import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { DebugProvider } from './contexts/DebugContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { Navbar } from './components/Navbar'
import DebugConsole from './components/DebugConsole'
import DebugButton from './components/DebugButton'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { AdminPage } from './pages/AdminPage'
import { CVAnalysisPage } from './pages/CVAnalysisPage'
import { LandingPage } from './pages/LandingPage'
import { useLogger } from './contexts/DebugContext'

function AppContent() {
  const logger = useLogger('App')
  
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="min-h-[60vh]">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cv/:cvId"
                element={
                  <ProtectedRoute>
                    <CVAnalysisPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              />
              <Route path="/" element={<LandingPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'text-sm',
          }}
        />
        
        {/* Consola de Debugging */}
        <DebugConsole />
        <DebugButton />
      </div>
    </Router>
  )
}

function App() {
  return (
    <DebugProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </DebugProvider>
  )
}

export default App