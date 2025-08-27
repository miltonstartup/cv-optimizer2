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
        const { listingId, content, fileContent } = await req.json();
        const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!openRouterApiKey || !supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing required environment variables');
        }

        const contentToAnalyze = content || fileContent || '';
        
        if (!contentToAnalyze.trim()) {
            throw new Error('No content provided for analysis');
        }

        // Analyze job listing with AI
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
                    content: `Analiza la siguiente oferta de trabajo y extrae la información estructurada en JSON:

Oferta de trabajo:
${contentToAnalyze}

Por favor, extrae y estructura la siguiente información:
{
  "jobTitle": "Título del puesto",
  "company": "Nombre de la empresa",
  "location": "Ubicación",
  "jobType": "Tiempo completo/medio tiempo/freelance",
  "experienceLevel": "Junior/Mid/Senior",
  "salary": "Rango salarial si se menciona",
  "description": "Descripción del puesto",
  "responsibilities": [
    "Responsabilidad 1",
    "Responsabilidad 2"
  ],
  "requirements": {
    "technical": ["Habilidad técnica 1", "Habilidad técnica 2"],
    "experience": ["Años de experiencia", "Tipo de experiencia"],
    "education": ["Nivel educativo requerido"],
    "languages": ["Idiomas requeridos"]
  },
  "benefits": ["Beneficio 1", "Beneficio 2"],
  "keywords": ["palabra clave 1", "palabra clave 2"]
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
                jobTitle: 'No extraído',
                company: 'No especificado',
                location: 'No especificado',
                description: contentToAnalyze.substring(0, 500) + '...',
                requirements: {
                    technical: [],
                    experience: [],
                    education: [],
                    languages: []
                },
                responsibilities: [],
                benefits: [],
                keywords: []
            };
        }

        return new Response(JSON.stringify({
            data: {
                listingId,
                parsedContent,
                originalContent: contentToAnalyze
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Parse listing error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'PARSE_LISTING_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});