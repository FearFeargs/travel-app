import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const LogoMark = () => (
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="18.25" stroke="#1C2E4A" strokeWidth="1.5"/>
    <line x1="20" y1="3" x2="20" y2="9" stroke="#C4CDD8" strokeWidth="1" strokeLinecap="round"/>
    <line x1="20" y1="31" x2="20" y2="37" stroke="#C4CDD8" strokeWidth="1" strokeLinecap="round"/>
    <line x1="3" y1="20" x2="9" y2="20" stroke="#C4CDD8" strokeWidth="1" strokeLinecap="round"/>
    <line x1="31" y1="20" x2="37" y2="20" stroke="#C4CDD8" strokeWidth="1" strokeLinecap="round"/>
    <polygon points="20,8 22.4,20 20,18.5 17.6,20" fill="#D95F2B"/>
    <polygon points="20,32 22.4,20 20,21.5 17.6,20" fill="#C4CDD8"/>
    <circle cx="20" cy="20" r="1.8" fill="#1C2E4A"/>
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
    navigate('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <LogoMark />
        <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '0.14em', color: '#0B0F1A' }}>away</span>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20, padding: '36px 36px 32px', boxShadow: '0 4px 24px rgba(11,15,26,0.10)' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, color: '#0B0F1A', marginBottom: 6 }}>Welcome back</h1>
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
