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
        const { cvId, listingId } = await req.json();
        const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!openRouterApiKey || !supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing required environment variables');
        }

        // Get CV data
        const cvResponse = await fetch(`${supabaseUrl}/rest/v1/cvs?id=eq.${cvId}&select=*`, {
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
                'Content-Type': 'application/json'
            }
        });

        const cvData = await cvResponse.json();
        if (!cvData || cvData.length === 0) {
            throw new Error('CV not found');
        }

        const cv = cvData[0];
        let jobDescription = '';

        // Get job listing if provided
        if (listingId) {
            const listingResponse = await fetch(`${supabaseUrl}/rest/v1/listings?id=eq.${listingId}&select=*`, {
                headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                    'Content-Type': 'application/json'
                }
            });

            const listingData = await listingResponse.json();
            if (listingData && listingData.length > 0) {
                jobDescription = listingData[0].content || '';
            }
        }

        // Analyze compatibility with AI
        const analysisPrompt = jobDescription ? 
        `Analiza la compatibilidad entre este CV y la siguiente oferta de trabajo.

CV:
${cv.original_content}

Oferta de trabajo:
${jobDescription}

Por favor, proporciona un análisis detallado en formato JSON:
{
  "compatibilityScore": 85,
  "strengths": ["Fortaleza 1", "Fortaleza 2"],
  "weaknesses": ["Debilidad 1", "Debilidad 2"],
  "matchingSkills": ["Habilidad 1", "Habilidad 2"],
  "missingSkills": ["Habilidad faltante 1", "Habilidad faltante 2"],
  "experienceMatch": "Alto/Medio/Bajo",
  "recommendations": ["Recomendación 1", "Recomendación 2"],
  "summary": "Resumen general del análisis"
}

Solo responde con el JSON estructurado.`
        :
        `Analiza este CV y proporciona un análisis general de las fortalezas y áreas de mejora.

CV:
${cv.original_content}

Por favor, proporciona un análisis en formato JSON:
{
  "compatibilityScore": 70,
  "strengths": ["Fortaleza 1", "Fortaleza 2"],
  "weaknesses": ["Área de mejora 1", "Área de mejora 2"],
  "skills": ["Habilidad principal 1", "Habilidad principal 2"],
  "recommendations": ["Recomendación 1", "Recomendación 2"],
  "summary": "Resumen general del perfil profesional"
}

Solo responde con el JSON estructurado.`;

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
                    content: analysisPrompt
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
        let analysisResult;
        
        try {
            const aiContent = aiResult.choices[0].message.content;
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysisResult = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found in AI response');
            }
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            // Fallback response
            analysisResult = {
                compatibilityScore: 0,
                strengths: ['No se pudo analizar el contenido'],
                weaknesses: ['Error en el procesamiento'],
                matchingSkills: [],
                missingSkills: [],
                recommendations: ['Intente nuevamente con contenido más claro'],
                summary: 'Error en el análisis del CV'
            };
        }

        // Store analysis in database
        const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await fetch(`${supabaseUrl}/rest/v1/analyses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: analysisId,
                cv_id: cvId,
                listing_id: listingId,
                analysis_type: 'compatibility',
                result_json: analysisResult,
                created_at: new Date().toISOString()
            })
        });

        return new Response(JSON.stringify({
            data: analysisResult
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Analyze CV error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'ANALYZE_CV_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});