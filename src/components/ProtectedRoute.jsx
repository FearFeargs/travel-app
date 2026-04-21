import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const user = useAuth()

  if (user === undefined) return null

  if (!user) return <Navigate to="/login" replace />

  return children
}
