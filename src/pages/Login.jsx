import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { markSessionActive } from '@/lib/sessionPersistence'

const LogoMark = () => (
  <svg width="28" height="35" viewBox="0 0 32 40" fill="none">
    <polygon points="16,2 20,20 16,17 12,20" fill="#D95F2B"/>
    <polygon points="16,38 20,20 16,23 12,20" fill="#1C2E4A" opacity="0.35"/>
    <circle cx="16" cy="20" r="2.2" fill="#1C2E4A"/>
    <circle cx="16" cy="20" r="1" fill="#F9F7F4"/>
  </svg>
)

export default function Login() {
  const user = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }
    markSessionActive()
    const redirect = sessionStorage.getItem('invite_redirect')
    if (redirect) { sessionStorage.removeItem('invite_redirect'); navigate(redirect) }
    else navigate('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <LogoMark />
        <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 16, fontWeight: 300, textTransform: 'uppercase', color: '#0B0F1A', display: 'inline-flex', alignItems: 'center', gap: '0.18em' }}>
          <span>a</span><span style={{ display: 'inline-block', transform: 'scaleX(-1)', minWidth: '0.8em', textAlign: 'center' }}>w</span><span>a</span><span>y</span>
        </span>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20, padding: '36px 36px 32px', boxShadow: '0 4px 24px rgba(11,15,26,0.10)' }}>
        <h1 style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 28, fontWeight: 400, color: '#0B0F1A', marginBottom: 6 }}>Welcome back</h1>
        <p style={{ fontSize: 14, color: '#677585', marginBottom: 28 }}>Log in to your account</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#677585', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #C4CDD8', fontSize: 15, color: '#0B0F1A', background: '#fff', outline: 'none', fontFamily: 'DM Sans, sans-serif', transition: 'border-color 150ms' }}
              onFocus={e => e.target.style.borderColor = '#D95F2B'}
              onBlur={e => e.target.style.borderColor = '#C4CDD8'}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#677585', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #C4CDD8', fontSize: 15, color: '#0B0F1A', background: '#fff', outline: 'none', fontFamily: 'DM Sans, sans-serif', transition: 'border-color 150ms' }}
              onFocus={e => e.target.style.borderColor = '#D95F2B'}
              onBlur={e => e.target.style.borderColor = '#C4CDD8'}
            />
          </div>

          {error && (
            <div style={{ background: '#FCECEA', border: '1px solid #F5B8B4', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#C23B2E' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-away-primary"
            style={{ width: '100%', marginTop: 4, opacity: loading ? 0.7 : 1, fontSize: 15, padding: '13px 24px' }}
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#677585' }}>
          No account?{' '}
          <Link to="/signup" style={{ color: '#D95F2B', fontWeight: 500 }}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}
