import * as pdfjsLib from 'pdfjs-dist';
import { 
  BINARY_PDF_PATTERNS, 
  FILE_SIZE_LIMITS, 
  CV_KEYWORDS 
} from '../utils/constants'
import { 
  isValidTextContent, 
  sanitizeContent, 
  truncateContent,
  validateFileSize 
} from '../utils/fileValidation'

// Configure pdfjs worker - CORREGIDO: Usar versión compatible 3.11.174
if (typeof window !== 'undefined') {
  // CRÍTICO: Usar versión compatible entre librería y worker
  const pdfjsVersion = '3.11.174'; // Versión compatible instalada
  // Usar worker local para evitar problemas de CORS/CDN
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  
  console.log(`📄 [PDF.js] Configurando worker local versión compatible: ${pdfjsVersion}`);
}

// Logger personalizado para debugging
let debugLogger: any = null;

// Función para inicializar logger desde componente React
export function initializeDocumentExtractorLogger(logger: any) {
  debugLogger = logger;
  debugLogger.info('Document Extractor logger inicializado', { version: '3.11.174' });
}

export interface PDFExtractResult {
  text: string;
  numPages: number;
  error?: string;
  method?: string;
}

// Función de logging con fallback a console
function log(level: 'info' | 'warning' | 'error' | 'success', message: string, data?: any) {
  if (debugLogger) {
    debugLogger[level](`[Document Extractor] ${message}`, data);
  }
  
  // Fallback a console del navegador
  const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
  console[consoleMethod](`📄 [Document Extractor] ${message}`, data || '');
}

/**
 * FALLBACK LEVEL 1: Extract text content from PDF file using PDF.js (MEJORADO)
 */
export async function extractPDFText(file: File): Promise<PDFExtractResult> {
  try {
    console.log('📄 [PDF Extractor] Starting PDF.js text extraction for:', file.name);
    
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('📄 [PDF Extractor] File converted to ArrayBuffer, size:', arrayBuffer.byteLength);
    
    // CRÍTICO: Configurar opciones para evitar problemas de versión
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      verbosity: 0, // Reducir logs
      disableAutoFetch: false,
      disableStream: false
    });
    
    // Agregar timeout para evitar cuelgues
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('PDF loading timeout')), 30000); // 30 segundos
    });
    
    const pdf = await Promise.race([loadingTask.promise, timeoutPromise]);
    console.log('📄 [PDF Extractor] PDF loaded successfully, pages:', pdf.numPages);
    
    let extractedText = '';
    const pageTexts: string[] = [];
    
    // Extract text from each page with better error handling
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        console.log(`📄 [PDF Extractor] Processing page ${pageNum}/${pdf.numPages}`);
        
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items from this page with better formatting
        let pageText = '';
        let lastY = 0;
        
        textContent.items.forEach((item: any) => {
          if ('str' in item && item.str.trim()) {
            // Add line breaks for text that appears on different vertical positions
            if (lastY && Math.abs(lastY - item.transform[5]) > 5) {
              pageText += '\n';
            }
            pageText += item.str + ' ';
            lastY = item.transform[5];
          }
        });
        
        if (pageText.trim()) {
          pageTexts.push(pageText.trim());
          console.log(`📄 [PDF Extractor] Extracted ${pageText.length} characters from page ${pageNum}`);
        }
      } catch (pageError) {
        console.error(`❌ [PDF Extractor] Error processing page ${pageNum}:`, pageError);
        // Continue with other pages even if one fails
      }
    }
    
    // Join all pages
    extractedText = pageTexts.join('\n\n');
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Clean up line breaks
      .trim();
    
    console.log('✅ [PDF Extractor] Total text extracted:', extractedText.length, 'characters');
    
    if (!extractedText.trim()) {
      throw new Error('No text content found in PDF - may be image-based or encrypted');
    }
    
    // VALIDACIÓN CRÍTICA: Verificar que no sea código binario
    if (!isValidTextContent(extractedText)) {
      throw new Error('Extracted content is binary code, not readable text');
    }
    
    return {
      text: extractedText,
      numPages: pdf.numPages,
      method: 'PDF.js Client-side (Fixed)'
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ [PDF Extractor] CRITICAL ERROR:', errorMsg);
    
    // Detectar errores específicos
    if (errorMsg.includes('API version') && errorMsg.includes('Worker version')) {
      console.error('❌ [PDF Extractor] VERSION MISMATCH DETECTED - trying fallback');
    }
    
    return {
      text: '',
      numPages: 0,
      error: errorMsg,
      method: 'PDF.js Client-side (Failed)'
    };
  }
}

