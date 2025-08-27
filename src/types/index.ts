export interface CVData {
  id: string
  user_id: string
  file_path?: string
  linkedin_url?: string
  original_content?: string
  parsed_content?: ParsedCVContent
  created_at: string
}

export interface ParsedCVContent {
  datos_personales?: {
    nombre?: string
    email?: string
    telefono?: string
    ubicacion?: string
  }
  resumen_profesional?: string
  experiencia_laboral?: Array<{
    empresa: string
    puesto: string
    fechas: string
    responsabilidades: string[]
  }>
  educacion?: Array<{
    institucion: string
    titulo: string
    fechas: string
  }>
  habilidades?: string[]
  idiomas?: string[]
  certificaciones?: string[]
  proyectos?: string[]
}

export interface JobListing {
  id: string
  cv_id: string
  file_path?: string
  content?: string
  parsed_content?: ParsedJobContent
  created_at: string
}

export interface ParsedJobContent {
  titulo_puesto?: string
  empresa?: string
  ubicacion?: string
  tipo_empleo?: string
  salario?: string
  requisitos_obligatorios?: string[]
  requisitos_deseables?: string[]
  responsabilidades_principales?: string[]
  habilidades_tecnicas_requeridas?: string[]
  años_experiencia_requeridos?: number
  educacion_requerida?: string
  beneficios?: string[]
}

export interface Analysis {
  id: string
  cv_id: string
  listing_id?: string
  result_json: AnalysisResult
  analysis_type: string
  status: string
  created_at: string
}

export interface AnalysisResult {
  analysis_type: string
  analysis_result?: {
    puntuacion_compatibilidad: number
    fortalezas_principales: string[]
    areas_de_mejora: string[]
    gaps_identificados: string[]
    palabras_clave_faltantes: string[]
    recomendaciones_especificas: string[]
  }
  recommendations?: {
    resumen_profesional_sugerido: string
    experiencia_laboral_mejorada: Array<{
      empresa: string
      puesto: string
      descripcion_mejorada: string
    }>
    habilidades_a_destacar: string[]
    secciones_a_reorganizar: string[]
    formato_sugerido: string
    palabras_clave_a_incluir: string[]
  }
  summaries?: {
    resumenes: string[]
    generation_successful: boolean
  }
  timestamp: string
}

export interface AIPrompt {
  id: string
  prompt_type: 'parse_cv' | 'parse_listing' | 'analyze_cv' | 'recommend_cv' | 'generate_summary' | 'parse_linkedin_screenshot'
  prompt_text: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}