import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ubicacionService } from '@/services/ubicacion'
import { UserRole } from '@/types'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  role: UserRole | null
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    let isMounted = true
    
    // Función para determinar el rol del usuario
    const determinarRol = async (user: User | null): Promise<'guardia' | 'admin'> => {
      if (!user) {
        throw new Error('Usuario no disponible')
      }

      try {
        // Intentar verificar si es guardia con timeout
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 2000) // Timeout de 2 segundos
        })

        const esGuardiaPromise = ubicacionService.esGuardia()
        
        const esGuardia = await Promise.race([esGuardiaPromise, timeoutPromise])
        return esGuardia ? 'guardia' : 'admin'
      } catch (error) {
        // Si hay error, asumir admin por defecto
        return 'admin'
      }
    }

    // Obtener sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // No bloquear - establecer loading en false rápidamente
        setLoading(false)
        
        // Verificar rol en segundo plano y actualizar cuando se complete
        determinarRol(session.user).then((rol) => {
          if (isMounted) {
            setRole(rol)
          }
        }).catch(() => {
          // Si falla, establecer admin solo después del error
          if (isMounted) {
            setRole('admin')
          }
        })
      } else {
        setRole(null)
        setLoading(false)
      }
    })

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // No bloquear - establecer loading en false rápidamente
        setLoading(false)
        
        // Verificar rol en segundo plano
        determinarRol(session.user).then((rol) => {
          if (isMounted) {
            setRole(rol)
          }
        }).catch(() => {
          if (isMounted) {
            setRole('admin')
          }
        })
      } else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}

