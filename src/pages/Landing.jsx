import { useNavigate } from 'react-router-dom'

const LogoMark = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="18.25" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5"/>
    <line x1="20" y1="3" x2="20" y2="9" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round"/>
    <line x1="20" y1="31" x2="20" y2="37" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round"/>
    <line x1="3" y1="20" x2="9" y2="20" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round"/>
    <line x1="31" y1="20" x2="37" y2="20" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round"/>
    <polygon points="20,8 22.4,20 20,18.5 17.6,20" fill="#D95F2B"/>
    <polygon points="20,32 22.4,20 20,21.5 17.6,20" fill="rgba(255,255,255,0.4)"/>
    <circle cx="20" cy="20" r="1.8" fill="#fff"/>
  </svg>
)

const features = [
  {
    icon: '✈',
    title: 'Plan every detail',
    body: 'Flights, stays, activities, and transfers — organized by day in one shared itinerary.',
  },
  {
    icon: '👥',
    title: 'Plan together',
    body: 'Invite friends and family to collaborate in real time. Anyone can suggest, edit, or comment.',
  },
  {
    icon: '💰',
    title: 'Track expenses',
    body: 'Log what you spend, split costs fairly, and see exactly who owes what at a glance.',
  },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' }}>

      {/* ── Nav ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 68,
        background: 'rgba(11,15,26,0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={28} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, letterSpacing: '0.18em', color: '#fff' }}>away</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'transparent', border: '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: 9999, padding: '9px 22px',
              fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.85)',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              transition: 'border-color 150ms',
            }}
            onMouseEnter={e => e.target.style.borderColor = 'rgba(255,255,255,0.6)'}
            onMouseLeave={e => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
          >Log in</button>
          <button
            onClick={() => navigate('/signup')}
            className="btn-away-primary"
            style={{ fontSize: 14, padding: '9px 22px' }}
          >Get started</button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(155deg, #0B0F1A 0%, #1C2E4A 45%, #2E4A6B 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '100px 24px 80px',
        position: 'relative', overflow: 'hidden',
        textAlign: 'center',
      }}>
        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(217,95,43,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 760 }}>
          <div style={{
            display: 'inline-block',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: '#D95F2B', marginBottom: 24,
            padding: '6px 14px', borderRadius: 9999,
            background: 'rgba(217,95,43,0.12)', border: '1px solid rgba(217,95,43,0.25)',
          }}>Collaborative travel planning</div>

          <h1 style={{
            fontFamily: "'California Sunshine', Georgia, serif",
            fontSize: 'clamp(52px, 8vw, 88px)',
            fontWeight: 400, color: '#fff', lineHeight: 1.05,
            letterSpacing: '-0.01em', marginBottom: 28,
          }}>
            Plan your next<br />trip. Together.
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2vw, 19px)', color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.7, maxWidth: 520, margin: '0 auto 44px',
          }}>
            Away brings everyone on the same trip into one shared itinerary — flights, stays, activities, and a budget that balances itself.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/signup')}
              className="btn-away-primary"
              style={{ fontSize: 16, padding: '14px 36px' }}
            >
              Get started free
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'rgba(255,255,255,0.08)', color: '#fff',
                border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 9999,
                fontSize: 16, fontWeight: 500, padding: '14px 32px',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                transition: 'background 150ms',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.14)'}
              onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.08)'}
            >
              Log in
            </button>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          <span>Scroll</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)' }} />
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{
        background: '#F9F7F4',
        padding: '96px 24px',
      }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D95F2B', marginBottom: 16 }}>Why Away</p>
            <h2 style={{ fontFamily: "'California Sunshine', Georgia, serif", fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 400, color: '#0B0F1A', lineHeight: 1.15 }}>
              Everything your trip needs,<br />in one place.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {features.map((f, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16,
                padding: '32px 28px',
                boxShadow: '0 2px 8px rgba(11,15,26,0.08)',
                border: '1px solid #E4E9EF',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: '#EBF0F7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, marginBottom: 20,
                }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: '#0B0F1A', marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#677585', lineHeight: 1.65 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{
        background: '#1C2E4A',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontFamily: "'California Sunshine', Georgia, serif", fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 400, color: '#fff', lineHeight: 1.15, marginBottom: 18 }}>
          Your next trip is waiting.
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 40, maxWidth: 460, margin: '0 auto 40px' }}>
          Create an account in seconds and start building your itinerary today.
        </p>
        <button
          onClick={() => navigate('/signup')}
          className="btn-away-primary"
          style={{ fontSize: 16, padding: '14px 40px' }}
        >
          Start planning for free
        </button>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        background: '#0B0F1A',
        padding: '32px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <LogoMark size={22} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.5)' }}>away</span>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          © {new Date().getFullYear()} Away. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
