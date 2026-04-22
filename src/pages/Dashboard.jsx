import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import NavBar from '@/components/NavBar'
import NewTripModal from '@/components/NewTripModal'

function TripCard({ trip, onClick }) {
  const [hover, setHover] = useState(false)

  function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const gradient = 'linear-gradient(145deg,#2E5080 0%,#8B6B3D 55%,#C4956A 100%)'

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
      <div style={{ position: 'absolute', inset: 0, background: gradient, transition: 'transform 400ms', transform: hover ? 'scale(1.04)' : 'scale(1)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(11,15,26,0.78) 0%,rgba(11,15,26,0.15) 55%,transparent 100%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 18px' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 400, color: '#fff', lineHeight: 1.2 }}>{trip.title}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 5 }}>
          {trip.destination_summary} · {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const user = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [trips, setTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setDisplayName(data.display_name) })

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

      {/* Hero */}
      <div style={{ background: '#1C2E4A', paddingTop: 62 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 40px 64px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '5%', top: '10%', width: 360, height: 360, borderRadius: '50%', background: 'rgba(217,95,43,0.07)', pointerEvents: 'none' }} />
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 48, fontWeight: 400, color: '#fff', lineHeight: 1.1, marginBottom: 10 }}>
            {displayName ? `Good to see you, ${displayName.split(' ')[0]}.` : 'Your trips.'}
          </div>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', marginBottom: 28 }}>
            Everything in one place.
          </p>
          <button className="btn-away-primary" onClick={() => setModalOpen(true)}>
            + Plan a new trip
          </button>
        </div>
      </div>

      {/* Trips grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px 80px' }}>
        {tripsLoading ? (
          <div style={{ color: '#8C97A6', fontSize: 15 }}>Loading…</div>
        ) : trips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, color: '#0B0F1A', marginBottom: 10 }}>Where to next?</div>
            <p style={{ fontSize: 15, color: '#677585', marginBottom: 28 }}>Your trips will appear here once you create one.</p>
            <button className="btn-away-primary" onClick={() => setModalOpen(true)}>Plan a trip</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, color: '#0B0F1A' }}>Your trips</h2>
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

      <NewTripModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
