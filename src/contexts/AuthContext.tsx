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
    // Función para determinar el rol del usuario
    const determinarRol = async (user: User | null) => {
      if (!user) {
        setRole(null)
        return
      }

      try {
        const esGuardia = await ubicacionService.esGuardia()
        setRole(esGuardia ? 'guardia' : 'admin')
      } catch (error) {
        // Si hay error, asumimos que es admin
        setRole('admin')
      }
    }

    // Obtener sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      await determinarRol(session?.user ?? null)
      setLoading(false)
    })

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      await determinarRol(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
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

