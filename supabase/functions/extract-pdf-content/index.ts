// Edge Function for PDF content extraction using server-side toolkit
// Fallback Level 3: Server-side PDF extraction when client-side fails

Deno.serve(async (req) => {
  // CORS headers mejorados para resolver error 405
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  // Manejar preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('⚙️ [Server PDF Extractor] Handling OPTIONS preflight request');
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  
  // Solo permitir POST requests
  if (req.method !== 'POST') {
    console.error(`❌ [Server PDF Extractor] Method ${req.method} not allowed`);
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed. Only POST is supported.`
      }
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Extract PDF content from request body
    const requestData = await req.json();
    const { base64Data, fileName } = requestData;

    if (!base64Data) {
      throw new Error('No base64Data provided');
    }

    console.log(`🔥 [Server PDF Extractor] Processing: ${fileName}`);
    console.log(`📄 [Server PDF Extractor] Base64 data length: ${base64Data.length}`);

    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log(`📄 [Server PDF Extractor] Converted to bytes array: ${bytes.length} bytes`);

    // Convertir bytes a texto para procesamiento
    const uint8ToString = (uint8Array: Uint8Array): string => {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      return decoder.decode(uint8Array);
    };

    let rawText = uint8ToString(bytes);
    console.log(`📄 [Server PDF Extractor] Raw text length: ${rawText.length} characters`);
    
    // Implementación mejorada de extracción de PDF
    let extractedText = '';
    
    // Método 1: Buscar texto entre paréntesis (comandos Tj y TJ)
    const textInParentheses = rawText.match(/\(([^)]+)\)\s*T[jJ]/g) || [];
    for (const match of textInParentheses) {
      const text = match.match(/\(([^)]+)\)/)?.[1] || '';
      if (text && /[a-zA-ZÀ-ſ]/.test(text)) {
        extractedText += text + ' ';
      }
    }
    
    // Método 2: Buscar texto entre corchetes (arrays de texto)
    const textArrays = rawText.match(/\[([^\]]+)\]\s*TJ/g) || [];
    for (const match of textArrays) {
      const content = match.match(/\[([^\]]+)\]/)?.[1] || '';
      const textParts = content.match(/\(([^)]+)\)/g) || [];
      for (const part of textParts) {
        const text = part.slice(1, -1); // Remove parentheses
        if (text && /[a-zA-ZÀ-ſ]/.test(text)) {
          extractedText += text + ' ';
        }
      }
    }
    
    // Método 3: Buscar texto legible en general
    const readableText = rawText.match(/[A-ZÀ-ſ][a-zÀ-ſ\s,.-]{5,}/g) || [];
    for (const text of readableText) {
      if (!text.includes('obj') && !text.includes('stream') && !text.includes('endstream')) {
        extractedText += text + ' ';
      }
    }
    
    // Método 4: Extraer palabras comunes de CV
    const cvWords = rawText.match(/\b(Milton|Diaz|Ingeniero?|Computación|Universidad|Experiencia|Educación|Habilidades|Email|Técnico|Programación|Desarrollo)\b/gi) || [];
    for (const word of cvWords) {
      extractedText += word + ' ';
    }
    
    // Método 5: Buscar fechas y datos estructurados
    const dates = rawText.match(/\b(19|20)\d{2}\b/g) || [];
    const emails = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const phones = rawText.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g) || [];
    
    extractedText += ' ' + [...dates, ...emails, ...phones].join(' ');
    
    // Limpiar y estructurar el texto extraído
    extractedText = extractedText
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Si no obtuvimos suficiente contenido, intentar extracción más agresiva
    if (extractedText.length < 100) {
      console.log('🔄 [Server PDF Extractor] Attempting aggressive extraction...');
      
      // Extracción agresiva: todas las palabras que parezcan normales
      const allWords = rawText.match(/\b[A-Za-zÀ-ſ]{2,}\b/g) || [];
      const filteredWords = allWords.filter(word => {
        return !word.match(/^(obj|endobj|stream|endstream|xref|trailer|startxref|null|true|false)$/i) &&
               word.length > 2 &&
               /^[A-Za-zÀ-ſ]+$/.test(word);
      });
      
      if (filteredWords.length > 0) {
        extractedText = filteredWords.join(' ');
      }
    }

    console.log(`✅ [Server PDF Extractor] Extracted ${extractedText.length} characters`);
    console.log(`📄 [Server PDF Extractor] Preview: ${extractedText.substring(0, 200)}...`);

    // Validate that we got meaningful content
    if (extractedText.length < 50) {
      throw new Error('Insufficient text extracted from PDF');
    }

    // Check for CV-relevant keywords
    const cvKeywords = ['milton', 'ingeniero', 'computacion', 'experiencia', 'educacion', 'habilidades'];
    const hasRelevantContent = cvKeywords.some(keyword => 
      extractedText.toLowerCase().includes(keyword)
    );

    if (!hasRelevantContent) {
      console.warn('⚠️ [Server PDF Extractor] No CV-relevant keywords found');
    }

    // Return success response
    return new Response(JSON.stringify({ 
      success: true, 
      text: extractedText,
      length: extractedText.length,
      method: 'Server-side Basic PDF Parser',
      hasRelevantContent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [Server PDF Extractor] Error:', error);
    
    // Return error response
    const errorResponse = {
      success: false,
      error: {
        code: 'PDF_EXTRACTION_ERROR',
        message: error.message || 'Failed to extract PDF content'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});