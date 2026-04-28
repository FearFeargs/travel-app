import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const C = {
  midnight: '#0B0F1A', horizon: '#1C2E4A', dusk: '#D95F2B', duskDark: '#B34A1C',
  sand: '#F5F0E8', parchment: '#F9F7F4', mist: '#EBF0F7',
  slate200: '#E4E9EF', slate300: '#C4CDD8', slate400: '#A0ADBC',
  slate500: '#8C97A6', slate600: '#677585', white: '#fff',
  success: '#2A7D5F',
}

const GRADS = {
  lisbon:    'linear-gradient(145deg,#2E5080 0%,#8B6B3D 55%,#C4956A 100%)',
  kyoto:     'linear-gradient(145deg,#3D2E5F 0%,#8B3D5F 55%,#D4916A 100%)',
  morocco:   'linear-gradient(145deg,#5F3D1A 0%,#C4773D 55%,#E8B870 100%)',
  santorini: 'linear-gradient(145deg,#1A4A6B 0%,#4A8BC4 55%,#E8C870 100%)',
  amalfi:    'linear-gradient(145deg,#1A5F3D 0%,#3A8F6A 55%,#2E5080 100%)',
}

const FEATURES = [
  { label: 'Search', title: 'Find the best flights', body: 'Compare hundreds of airlines in seconds. Filter by stops, times, price — book in a few taps.', grad: GRADS.lisbon, stat: '500+', statLabel: 'airlines' },
  { label: 'Stay',   title: 'Book where you sleep',  body: 'Hotels, apartments, villas. Filtered by your travel style, not just star ratings.',           grad: GRADS.kyoto,    stat: '2M+',  statLabel: 'properties' },
  { label: 'Plan',   title: 'Build your itinerary',  body: 'Drag days around, add activities, attach bookings. Your whole trip in a single view.',          grad: GRADS.amalfi,   stat: '∞',    statLabel: 'flexibility' },
  { label: 'Budget', title: 'Track every dollar',    body: 'See flights, stays, and experiences in one budget. No surprises at checkout.',                   grad: GRADS.morocco,  stat: '$0',   statLabel: 'hidden fees' },
]

const TESTIMONIALS = [
  { name: 'Mia K.', location: 'London', text: 'Planned our whole two-week Japan trip in an afternoon. The itinerary builder is genuinely magic.', trips: 14 },
  { name: 'Tom R.', location: 'New York', text: "Finally ditched the spreadsheet. Away keeps everything — flights, hotels, budget — in one place.", trips: 8 },
  { name: 'Sara O.', location: 'Berlin', text: 'Love that I can see my total spend across everything before I even book. No more surprises.', trips: 22 },
]

// Compass needle mark
const Mark = ({ size = 28, dark = true }) => (
  <svg width={size} height={size * 1.25} viewBox="0 0 32 40" fill="none">
    <polygon points="16,2 20,20 16,17 12,20" fill={C.dusk}/>
    <polygon points="16,38 20,20 16,23 12,20" fill={dark ? 'rgba(255,255,255,0.25)' : C.horizon} opacity={dark ? 1 : 0.35}/>
    <circle cx="16" cy="20" r="2.2" fill={dark ? 'rgba(255,255,255,0.9)' : C.horizon}/>
    <circle cx="16" cy="20" r="1" fill={dark ? C.horizon : C.parchment}/>
  </svg>
)

const Wordmark = ({ size = 15, dark = true }) => (
  <span style={{ fontFamily: "'Josefin Sans',sans-serif", fontSize: size, fontWeight: 300, textTransform: 'uppercase', color: dark ? '#fff' : C.midnight, display: 'inline-flex', alignItems: 'center', gap: '0.18em', letterSpacing: 0 }}>
    <span>a</span><span style={{ display: 'inline-block', transform: 'scaleX(-1)', minWidth: '0.8em', overflow: 'visible', textAlign: 'center' }}>w</span><span>a</span><span>y</span>
  </span>
)

