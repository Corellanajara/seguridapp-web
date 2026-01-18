import { createClient, User } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

/**
 * Obtiene el usuario autenticado de forma segura, manejando errores de refresh token
 * Si el refresh token no está disponible, intenta refrescar la sesión manualmente
 * @returns El usuario autenticado
 * @throws Error si la sesión no puede ser restaurada
 */
export async function getAuthenticatedUser(): Promise<User> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      // Si el error es relacionado con refresh token, intentar refrescar la sesión
      if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
        console.warn('Error de refresh token detectado, intentando refrescar sesión...')
        
        // Obtener la sesión actual primero
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (!currentSession) {
          throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
        }
        
        // Intentar refrescar la sesión manualmente
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession(currentSession)
        
        if (refreshError || !session) {
          // Si el refresh falla, la sesión ha expirado completamente
          throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
        }
        
        // Si el refresh fue exitoso, obtener el usuario nuevamente
        const { data: { user: refreshedUser }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !refreshedUser) {
          throw new Error('No se pudo obtener el usuario después de refrescar la sesión. Por favor, inicia sesión nuevamente.')
        }
        
        return refreshedUser
      }
      
      // Si es otro tipo de error, lanzarlo
      throw error
    }
    
    if (!user) {
      throw new Error('Usuario no autenticado. Por favor, inicia sesión nuevamente.')
    }
    
    return user
  } catch (error: any) {
    // Si el error ya es un string (nuestro error personalizado), lanzarlo tal cual
    if (typeof error === 'string' || (error && error.message)) {
      throw error
    }
    
    // Si es un error de Supabase relacionado con autenticación
    if (error?.message?.includes('Refresh Token') || error?.message?.includes('refresh_token')) {
      throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
    }
    
    throw error
  }
}