/**
 * FALLBACK LEVEL 2: Try to extract text using FileReader (MEJORADO - RECHAZA PDFs BINARIOS)
 */
export async function extractTextFallback(file: File): Promise<string> {
  console.log('🔄 [Text Fallback] Attempting text extraction fallback for:', file.name);
  
  // CRÍTICO: NO procesar archivos PDF con FileReader (produce código binario)
  if (file.type === 'application/pdf') {
    console.warn('⚠️ [Text Fallback] SKIPPING PDF with FileReader (would produce binary code)');
    throw new Error('FileReader cannot extract readable text from PDF files');
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        let text = e.target?.result as string || '';
        
        // VALIDACIÓN TEMPRANA: Verificar que no sea código binario
        if (text.includes('%PDF-') || text.includes('/Type/Catalog')) {
          console.error('❌ [Text Fallback] DETECTED PDF binary code, rejecting');
          reject(new Error('FileReader extracted PDF binary code instead of text'));
          return;
        }
        
        // Clean up text for database storage
        text = text
          .replace(/\u0000/g, '') // Remove null bytes
          .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Remove control characters
          .replace(/[^\x20-\x7E\n\r\t\u00c0-\u017f]/g, '') // Keep printable ASCII + basic whitespace + accented chars
          .trim();
        
        // VALIDACIÓN FINAL: Verificar contenido antes de retornar
        if (!isValidTextContent(text)) {
          console.error('❌ [Text Fallback] Content failed validation');
          reject(new Error('Extracted content is not valid text'));
          return;
        }
        
        console.log('✅ [Text Fallback] Extracted VALID text:', text.length, 'characters');
        resolve(text);
      } catch (error) {
        console.error('❌ [Text Fallback] Error reading text file:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      console.error('❌ [Text Fallback] File reader error');
      reject(new Error('Failed to read file using text fallback'));
    };
    
    // Try different encodings
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * FALLBACK LEVEL 3: Generate basic content from file metadata
 */
export function generateFallbackContent(file: File): string {
  console.log('🆘 [Emergency Fallback] Generating basic content for:', file.name);
  
  const fallbackText = `
Archivo: ${file.name}
Tipo: ${file.type || 'Unknown'}
Tamaño: ${(file.size / 1024).toFixed(2)} KB
Modificado: ${new Date(file.lastModified).toLocaleString()}

[NOTA: No se pudo extraer el contenido del archivo. Por favor, asegúrese de que el archivo esté en un formato compatible o intente con un archivo diferente.]
`;
  
  console.log('⚠️ [Emergency Fallback] Generated fallback content:', fallbackText.length, 'characters');
  return fallbackText;
}

export async function extractDocumentText(file: File): Promise<string> {
  log('info', 'INICIANDO extracción robusta de documento', {
    fileName: file.name,
    fileType: file.type,
    fileSize: `${(file.size / 1024).toFixed(2)} KB`
  });
  
  // Validation
  if (!file || file.size === 0) {
    log('error', 'Archivo inválido o vacío proporcionado');
    throw new Error('Invalid or empty file provided');
  }
  
  if (file.size > 50 * 1024 * 1024) { // 50MB limit
    log('error', 'Archivo demasiado grande', { 
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      limit: '50 MB'
    });
    throw new Error('File size too large (max 50MB)');
  }
  
  let extractedText = '';
  let extractionMethod = '';
  
  // LEVEL 1: PDF-specific extraction using PDF.js (CORREGIDO)
  if (file.type === 'application/pdf') {
    log('info', 'Intentando extracción PDF.js (Nivel 1)');
    
    try {
      const result = await extractPDFText(file);
      if (result.text.trim() && result.text.length > 20 && isValidTextContent(result.text)) {
        log('success', 'EXITO con PDF.js - Contenido válido extraído', {
          method: result.method,
          charactersExtracted: result.text.length,
          pages: result.numPages,
          preview: result.text.substring(0, 200) + '...'
        });
        return result.text;
      } else {
        log('warning', 'PDF.js falló validación o extrajo contenido inválido', {
          textLength: result.text?.length || 0,
          error: result.error
        });
      }
    } catch (error) {
      log('warning', 'Extracción PDF.js falló', { error: error.message });
    }
  }
  
  // LEVEL 2: Text fallback for all file types (VALIDADO)
  log('info', 'Intentando fallback de texto (Nivel 2)');
  
  try {
    extractedText = await extractTextFallback(file);
    extractionMethod = 'Text Fallback';
    
    // CRÍTICO: Validar que el contenido NO sea código binario
    if (extractedText.trim() && extractedText.length > 10 && isValidTextContent(extractedText)) {
      log('success', 'EXITO con fallback de texto', {
        method: extractionMethod,
        charactersExtracted: extractedText.length,
        preview: extractedText.substring(0, 200) + '...'
      });
      return extractedText;
    } else {
      log('error', 'Fallback de texto extrajo CÓDIGO BINARIO - RECHAZANDO');
    }
  } catch (error) {
    log('warning', 'Fallback de texto falló', { error: error.message });
  }
  
  // LEVEL 3: SERVER-SIDE PDF EXTRACTION usando Edge Function
  if (file.type === 'application/pdf') {
    log('info', 'Intentando extracción server-side PDF (Nivel 3)');
    
    try {
      // Convertir archivo a base64 para enviar al servidor
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1]; // Remover data:application/pdf;base64,
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      log('info', 'Enviando PDF al servidor para extracción', {
        base64Length: base64Data.length,
        fileName: file.name
      });
      
      // Llamar a la Edge Function para extracción server-side
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/extract-pdf-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          base64Data,
          fileName: file.name
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server extraction failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.text) {
        log('success', 'EXITO con extracción server-side', {
          method: result.method,
          charactersExtracted: result.length,
          hasRelevantContent: result.hasRelevantContent,
          preview: result.text.substring(0, 200) + '...'
        });
        
        // Validar el contenido extraído del servidor
        if (isValidTextContent(result.text)) {
          return result.text;
        } else {
          log('warning', 'Contenido extraído del servidor falló validación');
        }
      } else {
        log('warning', 'Extracción del servidor retornó resultado inválido', { result });
      }
      
    } catch (error) {
      log('error', 'Extracción server-side falló', { error: error.message });
    }
  }
  
  // LEVEL 4: Emergency fallback - metadata pero INFORMATIVO
  log('warning', 'Usando fallback de emergencia (Nivel 4) - TODOS LOS MÉTODOS FALLARON');
  
  const fallbackContent = `ARCHIVO PROCESADO CON FALLBACK DE EMERGENCIA

Archivo: ${file.name}
Tipo: ${file.type || 'Unknown'}
Tamaño: ${(file.size / 1024).toFixed(2)} KB
Fecha: ${new Date().toLocaleString()}

ERROR CRÍTICO: No se pudo extraer el contenido real del archivo.

PARA EL USUARIO:
- El sistema detectó que el archivo contiene código binario en lugar de texto
- Por favor, asegúrese de que el PDF contiene texto seleccionable
- Intente exportar nuevamente desde Word/Google Docs como PDF
- Como alternativa, copie manualmente el contenido a un archivo .txt

PARA DEBUGGING:
- Todas las herramientas de extracción fallaron
- El contenido extraído contenía patrones de código PDF binario
- Se requiere implementar extracción del lado del servidor

INFORMACIÓN DEL CV ESPERADA:
Por favor ingrese manualmente:
- Nombre completo
- Profesión/Título
- Experiencia laboral
- Educación
- Habilidades técnicas
- Información de contacto`;
  
  log('error', 'FALLBACK DE EMERGENCIA activado - Todos los niveles fallaron', {
    charactersGenerated: fallbackContent.length,
    message: 'Se requiere intervención manual del usuario'
  });
  
  return fallbackContent;
}