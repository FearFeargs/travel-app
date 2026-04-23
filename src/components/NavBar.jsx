import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const LogoMark = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
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

export default function NavBar({ displayName, onNewTrip }) {
  const navigate = useNavigate()
  const location = useLocation()
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?'

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const navLinks = [
    { label: 'My Trips', path: '/dashboard' },
    { label: 'Profile',  path: '/profile' },
  ]

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 62, display: 'flex', alignItems: 'center',
      padding: '0 40px',
      background: 'rgba(249,247,244,0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid #E4E9EF',
    }}>
      {/* Logo */}
      <div
        onClick={() => navigate('/dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', marginRight: 36 }}
      >
        <LogoMark size={26} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600, letterSpacing: '0.18em', color: '#0B0F1A' }}>away</span>
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
        {navLinks.map(link => {
          const active = location.pathname === link.path
          return (
            <button key={link.path} onClick={() => navigate(link.path)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 16px', borderRadius: 8,
              fontSize: 14, fontWeight: active ? 600 : 400,
              color: active ? '#0B0F1A' : '#677585',
              borderBottom: active ? '2px solid #D95F2B' : '2px solid transparent',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
            }}>{link.label}</button>
          )
        })}
      </nav>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onNewTrip && (
          <button className="btn-away-primary" style={{ fontSize: 13, padding: '8px 18px' }} onClick={onNewTrip}>
            + New trip
          </button>
        )}
        <button
          onClick={() => navigate('/profile')}
          title="Profile & settings"
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: '#D95F2B', color: '#fff',
            fontWeight: 600, fontSize: 14,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >{initial}</button>
      </div>
    </header>
  )
}
