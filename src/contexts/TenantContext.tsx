import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Empresa } from '@/types'

interface TenantContextType {
  empresa: Empresa | null
  setEmpresa: (empresa: Empresa | null) => void
  loading: boolean
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // En producción, aquí se obtendría la empresa del usuario autenticado
    // Por ahora, retornamos null (single-tenant)
    setLoading(false)
  }, [])

  return (
    <TenantContext.Provider value={{ empresa, setEmpresa, loading }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}
