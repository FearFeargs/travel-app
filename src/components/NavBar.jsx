import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

// Compass needle mark — pure diamond, no ring
const LogoMark = ({ size = 26, dark = false }) => (
  <svg width={size} height={size * 1.25} viewBox="0 0 32 40" fill="none">
    <polygon points="16,2 20,20 16,17 12,20" fill="#D95F2B"/>
    <polygon points="16,38 20,20 16,23 12,20" fill={dark ? 'rgba(255,255,255,0.25)' : '#1C2E4A'} opacity={dark ? 1 : 0.35}/>
    <circle cx="16" cy="20" r="2.2" fill={dark ? 'rgba(255,255,255,0.9)' : '#1C2E4A'}/>
    <circle cx="16" cy="20" r="1" fill={dark ? '#1C2E4A' : '#F9F7F4'}/>
  </svg>
)

// Wordmark — Josefin Sans 300, uppercase, mirrored W
const Wordmark = ({ size = 15, dark = false }) => (
  <span style={{
    fontFamily: "'Josefin Sans', sans-serif",
    fontSize: size, fontWeight: 300,
    textTransform: 'uppercase',
    color: dark ? '#fff' : '#0B0F1A',
    display: 'inline-flex', alignItems: 'center', gap: '0.18em',
    letterSpacing: 0,
  }}>
    <span>a</span>
    <span style={{ display: 'inline-block', transform: 'scaleX(-1)', minWidth: '0.8em', overflow: 'visible', textAlign: 'center' }}>w</span>
    <span>a</span>
    <span>y</span>
  </span>
)

export default function NavBar({ displayName, onNewTrip, dark = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?'

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const navLinks = [
    { label: 'My Trips', path: '/dashboard' },
    { label: 'Profile',  path: '/profile' },
    { label: 'Settings', path: '/settings' },
  ]

  const bg    = dark ? 'rgba(11,15,26,0.45)' : 'rgba(249,247,244,0.92)'
  const border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E4E9EF'
  const fg    = dark ? 'rgba(255,255,255,0.65)' : '#677585'
  const activeFg = dark ? '#fff' : '#0B0F1A'

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 62, display: 'flex', alignItems: 'center',
      padding: '0 40px',
      background: bg,
      backdropFilter: 'blur(20px)',
      borderBottom: border,
    }}>
      {/* Logo */}
      <div
        onClick={() => navigate('/dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', marginRight: 36 }}
      >
        <LogoMark size={22} dark={dark} />
        <Wordmark size={15} dark={dark} />
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
              color: active ? activeFg : fg,
              borderBottom: active ? '2px solid #D95F2B' : '2px solid transparent',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
            }}>{link.label}</button>
          )
        })}
      </nav>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Search icon */}
        <button onClick={() => navigate('/dashboard')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          width: 36, height: 36, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: fg, transition: 'all 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : '#F4F6F8'; e.currentTarget.style.color = activeFg; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = fg; }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: dark ? 'rgba(255,255,255,0.15)' : '#E4E9EF', margin: '0 4px' }} />

        {/* New trip — outlined pill */}
        {onNewTrip && (
          <button onClick={onNewTrip} style={{
            background: 'none',
            border: `1.5px solid ${dark ? 'rgba(255,255,255,0.3)' : '#C4CDD8'}`,
            borderRadius: 9999, padding: '7px 16px',
            fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
            color: dark ? '#fff' : '#0B0F1A',
            cursor: 'pointer', transition: 'all 150ms',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.65)' : '#8C97A6'; e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : '#F4F6F8'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#C4CDD8'; e.currentTarget.style.background = 'none'; }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> New trip
          </button>
        )}

        {/* Avatar */}
        <button
          onClick={() => navigate('/profile')}
          title={displayName || 'Profile'}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#D95F2B', color: '#fff',
            fontWeight: 600, fontSize: 13,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'DM Sans, sans-serif', marginLeft: 4,
          }}
        >{initial}</button>
      </div>
    </header>
  )
}
