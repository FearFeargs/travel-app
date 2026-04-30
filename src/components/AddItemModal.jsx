import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CommentThread from './CommentThread'

const TYPES = [
  { value: 'flight',    label: 'Flight',    color: '#EBF0F7' },
  { value: 'lodging',   label: 'Lodging',   color: '#F5F0E8' },
  { value: 'transport', label: 'Transport', color: '#EBF0F7' },
  { value: 'activity',  label: 'Activity',  color: '#F4F6F8' },
  { value: 'meal',      label: 'Meal',      color: '#F5F0E8' },
  { value: 'other',     label: 'Other',     color: '#F4F6F8' },
]

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #C4CDD8', fontSize: 14, color: '#0B0F1A',
  background: '#fff', outline: 'none', fontFamily: 'DM Sans, sans-serif',
  transition: 'border-color 150ms',
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#677585',
  letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6,
}

function focusDusk(e)  { e.target.style.borderColor = '#D95F2B' }
function blurSlate(e)  { e.target.style.borderColor = '#C4CDD8' }

const HOURS   = ['1','2','3','4','5','6','7','8','9','10','11','12']
const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55']

function timeToHHMM(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function TimeSelect({ value, onChange }) {
  let h = '', m = '00', ap = 'AM'
  if (value) {
    const [hh, mm] = value.split(':').map(Number)
    ap = hh >= 12 ? 'PM' : 'AM'
    h  = String(hh === 0 ? 12 : hh > 12 ? hh - 12 : hh)
    m  = String(mm).padStart(2, '0')
  }

  function emit(hour, min, ampm) {
    if (!hour) { onChange(''); return }
    let h24 = parseInt(hour)
    if (ampm === 'PM' && h24 !== 12) h24 += 12
    if (ampm === 'AM' && h24 === 12) h24 = 0
    onChange(`${String(h24).padStart(2, '0')}:${min}`)
  }

  const sel = { ...inputStyle, padding: '10px 8px', textAlign: 'center' }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <select value={h} onChange={e => emit(e.target.value, m, ap)}
        style={{ ...sel, flex: 2 }} onFocus={focusDusk} onBlur={blurSlate}>
        <option value="">--</option>
        {HOURS.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <select value={m} onChange={e => emit(h, e.target.value, ap)}
        style={{ ...sel, flex: 2 }} onFocus={focusDusk} onBlur={blurSlate}>
        {MINUTES.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <select value={ap} onChange={e => emit(h, m, e.target.value)}
        style={{ ...sel, flex: 1.5 }} onFocus={focusDusk} onBlur={blurSlate}>
        <option>AM</option>
        <option>PM</option>
      </select>
    </div>
  )
}

export default function AddItemModal({ open, onClose, day, tripId, userId, onAdded, item, onItemCommentAdded }) {
  const isEdit = Boolean(item)

  const [title, setTitle]         = useState('')
  const [itemType, setItemType]   = useState('activity')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime]     = useState('')
  const [location, setLocation]       = useState('')
  const [locationLat, setLocationLat] = useState(null)
  const [locationLng, setLocationLng] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSugs, setShowSugs]       = useState(false)
  const [notes, setNotes]         = useState('')
  const [cost, setCost]           = useState('')
  const [currency, setCurrency]   = useState('USD')
  const [url, setUrl]             = useState('')
  const [isProposal, setIsProposal] = useState(false)
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const geoDebounce = useRef(null)

  useEffect(() => {
    if (item) {
      setTitle(item.title || '')
      setItemType(item.item_type || 'activity')
      setStartTime(timeToHHMM(item.start_time))
      setEndTime(timeToHHMM(item.end_time))
      setLocation(item.location_name || '')
      setLocationLat(item.location_lat ?? null)
      setLocationLng(item.location_lng ?? null)
      setSuggestions([])
      setNotes(item.notes || '')
      setCost(item.cost_amount != null ? String(item.cost_amount) : '')
      setCurrency(item.cost_currency || 'USD')
      setUrl(item.url || '')
      setIsProposal(item.is_proposal || false)
      setError(null)
      setConfirmDelete(false)
    } else {
      reset()
    }
  }, [item, open])

  function reset() {
    setTitle(''); setItemType('activity'); setStartTime(''); setEndTime('')
    setLocation(''); setLocationLat(null); setLocationLng(null); setSuggestions([])
    setNotes(''); setCost(''); setCurrency('USD')
    setUrl(''); setIsProposal(false); setError(null); setConfirmDelete(false); setLoading(false)
  }

  function handleLocationChange(val) {
    setLocation(val)
    setLocationLat(null)
    setLocationLng(null)
    clearTimeout(geoDebounce.current)
    if (val.trim().length < 3) { setSuggestions([]); setShowSugs(false); return }
    geoDebounce.current = setTimeout(() => searchLocations(val), 300)
  }

  async function searchLocations(val) {
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
    const fsqKey      = import.meta.env.VITE_FSQ_KEY

    async function fetchMapbox() {
      if (!mapboxToken) return []
      const r = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json` +
        `?access_token=${mapboxToken}&limit=4&types=place,poi,address`
      )
      const data = await r.json()
      return (data.features || []).map(f => ({
        id:       f.id,
        name:     f.text,
        subtitle: f.place_name,
        lat:      f.center[1],
        lng:      f.center[0],
        source:   'mapbox',
      }))
    }

    async function fetchFSQ() {
      if (!fsqKey) return []
      const r = await fetch(
        `https://api.foursquare.com/v3/places/search` +
        `?query=${encodeURIComponent(val)}&limit=4&fields=name,categories,geocodes,location`,
        { headers: { Authorization: fsqKey, Accept: 'application/json' } }
      )
      if (!r.ok) return []
      const data = await r.json()
      return (data.results || [])
        .filter(p => p.geocodes?.main)
        .map(p => ({
          id:       p.fsq_id,
          name:     p.name,
          subtitle: p.location?.formatted_address || p.location?.locality || p.categories?.[0]?.name || '',
          lat:      p.geocodes.main.latitude,
          lng:      p.geocodes.main.longitude,
          source:   'foursquare',
        }))
    }

    const [fsqRes, mapboxRes] = await Promise.allSettled([fetchFSQ(), fetchMapbox()])
    const fsqResults    = fsqRes.status    === 'fulfilled' ? fsqRes.value    : []
    const mapboxResults = mapboxRes.status === 'fulfilled' ? mapboxRes.value : []

    // Foursquare results first (venue-precise), Mapbox fills in; dedupe by ~100m grid
    const seen = new Set()
    const merged = []
    for (const r of [...fsqResults, ...mapboxResults]) {
      const key = `${Math.round(r.lat * 1000)},${Math.round(r.lng * 1000)}`
      if (!seen.has(key)) { seen.add(key); merged.push(r) }
    }

    setSuggestions(merged.slice(0, 6))
    setShowSugs(merged.length > 0)
  }

  function selectSuggestion(result) {
    const city = result.subtitle?.split(',')[0] || ''
    setLocation(city ? `${result.name}, ${city}` : result.name)
    setLocationLat(result.lat)
    setLocationLng(result.lng)
    setSuggestions([])
    setShowSugs(false)
  }

  function handleClose() {
    if (loading) return
    reset(); onClose()
  }

  function combineDateTime(timeStr) {
    if (!timeStr || !day?.date) return null
    const [y, mo, d] = day.date.split('-').map(Number)
    const [h, m]     = timeStr.split(':').map(Number)
    return new Date(y, mo - 1, d, h, m).toISOString()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setError(null)
    setLoading(true)

    const fields = {
      title:         title.trim(),
      item_type:     itemType,
      start_time:    combineDateTime(startTime),
      end_time:      combineDateTime(endTime),
      location_name: location.trim() || null,
      location_lat:  locationLat,
      location_lng:  locationLng,
      notes:         notes.trim() || null,
      cost_amount:   cost ? parseFloat(cost) : null,
      cost_currency: currency,
      url:           url.trim() || null,
    }

    if (isEdit) {
      const { error: updateError } = await supabase
        .from('items').update(fields).eq('id', item.id)
      if (updateError) { setError(updateError.message); setLoading(false); return }
    } else {
      const { data: existingItems } = await supabase
        .from('items').select('order_index')
        .eq('day_id', day.id).order('order_index', { ascending: false }).limit(1)

      const nextIndex = existingItems?.[0]?.order_index != null
        ? existingItems[0].order_index + 1 : 0

      const { error: insertError } = await supabase.from('items').insert({
        ...fields,
        trip_id:            tripId,
        day_id:             day.id,
        order_index:        nextIndex,
        created_by_user_id: userId,
        is_proposal:        isProposal,
      })
      if (insertError) { setError(insertError.message); setLoading(false); return }
    }

    reset()
    onAdded()
    onClose()
  }

  async function handleDelete() {
    setLoading(true)
    const { error: deleteError } = await supabase
      .from('items').delete().eq('id', item.id)
    if (deleteError) { setError(deleteError.message); setLoading(false); return }
    reset()
    onAdded()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent style={{ borderRadius: 20, padding: '32px', maxWidth: 520, maxHeight: 'calc(90vh - 62px)', overflowY: 'auto', top: 'calc(50% + 31px)' }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 400, color: '#0B0F1A' }}>
            {isEdit ? 'Edit item' : `Add to ${day ? `Day ${day.day_number}` : 'itinerary'}`}
          </DialogTitle>
          {day && (
            <p style={{ fontSize: 13, color: '#8C97A6', marginTop: 2 }}>
              {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Type selector */}
          <div>
            <label style={labelStyle}>Type</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setItemType(t.value)}
                  style={{
                    padding: '7px 14px', borderRadius: 9999, fontSize: 13, fontWeight: 500,
                    background: itemType === t.value ? '#1C2E4A' : '#fff',
                    color: itemType === t.value ? '#fff' : '#475563',
                    border: `1.5px solid ${itemType === t.value ? '#1C2E4A' : '#C4CDD8'}`,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
                  }}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>Title</label>
            <input
              style={inputStyle} placeholder={
                itemType === 'flight' ? 'Flight LAX → Cabo' :
                itemType === 'lodging' ? 'Hotel check-in' :
                itemType === 'meal' ? 'Dinner at Casa Oaxaca' :
                itemType === 'activity' ? 'Snorkeling tour' :
                'Add a title'
              }
              value={title} onChange={e => setTitle(e.target.value)}
              onFocus={focusDusk} onBlur={blurSlate}
            />
          </div>

          {/* Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Start time <span style={{ color: '#A0ADBC', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <TimeSelect value={startTime} onChange={setStartTime} />
            </div>
            <div>
              <label style={labelStyle}>End time <span style={{ color: '#A0ADBC', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <TimeSelect value={endTime} onChange={setEndTime} />
            </div>
          </div>

          {/* Location with geocoding */}
          <div>
            <label style={labelStyle}>
              Location <span style={{ color: '#A0ADBC', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              {locationLat && locationLng && (
                <span style={{ marginLeft: 8, fontSize: 11, color: '#2A7D5F', fontWeight: 600, letterSpacing: 0, textTransform: 'none' }}>📍 Located</span>
              )}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, borderColor: locationLat && locationLng ? '#2A7D5F' : undefined }}
                placeholder="Search a place — e.g. Heathrow Terminal 5"
                value={location}
                onChange={e => handleLocationChange(e.target.value)}
                onFocus={e => { focusDusk(e); if (suggestions.length > 0) setShowSugs(true) }}
                onBlur={e => { blurSlate(e); setTimeout(() => setShowSugs(false), 150) }}
                autoComplete="off"
              />
              {showSugs && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
                  background: '#fff', borderRadius: 10, border: '1.5px solid #C4CDD8',
                  boxShadow: '0 8px 24px rgba(11,15,26,0.12)', overflow: 'hidden',
                }}>
                  {suggestions.map((result, i) => (
                    <button
                      key={result.id || i}
                      type="button"
                      onMouseDown={() => selectSuggestion(result)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '9px 14px', background: 'none', border: 'none',
                        cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                        borderBottom: i < suggestions.length - 1 ? '1px solid #F4F6F8' : 'none',
                        transition: 'background 80ms',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9F7F4'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#0B0F1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {result.name}
                        </div>
                        <div style={{ fontSize: 10, color: result.source === 'foursquare' ? '#D95F2B' : '#C4CDD8', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                          {result.source === 'foursquare' ? 'FSQ' : 'MAP'}
                        </div>
                      </div>
                      {result.subtitle && (
                        <div style={{ fontSize: 11, color: '#8C97A6', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {result.subtitle}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cost */}
          <div>
            <label style={labelStyle}>Cost <span style={{ color: '#A0ADBC', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={currency} onChange={e => setCurrency(e.target.value)}
                style={{ ...inputStyle, width: 90, flexShrink: 0 }}
                onFocus={focusDusk} onBlur={blurSlate}
              >
                {['USD','EUR','GBP','MXN','JPY','CAD','AUD'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={cost} onChange={e => setCost(e.target.value)}
                style={inputStyle} onFocus={focusDusk} onBlur={blurSlate}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes <span style={{ color: '#A0ADBC', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea rows={2} placeholder="Confirmation number, packing notes…"
              value={notes} onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={focusDusk} onBlur={blurSlate} />
          </div>

          {/* URL */}
          <div>
            <label style={labelStyle}>Link <span style={{ color: '#A0ADBC', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input style={inputStyle} placeholder="Booking confirmation URL"
              value={url} onChange={e => setUrl(e.target.value)}
              onFocus={focusDusk} onBlur={blurSlate} />
          </div>

          {/* Proposal toggle — new items only */}
          {!isEdit && (
            <button
              type="button"
              onClick={() => setIsProposal(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                border: `1.5px solid ${isProposal ? '#D95F2B' : '#E4E9EF'}`,
                background: isProposal ? '#FEF5F0' : '#F9F7F4',
                transition: 'all 150ms', textAlign: 'left',
              }}
            >
              {/* Toggle pill */}
              <div style={{
                width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                background: isProposal ? '#D95F2B' : '#C4CDD8',
                position: 'relative', transition: 'background 200ms',
              }}>
                <span style={{
                  position: 'absolute', top: 2,
                  left: isProposal ? 18 : 2,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 1px 3px rgba(11,15,26,0.2)',
                  transition: 'left 200ms', display: 'block',
                }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isProposal ? '#D95F2B' : '#475563' }}>
                  {isProposal ? 'Adding as proposal' : 'Add as proposal'}
                </div>
                <div style={{ fontSize: 12, color: '#8C97A6', marginTop: 1 }}>
                  {isProposal ? 'Group can approve or dismiss this suggestion.' : 'Suggest to the group before committing.'}
                </div>
              </div>
            </button>
          )}

          {/* Proposal banner — edit mode */}
          {isEdit && item?.is_proposal && (
            <div style={{ background: '#FEF5F0', border: '1.5px solid #F5C4A8', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#D95F2B' }}>This is a proposal</div>
                <div style={{ fontSize: 12, color: '#C47A40', marginTop: 1 }}>Approve it to add it to the confirmed itinerary.</div>
              </div>
            </div>
          )}

          {/* Item-level comments (edit mode only) */}
          {isEdit && item && (
            <div style={{ borderTop: '1px solid #F4F6F8', paddingTop: 20, marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#677585', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
                Comments
              </div>
              <CommentThread tripId={tripId} itemId={item.id} userId={userId} />
            </div>
          )}

          {error && (
            <div style={{ background: '#FCECEA', border: '1px solid #F5B8B4', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#C23B2E' }}>
              {error}
            </div>
          )}

          {/* Delete confirmation strip */}
          {isEdit && confirmDelete && (
            <div style={{ background: '#FCECEA', border: '1px solid #F5B8B4', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#C23B2E', fontWeight: 500 }}>Delete this item?</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-away-secondary" style={{ padding: '6px 14px', fontSize: 13 }}
                  onClick={() => setConfirmDelete(false)} disabled={loading}>Cancel</button>
                <button type="button" disabled={loading}
                  onClick={handleDelete}
                  style={{ padding: '6px 14px', fontSize: 13, fontWeight: 600, background: '#C23B2E', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
            {isEdit ? (
              <button type="button" disabled={loading || confirmDelete}
                onClick={() => setConfirmDelete(true)}
                style={{ fontSize: 13, color: '#C23B2E', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, padding: 0, opacity: confirmDelete ? 0.4 : 1 }}>
                Delete item
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-away-secondary" onClick={handleClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn-away-primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                {loading
                  ? (isEdit ? 'Saving…' : 'Adding…')
                  : isEdit
                    ? 'Save changes'
                    : isProposal ? 'Submit proposal' : 'Add to itinerary'}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
