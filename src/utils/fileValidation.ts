import { CV_KEYWORDS, BINARY_PDF_PATTERNS, FILE_SIZE_LIMITS } from './constants'

export interface ValidationResult {
  isValid: boolean
  error?: string
  warnings?: string[]
}

export function validateFileSize(file: File): ValidationResult {
  if (!file || file.size === 0) {
    return { isValid: false, error: 'Archivo inválido o vacío' }
  }

  if (file.size > FILE_SIZE_LIMITS.MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `Archivo demasiado grande (max ${FILE_SIZE_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB)` 
    }
  }

  return { isValid: true }
}

export function isValidTextContent(content: string): ValidationResult {
  if (!content || content.trim().length < FILE_SIZE_LIMITS.MIN_CONTENT_LENGTH) {
    return { 
      isValid: false, 
      error: 'Contenido muy corto o vacío',
      warnings: [`Longitud: ${content?.length || 0} caracteres`]
    }
  }

  // Verificar si contiene patrones de código binario
  const hasBinaryPatterns = BINARY_PDF_PATTERNS.some(pattern => 
    content.includes(pattern)
  )

  if (hasBinaryPatterns) {
    const detectedPatterns = BINARY_PDF_PATTERNS.filter(p => content.includes(p))
    return {
      isValid: false,
      error: 'Contenido contiene código binario PDF',
      warnings: [`Patrones detectados: ${detectedPatterns.join(', ')}`]
    }
  }

  // Verificar ratio de caracteres legibles
  const printableChars = content.match(/[a-zA-Z\u00c0-\u017f\s\d]/g) || []
  const printableRatio = printableChars.length / content.length

  if (printableRatio < 0.7) {
    return {
      isValid: false,
      error: 'Ratio de caracteres legibles muy bajo',
      warnings: [`Ratio: ${printableRatio.toFixed(2)}`]
    }
  }

  // Verificar que contenga palabras relevantes de CV
  const hasRelevantContent = CV_KEYWORDS.some(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  )

  const warnings = []
  if (!hasRelevantContent) {
    warnings.push('No se detectaron palabras relevantes de CV')
  }

  return { 
    isValid: true, 
    warnings: warnings.length > 0 ? warnings : undefined 
  }
}

export function sanitizeContent(content: string): string {
  if (!content) return ''

  return content
    .replace(/\u0000/g, '') // Remover null bytes
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Remover caracteres de control
    .replace(/[^\x20-\x7E\n\r\t\u00c0-\u017f]/g, '') // Mantener solo caracteres imprimibles
    .trim()
}

export function truncateContent(content: string, maxLength: number = FILE_SIZE_LIMITS.MAX_TEXT_LENGTH): string {
  if (content.length <= maxLength) return content
  
  return content.substring(0, maxLength) + '... [contenido truncado]'
}