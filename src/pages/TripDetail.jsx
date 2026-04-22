import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import NavBar from '@/components/NavBar'

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function diffDays(start, end) {
  const a = new Date(start), b = new Date(end)
  return Math.round((b - a) / 86400000) + 1
}

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase.from('users').select('display_name').eq('id', user.id).single()
      .then(({ data }) => { if (data) setDisplayName(data.display_name) })

    supabase.from('trips').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (!error) setTrip(data)
        setLoading(false)
      })
  }, [id, user])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4', paddingTop: 62 }}>
      <NavBar displayName={displayName} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px', color: '#8C97A6' }}>Loading…</div>
    </div>
  )

  if (!trip) return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4', paddingTop: 62 }}>
      <NavBar displayName={displayName} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px' }}>
        <p style={{ color: '#677585', marginBottom: 16 }}>Trip not found.</p>
        <button className="btn-away-secondary" onClick={() => navigate('/dashboard')}>Back to trips</button>
      </div>
    </div>
  )

  const nights = diffDays(trip.start_date, trip.end_date)

  return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4' }}>
      <NavBar displayName={displayName} />

      {/* Hero */}
      <div style={{ height: 320, position: 'relative', overflow: 'hidden', paddingTop: 62 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,#2E5080 0%,#8B6B3D 55%,#C4956A 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(11,15,26,0.3) 0%, rgba(11,15,26,0.62) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 40px 36px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 52, fontWeight: 400, color: '#fff', lineHeight: 1.1 }}>{trip.title}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 10, letterSpacing: '0.04em' }}>
                {formatDateShort(trip.start_date)} → {formatDateShort(trip.end_date)} · {nights} {nights === 1 ? 'night' : 'nights'}
              </div>
            </div>
            <button className="btn-away-secondary" onClick={() => navigate('/dashboard')} style={{ flexShrink: 0 }}>
              ← All trips
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 80px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>

        {/* Main column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {trip.destination_summary && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8C97A6' }}>Destination</span>
              <p style={{ fontSize: 16, color: '#0B0F1A', marginTop: 4 }}>{trip.destination_summary}</p>
            </div>
          )}
          {trip.description && (
            <div style={{ marginBottom: 28, padding: '16px 20px', background: '#F5F0E8', borderRadius: 12 }}>
              <p style={{ fontSize: 15, color: '#475563', lineHeight: 1.6 }}>{trip.description}</p>
            </div>
          )}

          {/* Itinerary placeholder */}
          <div style={{ marginTop: trip.description ? 0 : 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 400, color: '#0B0F1A' }}>Itinerary</h2>
            </div>
            <div style={{ background: '#fff', border: '2px dashed #C4CDD8', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#0B0F1A', marginBottom: 8 }}>Nothing planned yet</div>
              <p style={{ fontSize: 14, color: '#677585' }}>Days and activities will appear here.</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Trip info card */}
          <div style={{ background: '#1C2E4A', borderRadius: 16, padding: '22px 22px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>Trip dates</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 16 }}>
              {nights} {nights === 1 ? 'night' : 'nights'}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
              {[
                ['From', formatDate(trip.start_date)],
                ['To', formatDate(trip.end_date)],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Members placeholder */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0B0F1A', marginBottom: 14 }}>Travelers</div>
            <p style={{ fontSize: 13, color: '#8C97A6' }}>Member management coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
