import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getStayLoggedIn, hasStayPreference, isSessionActive } from '@/lib/sessionPersistence'

export default function ProtectedRoute({ children }) {
  const user = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!user) return
    // If user has chosen not to stay logged in AND this isn't an active browser session, sign them out
    if (hasStayPreference() && !getStayLoggedIn() && !isSessionActive()) {
      setSigningOut(true)
      supabase.auth.signOut()
    }
  }, [user])

  if (user === undefined || signingOut) return null

  if (!user) return <Navigate to="/" replace />

  return children
}
