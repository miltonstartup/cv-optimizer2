import { ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)

  useEffect(() => {
    // Mostrar warning si el loading toma demasiado tiempo
    const timeout = setTimeout(() => {
      if (loading) {
        setShowTimeoutWarning(true)
      }
    }, 8000) // 8 segundos

    return () => clearTimeout(timeout)
  }, [loading])

  useEffect(() => {
    // Reset warning cuando loading cambie
    if (!loading) {
      setShowTimeoutWarning(false)
    }
  }, [loading])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Cargando...</p>
        {showTimeoutWarning && (
          <div className="text-center text-sm text-yellow-600 max-w-md">
            <p>La carga está tomando más tiempo de lo esperado.</p>
            <p>Si el problema persiste, intenta recargar la página.</p>
          </div>
        )}
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}