// Utilidades centralizadas para procesamiento de archivos
import { generateTempId } from './idGenerator'
import { validateFileSize, sanitizeContent, truncateContent } from './fileValidation'
import { PROCESSING_TIMEOUTS } from './constants'
import toast from 'react-hot-toast'

export interface ProcessingResult {
  success: boolean
  cvId?: string
  content?: string
  error?: string
}

export interface ProcessingOptions {
  timeout?: number
  sanitize?: boolean
  truncate?: boolean
  maxLength?: number
}

export async function processFileWithTimeout<T>(
  processingFunction: () => Promise<T>,
  options: ProcessingOptions = {}
): Promise<T> {
  const { timeout = PROCESSING_TIMEOUTS.FILE_PROCESSING } = options

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout en procesamiento de archivo'))
    }, timeout)

    processingFunction()
      .then(result => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch(error => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

export function createEmergencyFallbackContent(
  file: File, 
  error: any, 
  additionalInfo?: string
): string {
  return `ARCHIVO PROCESADO CON FALLBACK DE EMERGENCIA

Archivo procesado: ${file.name}
Tipo: ${file.type || 'Desconocido'}
Tamaño: ${(file.size / 1024).toFixed(2)} KB
Fecha: ${new Date().toLocaleString()}

Error en extracción: ${error instanceof Error ? error.message : 'Error desconocido'}

${additionalInfo || ''}

[FALLBACK DE EMERGENCIA: El sistema no pudo extraer el contenido automáticamente. Por favor, copie manualmente el contenido de su CV o intente con un formato diferente (PDF recomendado).]

Para mejores resultados, intente:
1. Exportar el CV como PDF desde Word/Google Docs
2. Asegurar que el PDF contiene texto seleccionable
3. Usar archivos de texto plano (.txt) como alternativa`
}

export function processContentSafely(
  content: string,
  options: ProcessingOptions = {}
): string {
  const { sanitize = true, truncate = true, maxLength } = options
  
  let processedContent = content
  
  if (sanitize) {
    processedContent = sanitizeContent(processedContent)
  }
  
  if (truncate) {
    processedContent = truncateContent(processedContent, maxLength)
  }
  
  return processedContent
}

export function handleProcessingError(
  error: any,
  context: string,
  fallbackContent?: string
): void {
  console.error(`Error en ${context}:`, error)
  
  const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
  
  if (errorMessage.includes('Unicode')) {
    toast.error('Error: El archivo contiene caracteres no válidos. Intenta con otro formato.')
  } else if (errorMessage.includes('apikey')) {
    toast.error('Error de autenticación. Recarga la página e intenta nuevamente.')
  } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    toast.error('Timeout al procesar archivo. Intente de nuevo.')
  } else {
    toast.error(`Error en ${context}: ${errorMessage}`)
  }
}