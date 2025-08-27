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
        const { imageData, cvId, fileName } = await req.json();
        const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
        const openRouterVisionModel = Deno.env.get('OPENROUTER_MODEL_VISION');

        if (!openRouterApiKey || !openRouterVisionModel) {
            throw new Error('Missing required environment variables for vision analysis');
        }

        if (!imageData) {
            throw new Error('No image data provided');
        }

        // Analyze LinkedIn screenshot with AI vision model
        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openRouterApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: openRouterVisionModel,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Analiza esta captura de pantalla de un perfil de LinkedIn y extrae toda la información profesional visible en formato JSON estructurado:

{
  "personalInfo": {
    "name": "Nombre completo",
    "headline": "Título profesional",
    "location": "Ubicación",
    "connections": "Número de conexiones"
  },
  "summary": "Resumen profesional visible",
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
  "certifications": ["certificación1", "certificación2"],
  "languages": ["idioma1", "idioma2"]
}

Extrae solo el texto visible en la imagen. Si algún campo no es visible, déjalo vacío. Responde solo con el JSON estructurado.`
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageData
                            }
                        }
                    ]
                }],
                temperature: 0.1,
                max_tokens: 2000
            })
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            throw new Error(`AI Vision API error: ${errorText}`);
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
            // Fallback response
            parsedContent = {
                personalInfo: {
                    name: 'No extraído de la imagen',
                    headline: '',
                    location: '',
                    connections: ''
                },
                summary: 'No se pudo extraer información de la captura de pantalla',
                experience: [],
                education: [],
                skills: [],
                certifications: [],
                languages: []
            };
        }

        return new Response(JSON.stringify({
            data: {
                cvId,
                fileName,
                parsedContent,
                sourceType: 'linkedin_screenshot'
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Parse LinkedIn screenshot error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'PARSE_LINKEDIN_SCREENSHOT_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});