// Auth slide-over panel
function AuthPanel({ tab: initialTab, onClose, onSuccess }) {
  const [tab, setTab] = useState(initialTab || 'signup')
  const [step, setStep] = useState('form') // form | verify | done
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { setTab(initialTab || 'signup') }, [initialTab])
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const validate = () => {
    const e = {}
    if (tab === 'signup' && !form.name.trim()) e.name = 'Name is required'
    if (!form.email.includes('@')) e.email = 'Enter a valid email'
    if (form.password.length < 6) e.password = 'At least 6 characters'
    return e
  }

  const handleSubmit = e => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      if (tab === 'signup') setStep('verify')
      else onSuccess()
    }, 1000)
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: `1.5px solid ${C.slate300}`, borderRadius: 10,
    fontSize: 15, color: C.midnight, background: '#fff', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', transition: 'border-color 150ms',
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(11,15,26,0.5)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, zIndex: 201,
        background: '#fff', boxShadow: '-8px 0 48px rgba(11,15,26,0.2)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 280ms cubic-bezier(0.25,0.1,0.25,1) both',
      }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ padding: '28px 32px 0', borderBottom: `1px solid ${C.slate200}`, paddingBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mark size={20} dark={false} />
              <Wordmark size={14} dark={false} />
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate500, fontSize: 20, lineHeight: 1, padding: '4px 6px', borderRadius: 6 }}>×</button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {[['signup', 'Create account'], ['signin', 'Sign in']].map(([id, label]) => (
              <button key={id} onClick={() => { setTab(id); setStep('form'); setErrors({}) }} style={{
                flex: 1, background: 'none', border: 'none', padding: '12px 0 13px',
                fontSize: 14, fontWeight: tab === id ? 600 : 400,
                color: tab === id ? C.midnight : C.slate500,
                borderBottom: tab === id ? `2px solid ${C.dusk}` : `2px solid transparent`,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {step === 'verify' && (
            <div style={{ textAlign: 'center', paddingTop: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E8F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✉</div>
              <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 26, fontWeight: 300, color: C.midnight, marginBottom: 10 }}>Check your inbox</div>
              <div style={{ fontSize: 14, color: C.slate600, lineHeight: 1.6, marginBottom: 28 }}>
                We sent a confirmation link to<br/><strong style={{ color: C.midnight }}>{form.email}</strong>
              </div>
              <button onClick={() => setStep('done')} style={{ width: '100%', background: C.horizon, color: '#fff', border: 'none', borderRadius: 9999, padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans' }}>
                Open my email app
              </button>
              <div style={{ marginTop: 14, fontSize: 13, color: C.slate500 }}>Didn't receive it? <span style={{ color: C.dusk, cursor: 'pointer', fontWeight: 500 }}>Resend</span></div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', paddingTop: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E8F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28, color: C.success }}>✓</div>
              <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 26, fontWeight: 300, color: C.midnight, marginBottom: 10 }}>Welcome aboard</div>
              <div style={{ fontSize: 14, color: C.slate600, lineHeight: 1.6, marginBottom: 28 }}>Your Away account is ready.<br/>Where do you want to go first?</div>
              <button onClick={onSuccess} style={{ width: '100%', background: C.dusk, color: '#fff', border: 'none', borderRadius: 9999, padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans' }}>
                Start exploring →
              </button>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {tab === 'signup' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.slate600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full name</label>
                  <input type="text" placeholder="Sarah Mitchell" value={form.name}
                    onChange={e => setForm(f => ({...f, name: e.target.value}))}
                    style={{ ...inputStyle, borderColor: errors.name ? '#C23B2E' : C.slate300 }}
                    onFocus={e => e.target.style.borderColor = errors.name ? '#C23B2E' : C.dusk}
                    onBlur={e => e.target.style.borderColor = errors.name ? '#C23B2E' : C.slate300}
                  />
                  {errors.name && <div style={{ fontSize: 12, color: '#C23B2E', marginTop: 5 }}>{errors.name}</div>}
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.slate600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                <input type="email" placeholder="sarah@example.com" value={form.email}
                  onChange={e => setForm(f => ({...f, email: e.target.value}))}
                  style={{ ...inputStyle, borderColor: errors.email ? '#C23B2E' : C.slate300 }}
                  onFocus={e => e.target.style.borderColor = errors.email ? '#C23B2E' : C.dusk}
                  onBlur={e => e.target.style.borderColor = errors.email ? '#C23B2E' : C.slate300}
                />
                {errors.email && <div style={{ fontSize: 12, color: '#C23B2E', marginTop: 5 }}>{errors.email}</div>}
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.slate600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                <input type="password" placeholder="6+ characters" value={form.password}
                  onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  style={{ ...inputStyle, borderColor: errors.password ? '#C23B2E' : C.slate300 }}
                  onFocus={e => e.target.style.borderColor = errors.password ? '#C23B2E' : C.dusk}
                  onBlur={e => e.target.style.borderColor = errors.password ? '#C23B2E' : C.slate300}
                />
                {errors.password && <div style={{ fontSize: 12, color: '#C23B2E', marginTop: 5 }}>{errors.password}</div>}
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', background: loading ? C.slate300 : C.dusk, color: '#fff',
                border: 'none', borderRadius: 9999, padding: '14px', fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 150ms',
              }}>
                {loading
                  ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>Working…</>
                  : tab === 'signup' ? 'Create free account' : 'Sign in'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                <div style={{ flex: 1, height: 1, background: C.slate200 }} />
                <span style={{ fontSize: 12, color: C.slate400 }}>or continue with</span>
                <div style={{ flex: 1, height: 1, background: C.slate200 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {['Google', 'Apple'].map(p => (
                  <button key={p} type="button" style={{
                    background: '#fff', border: `1.5px solid ${C.slate300}`, borderRadius: 10,
                    padding: '11px', fontSize: 14, fontWeight: 500, color: C.midnight,
                    cursor: 'pointer', fontFamily: 'DM Sans', transition: 'border-color 150ms',
                  }}
                  onMouseEnter={e => e.target.style.borderColor = C.slate500}
                  onMouseLeave={e => e.target.style.borderColor = C.slate300}>
                    {p === 'Google' ? '🔵' : '⚫'} {p}
                  </button>
                ))}
              </div>

              {tab === 'signin' && (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <span style={{ fontSize: 13, color: C.dusk, cursor: 'pointer', fontWeight: 500 }}>Forgot password?</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [authPanel, setAuthPanel] = useState(null) // null | 'signup' | 'signin'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const openSignup = () => setAuthPanel('signup')
  const openSignin = () => setAuthPanel('signin')
  const handleAuthSuccess = () => navigate('/signup')

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px',
        background: scrolled ? 'rgba(11,15,26,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
        transition: 'all 300ms',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Mark size={22} dark />
          <Wordmark size={15} dark />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={openSignin} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
            fontSize: 14, cursor: 'pointer', padding: '8px 16px', borderRadius: 8,
            transition: 'color 150ms', fontFamily: 'DM Sans',
          }}
          onMouseEnter={e => e.target.style.color = '#fff'}
          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.7)'}>
            Sign in
          </button>
          <button onClick={openSignup} style={{
            background: C.dusk, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', padding: '9px 20px', borderRadius: 9999,
            transition: 'background 150ms', fontFamily: 'DM Sans',
          }}
          onMouseEnter={e => e.target.style.background = C.duskDark}
          onMouseLeave={e => e.target.style.background = C.dusk}>
            Get started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100vh', background: C.midnight,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', padding: '100px 48px 80px',
      }}>
        {/* Floating destination cards */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: '-2%', top: '18%', width: 200, height: 280, borderRadius: 20, background: GRADS.kyoto, opacity: 0.28, transform: 'rotate(-8deg)', animation: 'float 7s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', left: '5%', top: '30%', width: 160, height: 220, borderRadius: 16, background: GRADS.morocco, opacity: 0.22, transform: 'rotate(-4deg)', animation: 'float 9s ease-in-out infinite 1s' }} />
          <div style={{ position: 'absolute', right: '5%', top: '22%', width: 180, height: 250, borderRadius: 18, background: GRADS.lisbon, opacity: 0.28, transform: 'rotate(6deg)', animation: 'float 8s ease-in-out infinite 0.5s' }} />
          <div style={{ position: 'absolute', right: '-1%', top: '35%', width: 150, height: 200, borderRadius: 16, background: GRADS.santorini, opacity: 0.2, transform: 'rotate(10deg)', animation: 'float 6s ease-in-out infinite 2s' }} />
          {/* Glow orbs */}
          <div style={{ position: 'absolute', left: '30%', top: '25%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,95,43,0.12) 0%, transparent 70%)', animation: 'pulse 6s ease-in-out infinite' }} />
        </div>
        <style>{`
          @keyframes float { 0%,100%{transform:var(--r,rotate(0deg)) translateY(0)} 50%{transform:var(--r,rotate(0deg)) translateY(-10px)} }
          @keyframes pulse { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.05)} }
          @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        `}</style>

        {/* Content */}
        <div style={{ textAlign: 'center', maxWidth: 740, position: 'relative', zIndex: 2 }}>
          {/* Eyebrow */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(217,95,43,0.15)', border: '1px solid rgba(217,95,43,0.3)', borderRadius: 9999, padding: '6px 14px', marginBottom: 36, animation: 'fadeUp 600ms 100ms both' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.dusk, display: 'inline-block' }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 500, color: C.dusk, letterSpacing: '0.06em' }}>NOW IN OPEN BETA</span>
          </div>

          <h1 style={{
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: 'clamp(52px,8vw,96px)', fontWeight: 200,
            color: '#fff', lineHeight: 1.0, letterSpacing: '-0.01em',
            marginBottom: 28, animation: 'fadeUp 600ms 200ms both',
          }}>
            Every trip,<br/>in one place.
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 44px', animation: 'fadeUp 600ms 320ms both' }}>
            Search flights, book stays, plan your days. Away brings your whole journey together — from the first search to the last night.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 600ms 440ms both' }}>
            <button onClick={openSignup} style={{
              background: C.dusk, border: 'none', color: '#fff', fontSize: 16, fontWeight: 600,
              padding: '15px 36px', borderRadius: 9999, cursor: 'pointer', fontFamily: 'DM Sans',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.target.style.background = C.duskDark; e.target.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.target.style.background = C.dusk; e.target.style.transform = 'none'; }}>
              Create free account
            </button>
            <button onClick={openSignin} style={{
              background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 16, fontWeight: 500,
              padding: '14px 32px', borderRadius: 9999, cursor: 'pointer', fontFamily: 'DM Sans',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.08)'}>
              Sign in
            </button>
          </div>

          {/* Social proof */}
          <div style={{ marginTop: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, animation: 'fadeUp 600ms 440ms both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex' }}>
                {['#C4956A','#8B6B3D','#4A8BC4','#C44A6B'].map((c,i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid #0B0F1A', marginLeft: i > 0 ? -8 : 0 }} />
                ))}
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Joined by <span style={{ color: '#fff', fontWeight: 600 }}>12,000+</span> travelers</span>
            </div>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#E8932A', fontSize: 14 }}>★★★★★</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>4.9 / 5</span>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.35 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', fontFamily: 'JetBrains Mono' }}>scroll</span>
          <div style={{ width: 1, height: 32, background: 'linear-gradient(to bottom, #fff, transparent)' }} />
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ background: C.parchment, padding: '96px 48px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 500, color: C.dusk, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Everything you need</div>
            <h2 style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 'clamp(36px,5vw,56px)', fontWeight: 200, color: C.midnight, lineHeight: 1.1 }}>
              One app for the<br/>whole journey
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ borderRadius: 20, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 12px rgba(11,15,26,0.08)' }}>
                <div style={{ height: 160, background: f.grad, position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,15,26,0.5) 0%, transparent 60%)' }} />
                  <div style={{ position: 'absolute', bottom: 14, left: 16 }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{f.label}</span>
                  </div>
                  <div style={{ position: 'absolute', top: 14, right: 16, textAlign: 'right' }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 600, color: '#fff' }}>{f.stat}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{f.statLabel}</div>
                  </div>
                </div>
                <div style={{ padding: '20px 20px 24px' }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: C.midnight, marginBottom: 8 }}>{f.title}</div>
                  <div style={{ fontSize: 14, color: C.slate600, lineHeight: 1.6 }}>{f.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ background: C.horizon, padding: '96px 48px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 'clamp(32px,4vw,48px)', fontWeight: 200, color: '#fff', lineHeight: 1.1 }}>Travelers love it</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: '28px 28px 24px' }}>
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: 24, fontStyle: 'italic' }}>"{t.text}"</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.dusk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#fff' }}>{t.name[0]}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{t.location}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 600, color: '#fff' }}>{t.trips}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>trips</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: C.midnight, padding: '96px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginBottom: 64 }}>
            {[['12K+','Travelers'],['180','Countries'],['Free','Forever']].map(([v,l]) => (
              <div key={l}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 28, fontWeight: 600, color: '#fff' }}>{v}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
          <h2 style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 'clamp(34px,5vw,52px)', fontWeight: 200, color: '#fff', lineHeight: 1.1, marginBottom: 18 }}>
            Your next trip is waiting.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 40, lineHeight: 1.6 }}>
            Create an account in seconds and start building your itinerary today.
          </p>
          <button onClick={openSignup} style={{
            background: C.dusk, border: 'none', color: '#fff', fontSize: 16, fontWeight: 600,
            padding: '15px 40px', borderRadius: 9999, cursor: 'pointer', fontFamily: 'DM Sans',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => e.target.style.background = C.duskDark}
          onMouseLeave={e => e.target.style.background = C.dusk}>
            Start planning for free
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#060a10', padding: '28px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Mark size={18} dark />
          <Wordmark size={12} dark />
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>© {new Date().getFullYear()} Away. All rights reserved.</p>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>v1.0.0</p>
      </footer>

      {/* Auth panel */}
      {authPanel && (
        <AuthPanel
          tab={authPanel}
          onClose={() => setAuthPanel(null)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  )
}
