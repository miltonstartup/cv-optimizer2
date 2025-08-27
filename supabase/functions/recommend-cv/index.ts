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
        const { cvId, analysisId, listingId } = await req.json();
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
        let analysisData = null;

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

        // Get previous analysis if available
        if (analysisId) {
            const analysisResponse = await fetch(`${supabaseUrl}/rest/v1/analyses?id=eq.${analysisId}&select=*`, {
                headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                    'Content-Type': 'application/json'
                }
            });

            const analysisResult = await analysisResponse.json();
            if (analysisResult && analysisResult.length > 0) {
                analysisData = analysisResult[0].result_json;
            }
        }

        // Generate recommendations with AI
        const recommendationPrompt = jobDescription ?
        `Basándote en este CV y la oferta de trabajo, proporciona recomendaciones específicas de mejora:

CV:
${cv.original_content}

Oferta de trabajo:
${jobDescription}

${analysisData ? `Análisis previo:\n${JSON.stringify(analysisData, null, 2)}\n\n` : ''}

Por favor, proporciona recomendaciones detalladas en formato JSON:
{
  "contentImprovements": [
    {
      "section": "Sección del CV",
      "current": "Texto actual",
      "suggested": "Texto mejorado",
      "reason": "Por qué este cambio mejorará el CV"
    }
  ],
  "skillsToAdd": [
    {
      "skill": "Habilidad a añadir",
      "importance": "Alto/Medio/Bajo",
      "reason": "Por qué es importante para esta posición"
    }
  ],
  "formattingTips": [
    "Consejo de formato 1",
    "Consejo de formato 2"
  ],
  "priorityActions": [
    "Acción prioritaria 1",
    "Acción prioritaria 2"
  ],
  "overallScore": 85
}

Solo responde con el JSON estructurado.`
        :
        `Analiza este CV y proporciona recomendaciones generales de mejora:

CV:
${cv.original_content}

Por favor, proporciona recomendaciones en formato JSON:
{
  "contentImprovements": [
    {
      "section": "Sección del CV",
      "current": "Texto actual",
      "suggested": "Texto mejorado",
      "reason": "Por qué este cambio mejorará el CV"
    }
  ],
  "generalTips": [
    "Consejo general 1",
    "Consejo general 2"
  ],
  "formattingTips": [
    "Consejo de formato 1",
    "Consejo de formato 2"
  ],
  "priorityActions": [
    "Acción prioritaria 1",
    "Acción prioritaria 2"
  ]
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
                    content: recommendationPrompt
                }],
                temperature: 0.2,
                max_tokens: 2500
            })
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            throw new Error(`AI API error: ${errorText}`);
        }

        const aiResult = await aiResponse.json();
        let recommendations;
        
        try {
            const aiContent = aiResult.choices[0].message.content;
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                recommendations = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found in AI response');
            }
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            // Fallback recommendations
            recommendations = {
                contentImprovements: [{
                    section: 'General',
                    current: 'Contenido actual',
                    suggested: 'Error en el procesamiento de recomendaciones',
                    reason: 'Por favor intente nuevamente'
                }],
                formattingTips: ['Revise el formato del CV'],
                priorityActions: ['Intente cargar el CV nuevamente']
            };
        }

        // Store recommendations in database
        const recommendationId = `recommendation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await fetch(`${supabaseUrl}/rest/v1/analyses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: recommendationId,
                cv_id: cvId,
                listing_id: listingId,
                analysis_type: 'recommendations',
                result_json: { recommendations },
                created_at: new Date().toISOString()
            })
        });

        return new Response(JSON.stringify({
            data: { recommendations }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Recommend CV error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'RECOMMEND_CV_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});