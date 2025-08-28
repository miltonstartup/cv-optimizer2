import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLogger } from '../contexts/DebugContext'
import { FileText, Settings, LogOut, User } from 'lucide-react'
import toast from 'react-hot-toast'

export function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const logger = useLogger('Navbar')

  async function handleSignOut() {
    logger.info('Iniciando cierre de sesión')
    const { error } = await signOut()
    if (error) {
      logger.error('Error al cerrar sesión', error)
      toast.error('Error al cerrar sesión')
    } else {
      logger.success('Sesión cerrada exitosamente')
      toast.success('Sesión cerrada exitosamente')
      navigate('/login')
    }
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">CV Optimizer</span>
          </Link>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-4">
                  <Link
                    to="/dashboard"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                  
                  {profile?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  )}
                </div>

                <div className="flex items-center space-x-3 border-l pl-4 border-gray-200">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-700">{user.email}</span>
                  </div>
                  
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Salir</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}