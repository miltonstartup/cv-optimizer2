import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Settings, Save, Edit, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { AIPrompt } from '../types'
import toast from 'react-hot-toast'

export function AdminPage() {
  const { user, isAdmin } = useAuth()
  const [prompts, setPrompts] = useState<AIPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [editedText, setEditedText] = useState('')
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set())

  const promptTypes = [
    { key: 'parse_cv', label: 'Parseo de CV', description: 'Extracción estructurada de información del CV' },
    { key: 'parse_listing', label: 'Parseo de Ofertas', description: 'Extracción de requisitos de ofertas de trabajo' },
    { key: 'parse_linkedin_screenshot', label: 'Análisis de LinkedIn', description: 'Análisis de capturas de pantalla de LinkedIn' },
    { key: 'analyze_cv', label: 'Análisis de Compatibilidad', description: 'Comparación CV vs oferta de trabajo' },
    { key: 'recommend_cv', label: 'Recomendaciones', description: 'Sugerencias de mejora para el CV' },
    { key: 'generate_summary', label: 'Generación de Resúmenes', description: 'Creación de resúmenes profesionales' }
  ]

  useEffect(() => {
    if (!isAdmin) return
    loadPrompts()
  }, [isAdmin])

  async function loadPrompts() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('prompt_type')
      
      if (error) throw error
      setPrompts(data || [])
    } catch (error) {
      console.error('Error loading prompts:', error)
      toast.error('Error al cargar los prompts')
    } finally {
      setLoading(false)
    }
  }

  async function savePrompt(promptId: string) {
    if (!editedText.trim()) {
      toast.error('El texto del prompt no puede estar vacío')
      return
    }

    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ 
          prompt_text: editedText,
          updated_at: new Date().toISOString()
        })
        .eq('id', promptId)
      
      if (error) throw error
      
      // Actualizar el estado local
      setPrompts(prev => prev.map(p => 
        p.id === promptId 
          ? { ...p, prompt_text: editedText, updated_at: new Date().toISOString() }
          : p
      ))
      
      setEditingPrompt(null)
      setEditedText('')
      toast.success('Prompt actualizado exitosamente')
    } catch (error) {
      console.error('Error saving prompt:', error)
      toast.error('Error al guardar el prompt')
    }
  }

  async function togglePromptActive(promptId: string, currentActive: boolean) {
    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ is_active: !currentActive })
        .eq('id', promptId)
      
      if (error) throw error
      
      setPrompts(prev => prev.map(p => 
        p.id === promptId ? { ...p, is_active: !currentActive } : p
      ))
      
      toast.success(`Prompt ${!currentActive ? 'activado' : 'desactivado'} exitosamente`)
    } catch (error) {
      console.error('Error toggling prompt:', error)
      toast.error('Error al cambiar el estado del prompt')
    }
  }

  function startEditing(prompt: AIPrompt) {
    setEditingPrompt(prompt.id)
    setEditedText(prompt.prompt_text)
  }

  function cancelEditing() {
    setEditingPrompt(null)
    setEditedText('')
  }

  function toggleExpanded(promptId: string) {
    setExpandedPrompts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(promptId)) {
        newSet.delete(promptId)
      } else {
        newSet.add(promptId)
      }
      return newSet
    })
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Acceso Denegado</h2>
        <p className="text-gray-600">No tienes permisos para acceder al panel de administración.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="text-gray-600 mt-2">Gestiona los prompts de IA para optimizar el rendimiento del sistema</p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Importante</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Los cambios en los prompts afectarán inmediatamente a todos los análisis futuros. 
              Asegúrate de probar los prompts antes de activarlos en producción.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {promptTypes.map(type => {
          const prompt = prompts.find(p => p.prompt_type === type.key)
          const isExpanded = expandedPrompts.has(prompt?.id || '')
          const isEditing = editingPrompt === prompt?.id
          
          return (
            <div key={type.key} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{type.label}</h3>
                    <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {prompt && (
                      <>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          prompt.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {prompt.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        
                        <button
                          onClick={() => togglePromptActive(prompt.id, prompt.is_active)}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            prompt.is_active
                              ? 'bg-red-100 hover:bg-red-200 text-red-700'
                              : 'bg-green-100 hover:bg-green-200 text-green-700'
                          }`}
                        >
                          {prompt.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                        
                        <button
                          onClick={() => toggleExpanded(prompt.id)}
                          className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors"
                        >
                          {isExpanded ? (
                            <><EyeOff className="h-4 w-4" /><span>Ocultar</span></>
                          ) : (
                            <><Eye className="h-4 w-4" /><span>Ver</span></>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {prompt && isExpanded && (
                <div className="p-6">
                  {isEditing ? (
                    <div className="space-y-4">
                      <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        placeholder="Ingresa el texto del prompt..."
                      />
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => savePrompt(prompt.id)}
                          className="flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                        >
                          <Save className="h-4 w-4" />
                          <span>Guardar</span>
                        </button>
                        
                        <button
                          onClick={cancelEditing}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-md p-4">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                          {prompt.prompt_text}
                        </pre>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          Última actualización: {formatDate(prompt.updated_at)}
                        </div>
                        
                        <button
                          onClick={() => startEditing(prompt)}
                          className="flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-sm transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {!prompt && (
                <div className="p-6">
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Prompt no encontrado para este tipo</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}