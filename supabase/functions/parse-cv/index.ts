Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { cvId, linkedinUrl, fileContent } = await req.json();
        const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!openRouterApiKey || !supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing required environment variables');
        }

        let contentToAnalyze = '';
        let sourceType = '';

        if (linkedinUrl) {
            contentToAnalyze = linkedinUrl;
            sourceType = 'linkedin_url';
        } else if (fileContent) {
            contentToAnalyze = fileContent;
            sourceType = 'file_content';
        } else {
            throw new Error('No content provided for analysis');
        }

        // Analyze content with AI
        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openRouterApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: `Analiza el siguiente CV y extrae la información estructurada en JSON:

Contenido del CV:
${contentToAnalyze}

Por favor, extrae y estructura la siguiente información:
{
  "personalInfo": {
    "name": "Nombre completo",
    "email": "email@example.com",
    "phone": "teléfono",
    "location": "ubicación"
  },
  "summary": "Resumen profesional",
  "experience": [
    {
      "company": "Nombre empresa",
      "position": "Cargo",
      "duration": "Duración",
      "description": "Descripción del rol"
    }
  ],
  "education": [
    {
      "institution": "Institución",
      "degree": "Título",
      "duration": "Duración"
    }
  ],
  "skills": ["habilidad1", "habilidad2"],
  "languages": ["idioma1", "idioma2"]
}

Solo responde con el JSON estructurado.`
                }],
                temperature: 0.1,
                max_tokens: 2000
            })
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            throw new Error(`AI API error: ${errorText}`);
        }

        const aiResult = await aiResponse.json();
        let parsedContent;
        
        try {
            const aiContent = aiResult.choices[0].message.content;
            // Extract JSON from AI response
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedContent = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found in AI response');
            }
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            // Fallback structured response
            parsedContent = {
                personalInfo: { name: 'No extraído', email: '', phone: '', location: '' },
                summary: 'No se pudo extraer el resumen',
                experience: [],
                education: [],
                skills: [],
                languages: []
            };
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        let userId = null;
        
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': supabaseServiceKey
                }
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                userId = userData.id;
            }
        }

        // Store in database if user is authenticated
        if (userId) {
            const { data: existingCv } = await (await fetch(`${supabaseUrl}/rest/v1/cvs?id=eq.${cvId}&user_id=eq.${userId}`, {
                headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                    'Content-Type': 'application/json'
                }
            })).json();

            if (existingCv && existingCv.length > 0) {
                // Update existing CV
                await fetch(`${supabaseUrl}/rest/v1/cvs?id=eq.${cvId}&user_id=eq.${userId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        original_content: contentToAnalyze,
                        parsed_content: parsedContent,
                        updated_at: new Date().toISOString()
                    })
                });
            } else {
                // Create new CV
                await fetch(`${supabaseUrl}/rest/v1/cvs`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id: cvId,
                        user_id: userId,
                        original_content: contentToAnalyze,
                        parsed_content: parsedContent,
                        source_type: sourceType,
                        created_at: new Date().toISOString()
                    })
                });
            }
        }

        return new Response(JSON.stringify({
            data: {
                cvId,
                parsedContent,
                originalText: contentToAnalyze,
                sourceType
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Parse CV error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'PARSE_CV_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});