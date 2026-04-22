import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import NavBar from '@/components/NavBar'
import AddItemModal from '@/components/AddItemModal'

// ── Helpers ─────────────────────────────────────────────────────

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

function diffDays(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 86400000) + 1
}

// ── Type config ─────────────────────────────────────────────────

const TYPE_CONFIG = {
  flight:    { label: 'Flight',    bg: '#EBF0F7', icon: '✈' },
  lodging:   { label: 'Lodging',   bg: '#F5F0E8', icon: '🏠' },
  transport: { label: 'Transport', bg: '#EBF0F7', icon: '🚗' },
  activity:  { label: 'Activity',  bg: '#F4F6F8', icon: '⊕' },
  meal:      { label: 'Meal',      bg: '#F5F0E8', icon: '🍽' },
  other:     { label: 'Other',     bg: '#F4F6F8', icon: '◎' },
}

// ── Item card ───────────────────────────────────────────────────

function ItemCard({ item }) {
  const [hover, setHover] = useState(false)
  const cfg = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.other

  const timeStr = formatTime(item.start_time)
  const endStr  = formatTime(item.end_time)
  const subtitle = [
    timeStr && (endStr ? `${timeStr} – ${endStr}` : timeStr),
    item.location_name,
  ].filter(Boolean).join(' · ')

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff', borderRadius: 14,
        padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: hover ? '0 4px 16px rgba(11,15,26,0.10)' : '0 2px 8px rgba(11,15,26,0.07)',
        cursor: 'pointer', transition: 'box-shadow 150ms',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: cfg.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>{cfg.icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#0B0F1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 13, color: '#677585', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtitle}
          </div>
        )}
        {item.notes && (
          <div style={{ fontSize: 12, color: '#A0ADBC', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.notes}
          </div>
        )}
      </div>

      {item.cost_amount != null && (
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600, color: '#0B0F1A', flexShrink: 0 }}>
          {item.cost_currency === 'USD' ? '$' : item.cost_currency + ' '}
          {Number(item.cost_amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </div>
      )}

      {item.url && (
        <a
          href={item.url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ color: '#D95F2B', fontSize: 12, fontWeight: 500, flexShrink: 0, textDecoration: 'none' }}
        >Link ↗</a>
      )}

      <div style={{ color: '#C4CDD8', fontSize: 20, flexShrink: 0 }}>›</div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [trip, setTrip]               = useState(null)
  const [days, setDays]               = useState([])
  const [items, setItems]             = useState([])
  const [activeDay, setActiveDay]     = useState(0)
  const [loading, setLoading]         = useState(true)
  const [modalOpen, setModalOpen]     = useState(false)

  const loadItems = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('trip_id', id)
      .order('order_index', { ascending: true })
    if (data) setItems(data)
  }, [id])

  useEffect(() => {
    if (!user) return

    supabase.from('users').select('display_name').eq('id', user.id).single()
      .then(({ data }) => { if (data) setDisplayName(data.display_name) })

    Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('days').select('*').eq('trip_id', id).order('day_number', { ascending: true }),
    ]).then(([tripRes, daysRes]) => {
      if (!tripRes.error) setTrip(tripRes.data)
      if (!daysRes.error) setDays(daysRes.data ?? [])
      setLoading(false)
    })

    loadItems()
  }, [id, user, loadItems])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4' }}>
      <NavBar displayName={displayName} />
      <div style={{ paddingTop: 62 + 48, maxWidth: 1200, margin: '0 auto', padding: '110px 40px', color: '#8C97A6' }}>Loading…</div>
    </div>
  )

  if (!trip) return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4' }}>
      <NavBar displayName={displayName} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '110px 40px' }}>
        <p style={{ color: '#677585', marginBottom: 16 }}>Trip not found.</p>
        <button className="btn-away-secondary" onClick={() => navigate('/dashboard')}>Back to trips</button>
      </div>
    </div>
  )

  const nights = diffDays(trip.start_date, trip.end_date)
  const activeDay_obj = days[activeDay] ?? null
  const dayItems = activeDay_obj
    ? items.filter(i => i.day_id === activeDay_obj.id)
    : []

  const totalCost = items.reduce((sum, i) => sum + (parseFloat(i.cost_amount) || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4' }}>
      <NavBar displayName={displayName} />

      {/* Hero */}
      <div style={{ height: 320, position: 'relative', overflow: 'hidden', marginTop: 62 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,#2E5080 0%,#8B6B3D 55%,#C4956A 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(11,15,26,0.25) 0%, rgba(11,15,26,0.65) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 40px 32px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 52, fontWeight: 400, color: '#fff', lineHeight: 1.1 }}>{trip.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>
                  {formatDateLong(trip.start_date)} → {formatDateLong(trip.end_date)} · {nights} {nights === 1 ? 'night' : 'nights'}
                </span>
                {trip.destination_summary && (
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{trip.destination_summary}</span>
                )}
              </div>
            </div>
            <button className="btn-away-secondary" onClick={() => navigate('/dashboard')} style={{ flexShrink: 0 }}>
              ← All trips
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 40px 80px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>

        {/* Left: itinerary */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {days.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', textAlign: 'center', boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#0B0F1A', marginBottom: 8 }}>No days yet</div>
              <p style={{ fontSize: 14, color: '#677585' }}>This trip was created before day generation was added. Create a new trip to get a full itinerary.</p>
            </div>
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
                    <div style={{ fontSize: 13, fontWeight: activeDay === i ? 600 : 400 }}>{formatDateShort(day.date)}</div>
                  </button>
                ))}
              </div>

              {/* Items for active day */}
              <div className="fade-in" key={activeDay}>
                {activeDay_obj && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#8C97A6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                    {formatDateShort(activeDay_obj.date)}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dayItems.length === 0 && (
                    <div style={{ color: '#A0ADBC', fontSize: 14, padding: '8px 0' }}>Nothing planned yet.</div>
                  )}
                  {dayItems.map(item => (
                    <ItemCard key={item.id} item={item} />
                  ))}

                  {/* Add item button */}
                  <button
                    onClick={() => setModalOpen(true)}
                    style={{
                      background: '#fff', border: '2px dashed #C4CDD8', borderRadius: 14,
                      padding: '16px 20px', fontSize: 14, color: '#8C97A6',
                      cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#D95F2B'; e.currentTarget.style.color = '#D95F2B' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#C4CDD8'; e.currentTarget.style.color = '#8C97A6' }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add activity
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: sidebar */}
        <div style={{ width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Budget card */}
          <div style={{ background: '#1C2E4A', borderRadius: 16, padding: '22px 22px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
              Total budget
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 32, fontWeight: 600, color: '#fff', marginBottom: 16 }}>
              ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>

            {/* Per-type breakdown */}
            {(() => {
              const byType = {}
              items.forEach(i => {
                if (!i.cost_amount) return
                byType[i.item_type] = (byType[i.item_type] || 0) + parseFloat(i.cost_amount)
              })
              const entries = Object.entries(byType).sort((a, b) => b[1] - a[1])
              if (entries.length === 0) return (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Add items with costs to see a breakdown.</p>
              )
              return entries.map(([type, amount]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{TYPE_CONFIG[type]?.label || type}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: '#fff' }}>
                    ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))
            })()}
          </div>

          {/* Trip info */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0B0F1A', marginBottom: 14 }}>Trip details</div>
            {[
              ['Destination', trip.destination_summary],
              ['Start', trip.start_date ? formatDateShort(trip.start_date) : '—'],
              ['End', trip.end_date ? formatDateShort(trip.end_date) : '—'],
              ['Duration', `${nights} ${nights === 1 ? 'night' : 'nights'}`],
              ['Items', `${items.length} planned`],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F4F6F8' }}>
                <span style={{ fontSize: 13, color: '#8C97A6' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0B0F1A' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Members placeholder */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0B0F1A', marginBottom: 8 }}>Travelers</div>
            <p style={{ fontSize: 13, color: '#8C97A6' }}>Invite and manage members — coming soon.</p>
          </div>
        </div>
      </div>

      {/* Add item modal */}
      {activeDay_obj && (
        <AddItemModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          day={activeDay_obj}
          tripId={id}
          userId={user?.id}
          onAdded={loadItems}
        />
      )}
    </div>
  )
}
