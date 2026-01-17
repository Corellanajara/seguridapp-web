import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Shield, User } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, user, role, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!authLoading && user && role) {
      if (role === 'guardia') {
        navigate('/guardia/app')
      } else {
        navigate('/')
      }
    }
  }, [user, role, authLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      toast({
        title: 'Error de autenticación',
        description: error.message,
        variant: 'destructive',
      })
      setLoading(false)
    } else {
      // La redirección se manejará en el useEffect cuando se determine el rol
      // Esperamos un momento para que se actualice el rol
      setTimeout(() => {
        setLoading(false)
      }, 500)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-bold">
              SeguridApp
            </CardTitle>
          </div>
          <CardDescription className="text-center">
            Control de Guardias de Seguridad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
            <div className="text-xs text-center text-muted-foreground pt-2">
              <p>El sistema detectará automáticamente si eres</p>
              <p className="flex items-center justify-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> Administrador
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Guardia
                </span>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

