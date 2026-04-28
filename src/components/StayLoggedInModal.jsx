import { setStayLoggedIn, markSessionActive } from '@/lib/sessionPersistence'

export default function StayLoggedInModal({ onDone }) {
  function handleChoice(stay) {
    setStayLoggedIn(stay)
    markSessionActive()
    onDone()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(11,15,26,0.55)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: '#fff', borderRadius: 20,
        padding: '36px 32px 32px',
        boxShadow: '0 16px 48px rgba(11,15,26,0.18)',
        animation: 'fadeIn 220ms ease both',
      }}>
        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: '#EBF0F7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, fontSize: 22,
        }}>🔒</div>

        <h2 style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 26, fontWeight: 400, color: '#0B0F1A', lineHeight: 1.2, marginBottom: 10 }}>
          Stay logged in?
        </h2>
        <p style={{ fontSize: 14, color: '#677585', lineHeight: 1.6, marginBottom: 28 }}>
          Keep your session active on this device so you don't have to sign in each time you visit.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => handleChoice(true)}
            className="btn-away-primary"
            style={{ width: '100%' }}
          >
            Yes, stay logged in
          </button>
          <button
            onClick={() => handleChoice(false)}
            className="btn-away-secondary"
            style={{ width: '100%' }}
          >
            Not now
          </button>
        </div>

        <p style={{ marginTop: 18, fontSize: 12, color: '#A0ADBC', textAlign: 'center' }}>
          You can change this anytime in Settings.
        </p>
      </div>
    </div>
  )
}
