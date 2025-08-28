import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cvDatabase, handleSupabaseError } from '../utils/supabaseHelpers'
import { useAuth } from '../contexts/AuthContext'
import { FileUpload } from '../components/FileUpload'
import { formatDate } from '../utils/dateFormatter'
import { processContentSafely, handleProcessingError } from '../utils/processingHelpers'
import { ERROR_MESSAGES } from '../utils/constants'
import { 
  FileText, Plus, Calendar, Trash2, Edit, Eye, Upload, 
  BarChart3, Zap, CheckCircle2, Clock, Users, TrendingUp,
  Star, Sparkles, ArrowRight, RefreshCw
} from 'lucide-react'
import { CVData } from '../types'
import toast from 'react-hot-toast'

export function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [cvs, setCvs] = useState<CVData[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [stats, setStats] = useState({
    totalCVs: 0,
    optimizedCVs: 0,
    lastUpload: null as string | null,
    analysisCount: 0
  })

  useEffect(() => {
    // Sólo cargar CVs cuando:
    // 1. El usuario esté autenticado
    // 2. La autenticación no esté cargando
    // 3. Tengamos un ID de usuario válido
    if (user?.id && !authLoading) {
      loadCVs()
    } else if (!authLoading && !user) {
      // Si no hay usuario y la auth no está cargando, limpiar estado
      setCvs([])
      setStats({
        totalCVs: 0,
        optimizedCVs: 0,
        lastUpload: null,
        analysisCount: 0
      })
      setLoading(false)
    }
  }, [user?.id, authLoading]) // Dependencias optimizadas

  async function loadCVs() {
    if (!user?.id) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    
    try {
      console.log('Loading CVs for user:', user.id)
      const cvList = await cvDatabase.getByUserId(user.id)
      
      console.log('CVs loaded successfully:', cvList.length)
      setCvs(cvList)
      updateStats(cvList)
    } catch (error: any) {
      console.error('Catch error loading CVs:', error)
      const errorMessage = handleSupabaseError(error)
      toast.error(errorMessage)
      setCvs([])
      updateStats([])
    } finally {
      setLoading(false)
    }
  }

  // Función separada para actualizar estadísticas
  const updateStats = useCallback((cvList: CVData[]) => {
    const totalCVs = cvList.length
    const optimizedCVs = cvList.filter(cv => cv.parsed_content)?.length || 0
    const lastUpload = totalCVs > 0 ? cvList[0].created_at : null
    
    setStats({
      totalCVs,
      optimizedCVs,
      lastUpload,
      analysisCount: optimizedCVs
    })
  }, [])

  // Función callback para manejar el éxito de la subida
  const handleUploadSuccess = (cvId?: string) => {
    setShowUpload(false) // Cerrar el modal de subida
    if (cvId) {
      // Navegar directamente a la vista previa del CV recién subido
      navigate(`/cv/${cvId}`)
    } else {
      loadCVs() // Recargar la lista de CVs
    }
  }

  async function handleFileProcessed(tempCvId: string, content: string) {
    if (!user?.id) {
      console.error('User not authenticated')
      toast.error(ERROR_MESSAGES.AUTH_ERROR)
      return
    }
    
    try {
      // Usar función centralizada de procesamiento
      const cleanContent = processContentSafely(content)
      
      // Validar que no esté vacío después de la limpieza
      if (!cleanContent.trim()) {
        toast.error('El contenido del archivo está vacío o no es válido')
        return
      }
      
      const cvData = await cvDatabase.create({
        user_id: user.id,
        original_content: cleanContent,
        parsed_content: null
      })
      
      // Mostrar mensaje de éxito
      toast.success('¡CV guardado exitosamente! Redirigiendo a vista previa...')
      
      // Ejecutar callback de éxito para actualizar la interfaz y navegar
      handleUploadSuccess(cvData.id)
      
    } catch (error: any) {
      console.error('Error saving CV:', error)
      const errorMessage = handleSupabaseError(error)
      toast.error(errorMessage)
    }
  }

  async function deleteCV(cvId: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este CV?')) return
    
    try {
      if (!user?.id) {
        toast.error(ERROR_MESSAGES.AUTH_ERROR)
        return
      }
      
      await cvDatabase.delete(cvId, user.id)
      
      const newCvList = cvs.filter(cv => cv.id !== cvId)
      setCvs(newCvList)
      updateStats(newCvList)
      toast.success('CV eliminado exitosamente')
    } catch (error) {
      console.error('Error deleting CV:', error)
      const errorMessage = handleSupabaseError(error)
      toast.error(errorMessage)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Iniciando sesión...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando tus currículums...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header principal */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-lg">
            <Zap className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            CV <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Optimizer</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Transforma tu currículum con el poder de la inteligencia artificial. 
            Obtén análisis personalizados, recomendaciones expertas y optimizaciones profesionales.
          </p>
        </div>

        {/* Sección de acción rápida */}
        <div className="flex items-center justify-center mb-12">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="group flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
              <Plus className="h-6 w-6" />
            </div>
            <span>{showUpload ? 'Ocultar subida' : 'Subir nuevo CV'}</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Upload Section */}
        {showUpload && (
          <div className="mb-12">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-green-500 rounded-2xl mb-4">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Subir Currículum</h2>
                <p className="text-gray-600">Arrastra tu archivo o selecciona desde tu dispositivo</p>
              </div>
              <FileUpload
                onFileProcessed={handleFileProcessed}
                loading={uploadLoading}
                setLoading={setUploadLoading}
              />
              {/* Botón para cancelar la subida */}
              <div className="text-center mt-6">
                <button
                  onClick={() => setShowUpload(false)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-all duration-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats mejoradas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.totalCVs}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">CVs Totales</h3>
            <p className="text-sm text-gray-500">Currículums subidos</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.optimizedCVs}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">CVs Optimizados</h3>
            <p className="text-sm text-gray-500">Con mejoras de IA</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.analysisCount}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Análisis</h3>
            <p className="text-sm text-gray-500">Realizados con éxito</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-sm font-bold text-gray-900">
                {stats.lastUpload ? formatDate(stats.lastUpload).split(',')[0] : 'N/A'}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Último CV</h3>
            <p className="text-sm text-gray-500">Fecha de subida</p>
          </div>
        </div>

        {/* CVs List */}
        {stats.totalCVs === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="h-12 w-12 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Comienza tu Optimización</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Sube tu primer currículum y descubre cómo la inteligencia artificial 
                puede mejorar tus oportunidades profesionales.
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Análisis instantáneo</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Recomendaciones IA</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Descarga optimizada</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpload(true)}
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <Plus className="h-5 w-5" />
                  <span>Subir Mi Primer CV</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Mis Currículums</h2>
                  <p className="text-gray-600">Gestiona y optimiza tus documentos profesionales</p>
                </div>
                <button
                  onClick={loadCVs}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {cvs.map((cv) => {
                const isOptimized = cv.parsed_content
                const cvNumber = cv.id.slice(-8)
                
                return (
                  <div key={cv.id} className="p-8 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                          isOptimized 
                            ? 'bg-gradient-to-br from-green-400 to-green-500' 
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        }`}>
                          <FileText className="h-8 w-8 text-white" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {cv.linkedin_url ? 'Perfil LinkedIn' : 'Currículum'} #{cvNumber}
                          </h3>
                          <p className="text-gray-500">Subido el {formatDate(cv.created_at)}</p>
                          <div className="flex items-center space-x-3">
                            {isOptimized ? (
                              <div className="flex items-center space-x-1">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium text-green-700">Optimizado</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4 text-orange-500" />
                                <span className="text-sm font-medium text-orange-700">Pendiente optimización</span>
                              </div>
                            )}
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="text-sm text-gray-500">
                              {(cv.original_content?.length || 0) > 1000 ? 
                                `${Math.round((cv.original_content?.length || 0) / 1000)}K caracteres` : 
                                `${cv.original_content?.length || 0} caracteres`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/cv/${cv.id}`}
                          className="group flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 transform hover:scale-105 font-semibold"
                        >
                          {isOptimized ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          <span>{isOptimized ? 'Ver Resultados' : 'Optimizar'}</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        
                        <button
                          onClick={() => deleteCV(cv.id)}
                          className="flex items-center space-x-1 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors border border-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="font-medium">Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}