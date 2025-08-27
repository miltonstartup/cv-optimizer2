// Sistema robusto de extracción de documentos con múltiples fallbacks
// Nivel 1: PDF.js (cliente) -> Nivel 2: Texto plano -> Nivel 3: Edge Function (servidor)

import * as pdfjsLib from 'pdfjs-dist'
import { BINARY_PDF_PATTERNS, FILE_SIZE_LIMITS } from '../utils/constants'
import { isValidTextContent } from '../utils/fileValidation'

// Configurar PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

// Logger global para debugging
let globalLogger: any = null

export function initializeDocumentExtractorLogger(logger: any) {
  globalLogger = logger
  globalLogger?.info('📚 Document Extractor inicializado con logging')
}

function log(level: 'info' | 'warning' | 'error' | 'success', message: string, data?: any) {
  if (globalLogger) {
    globalLogger[level](message, data)
  } else {
    console[level === 'success' ? 'log' : level](`[DocumentExtractor] ${message}`, data || '')
  }
}

export async function extractDocumentText(file: File): Promise<string> {
  log('info', `🚀 Iniciando extracción robusta para: ${file.name}`, {
    type: file.type,
    size: file.size
  })

  // Determinar estrategia basada en el tipo de archivo
  switch (file.type) {
    case 'application/pdf':
      return await extractPDFText(file)
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword':
      return await extractWordText(file)
    case 'text/plain':
      return await extractPlainText(file)
    default:
      log('warning', `⚠️ Tipo de archivo no reconocido: ${file.type}, intentando como texto plano`)
      return await extractPlainText(file)
  }
}

async function extractPDFText(file: File): Promise<string> {
  log('info', '📄 Iniciando extracción de PDF con múltiples métodos')
  
  try {
    // NIVEL 1: PDF.js (método preferido)
    log('info', '🔍 Método 1: PDF.js client-side')
    const pdfText = await extractPDFWithPDFJS(file)
    
    const validation = isValidTextContent(pdfText)
    if (validation.isValid) {
      log('success', '✅ PDF.js exitoso', {
        textLength: pdfText.length,
        preview: pdfText.substring(0, 100) + '...'
      })
      return pdfText
    } else {
      log('warning', '⚠️ PDF.js produjo contenido inválido', validation)
    }
  } catch (error) {
    log('warning', '⚠️ PDF.js falló, intentando método alternativo', error)
  }

  try {
    // NIVEL 2: Extracción básica como texto
    log('info', '🔍 Método 2: Extracción básica de texto')
    const basicText = await extractPlainText(file)
    
    const validation = isValidTextContent(basicText)
    if (validation.isValid) {
      log('success', '✅ Extracción básica exitosa', {
        textLength: basicText.length
      })
      return basicText
    }
  } catch (error) {
    log('warning', '⚠️ Extracción básica falló', error)
  }

  try {
    // NIVEL 3: Edge Function (servidor)
    log('info', '🔍 Método 3: Edge Function server-side')
    const serverText = await extractPDFWithEdgeFunction(file)
    
    const validation = isValidTextContent(serverText)
    if (validation.isValid) {
      log('success', '✅ Edge Function exitosa', {
        textLength: serverText.length
      })
      return serverText
    }
  } catch (error) {
    log('error', '❌ Edge Function falló', error)
  }

  // FALLBACK FINAL
  log('warning', '🆘 Todos los métodos fallaron, usando fallback de emergencia')
  return createPDFFallbackContent(file)
}

async function extractPDFWithPDFJS(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  log('info', `📖 PDF cargado: ${pdf.numPages} páginas`)
  
  let fullText = ''
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      
      fullText += pageText + '\n'
      
      log('info', `📄 Página ${pageNum} procesada: ${pageText.length} caracteres`)
    } catch (pageError) {
      log('warning', `⚠️ Error en página ${pageNum}`, pageError)
      continue
    }
  }
  
  return fullText.trim()
}

async function extractPDFWithEdgeFunction(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
  
  log('info', '🌐 Enviando PDF a Edge Function', {
    base64Length: base64Data.length,
    fileName: file.name
  })
  
  const response = await fetch('/api/extract-pdf-content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base64Data,
      fileName: file.name
    })
  })
  
  if (!response.ok) {
    throw new Error(`Edge Function error: ${response.status} ${response.statusText}`)
  }
  
  const result = await response.json()
  
  if (!result.success) {
    throw new Error(result.error?.message || 'Edge Function failed')
  }
  
  return result.text || ''
}

async function extractWordText(file: File): Promise<string> {
  log('info', '📝 Extrayendo texto de documento Word')
  
  try {
    // Para archivos Word, intentamos leer como texto plano primero
    const text = await extractPlainText(file)
    
    // Limpiar marcado XML básico si es DOCX
    if (file.type.includes('openxml')) {
      const cleanText = text
        .replace(/<[^>]*>/g, ' ') // Remover tags XML
        .replace(/\s+/g, ' ') // Normalizar espacios
        .trim()
      
      if (cleanText.length > 50) {
        log('success', '✅ Texto Word extraído y limpiado', {
          originalLength: text.length,
          cleanedLength: cleanText.length
        })
        return cleanText
      }
    }
    
    return text
  } catch (error) {
    log('error', '❌ Error extrayendo Word', error)
    return createWordFallbackContent(file)
  }
}

async function extractPlainText(file: File): Promise<string> {
  log('info', '📄 Extrayendo como texto plano')
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        
        if (!text) {
          reject(new Error('No se pudo leer el archivo'))
          return
        }
        
        log('success', '✅ Texto plano extraído', {
          length: text.length,
          preview: text.substring(0, 100) + '...'
        })
        
        resolve(text)
      } catch (error) {
        log('error', '❌ Error procesando texto plano', error)
        reject(error)
      }
    }
    
    reader.onerror = () => {
      const error = new Error('Error leyendo archivo como texto')
      log('error', '❌ FileReader error', error)
      reject(error)
    }
    
    reader.readAsText(file, 'utf-8')
  })
}

function createPDFFallbackContent(file: File): string {
  return `FALLBACK DE EMERGENCIA - PDF

Archivo: ${file.name}
Tipo: ${file.type}
Tamaño: ${(file.size / 1024).toFixed(2)} KB
Fecha: ${new Date().toLocaleString()}

[NOTA IMPORTANTE]
No se pudo extraer el texto automáticamente de este PDF.

Posibles causas:
- PDF escaneado (imagen) sin OCR
- PDF protegido o encriptado
- Formato PDF corrupto o no estándar
- Texto incrustado como imágenes

SOLUCIONES RECOMENDADAS:
1. Abrir el PDF y copiar/pegar el texto manualmente
2. Convertir a formato Word (.docx) y volver a subir
3. Usar un archivo de texto plano (.txt)
4. Asegurar que el PDF tiene texto seleccionable

Para continuar, copie manualmente el contenido de su CV y péguelo en un archivo de texto.`
}

function createWordFallbackContent(file: File): string {
  return `FALLBACK DE EMERGENCIA - WORD

Archivo: ${file.name}
Tipo: ${file.type}
Tamaño: ${(file.size / 1024).toFixed(2)} KB
Fecha: ${new Date().toLocaleString()}

[NOTA IMPORTANTE]
No se pudo extraer el texto automáticamente de este documento Word.

SOLUCIONES RECOMENDADAS:
1. Exportar como PDF desde Word y volver a subir
2. Copiar todo el contenido y pegarlo en un archivo .txt
3. Usar "Guardar como" -> "Texto plano" en Word

Para continuar, copie manualmente el contenido de su CV.`
}