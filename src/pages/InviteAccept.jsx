import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function InviteAccept() {
  const { token } = useParams()
  const navigate  = useNavigate()
  const user      = useAuth()

  const [invite, setInvite]   = useState(null)
  const [status, setStatus]   = useState('loading') // loading | ready | accepting | accepted | error | expired
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('Invalid invite link.'); return }

    supabase.rpc('get_invite', { p_token: token }).then(({ data, error }) => {
      if (error || !data) { setStatus('error'); setErrorMsg('This invite link is not valid.'); return }
      if (data.accepted_at) { setStatus('error'); setErrorMsg('This invite has already been accepted.'); return }
      if (new Date(data.expires_at) < new Date()) { setStatus('expired'); return }
      setInvite(data)
      setStatus('ready')
    })
  }, [token])

  async function accept() {
    if (!user) {
      // Send to login, come back after
      sessionStorage.setItem('invite_redirect', `/invite/${token}`)
      navigate('/login')
      return
    }

    setStatus('accepting')
    const { data, error } = await supabase.rpc('accept_invite', { p_token: token })

    if (error || data?.error) {
      setStatus('error')
      setErrorMsg(data?.error || error?.message || 'Something went wrong.')
      return
    }

    setStatus('accepted')
    setTimeout(() => navigate(`/trips/${data.trip_id}`), 1800)
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  const card = (children) => (
    <div style={{ minHeight: '100vh', background: '#F9F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', maxWidth: 440, width: '100%', boxShadow: '0 8px 32px rgba(11,15,26,0.12)', textAlign: 'center' }}>
        {children}
      </div>
    </div>
  )

  if (status === 'loading') return card(
    <div style={{ color: '#8C97A6', fontSize: 14 }}>Loading invite…</div>
  )

  if (status === 'expired') return card(<>
    <div style={{ fontSize: 36, marginBottom: 12 }}>⏰</div>
    <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#0B0F1A', marginBottom: 8 }}>Invite expired</div>
    <p style={{ fontSize: 14, color: '#677585', marginBottom: 24 }}>This invite link has expired. Ask the trip owner to send a new one.</p>
    <button className="btn-away-secondary" onClick={() => navigate('/dashboard')}>Go to dashboard</button>
  </>)

  if (status === 'error') return card(<>
    <div style={{ fontSize: 36, marginBottom: 12 }}>✕</div>
    <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#0B0F1A', marginBottom: 8 }}>Can't open invite</div>
    <p style={{ fontSize: 14, color: '#677585', marginBottom: 24 }}>{errorMsg}</p>
    <button className="btn-away-secondary" onClick={() => navigate('/dashboard')}>Go to dashboard</button>
  </>)

  if (status === 'accepted') return card(<>
    <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
    <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#0B0F1A', marginBottom: 8 }}>You're in!</div>
    <p style={{ fontSize: 14, color: '#677585' }}>Taking you to <strong>{invite?.trip_title}</strong>…</p>
  </>)

  // status === 'ready' | 'accepting'
  return card(<>
    <div style={{ fontSize: 36, marginBottom: 16 }}>✈</div>
    <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#0B0F1A', marginBottom: 6 }}>
      {invite?.trip_title}
    </div>
    <p style={{ fontSize: 14, color: '#677585', marginBottom: 4 }}>
      You've been invited to join this trip as{' '}
      <strong style={{ color: '#0B0F1A' }}>{invite?.role === 'editor' ? 'an editor' : 'a viewer'}</strong>.
    </p>
    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#A0ADBC', marginBottom: 28 }}>
      Expires {new Date(invite?.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
    </p>

    {!user ? (
      <>
        <p style={{ fontSize: 13, color: '#677585', marginBottom: 16 }}>Sign in or create an account to accept this invite.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn-away-secondary" onClick={() => { sessionStorage.setItem('invite_redirect', `/invite/${token}`); navigate('/login') }}>Sign in</button>
          <button className="btn-away-primary" onClick={() => { sessionStorage.setItem('invite_redirect', `/invite/${token}`); navigate('/signup') }}>Create account</button>
        </div>
      </>
    ) : (
      <button
        className="btn-away-primary"
        disabled={status === 'accepting'}
        style={{ width: '100%', padding: '12px', fontSize: 14, opacity: status === 'accepting' ? 0.7 : 1 }}
        onClick={accept}
      >
        {status === 'accepting' ? 'Joining…' : 'Accept invite'}
      </button>
    )}
  </>)
}
