import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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

export default function AddItemModal({ open, onClose, day, tripId, userId, onAdded, item }) {
  const isEdit = Boolean(item)

  const [title, setTitle]         = useState('')
  const [itemType, setItemType]   = useState('activity')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime]     = useState('')
  const [location, setLocation]   = useState('')
  const [notes, setNotes]         = useState('')
  const [cost, setCost]           = useState('')
  const [currency, setCurrency]   = useState('USD')
  const [url, setUrl]             = useState('')
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (item) {
      setTitle(item.title || '')
      setItemType(item.item_type || 'activity')
      setStartTime(timeToHHMM(item.start_time))
      setEndTime(timeToHHMM(item.end_time))
      setLocation(item.location_name || '')
      setNotes(item.notes || '')
      setCost(item.cost_amount != null ? String(item.cost_amount) : '')
      setCurrency(item.cost_currency || 'USD')
      setUrl(item.url || '')
      setError(null)
      setConfirmDelete(false)
    } else {
      reset()
    }
  }, [item, open])

  function reset() {
    setTitle(''); setItemType('activity'); setStartTime(''); setEndTime('')
    setLocation(''); setNotes(''); setCost(''); setCurrency('USD')
    setUrl(''); setError(null); setConfirmDelete(false); setLoading(false)
  }

  function handleClose() {
    if (loading) return
    reset(); onClose()
  }

  function combineDateTime(timeStr) {
    if (!timeStr || !day?.date) return null
    return `${day.date}T${timeStr}:00`
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
          <DialogTitle style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 400, color: '#0B0F1A' }}>
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

          {/* Location */}
          <div>
            <label style={labelStyle}>Location <span style={{ color: '#A0ADBC', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input style={inputStyle} placeholder="Terminal 5, Heathrow"
              value={location} onChange={e => setLocation(e.target.value)}
              onFocus={focusDusk} onBlur={blurSlate} />
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
                {loading ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save changes' : 'Add to itinerary')}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
