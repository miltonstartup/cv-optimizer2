import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, cvOperations } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CVDiffViewer } from '../components/CVDiffViewer'
import DebugConsole from '../components/DebugConsole'
import { useLogger } from '../contexts/DebugContext'
import { formatDate } from '../utils/dateFormatter'
import { generateTempId } from '../utils/idGenerator'
import { extractDocumentText } from '../lib/documentExtractor'
import { 
  FileText, Upload, Zap, TrendingUp, BarChart3, Sparkles, ArrowLeft, 
  CheckCircle2, Clock, FileDown, Eye, Brain, Target, AlertCircle,
  Loader2, Play, RefreshCw, ChevronDown
} from 'lucide-react'
import { CVData, JobListing, Analysis, AnalysisResult } from '../types'
import toast from 'react-hot-toast'

export function CVAnalysisPage() {
  const { cvId } = useParams<{ cvId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [cv, setCv] = useState<CVData | null>(null)
  const [jobListing, setJobListing] = useState<string>('')
  const [jobListingFile, setJobListingFile] = useState<JobListing | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null)
  const [recommendations, setRecommendations] = useState<any>(null)
  const [summaries, setSummaries] = useState<any>(null)
  
  // Estados para el nuevo flujo
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'analyzing' | 'results'>('upload')
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState('')
  
  // Estado para la vista previa del texto extraído
  const [extractedText, setExtractedText] = useState<string>('')
  const [showFullPreview, setShowFullPreview] = useState(false)
  
  // Logger para debugging
  const logger = useLogger('CVAnalysisPage');

  useEffect(() => {
    logger.info('Componente montado', { cvId, userId: user?.id })
    
    // Only load if we have cvId, user, and haven't already loaded
    if (cvId && user && !cv) {
      const loadTimeout = setTimeout(() => {
        logger.warning('Timeout cargando datos del CV')
        setLoading(false)
        toast.error('Timeout al cargar datos del CV')
      }, 15000) // 15 second timeout
      
      loadCVData().finally(() => {
        clearTimeout(loadTimeout)
      })
      
      return () => {
        clearTimeout(loadTimeout)
      }
    } else if (!cvId) {
      logger.warning('No CVId proporcionado')
      setLoading(false)
      navigate('/dashboard')
    } else if (!user) {
      logger.info('Esperando usuario autenticado')
      setLoading(false)
    }
  }, [cvId, user?.id]) // Only depend on cvId and user.id, not the whole user object

  async function loadCVData() {
    if (!cvId || !user) return
    
    logger.info(`Cargando datos del CV: ${cvId}`, { userId: user.id })
    setLoading(true)
    try {
      // Cargar CV
      logger.info('Consultando CV en base de datos')
      const { data: cvData, error: cvError } = await supabase
        .from('cvs')
        .select('*')
        .eq('id', cvId)
        .eq('user_id', user.id)
        .maybeSingle()
      
      logger.info('Resultado de consulta CV', {
        hasData: !!cvData,
        hasError: !!cvError,
        error: cvError
      })
      
      if (cvError) throw cvError
      if (!cvData) {
        logger.error('CV no encontrado o sin permisos')
        toast.error('CV no encontrado')
        navigate('/dashboard')
        return
      }
      
      logger.success('CV cargado exitosamente', {
        cvId: cvData.id,
        hasContent: !!cvData.original_content,
        contentLength: cvData.original_content?.length || 0
      })
      setCv(cvData)
      
      // Cargar job listings
      logger.info('Consultando job listings')
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .eq('cv_id', cvId)
        .order('created_at', { ascending: false })
        .limit(1)
      
      logger.info('Job listings encontrados', {
        count: listingsData?.length || 0
      })
      
      if (listingsData && listingsData.length > 0) {
        setJobListingFile(listingsData[0])
        setJobListing(listingsData[0].content || '')
        logger.success('Job listing cargado', {
          listingId: listingsData[0].id,
          contentLength: listingsData[0].content?.length || 0
        })
      }
      
      // Cargar análisis
      logger.info('Consultando análisis previos')
      const { data: analysesData } = await supabase
        .from('analyses')
        .select('*')
        .eq('cv_id', cvId)
        .order('created_at', { ascending: false })
      
      logger.info('Análisis encontrados', {
        count: analysesData?.length || 0,
        types: analysesData?.map(a => a.analysis_type) || []
      })
      
      if (analysesData) {
        setAnalyses(analysesData)
        
        // Buscar el análisis de compatibilidad más reciente
        const latestAnalysis = analysesData.find(a => a.analysis_type === 'compatibility')
        if (latestAnalysis) {
          setCurrentAnalysis(latestAnalysis.result_json)
          logger.success('Análisis de compatibilidad encontrado', {
            analysisId: latestAnalysis.id,
            score: latestAnalysis.result_json?.compatibilityScore
          })
        }
        
        // Buscar recomendaciones
        const latestRecommendations = analysesData.find(a => a.analysis_type === 'recommendations')
        if (latestRecommendations) {
          setRecommendations(latestRecommendations.result_json.recommendations)
          logger.success('Recomendaciones encontradas', {
            recommendationId: latestRecommendations.id
          })
        }
        
        // Buscar resúmenes
        const latestSummaries = analysesData.find(a => a.analysis_type === 'summary_generation')
        if (latestSummaries) {
          setSummaries(latestSummaries.result_json.summaries)
          logger.success('Resúmenes encontrados', {
            summaryId: latestSummaries.id,
            summaryCount: latestSummaries.result_json.summaries?.length || 0
          })
        }
      }
    } catch (error) {
      logger.error('Error cargando datos del CV', error)
      toast.error('Error al cargar los datos del CV')
    } finally {
      setLoading(false)
      
      // Determinar el paso actual basado en los datos
      if (analyses.length > 0 && currentAnalysis) {
        logger.info('Estableciendo paso a resultados')
        setCurrentStep('results')
        // Extraer y mostrar el contenido original para vista previa
        if (cv.original_content) {
          setExtractedText(cv.original_content)
        }
      } else if (cv && cv.original_content) {
        logger.info('Estableciendo paso a vista previa')
        setCurrentStep('preview')
        setExtractedText(cv.original_content)
      } else {
        logger.info('Estableciendo paso a configuración')
        setCurrentStep('upload')
      }
    }
  }

  async function handleJobListingUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !cvId) return

    logger.info(`Procesando job listing: ${file.name}`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    try {
      const content = await extractDocumentText(file)
      logger.info('Contenido extraído del archivo', {
        contentLength: content.length,
        preview: content.substring(0, 200) + '...'
      })
      
      logger.info('Enviando job listing a Edge Function')
      const { data, error } = await cvOperations.parseListing(undefined, content)
      
      logger.info('Respuesta de parseListing recibida', {
        hasData: !!data,
        hasError: !!error,
        error: error
      })
      
      if (error) {
        logger.error(`Error procesando job listing: ${error.message || error}`, error)
        toast.error('Error al procesar la oferta de trabajo')
        return
      }
      
      // Sanitización adicional antes de guardar en la base de datos
      let cleanContent = content || ''
      
      // Remover caracteres problemáticos para PostgreSQL
      cleanContent = cleanContent.replace(/\u0000/g, '') // Remover null bytes
      cleanContent = cleanContent.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Remover otros caracteres de control
      
      // Limitar longitud para evitar problemas de memoria/base de datos
      if (cleanContent.length > 1000000) { // 1MB de texto
        cleanContent = cleanContent.substring(0, 1000000) + '... [contenido truncado]'
        logger.warning('Contenido truncado por tamaño')
        toast.success('Archivo muy grande, contenido truncado')
      }
      
      // Guardar en base de datos
      logger.info('Guardando job listing en base de datos')
      const { data: listingData, error: dbError } = await supabase
        .from('listings')
        .insert({
          cv_id: cvId,
          content: cleanContent,
          parsed_content: data?.data?.parsedContent
        })
        .select()
        .single()
      
      if (dbError) {
        logger.error('Error guardando en base de datos', dbError)
        throw dbError
      }
      
      logger.success('Job listing guardado exitosamente', {
        listingId: listingData.id
      })
      
      setJobListingFile(listingData)
      setJobListing(cleanContent)
      toast.success('Oferta de trabajo procesada correctamente')
    } catch (error) {
      logger.error('Error general procesando job listing', error)
      toast.error('Error al procesar la oferta')
    }
  }



  async function runAnalysis() {
    if (!cvId) return
    
    logger.info(`Iniciando análisis completo para CV: ${cvId}`, {
      hasJobListing: !!jobListingFile,
      jobListingId: jobListingFile?.id
    })
    
    setAnalysisLoading(true)
    setCurrentStep('analyzing')
    setAnalysisProgress(0)
    
    try {
      // Paso 1: Análisis de compatibilidad
      logger.info('Iniciando análisis de compatibilidad')
      setCurrentAnalysisStep('Analizando compatibilidad con la oferta...')
      setAnalysisProgress(25)
      
      const { data: analysisData, error: analysisError } = await cvOperations.analyzeCV(
        cvId, 
        jobListingFile?.id
      )
      
      logger.info('Respuesta de analyzeCV recibida', {
        hasData: !!analysisData,
        hasError: !!analysisError,
        error: analysisError,
        data: analysisData
      })
      
      if (analysisError) {
        logger.error(`Error en análisis: ${analysisError.message || analysisError}`, analysisError)
        throw analysisError
      }
      
      if (analysisData?.data) {
        setCurrentAnalysis(analysisData.data)
        logger.success('Análisis de compatibilidad completado', {
          compatibilityScore: analysisData.data.compatibilityScore,
          strengths: analysisData.data.strengths?.length,
          weaknesses: analysisData.data.weaknesses?.length
        })
      } else {
        logger.warning('Análisis no retornó datos')
      }
      
      // Paso 2: Recomendaciones
      logger.info('Iniciando generación de recomendaciones')
      setCurrentAnalysisStep('Generando recomendaciones de mejora...')
      setAnalysisProgress(50)
      
      const { data: recommendationsData, error: recommendationsError } = await cvOperations.recommendCV(
        cvId,
        undefined,
        jobListingFile?.id
      )
      
      logger.info('Respuesta de recommendCV recibida', {
        hasData: !!recommendationsData,
        hasError: !!recommendationsError,
        error: recommendationsError
      })
      
      if (recommendationsError) {
        logger.error('Error en recomendaciones (continuando)', recommendationsError)
      } else if (recommendationsData?.data) {
        setRecommendations(recommendationsData.data.recommendations)
        logger.success('Recomendaciones generadas', {
          contentImprovements: recommendationsData.data.recommendations?.contentImprovements?.length,
          priorityActions: recommendationsData.data.recommendations?.priorityActions?.length
        })
      }
      
      // Paso 3: Generación de resúmenes
      logger.info('Iniciando generación de resúmenes')
      setCurrentAnalysisStep('Creando resúmenes profesionales...')
      setAnalysisProgress(75)
      
      const { data: summariesData, error: summariesError } = await cvOperations.generateSummary(
        cvId,
        jobListingFile?.id
      )
      
      logger.info('Respuesta de generateSummary recibida', {
        hasData: !!summariesData,
        hasError: !!summariesError,
        error: summariesError
      })
      
      if (summariesError) {
        logger.error('Error en resúmenes (continuando)', summariesError)
      } else if (summariesData?.data) {
        setSummaries(summariesData.data.summaries)
        logger.success('Resúmenes generados', {
          summaryCount: summariesData.data.summaries?.length
        })
      }
      
      // Finalizar
      logger.success('Análisis completo finalizado')
      setCurrentAnalysisStep('Finalizando análisis...')
      setAnalysisProgress(100)
      
      toast.success('¡Análisis completado exitosamente!')
      
      // Cambiar al paso de resultados
      setTimeout(() => {
        setCurrentStep('results')
        setAnalysisProgress(0)
        setCurrentAnalysisStep('')
      }, 1000)
      
      // Recargar datos
      await loadCVData()
    } catch (error) {
      logger.error('Error crítico en análisis', error)
      toast.error(`Error al realizar el análisis: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      setCurrentStep('upload') // Volver al paso de carga
    } finally {
      setAnalysisLoading(false)
    }
  }

  // Renderizar stepper de progreso
  const renderProgressStepper = () => {
    const steps = [
      { id: 'upload', label: 'Cargar CV', icon: Upload, completed: ['preview', 'analyzing', 'results'].includes(currentStep) },
      { id: 'preview', label: 'Vista Previa', icon: Eye, completed: ['analyzing', 'results'].includes(currentStep) },
      { id: 'analyzing', label: 'Análisis IA', icon: Brain, completed: currentStep === 'results' },
      { id: 'results', label: 'Resultados', icon: Target, completed: currentStep === 'results' }
    ]

    return (
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => {
            const isActive = currentStep === step.id
            const isCompleted = step.completed
            const Icon = step.icon
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex flex-col items-center space-y-2`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white'
                      : isActive 
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : isActive && currentStep === 'analyzing' ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 transition-all duration-300 ${
                    step.completed ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Renderizar paso de análisis
  const renderAnalyzingStep = () => (
    <div className="max-w-3xl mx-auto text-center">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analizando tu CV con IA</h2>
          <p className="text-gray-600">
            Nuestro sistema de inteligencia artificial está optimizando tu currículum
          </p>
        </div>
        
        <div className="space-y-6">
          {/* Barra de progreso */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
          
          {/* Texto del progreso */}
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-gray-700">
              {currentAnalysisStep || 'Preparando análisis...'}
            </span>
          </div>
          
          {/* Porcentaje */}
          <div className="text-3xl font-bold text-blue-600">
            {analysisProgress}%
          </div>
          
          {/* Información adicional */}
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <p className="mb-2">
              <strong>Proceso de análisis:</strong>
            </p>
            <ul className="space-y-1 text-left">
              <li className={`flex items-center space-x-2 ${
                analysisProgress >= 25 ? 'text-green-700' : 'text-blue-700'
              }`}>
                {analysisProgress >= 25 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                <span>Análisis de compatibilidad</span>
              </li>
              <li className={`flex items-center space-x-2 ${
                analysisProgress >= 50 ? 'text-green-700' : 'text-blue-700'
              }`}>
                {analysisProgress >= 50 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                <span>Generación de recomendaciones</span>
              </li>
              <li className={`flex items-center space-x-2 ${
                analysisProgress >= 75 ? 'text-green-700' : 'text-blue-700'
              }`}>
                {analysisProgress >= 75 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                <span>Creación de resúmenes optimizados</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  // Renderizar paso de vista previa del texto extraído
  const renderPreviewStep = () => (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vista Previa del Texto Extraído</h2>
              <p className="text-gray-600">
                Revisa el contenido extraído de tu CV antes de continuar con el análisis
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Estadísticas del contenido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">Caracteres</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {extractedText.length.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">Palabras</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {extractedText.split(/\s+/).filter(word => word.length > 0).length.toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-gray-900">Líneas</span>
              </div>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {extractedText.split('\n').length.toLocaleString()}
              </div>
            </div>
          </div>
          
          {/* Contenido del texto extraído */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-900">Contenido Extraído</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  extractedText.length > 500 
                    ? 'bg-green-100 text-green-700' 
                    : extractedText.length > 100 
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                }`}>
                  {extractedText.length > 500 ? 'Excelente' : extractedText.length > 100 ? 'Aceptable' : 'Muy corto'}
                </span>
              </div>
              <button
                onClick={() => setShowFullPreview(!showFullPreview)}
                className="flex items-center space-x-2 px-3 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <span>{showFullPreview ? 'Ocultar' : 'Ver todo'}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${
                  showFullPreview ? 'rotate-180' : ''
                }`} />
              </button>
            </div>
            <div className="p-6">
              <div className={`whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed ${
                !showFullPreview ? 'max-h-96 overflow-hidden' : ''
              }`}>
                {extractedText || 'No se pudo extraer contenido del archivo'}
              </div>
              {!showFullPreview && extractedText.length > 1000 && (
                <div className="mt-4 text-center">
                  <div className="bg-gradient-to-t from-white to-transparent h-8 -mt-8 relative z-10" />
                  <button
                    onClick={() => setShowFullPreview(true)}
                    className="relative z-20 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Ver contenido completo
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Verificaciones de calidad */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Verificación de Calidad</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                {extractedText.length > 100 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={`text-sm ${
                  extractedText.length > 100 ? 'text-green-700' : 'text-red-700'
                }`}>
                  Longitud adecuada
                </span>
              </div>
              <div className="flex items-center space-x-3">
                {/\b(experiencia|educación|habilidades|trabajo|email|@|teléfono)\b/i.test(extractedText) ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <span className={`text-sm ${
                  /\b(experiencia|educación|habilidades|trabajo|email|@|teléfono)\b/i.test(extractedText) 
                    ? 'text-green-700' 
                    : 'text-yellow-700'
                }`}>
                  Contiene información relevante
                </span>
              </div>
              <div className="flex items-center space-x-3">
                {!extractedText.includes('%PDF-') && !extractedText.includes('/Type/Catalog') ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={`text-sm ${
                  !extractedText.includes('%PDF-') && !extractedText.includes('/Type/Catalog')
                    ? 'text-green-700' 
                    : 'text-red-700'
                }`}>
                  Texto extraído correctamente
                </span>
              </div>
              <div className="flex items-center space-x-3">
                {extractedText.split(/\s+/).filter(word => word.length > 2).length > 50 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <span className={`text-sm ${
                  extractedText.split(/\s+/).filter(word => word.length > 2).length > 50
                    ? 'text-green-700' 
                    : 'text-yellow-700'
                }`}>
                  Suficientes palabras significativas
                </span>
              </div>
            </div>
          </div>
          
          {/* Acciones */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver y subir otro archivo</span>
            </button>
            
            <div className="flex items-center space-x-3">
              {extractedText.length < 100 && (
                <div className="flex items-center space-x-2 text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
                  <AlertCircle className="h-4 w-4" />
                  <span>El contenido es muy corto. Considera subir un archivo diferente.</span>
                </div>
              )}
              
              <button
                onClick={() => setCurrentStep('upload')}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Play className="h-5 w-5" />
                <span>Continuar al Análisis</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!cv) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">CV no encontrado</h2>
        <p className="text-gray-600">El CV que buscas no existe o no tienes permisos para verlo.</p>
      </div>
    )
  }

  const originalCV = cv.original_content || 'Contenido del CV no disponible'
  const optimizedCV = recommendations 
    ? generateOptimizedCV(originalCV, recommendations)
    : originalCV

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Dashboard</span>
        </button>
        
        {/* Header mejorado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Optimizador de CV
          </h1>
          <p className="text-xl text-gray-600">
            Mejora tu currículum con inteligencia artificial
          </p>
        </div>
        
        {/* Stepper de progreso */}
        {renderProgressStepper()}
      </div>

      {/* Contenido basado en el paso actual */}
      {currentStep === 'preview' && renderPreviewStep()}
      {currentStep === 'analyzing' && renderAnalyzingStep()}
      
      {currentStep === 'upload' && (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Sección de configuración */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Configurar Análisis</h2>
                <p className="text-gray-600">Personaliza tu análisis de CV con una oferta de trabajo específica</p>
              </div>
            </div>
            
            {/* Oferta de trabajo opcional */}
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-start space-x-3 mb-4">
                  <Target className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Oferta de Trabajo (Opcional)
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Proporciona una descripción de la oferta para obtener un análisis más preciso y recomendaciones específicas.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <textarea
                    value={jobListing}
                    onChange={(e) => setJobListing(e.target.value)}
                    placeholder="Pega aquí la descripción completa de la oferta de trabajo...\n\nEjemplo:\nTítulo: Desarrollador Frontend Senior\nEmpresa: Tech Company\nRequisitos: React, TypeScript, 3+ años de experiencia...\nResponsabilidades: Desarrollar interfaces de usuario, colaborar con el equipo..."
                    className="w-full h-40 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">O sube un archivo:</span>
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <div className="p-2 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-colors">
                          <Upload className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm text-blue-600 hover:text-blue-800 font-medium">Seleccionar archivo</span>
                        <input
                          type="file"
                          accept=".txt,.pdf,.docx,.doc"
                          onChange={handleJobListingUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    {jobListing.trim() && (
                      <div className="flex items-center space-x-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Oferta configurada</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Botón de inicio de análisis */}
              <div className="flex items-center justify-center pt-6">
                <button
                  onClick={runAnalysis}
                  disabled={analysisLoading}
                  className="flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-xl"
                >
                  {analysisLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                  <span>{analysisLoading ? 'Iniciando análisis...' : 'Comenzar Análisis IA'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {currentStep === 'results' && (
        <div className="space-y-8">
          {/* Header de resultados */}
          <div className="text-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Análisis Completado!</h2>
            <p className="text-lg text-gray-600 mb-6">
              Tu CV ha sido optimizado con inteligencia artificial
            </p>
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setCurrentStep('upload')}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Nuevo Análisis</span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
              {/* Comparación diff */}
              {recommendations && (
                <CVDiffViewer
                  originalCV={originalCV}
                  optimizedCV={optimizedCV}
                  recommendations={recommendations}
                />
              )}
            </div>

            <div className="space-y-6">
              {/* Análisis de compatibilidad */}
              {currentAnalysis?.analysis_result && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Análisis de Compatibilidad</h3>
                      <p className="text-gray-600">Evaluación detallada de tu CV</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Puntuación principal */}
                    <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
                      <div className="text-5xl font-bold text-blue-600 mb-2">
                        {currentAnalysis.analysis_result.puntuacion_compatibilidad}%
                      </div>
                      <p className="text-lg font-medium text-gray-700 mb-4">Puntuación de Compatibilidad</p>
                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${currentAnalysis.analysis_result.puntuacion_compatibilidad}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Fortalezas y áreas de mejora */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {currentAnalysis.analysis_result.fortalezas_principales?.length > 0 && (
                        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                          <h4 className="font-bold text-green-900 mb-4 flex items-center">
                            <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                            Fortalezas Identificadas
                          </h4>
                          <ul className="space-y-3">
                            {currentAnalysis.analysis_result.fortalezas_principales.map((strength, index) => (
                              <li key={index} className="flex items-start space-x-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-green-800 text-sm">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {currentAnalysis.analysis_result.areas_de_mejora?.length > 0 && (
                        <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                          <h4 className="font-bold text-orange-900 mb-4 flex items-center">
                            <Sparkles className="h-5 w-5 text-orange-600 mr-2" />
                            Oportunidades de Mejora
                          </h4>
                          <ul className="space-y-3">
                            {currentAnalysis.analysis_result.areas_de_mejora.map((area, index) => (
                              <li key={index} className="flex items-start space-x-3">
                                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                <span className="text-orange-800 text-sm">{area}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Resúmenes generados */}
              {summaries?.resumenes && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Resúmenes Profesionales</h3>
                      <p className="text-gray-600">Opciones generadas por IA para tu CV</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {summaries.resumenes.map((resumen: string, index: number) => (
                      <div key={index} className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-gray-900">Opción {index + 1}</h4>
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                            Recomendado
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{resumen}</p>
                        <div className="mt-4 flex space-x-2">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(resumen)
                              toast.success('Resumen copiado al portapapeles')
                            }}
                            className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs rounded-lg transition-colors"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Componente de debugging - ÚLTIMO ELEMENTO */}
      <DebugConsole />
    </div>
  )
}

function generateOptimizedCV(originalCV: string, recommendations: any): string {
  if (!recommendations) {
    return originalCV;
  }

  let optimizedCV = originalCV;
  const lines = originalCV.split('\n');
  const optimizedLines: string[] = [];
  
  // Agregar resumen profesional al inicio si está disponible
  if (recommendations.resumen_profesional_sugerido) {
    optimizedLines.push('RESUMEN PROFESIONAL');
    optimizedLines.push('=' + '='.repeat('RESUMEN PROFESIONAL'.length - 1));
    optimizedLines.push('');
    optimizedLines.push(recommendations.resumen_profesional_sugerido);
    optimizedLines.push('');
    optimizedLines.push('=' + '='.repeat(50));
    optimizedLines.push('');
  }
  
  // Procesar líneas del CV original manteniendo estructura
  let inExperienceSection = false;
  let inSkillsSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Detectar secciones
    if (lowerLine.includes('experiencia') || lowerLine.includes('experience')) {
      inExperienceSection = true;
      inSkillsSection = false;
    } else if (lowerLine.includes('habilidades') || lowerLine.includes('skills') || 
               lowerLine.includes('competencias')) {
      inSkillsSection = true;
      inExperienceSection = false;
    } else if (lowerLine.includes('educación') || lowerLine.includes('education') ||
               lowerLine.includes('formación')) {
      inExperienceSection = false;
      inSkillsSection = false;
    }
    
    // Aplicar mejoras específicas según la sección
    if (inExperienceSection && recommendations.experiencia_laboral_mejorada) {
      // Buscar coincidencias en experiencia laboral mejorada
      for (const exp of recommendations.experiencia_laboral_mejorada) {
        if (line.toLowerCase().includes(exp.empresa?.toLowerCase() || '') || 
            line.toLowerCase().includes(exp.puesto?.toLowerCase() || '')) {
          if (exp.descripcion_mejorada) {
            // Mantener la línea original pero agregar descripción mejorada
            optimizedLines.push(line);
            optimizedLines.push('   • ' + exp.descripcion_mejorada);
            continue;
          }
        }
      }
    }
    
    // Mejorar sección de habilidades
    if (inSkillsSection && recommendations.habilidades_a_destacar) {
      if (line.trim() && !line.startsWith('•') && !line.includes(':')) {
        // Agregar habilidades destacadas
        optimizedLines.push(line);
        recommendations.habilidades_a_destacar.forEach((skill: string) => {
          if (!originalCV.toLowerCase().includes(skill.toLowerCase())) {
            optimizedLines.push('• ' + skill);
          }
        });
        continue;
      }
    }
    
    // Aplicar mejoras de palabras clave
    if (recommendations.palabras_clave_a_incluir && line.trim()) {
      let enhancedLine = line;
      
      // Insertar palabras clave relevantes naturalmente
      recommendations.palabras_clave_a_incluir.forEach((keyword: string) => {
        if (!line.toLowerCase().includes(keyword.toLowerCase())) {
          // Agregar palabra clave si la línea parece relevante
          if (lowerLine.includes('responsabilidades') || lowerLine.includes('funciones') ||
              lowerLine.includes('logros') || lowerLine.includes('achievements')) {
            enhancedLine = line + ' (' + keyword + ')';
          }
        }
      });
      
      line = enhancedLine;
    }
    
    optimizedLines.push(line);
  }
  
  // Agregar sección de mejoras sugeridas al final
  if (recommendations.recomendaciones_específicas && recommendations.recomendaciones_específicas.length > 0) {
    optimizedLines.push('');
    optimizedLines.push('=' + '='.repeat(50));
    optimizedLines.push('MEJORAS APLICADAS POR IA');
    optimizedLines.push('=' + '='.repeat(50));
    optimizedLines.push('');
    
    recommendations.recomendaciones_específicas.forEach((rec: string, index: number) => {
      optimizedLines.push(`${index + 1}. ${rec}`);
    });
    
    if (recommendations.habilidades_a_destacar && recommendations.habilidades_a_destacar.length > 0) {
      optimizedLines.push('');
      optimizedLines.push('HABILIDADES DESTACADAS:');
      recommendations.habilidades_a_destacar.forEach((skill: string) => {
        optimizedLines.push('• ' + skill);
      });
    }
    
    if (recommendations.palabras_clave_a_incluir && recommendations.palabras_clave_a_incluir.length > 0) {
      optimizedLines.push('');
      optimizedLines.push('PALABRAS CLAVE OPTIMIZADAS:');
      optimizedLines.push(recommendations.palabras_clave_a_incluir.join(', '));
    }
  }
  
  // Unir las líneas manteniendo el formato
  optimizedCV = optimizedLines.join('\n');
  
  // Limpiar espacios excesivos pero mantener estructura
  optimizedCV = optimizedCV
    .replace(/\n{4,}/g, '\n\n\n')  // Máximo 3 líneas vacías
    .replace(/[ \t]+$/gm, '')     // Remover espacios al final de líneas
    .trim();                      // Remover espacios al inicio y final
  
  return optimizedCV;
}