import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Image, X, Camera, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import { cvOperations } from '../lib/supabase'
import { extractDocumentText, initializeDocumentExtractorLogger } from '../lib/documentExtractor'
import { useLogger } from '../contexts/DebugContext'
import { PROCESSING_TIMEOUTS, ACCEPTED_FILE_EXTENSIONS } from '../utils/constants'
import { generateTempId } from '../utils/idGenerator'
import { validateFileSize, sanitizeContent, truncateContent } from '../utils/fileValidation'
import toast from 'react-hot-toast'

interface FileUploadProps {
  onFileProcessed: (cvId: string, content: string) => void
  loading: boolean
  setLoading: (loading: boolean) => void
}

export function FileUpload({ onFileProcessed, loading, setLoading }: FileUploadProps) {
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [showScreenshotCapture, setShowScreenshotCapture] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Inicializar logger para debugging
  const logger = useLogger('FileUpload');
  
  // Inicializar logger del document extractor
  useEffect(() => {
    initializeDocumentExtractorLogger(logger);
    logger.info('FileUpload componente inicializado con debugging habilitado');
  }, [logger]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Validar tamaño del archivo
    const sizeValidation = validateFileSize(file)
    if (!sizeValidation.isValid) {
      toast.error(sizeValidation.error!)
      return
    }
    
    logger.info('🚀 INICIANDO procesamiento robusto de archivo', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    })

    setLoading(true)
    setProcessingStep('Iniciando procesamiento...')
    setUploadProgress(10)
    
    // CRÍTICO: Timeout para evitar loading infinito
    const processingTimeout = setTimeout(() => {
      logger.error('⏱️ TIMEOUT en procesamiento de archivo')
      setLoading(false)
      setProcessingStep('')
      setUploadProgress(0)
      toast.error('Timeout al procesar archivo. Intente de nuevo.')
    }, PROCESSING_TIMEOUTS.FILE_PROCESSING)
    
    try {
      const cvId = generateTempId()
      logger.info(`✨ ID temporal generado: ${cvId}`)
      
      if (file.type.startsWith('image/')) {
        await processImageFile(file, cvId, logger, setProcessingStep, setUploadProgress, onFileProcessed)
      } else {
        await processDocumentFile(file, cvId, logger, setProcessingStep, setUploadProgress, onFileProcessed)
      }
    } catch (criticalError) {
      logger.error('🚨 ERROR CRÍTICO en procesamiento', criticalError)
      
      // ÚLTIMO RECURSO
      const lastResortContent = `ERROR CRÍTICO procesando: ${file.name}\n\nSistema: ${criticalError instanceof Error ? criticalError.message : 'Error desconocido'}\n\n[ÚLTIMO RECURSO: Por favor, intente nuevamente o contacte soporte técnico]`
      
      const emergencyId = generateTempId()
      onFileProcessed(emergencyId, lastResortContent)
      toast.error('Error crítico. Se creó registro de emergencia.')
    } finally {
      clearTimeout(processingTimeout)
      setTimeout(() => {
        setLoading(false)
        setProcessingStep('')
        setUploadProgress(0)
        logger.info('🏁 Procesamiento finalizado y limpieza completada')
      }, 1500)
    }
  }, [onFileProcessed, setLoading, logger])

  // Función auxiliar para procesar imágenes
  async function processImageFile(
    file: File, 
    cvId: string, 
    logger: any, 
    setProcessingStep: (step: string) => void,
    setUploadProgress: (progress: number) => void,
    onFileProcessed: (cvId: string, content: string) => void
  ) {
    logger.info('🖼️ Procesando como imagen de LinkedIn')
    setProcessingStep('Analizando imagen de LinkedIn...')
    setUploadProgress(30)
    
    const reader = new FileReader()
    reader.onloadend = async () => {
      const imageData = reader.result as string
      try {
        logger.info('🧠 Enviando imagen a IA para análisis')
        setProcessingStep('Procesando contenido con IA...')
        setUploadProgress(60)
        
        const { data, error } = await cvOperations.parseLinkedInScreenshot(
          imageData,
          cvId,
          file.name
        )
        
        logger.info('📨 Respuesta de IA recibida', {
          hasData: !!data,
          hasError: !!error,
          error: error
        })
        
        if (error) {
          logger.error(`❌ Error en análisis de imagen: ${error.message || error}`, error)
          
          // FALLBACK: Usar metadata como contenido mínimo
          const fallbackContent = `Imagen de LinkedIn: ${file.name}\nTamaño: ${(file.size/1024).toFixed(2)} KB\n\n[NOTA: El análisis automático falló. Por favor, copie manualmente la información de su perfil o intente con un archivo de texto.]`
          onFileProcessed(cvId, fallbackContent)
          toast.error('Error al analizar imagen. Usando información básica.')
          return
        }
        
        if (data?.data) {
          setProcessingStep('Finalizando...')
          setUploadProgress(90)
          
          const parsedContent = JSON.stringify(data.data.parsedContent, null, 2)
          logger.success('✅ Contenido extraído exitosamente', {
            contentLength: parsedContent.length,
            hasName: !!data.data.parsedContent?.personalInfo?.name
          })
          
          onFileProcessed(cvId, parsedContent)
          toast.success('Imagen de LinkedIn analizada correctamente')
          setUploadProgress(100)
        } else {
          logger.warning('⚠️ IA no retornó datos útiles')
          const fallbackContent = `Imagen procesada: ${file.name}\n\n[NOTA: No se pudo extraer información automáticamente. Revise la imagen manualmente.]`
          onFileProcessed(cvId, fallbackContent)
          toast('Imagen procesada con información limitada', { icon: '⚠️' })
        }
      } catch (err) {
        logger.error('💥 Error crítico procesando imagen', err)
        const emergencyContent = `Error procesando imagen: ${file.name}\nError: ${err instanceof Error ? err.message : 'Desconocido'}\n\n[NOTA: Procesamiento fallido. Intente con un archivo de texto.]`
        onFileProcessed(cvId, emergencyContent)
        toast.error('Error procesando imagen. Usando información de emergencia.')
      }
    }
    reader.readAsDataURL(file)
  }

  // Función auxiliar para procesar documentos
  async function processDocumentFile(
    file: File, 
    cvId: string, 
    logger: any, 
    setProcessingStep: (step: string) => void,
    setUploadProgress: (progress: number) => void,
    onFileProcessed: (cvId: string, content: string) => void
  ) {
    logger.info(`📄 Iniciando extracción robusta: ${file.type}`)
    setProcessingStep('Extrayendo contenido con múltiples métodos...')
    setUploadProgress(20)
    
    try {
      let extractedText = await extractDocumentText(file)
      
      // Sanitizar y truncar contenido
      extractedText = sanitizeContent(extractedText)
      extractedText = truncateContent(extractedText)
      
      logger.success('🎉 Extracción exitosa', {
        textLength: extractedText.length,
        preview: extractedText.substring(0, 150) + '...',
        fileName: file.name,
        hasRealContent: extractedText.length > 100
      })
      
      // Validación de calidad del contenido
      if (extractedText.length < 20) {
        logger.warning('⚠️ Contenido muy corto, podría ser problemático')
        toast('El contenido extraído es muy corto. Verifique el archivo.', { icon: '⚠️' })
      }
      
      setProcessingStep('Enviando a análisis de IA...')
      setUploadProgress(60)
      
      // Intentar análisis con IA (sin fallar si no funciona)
      try {
        logger.info('🤖 Enviando a IA para análisis avanzado')
        const { data, error } = await cvOperations.parseCV(cvId, undefined, extractedText)
        
        if (error) {
          logger.warning('⚠️ IA falló, usando contenido extraído directamente', error)
        } else {
          logger.success('✨ IA procesó el contenido exitosamente')
        }
      } catch (aiError) {
        logger.warning('⚠️ Error en IA (continuando con extracción)', aiError)
      }
      
      setProcessingStep('Finalizando procesamiento...')
      setUploadProgress(90)
      
      // SIEMPRE usar el contenido extraído (independiente del éxito de la IA)
      logger.success('💯 Procesamiento completado exitosamente')
      onFileProcessed(cvId, extractedText)
      toast.success('Archivo procesado correctamente')
      
      setUploadProgress(100)
      
    } catch (extractError) {
      logger.error('💥 Error en extracción, usando fallback de emergencia', extractError)
      
      // 🆘 FALLBACK FINAL DE EMERGENCIA
      const emergencyContent = createEmergencyFallbackContent(file, extractError)
      
      logger.info('🆘 Aplicando fallback de emergencia')
      onFileProcessed(cvId, emergencyContent)
      toast.error('Error extrayendo contenido. Se usó información básica del archivo.')
    }
  }

  // Función auxiliar para crear contenido de emergencia
  function createEmergencyFallbackContent(file: File, error: any): string {
    return `ARCHIVO PROCESADO CON FALLBACK DE EMERGENCIA

Archivo procesado: ${file.name}
Tipo: ${file.type || 'Desconocido'}
Tamaño: ${(file.size / 1024).toFixed(2)} KB
Fecha: ${new Date().toLocaleString()}

Error en extracción: ${error instanceof Error ? error.message : 'Error desconocido'}

[FALLBACK DE EMERGENCIA: El sistema no pudo extraer el contenido automáticamente. Por favor, copie manualmente el contenido de su CV o intente con un formato diferente (PDF recomendado).]

Para mejores resultados, intente:
1. Exportar el CV como PDF desde Word/Google Docs
2. Asegurar que el PDF contiene texto seleccionable
3. Usar archivos de texto plano (.txt) como alternativa`
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_EXTENSIONS,
    maxFiles: 1,
    disabled: loading
  })

  async function handleLinkedInUrl() {
    if (!linkedinUrl.trim()) {
      toast.error('Por favor ingresa una URL válida de LinkedIn')
      return
    }

    logger.info(`Procesando URL de LinkedIn: ${linkedinUrl}`)
    setLoading(true)
    setProcessingStep('Conectando con LinkedIn...')
    setUploadProgress(20)
    
    // Timeout para LinkedIn también
    const linkedinTimeout = setTimeout(() => {
      setLoading(false)
      setProcessingStep('')
      setUploadProgress(0)
      toast.error('Timeout procesando LinkedIn. Intente con captura de pantalla.')
      setShowScreenshotCapture(true)
    }, PROCESSING_TIMEOUTS.LINKEDIN_PROCESSING)
    
    try {
      const cvId = generateTempId()
      logger.info(`ID generado para LinkedIn: ${cvId}`)
      
      setProcessingStep('Extrayendo información del perfil...')
      setUploadProgress(50)
      
      logger.info('Enviando URL de LinkedIn a Edge Function')
      const { data, error } = await cvOperations.parseCV(cvId, linkedinUrl)
      
      logger.info('Respuesta de LinkedIn recibida', {
        hasData: !!data,
        hasError: !!error,
        error: error
      })
      
      if (error) {
        logger.error(`Error procesando LinkedIn: ${error.message || error}`, error)
        toast.error('Error al procesar el perfil de LinkedIn. Intenta con una captura de pantalla.')
        setShowScreenshotCapture(true)
        return
      }
      
      if (data?.data) {
        setProcessingStep('Finalizando...')
        setUploadProgress(90)
        
        const content = data.data.originalText || linkedinUrl
        logger.success('LinkedIn procesado exitosamente', {
          contentLength: content.length
        })
        
        onFileProcessed(cvId, content)
        toast.success('Perfil de LinkedIn procesado correctamente')
        setLinkedinUrl('')
        
        setUploadProgress(100)
      } else {
        logger.warning('No se recibieron datos de LinkedIn')
        toast.error('No se pudo extraer información del perfil')
        setShowScreenshotCapture(true)
      }
    } catch (error) {
      logger.error('Error general procesando LinkedIn', error)
      toast.error('Error al procesar el perfil de LinkedIn')
      setShowScreenshotCapture(true)
    } finally {
      clearTimeout(linkedinTimeout)
      setTimeout(() => {
        setLoading(false)
        setProcessingStep('')
        setUploadProgress(0)
      }, 1000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Sección de subida de archivo */}
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
            isDragActive
              ? 'border-blue-400 bg-blue-50 scale-105'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-6">
            {loading ? (
              <div className="space-y-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                </div>
                <div className="space-y-2">
                  <div className="text-lg font-semibold text-gray-900">
                    {processingStep || 'Procesando archivo...'}
                  </div>
                  <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    {uploadProgress}% completado
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Upload className="h-10 w-10 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-gray-900">
                    {isDragActive
                      ? 'Suelta el archivo aquí'
                      : 'Arrastra tu CV o haz clic para seleccionar'}
                  </p>
                  <p className="text-gray-500">
                    Formatos soportados: PDF, DOCX, DOC, TXT, o imágenes de LinkedIn
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Seguro</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Rápido</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Privado</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección de LinkedIn */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Importar desde LinkedIn</h3>
            <p className="text-sm text-gray-600">Extrae información directamente de tu perfil</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {loading && processingStep.includes('LinkedIn') ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center space-x-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">{processingStep}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-3">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex space-x-3">
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/tu-perfil"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={loading}
              />
              <button
                onClick={handleLinkedInUrl}
                disabled={loading || !linkedinUrl.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold transition-all duration-200 transform hover:scale-105"
              >
                <FileText className="h-4 w-4" />
                <span>Procesar</span>
              </button>
            </div>
          )}
          
          <div className="bg-blue-100 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Camera className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Consejo:</p>
                <p>Si el enlace no funciona, puedes tomar una captura de pantalla de tu perfil y subirla como imagen arriba.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showScreenshotCapture && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Image className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-yellow-800 mb-2">Captura de pantalla alternativa</h4>
              <p className="text-yellow-700 mb-4">
                Como alternativa, puedes tomar una captura de pantalla de tu perfil de LinkedIn y subirla como imagen usando el área de subida de arriba.
              </p>
              <div className="space-y-3">
                <div className="bg-yellow-100 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Instrucciones:</strong>
                  </p>
                  <ol className="text-sm text-yellow-700 mt-1 space-y-1 list-decimal list-inside">
                    <li>Ve a tu perfil de LinkedIn</li>
                    <li>Toma una captura de pantalla completa</li>
                    <li>Arrastra la imagen al área de subida de arriba</li>
                  </ol>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowScreenshotCapture(false)}
                    className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg transition-colors font-medium"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowScreenshotCapture(false)}
              className="text-yellow-400 hover:text-yellow-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}