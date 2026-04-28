import { useEffect, useRef, useState, useMemo } from 'react'
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
  const overlayStop = isDark ? 'rgba(11,15,26,0.72)' : 'rgba(11,15,26,0.55)'

  const today = new Date().toISOString().slice(0, 10)
  const isUpcoming = trip.start_date >= today
  const isPast     = trip.end_date < today
  const statusLabel = isPast ? 'Past' : isUpcoming ? 'Upcoming' : 'Active'
  const statusColor = isPast ? '#8C97A6' : isUpcoming ? '#2A7D5F' : '#D95F2B'
  const statusBg    = isPast ? '#F4F6F8'  : isUpcoming ? '#E8F5F0' : '#FEF5F0'

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

      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to top, ${overlayStop} 0%, rgba(11,15,26,0.08) 55%, transparent 100%)`,
      }} />

      {/* Status badge */}
      <div style={{ position: 'absolute', top: 14, left: 14 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 9999,
          fontSize: 11, fontWeight: 600, padding: '3px 10px',
          background: statusBg, color: statusColor,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block', flexShrink: 0 }} />
          {statusLabel}
        </span>
      </div>

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

// ── Hero search bar ───────────────────────────────────────────────────────────

function HeroSearch({ onSearch }) {
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate]     = useState('')
  const [endDate, setEndDate]         = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onSearch({ destination, startDate, endDate })
  }

  const fieldStyle = {
    flex: 1, padding: '14px 20px', borderRight: '1px solid #E4E9EF', cursor: 'text',
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#fff', borderRadius: 16, display: 'flex', alignItems: 'stretch',
        overflow: 'hidden', boxShadow: '0 8px 32px rgba(11,15,26,0.28)',
        maxWidth: 700, margin: '0 auto',
      }}
    >
      {/* Destination */}
      <div style={fieldStyle}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#8C97A6', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Destination</div>
        <input
          type="text"
          placeholder="Anywhere"
          value={destination}
          onChange={e => setDestination(e.target.value)}
          style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, color: '#0B0F1A', background: 'transparent', fontFamily: 'DM Sans, sans-serif' }}
        />
      </div>

      {/* Depart */}
      <div style={{ ...fieldStyle }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#8C97A6', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Depart</div>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, color: startDate ? '#0B0F1A' : '#A0ADBC', background: 'transparent', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer' }}
        />
      </div>

      {/* Return */}
      <div style={{ ...fieldStyle, borderRight: 'none' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#8C97A6', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Return</div>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, color: endDate ? '#0B0F1A' : '#A0ADBC', background: 'transparent', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer' }}
        />
      </div>

      {/* Submit */}
      <div style={{ padding: '10px 12px 10px 8px', display: 'flex', alignItems: 'center' }}>
        <button
          type="submit"
          className="btn-away-primary"
          style={{ padding: '12px 22px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          Plan
        </button>
      </div>
    </form>
  )
}

// ── Dashboard hero ────────────────────────────────────────────────────────────

function DashboardHero({ displayName, coverUrl, onCoverChange, onSearch }) {
  const fileRef   = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [hover, setHover]         = useState(false)
  const isDark    = useImageBrightness(coverUrl, 'top')
  const textColor = isDark ? '#fff' : '#fff'
  const subColor  = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.75)'

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

  const firstName = displayName ? displayName.split(' ')[0] : null

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

      {/* Overlay — always dark enough for white text */}
      <div style={{
        position: 'absolute', inset: 0,
        background: coverUrl ? 'rgba(11,15,26,0.48)' : 'transparent',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '64px 40px 72px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 52, fontWeight: 400, color: textColor, lineHeight: 1.1, marginBottom: 12 }}>
          {firstName ? `Where to next, ${firstName}?` : 'Where to next?'}
        </div>
        <p style={{ fontSize: 17, color: subColor, marginBottom: 36 }}>
          Flights, stays, and experiences — all in one place.
        </p>
        <HeroSearch onSearch={onSearch} />

        {/* Quick links */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 22, flexWrap: 'wrap' }}>
          {['🌍 Anywhere', '🌸 Spring deals', '✈️ Weekend escape', '🏝 Beach'].map(tag => (
            <button
              key={tag}
              onClick={() => onSearch({ destination: tag.split(' ').slice(1).join(' '), startDate: '', endDate: '' })}
              style={{
                background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 9999, padding: '7px 16px', fontSize: 13, color: 'rgba(255,255,255,0.9)',
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)' }}
            >{tag}</button>
          ))}
        </div>
      </div>

      {/* Upload cover button */}
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
  const [activeTab, setActiveTab]       = useState('all')
  const [searchInit, setSearchInit]     = useState({ destination: '', startDate: '', endDate: '' })

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

  const today = new Date().toISOString().slice(0, 10)
  const filteredTrips = useMemo(() => {
    if (activeTab === 'upcoming') return trips.filter(t => t.start_date >= today)
    if (activeTab === 'past')     return trips.filter(t => t.end_date < today)
    return trips
  }, [trips, activeTab, today])

  function handleSearch({ destination, startDate, endDate }) {
    setSearchInit({ destination, startDate, endDate })
    setModalOpen(true)
  }

  const tabs = [
    { id: 'all',      label: 'All trips' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past',     label: 'Past' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4' }}>
      <NavBar displayName={displayName} onNewTrip={() => setModalOpen(true)} />

      <DashboardHero
        displayName={displayName}
        coverUrl={coverUrl}
        onCoverChange={setCoverUrl}
        onSearch={handleSearch}
      />

      {/* Trips section */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px 80px' }}>

        {tripsLoading ? (
          <div style={{ color: '#8C97A6', fontSize: 15 }}>Loading…</div>
        ) : trips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, fontWeight: 500, color: '#0B0F1A', marginBottom: 10 }}>No trips yet</div>
            <p style={{ fontSize: 15, color: '#677585', marginBottom: 28 }}>Use the search above to plan your first trip.</p>
            <button className="btn-away-primary" onClick={() => setModalOpen(true)}>Plan a trip</button>
          </div>
        ) : (
          <>
            {/* Section header + tab filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, fontWeight: 500, color: '#0B0F1A' }}>Your trips</h2>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#8C97A6' }}>{filteredTrips.length} of {trips.length}</span>
            </div>

            {/* Category tabs — underline style */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1.5px solid #E4E9EF', marginBottom: 32, marginTop: 8 }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 20px 11px', background: 'none', border: 'none',
                    borderBottom: activeTab === tab.id ? '2px solid #D95F2B' : '2px solid transparent',
                    marginBottom: -1.5,
                    fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
                    color: activeTab === tab.id ? '#0B0F1A' : '#8C97A6',
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#475563' }}
                  onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#8C97A6' }}
                >{tab.label}</button>
              ))}
            </div>

            {filteredTrips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#8C97A6', fontSize: 15 }}>
                No {activeTab} trips.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {filteredTrips.map(trip => (
                  <TripCard key={trip.id} trip={trip} onClick={() => navigate(`/trips/${trip.id}`)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <NewTripModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSearchInit({ destination: '', startDate: '', endDate: '' }) }}
        initialDestination={searchInit.destination}
        initialStartDate={searchInit.startDate}
        initialEndDate={searchInit.endDate}
        onCreated={trip => {
          setTrips(prev => [trip, ...prev])
        }}
      />
    </div>
  )
}
