import { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface PermissionGateProps {
  children: ReactNode
  requiredPermission?: string
  requiredRole?: string
  fallback?: ReactNode
}

export default function PermissionGate({
  children,
  requiredPermission,
  requiredRole,
  fallback = null,
}: PermissionGateProps) {
  const { role } = useAuth()

  // Por ahora, solo verificamos el rol básico
  // En producción, se implementaría la verificación de permisos granular
  if (requiredRole && role !== requiredRole) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
