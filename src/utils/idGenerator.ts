// Utilidad centralizada para generar IDs únicos
export function generateTempId(): string {
  return 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}

export function generateAnalysisId(): string {
  return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function generateRecommendationId(): string {
  return `recommendation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function generateSummaryId(): string {
  return `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}