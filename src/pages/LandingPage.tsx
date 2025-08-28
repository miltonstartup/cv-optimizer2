import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLogger } from '../contexts/DebugContext'
import {
  FileText, Brain, Target, Download, CheckCircle, Star,
  ArrowRight, Zap, Shield, Eye, TrendingUp, Users,
  BarChart3, Clock, Award, ChevronRight, Play,
  Upload, Sparkles, ArrowUpRight
} from 'lucide-react'

export function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const logger = useLogger('LandingPage') // Keep logger for debugging
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    logger.info('LandingPage montada', { hasUser: !!user })
    setIsVisible(true)
    // Redirect authenticated users to dashboard only if user is loaded
    if (user) {
      logger.info('Usuario autenticado, redirigiendo a dashboard')
      navigate('/dashboard')
    }
  }, [user, navigate])

  const features = [
    {
      icon: Brain,
      title: 'Análisis Inteligente con IA',
      description: 'Nuestro sistema de inteligencia artificial analiza tu CV y identifica áreas de mejora específicas para maximizar tus oportunidades.'
    },
    {
      icon: Target,
      title: 'Comparación Automática',
      description: 'Compara automáticamente tu CV con descripciones de trabajo para identificar coincidencias y brechas de habilidades.'
    },
    {
      icon: Sparkles,
      title: 'Recomendaciones Personalizadas',
      description: 'Recibe sugerencias específicas y accionables para optimizar cada sección de tu currículum.'
    },
    {
      icon: Download,
      title: 'Reportes PDF Profesionales',
      description: 'Genera reportes detallados y profesionales que puedes descargar y compartir con reclutadores.'
    },
    {
      icon: Eye,
      title: 'Consola de Debugging',
      description: 'Transparencia total: visualiza cada paso del análisis con nuestra consola de debugging avanzada.'
    },
    {
      icon: Shield,
      title: 'Seguro y Privado',
      description: 'Tus datos están protegidos con encriptación de nivel empresarial. Tu información nunca se comparte.'
    }
  ]

  const steps = [
    {
      number: '01',
      title: 'Sube tu CV',
      description: 'Arrastra tu CV en PDF, DOCX o imagen de LinkedIn. Nuestro sistema extrae automáticamente toda la información.',
      icon: Upload
    },
    {
      number: '02', 
      title: 'Añade la Descripción del Trabajo',
      description: 'Pega la descripción de la posición que te interesa para obtener un análisis personalizado.',
      icon: FileText
    },
    {
      number: '03',
      title: 'Obtén Análisis Detallado',
      description: 'Recibe una puntuación de compatibilidad, fortalezas, debilidades y recomendaciones específicas.',
      icon: BarChart3
    },
    {
      number: '04',
      title: 'Descarga Reporte Optimizado',
      description: 'Obtén tu CV mejorado y un reporte completo listo para enviar a empleadores.',
      icon: Download
    }
  ]

  const testimonials = [
    {
      name: 'María González',
      role: 'Desarrolladora Frontend',
      company: 'TechCorp',
      rating: 5,
      comment: 'Increíble herramienta. Después de optimizar mi CV con las recomendaciones de la IA, conseguí 3 entrevistas en 2 semanas.'
    },
    {
      name: 'Carlos Mendoza',
      role: 'Project Manager',
      company: 'StartupXYZ',
      rating: 5,
      comment: 'La comparación automática con ofertas de trabajo me ayudó a identificar exactamente qué habilidades necesitaba destacar.'
    },
    {
      name: 'Ana Rodríguez',
      role: 'Diseñadora UX',
      company: 'Design Studio',
      rating: 5,
      comment: 'Los reportes PDF son muy profesionales. Los reclutadores quedaron impresionados con el nivel de detalle.'
    }
  ]

  const stats = [
    { value: '85%', label: 'Más entrevistas conseguidas' },
    { value: '92%', label: 'Usuarios satisfechos' },
    { value: '10K+', label: 'CVs optimizados' },
    { value: '4.9★', label: 'Calificación promedio' }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] -z-10" />
        
        <div className="relative max-w-7xl mx-auto px-4 pt-20 pb-32">

          {/* Hero Content */}
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Optimización de CV impulsada por IA</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Consigue Más Entrevistas con
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> IA Avanzada</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Optimiza tu currículum con inteligencia artificial. Analiza tu CV contra ofertas específicas,
              recibe recomendaciones personalizadas y aumenta tus posibilidades de conseguir el trabajo de tus sueños.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                to="/register"
                className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <span>Optimiza tu CV Gratis</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <button className="group flex items-center space-x-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">
                <div className="w-12 h-12 bg-white shadow-md rounded-full flex items-center justify-center group-hover:shadow-lg transition-shadow">
                  <Play className="h-5 w-5 text-blue-600 ml-1" />
                </div>
                <span>Ver demo (2 min)</span>
              </button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{stat.value}</div>
                  <div className="text-gray-600 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-1/4 -right-64 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-64 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-blue-600/20 rounded-full blur-3xl" />
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Características Que Te Darán Ventaja Competitiva
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tecnología avanzada diseñada para maximizar el impacto de tu currículum
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="group bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-lg transition-all duration-300 hover:border-blue-200">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Cómo Funciona en 4 Pasos Simples
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Un proceso optimizado que te lleva de un CV promedio a uno que destaca
            </p>
          </div>
          
          <div className="grid lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="relative">
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center hover:shadow-lg transition-all group">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    
                    <div className="text-sm font-bold text-blue-600 mb-2">PASO {step.number}</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-blue-300 to-indigo-400 transform -translate-y-1/2" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Lo Que Dicen Nuestros Usuarios
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Miles de profesionales han transformado sus carreras con CV Optimizer
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <p className="text-gray-700 mb-6 leading-relaxed italic">
                  "{testimonial.comment}"
                </p>
                
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tecnología Avanzada en la que Puedes Confiar
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">IA Avanzada</h3>
              <p className="text-gray-600 leading-relaxed">
                Utilizamos GPT-4 y modelos de lenguaje de última generación para análisis precisos y recomendaciones inteligentes.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Eye className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Transparencia Total</h3>
              <p className="text-gray-600 leading-relaxed">
                Nuestra consola de debugging te permite ver exactamente cómo funciona el análisis, paso a paso.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Máxima Seguridad</h3>
              <p className="text-gray-600 leading-relaxed">
                Encriptación de nivel empresarial. Tus datos están seguros y nunca se comparten con terceros.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            ¿Listo Para Transformar Tu Carrera?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Únete a miles de profesionales que han conseguido mejores oportunidades
            gracias a CVs optimizados con inteligencia artificial.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/register"
              className="group bg-white hover:bg-gray-50 text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <span>Comenzar Ahora - Es Gratis</span>
              <ArrowUpRight className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>
          
          <div className="mt-8 text-blue-200 text-sm">
            ✓ No requiere tarjeta de crédito &nbsp;·&nbsp; ✓ Configuración en 2 minutos &nbsp;·&nbsp; ✓ Soporte 24/7
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold">CV Optimizer</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                La plataforma de optimización de CV más avanzada, impulsada por inteligencia artificial.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/" className="hover:text-white transition-colors">Características</Link></li>
                <li><Link to="/" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/" className="hover:text-white transition-colors">API</Link></li>
                <li><Link to="/" className="hover:text-white transition-colors">Integraciones</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/" className="hover:text-white transition-colors">Centro de Ayuda</Link></li>
                <li><Link to="/" className="hover:text-white transition-colors">Documentación</Link></li>
                <li><Link to="/" className="hover:text-white transition-colors">Contacto</Link></li>
                <li><Link to="/" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/" className="hover:text-white transition-colors">Acerca de</Link></li>
                <li><Link to="/" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link to="/" className="hover:text-white transition-colors">Privacidad</Link></li>
                <li><Link to="/" className="hover:text-white transition-colors">Términos</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2025 CV Optimizer. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}