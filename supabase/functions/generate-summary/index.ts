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
        const { cvId, listingId, profileData } = await req.json();
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

        // Generate multiple summaries with AI
        const summaryPrompt = jobDescription ?
        `Basándote en este CV y la oferta de trabajo, genera 3 versiones optimizadas de resumen profesional:

CV:
${cv.original_content}

Oferta de trabajo:
${jobDescription}

Por favor, genera 3 resúmenes diferentes en formato JSON:
{
  "summaries": [
    {
      "type": "conciso",
      "title": "Resumen Conciso (2-3 líneas)",
      "content": "Resumen breve y directo",
      "wordCount": 45
    },
    {
      "type": "detallado",
      "title": "Resumen Detallado (4-5 líneas)",
      "content": "Resumen más extenso con detalles específicos",
      "wordCount": 85
    },
    {
      "type": "orientado_objetivo",
      "title": "Orientado a Objetivo (3-4 líneas)",
      "content": "Resumen específicamente adaptado a esta oferta",
      "wordCount": 65
    }
  ]
}

Cada resumen debe destacar las fortalezas más relevantes para esta posición específica. Solo responde con el JSON estructurado.`
        :
        `Basándote en este CV, genera 3 versiones de resumen profesional optimizadas:

CV:
${cv.original_content}

Por favor, genera 3 resúmenes en formato JSON:
{
  "summaries": [
    {
      "type": "conciso",
      "title": "Resumen Conciso (2-3 líneas)",
      "content": "Resumen breve y directo",
      "wordCount": 45
    },
    {
      "type": "detallado",
      "title": "Resumen Detallado (4-5 líneas)",
      "content": "Resumen más extenso con experiencia y logros",
      "wordCount": 85
    },
    {
      "type": "versatil",
      "title": "Versátil (3-4 líneas)",
      "content": "Resumen adaptable a múltiples posiciones",
      "wordCount": 65
    }
  ]
}

Cada resumen debe ser profesional y destacar las principales fortalezas. Solo responde con el JSON estructurado.`;

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
                    content: summaryPrompt
                }],
                temperature: 0.3,
                max_tokens: 2000
            })
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            throw new Error(`AI API error: ${errorText}`);
        }

        const aiResult = await aiResponse.json();
        let summariesResult;
        
        try {
            const aiContent = aiResult.choices[0].message.content;
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                summariesResult = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found in AI response');
            }
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            // Fallback summaries
            summariesResult = {
                summaries: [
                    {
                        type: 'error',
                        title: 'Error en generación',
                        content: 'No se pudieron generar los resúmenes. Por favor intente nuevamente.',
                        wordCount: 0
                    }
                ]
            };
        }

        // Store summaries in database
        const summaryId = `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await fetch(`${supabaseUrl}/rest/v1/analyses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: summaryId,
                cv_id: cvId,
                listing_id: listingId,
                analysis_type: 'summary_generation',
                result_json: summariesResult,
                created_at: new Date().toISOString()
            })
        });

        return new Response(JSON.stringify({
            data: summariesResult
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Generate summary error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'GENERATE_SUMMARY_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});