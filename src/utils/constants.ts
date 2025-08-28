// Constantes compartidas para evitar duplicación
export const PROCESSING_TIMEOUTS = {
  FILE_PROCESSING: 90000, // 90 segundos
  LINKEDIN_PROCESSING: 30000, // 30 segundos
  AUTH_INITIALIZATION: 10000, // 10 segundos
  CV_LOADING: 15000, // 15 segundos
  SUPABASE_CONNECTION: 5000 // 5 segundos
} as const

export const FILE_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
  TXT: 'text/plain'
} as const

export const ACCEPTED_FILE_EXTENSIONS = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
  'image/*': ['.png', '.jpg', '.jpeg', '.webp']
} as const

export const CV_KEYWORDS = [
  'experiencia', 'educación', 'habilidades', 'trabajo', 'empresa',
  'universidad', 'carrera', 'estudios', 'proyecto', 'responsable',
  'email', '@', 'teléfono', 'dirección', 'perfil', 'ingeniero',
  'experience', 'education', 'skills', 'work', 'university'
] as const

export const BINARY_PDF_PATTERNS = [
  '%PDF-',           // Cabecera PDF
  '/Type/Catalog',   // Objetos PDF
  '/Type/Page',      // Páginas PDF
  'endobj',          // Final de objeto PDF
  'stream',          // Flujos de datos PDF
  'endstream',       // Final de flujo PDF
  '<<',              // Diccionarios PDF
  '>>',              // Cierre de diccionarios PDF
  'obj\r\n',         // Objetos PDF con salto de línea
  'xref',            // Referencias cruzadas PDF
  'trailer'          // Trailer PDF
] as const

export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_TEXT_LENGTH: 1000000, // 1MB de texto
  MIN_CONTENT_LENGTH: 20,
  MIN_VALID_CONTENT_LENGTH: 10,
  TRUNCATE_MESSAGE: '... [contenido truncado]'
} as const

// Configuración de Supabase
export const SUPABASE_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 30000
} as const

// Mensajes de error estandarizados
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Verifica tu conexión a internet.',
  AUTH_ERROR: 'Error de autenticación. Por favor inicia sesión nuevamente.',
  SUPABASE_ERROR: 'Error del servidor. Intenta nuevamente en unos momentos.',
  FILE_TOO_LARGE: 'El archivo es demasiado grande. Máximo 50MB.',
  INVALID_FILE_TYPE: 'Tipo de archivo no soportado.',
  PROCESSING_TIMEOUT: 'El procesamiento está tomando demasiado tiempo. Intenta con un archivo más pequeño.'
} as const