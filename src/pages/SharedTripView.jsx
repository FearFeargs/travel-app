import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const TYPE_CONFIG = {
  flight:    { label: 'Flight',    bg: '#EBF0F7', icon: '✈' },
  lodging:   { label: 'Lodging',   bg: '#F5F0E8', icon: '🏠' },
  transport: { label: 'Transport', bg: '#EBF0F7', icon: '🚗' },
  activity:  { label: 'Activity',  bg: '#F4F6F8', icon: '⊕' },
  meal:      { label: 'Meal',      bg: '#F5F0E8', icon: '🍽' },
  other:     { label: 'Other',     bg: '#F4F6F8', icon: '◎' },
}

const LogoMark = () => (
  <svg width="22" height="27.5" viewBox="0 0 32 40" fill="none">
    <polygon points="16,2 20,20 16,17 12,20" fill="#D95F2B"/>
    <polygon points="16,38 20,20 16,23 12,20" fill="#1C2E4A" opacity="0.35"/>
    <circle cx="16" cy="20" r="2.2" fill="#1C2E4A"/>
    <circle cx="16" cy="20" r="1" fill="#F9F7F4"/>
  </svg>
)

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatDateLong(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function formatTime(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtMoney(n) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function diffDays(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 86400000) + 1
}

export default function SharedTripView() {
  const { id } = useParams()

  const [trip, setTrip]       = useState(null)
  const [days, setDays]       = useState([])
  const [items, setItems]     = useState([])
  const [activeDay, setActiveDay] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: tripData, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .eq('is_public', true)
        .single()

      if (error || !tripData) { setNotFound(true); setLoading(false); return }
      setTrip(tripData)

      const [{ data: daysData }, { data: itemsData }] = await Promise.all([
        supabase.from('days').select('*').eq('trip_id', id).order('day_number', { ascending: true }),
        supabase.from('items').select('*').eq('trip_id', id).order('order_index', { ascending: true }),
      ])
      setDays(daysData ?? [])
      setItems(itemsData ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#8C97A6', fontSize: 15, fontFamily: 'DM Sans, sans-serif' }}>Loading…</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <LogoMark />
      <div style={{ marginTop: 24, fontFamily: "'Josefin Sans', sans-serif", fontSize: 24, fontWeight: 400, color: '#0B0F1A', marginBottom: 8 }}>Trip not found</div>
      <p style={{ color: '#677585', fontSize: 14, marginBottom: 24 }}>This itinerary is private or no longer exists.</p>
      <Link to="/" style={{ color: '#D95F2B', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Go to Away →</Link>
    </div>
  )

  const nights = diffDays(trip.start_date, trip.end_date)
  const activeDay_obj = days[activeDay] ?? null
  const dayItems = activeDay_obj
    ? items
        .filter(i => i.day_id === activeDay_obj.id)
        .sort((a, b) => {
          if (!a.start_time && !b.start_time) return 0
          if (!a.start_time) return 1
          if (!b.start_time) return -1
          return new Date(a.start_time) - new Date(b.start_time)
        })
    : []

  return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Minimal nav */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px',
        background: 'rgba(249,247,244,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #E4E9EF',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <LogoMark />
          <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 14, fontWeight: 300, textTransform: 'uppercase', color: '#0B0F1A', display: 'inline-flex', alignItems: 'center', gap: '0.18em' }}>
            <span>a</span><span style={{ display: 'inline-block', transform: 'scaleX(-1)', minWidth: '0.8em', textAlign: 'center' }}>w</span><span>a</span><span>y</span>
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#8C97A6', fontFamily: 'JetBrains Mono, monospace' }}>Read-only view</span>
          <Link
            to="/signup"
            style={{ padding: '8px 18px', borderRadius: 9999, fontSize: 13, fontWeight: 600, background: '#D95F2B', color: '#fff', textDecoration: 'none' }}
          >Plan your own →</Link>
        </div>
      </header>

      {/* Hero */}
      <div style={{ height: 300, position: 'relative', overflow: 'hidden', marginTop: 58 }}>
        {trip.cover_image_url ? (
          <img src={trip.cover_image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,#2E5080 0%,#8B6B3D 55%,#C4956A 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(11,15,26,0.28) 0%, rgba(11,15,26,0.65) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 40px 32px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 48, fontWeight: 400, color: '#fff', lineHeight: 1.1 }}>{trip.title}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
              {formatDateLong(trip.start_date)} → {formatDateLong(trip.end_date)} · {nights} {nights === 1 ? 'night' : 'nights'}
              {trip.destination_summary && <span style={{ marginLeft: 12, opacity: 0.7 }}>{trip.destination_summary}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 40px 80px' }}>

        {days.length === 0 ? (
          <div style={{ color: '#8C97A6', fontSize: 15, textAlign: 'center', paddingTop: 40 }}>No itinerary days yet.</div>
        ) : (
          <>
            {/* Day tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
              {days.map((day, i) => (
                <button
                  key={day.id}
                  onClick={() => setActiveDay(i)}
                  style={{
                    padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms', border: 'none',
                    background: activeDay === i ? '#1C2E4A' : '#fff',
                    color: activeDay === i ? '#fff' : '#475563',
                    outline: `1.5px solid ${activeDay === i ? '#1C2E4A' : '#C4CDD8'}`,
                    boxShadow: '0 1px 4px rgba(11,15,26,0.06)',
                  }}
                >
                  <div style={{ fontSize: 10, opacity: 0.65, marginBottom: 2, fontWeight: 500 }}>Day {day.day_number}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: activeDay === i ? 600 : 400 }}>{formatDateShort(day.date)}</div>
                </button>
              ))}
            </div>

            {/* Items */}
            {activeDay_obj && (
              <>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#8C97A6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  {formatDateShort(activeDay_obj.date)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720 }}>
                  {dayItems.length === 0 ? (
                    <div style={{ color: '#A0ADBC', fontSize: 14 }}>Nothing planned for this day.</div>
                  ) : dayItems.map(item => {
                    const cfg = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.other
                    const timeStr = formatTime(item.start_time)
                    const endStr  = formatTime(item.end_time)
                    const subtitle = [
                      timeStr && (endStr ? `${timeStr} – ${endStr}` : timeStr),
                      item.location_name,
                    ].filter(Boolean).join(' · ')
                    return (
                      <div key={item.id} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{cfg.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#0B0F1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                          {subtitle && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#677585', marginTop: 3 }}>{subtitle}</div>}
                          {item.notes && <div style={{ fontSize: 12, color: '#A0ADBC', marginTop: 3 }}>{item.notes}</div>}
                        </div>
                        {item.cost_amount != null && (
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600, color: '#0B0F1A', flexShrink: 0 }}>
                            {item.cost_currency === 'USD' ? '$' : item.cost_currency + ' '}{fmtMoney(item.cost_amount)}
                          </div>
                        )}
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            style={{ color: '#D95F2B', fontSize: 12, fontWeight: 500, flexShrink: 0, textDecoration: 'none' }}>↗</a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* CTA footer */}
        <div style={{ marginTop: 64, background: '#1C2E4A', borderRadius: 20, padding: '40px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
          <div>
            <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 22, fontWeight: 400, color: '#fff', marginBottom: 8 }}>Plan your own trip with Away</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>Collaborative itineraries, budget tracking, and more.</div>
          </div>
          <Link
            to="/signup"
            style={{ padding: '13px 28px', borderRadius: 9999, fontSize: 14, fontWeight: 600, background: '#D95F2B', color: '#fff', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}
          >Get started free →</Link>
        </div>
      </div>
    </div>
  )
}
