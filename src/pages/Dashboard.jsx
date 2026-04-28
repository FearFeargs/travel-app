import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/uploadImage'
import { useAuth } from '@/hooks/useAuth'
import { useImageBrightness } from '@/hooks/useImageBrightness'
import NavBar from '@/components/NavBar'
import NewTripModal from '@/components/NewTripModal'

const CARD_GRADIENT = 'linear-gradient(145deg,#2E5080 0%,#8B6B3D 55%,#C4956A 100%)'
const HERO_GRADIENT = 'linear-gradient(135deg,#1C2E4A 0%,#2E4A6B 100%)'

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Trip card ────────────────────────────────────────────────────────────────

function TripCard({ trip, onClick }) {
  const [hover, setHover] = useState(false)
  const isDark = useImageBrightness(trip.cover_image_url)
  const textColor   = isDark ? '#fff' : '#0B0F1A'
  const subColor    = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(11,15,26,0.55)'
  // Stronger overlay when image is light so text stays readable
  const overlayStop = isDark ? 'rgba(11,15,26,0.72)' : 'rgba(11,15,26,0.55)'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 16, overflow: 'hidden', cursor: 'pointer', position: 'relative', height: 240,
        boxShadow: hover ? '0 12px 32px rgba(11,15,26,0.18)' : '0 4px 16px rgba(11,15,26,0.10)',
        transform: hover ? 'translateY(-3px)' : 'none', transition: 'all 250ms',
      }}
    >
      {/* Background: photo or gradient */}
      {trip.cover_image_url ? (
        <img
          src={trip.cover_image_url}
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', transition: 'transform 400ms',
            transform: hover ? 'scale(1.04)' : 'scale(1)',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0, background: CARD_GRADIENT,
          transition: 'transform 400ms', transform: hover ? 'scale(1.04)' : 'scale(1)',
        }} />
      )}

      {/* Gradient overlay — heavier at bottom for text legibility */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to top, ${overlayStop} 0%, rgba(11,15,26,0.08) 55%, transparent 100%)`,
        transition: 'opacity 150ms',
      }} />

      {/* Text */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 18px' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 500, color: textColor, lineHeight: 1.2 }}>
          {trip.title}
        </div>
        <div style={{ fontSize: 13, color: subColor, marginTop: 5 }}>
          {trip.destination_summary} · {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard hero ────────────────────────────────────────────────────────────

function DashboardHero({ displayName, coverUrl, onCoverChange, onNewTrip }) {
  const fileRef   = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [hover, setHover]         = useState(false)
  const isDark    = useImageBrightness(coverUrl, 'top')
  const textColor = isDark ? '#fff' : '#0B0F1A'
  const subColor  = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(11,15,26,0.55)'

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const userId  = (await supabase.auth.getUser()).data.user?.id
      const url     = await uploadImage('images', `users/${userId}/dashboard-cover`, file)
      await supabase.from('users').update({ dashboard_cover_url: url }).eq('id', userId)
      onCoverChange(url)
    } catch (err) {
      setUploadError(err?.message || String(err))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div
      style={{ paddingTop: 62, position: 'relative', overflow: 'hidden' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Background */}
      {coverUrl ? (
        <img src={coverUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: HERO_GRADIENT }} />
      )}

      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: coverUrl
          ? (isDark ? 'rgba(11,15,26,0.45)' : 'rgba(11,15,26,0.30)')
          : 'transparent',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '56px 40px 64px' }}>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 48, fontWeight: 400, color: textColor, lineHeight: 1.1, marginBottom: 10 }}>
          {displayName ? `Good to see you, ${displayName.split(' ')[0]}.` : 'Your trips.'}
        </div>
        <p style={{ fontSize: 16, color: subColor, marginBottom: 28 }}>Everything in one place.</p>
        <button className="btn-away-primary" onClick={onNewTrip}>+ Plan a new trip</button>
      </div>

      {/* Upload cover button — appears on hover */}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFile} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        style={{
          position: 'absolute', top: 82, right: 40,
          padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: 'rgba(0,0,0,0.45)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', backdropFilter: 'blur(6px)',
          opacity: hover || uploading ? 1 : 0, transition: 'opacity 200ms',
        }}
      >{uploading ? 'Uploading…' : '⬆ Cover photo'}</button>
      {uploadError && (
        <div style={{ position: 'absolute', top: 118, right: 40, maxWidth: 300, padding: '10px 14px', borderRadius: 8, background: 'rgba(194,59,46,0.92)', color: '#fff', fontSize: 12, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, marginBottom: 3 }}>Upload failed</div>
          <div>{uploadError}</div>
          <div style={{ marginTop: 4, opacity: 0.75 }}>JPEG · PNG · WebP · Max 5 MB</div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName]   = useState('')
  const [coverUrl, setCoverUrl]         = useState(null)
  const [trips, setTrips]               = useState([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [modalOpen, setModalOpen]       = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('display_name, dashboard_cover_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name)
          setCoverUrl(data.dashboard_cover_url || null)
        }
      })

    supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setTrips(data)
        setTripsLoading(false)
      })
  }, [user])

  return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4' }}>
      <NavBar displayName={displayName} onNewTrip={() => setModalOpen(true)} />

      <DashboardHero
        displayName={displayName}
        coverUrl={coverUrl}
        onCoverChange={setCoverUrl}
        onNewTrip={() => setModalOpen(true)}
      />

      {/* Trips grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px 80px' }}>
        {tripsLoading ? (
          <div style={{ color: '#8C97A6', fontSize: 15 }}>Loading…</div>
        ) : trips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 28, fontWeight: 400, color: '#0B0F1A', marginBottom: 10 }}>Where to next?</div>
            <p style={{ fontSize: 15, color: '#677585', marginBottom: 28 }}>Your trips will appear here once you create one.</p>
            <button className="btn-away-primary" onClick={() => setModalOpen(true)}>Plan a trip</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, fontWeight: 500, color: '#0B0F1A' }}>Your trips</h2>
              <span style={{ fontSize: 14, color: '#8C97A6' }}>{trips.length} {trips.length === 1 ? 'trip' : 'trips'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {trips.map(trip => (
                <TripCard key={trip.id} trip={trip} onClick={() => navigate(`/trips/${trip.id}`)} />
              ))}
            </div>
          </>
        )}
      </div>

      <NewTripModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={trip => {
        setTrips(prev => [trip, ...prev])
      }} />
    </div>
  )
}
