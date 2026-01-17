import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Guardias from './pages/Guardias'
import GuardiaDetail from './pages/GuardiaDetail'
import Administracion from './pages/Administracion'
import GuardiaApp from './pages/GuardiaApp'
import { Toaster } from './components/ui/toaster'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: ('admin' | 'guardia')[] }) {
  const { user, loading, role } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirigir según el rol
    if (role === 'guardia') {
      return <Navigate to="/guardia/app" replace />
    } else {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, loading, role } = useAuth()

  // Redirigir si está autenticado y va al login
  if (!loading && user && window.location.pathname === '/login') {
    if (role === 'guardia') {
      return <Navigate to="/guardia/app" replace />
    } else {
      return <Navigate to="/" replace />
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Rutas de Administrador */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guardias"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Guardias />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guardias/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <GuardiaDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/administracion"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Administracion />
          </ProtectedRoute>
        }
      />

      {/* Ruta de Guardia */}
      <Route
        path="/guardia/app"
        element={
          <ProtectedRoute allowedRoles={['guardia']}>
            <GuardiaApp />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster />
      </Router>
    </AuthProvider>
  )
}

export default App

