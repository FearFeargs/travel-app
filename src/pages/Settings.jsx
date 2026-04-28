import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import NavBar from '@/components/NavBar'
import { getStayLoggedIn, setStayLoggedIn } from '@/lib/sessionPersistence'

export default function Settings() {
  const user = useAuth()
  const navigate = useNavigate()
  const [stayLoggedIn, setStayState] = useState(() => getStayLoggedIn())
  const [saved, setSaved] = useState(false)

  function handleToggle(val) {
    setStayState(val)
    setStayLoggedIn(val)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <>
      <NavBar displayName={user?.user_metadata?.display_name} />
      <div style={{ paddingTop: 62, minHeight: '100vh', background: '#F9F7F4' }}>
        <div style={{ maxWidth: 620, margin: '0 auto', padding: '48px 24px' }}>

          <h1 style={{ fontFamily: "'California Sunshine', Georgia, serif", fontSize: 38, fontWeight: 400, color: '#0B0F1A', marginBottom: 6 }}>Settings</h1>
          <p style={{ fontSize: 14, color: '#677585', marginBottom: 40 }}>Manage your account preferences.</p>

          {/* Session section */}
          <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E9EF', overflow: 'hidden', marginBottom: 24, boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F4F6F8' }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#A0ADBC' }}>Session</p>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#0B0F1A', marginBottom: 4 }}>Remain logged in</p>
                  <p style={{ fontSize: 13, color: '#677585', lineHeight: 1.6 }}>
                    Keep your session active across browser closes. When off, you'll be signed out automatically when you close your browser.
                  </p>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(!stayLoggedIn)}
                  style={{
                    flexShrink: 0,
                    width: 48, height: 28, borderRadius: 14,
                    background: stayLoggedIn ? '#D95F2B' : '#C4CDD8',
                    border: 'none', cursor: 'pointer',
                    position: 'relative', transition: 'background 200ms',
                    padding: 0,
                  }}
                  aria-checked={stayLoggedIn}
                  role="switch"
                >
                  <span style={{
                    position: 'absolute', top: 3,
                    left: stayLoggedIn ? 22 : 3,
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(11,15,26,0.2)',
                    transition: 'left 200ms',
                    display: 'block',
                  }} />
                </button>
              </div>

              {saved && (
                <div style={{ marginTop: 14, fontSize: 13, color: '#2A7D5F', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✓</span> Preference saved
                </div>
              )}
            </div>
          </section>

          {/* Account section */}
          <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E9EF', overflow: 'hidden', marginBottom: 24, boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F4F6F8' }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#A0ADBC' }}>Account</p>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#0B0F1A', marginBottom: 2 }}>Email</p>
                  <p style={{ fontSize: 13, color: '#677585' }}>{user?.email}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            style={{
              background: 'transparent', border: '1.5px solid #C4CDD8',
              borderRadius: 9999, padding: '11px 24px',
              fontSize: 14, fontWeight: 500, color: '#677585',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              transition: 'border-color 150ms, color 150ms',
            }}
            onMouseEnter={e => { e.target.style.borderColor = '#C23B2E'; e.target.style.color = '#C23B2E' }}
            onMouseLeave={e => { e.target.style.borderColor = '#C4CDD8'; e.target.style.color = '#677585' }}
          >Sign out</button>
        </div>
      </div>
    </>
  )
}
