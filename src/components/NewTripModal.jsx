import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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

export default function NewTripModal({ open, onClose }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function validate() {
    if (!title.trim()) return 'Title is required.'
    if (!destination.trim()) return 'Destination is required.'
    if (!startDate) return 'Start date is required.'
    if (!endDate) return 'End date is required.'
    if (endDate < startDate) return 'End date must be on or after the start date.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError(null)
    setLoading(true)

    const { data, error: rpcError } = await supabase.rpc('create_trip', {
      p_title: title.trim(),
      p_destination_summary: destination.trim(),
      p_start_date: startDate,
      p_end_date: endDate,
      p_description: description.trim() || null,
    })

    if (rpcError) { setError(rpcError.message); setLoading(false); return }
    navigate(`/trips/${data}`)
  }

  function handleClose() {
    if (loading) return
    setTitle(''); setDestination(''); setStartDate(''); setEndDate('')
    setDescription(''); setError(null); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent style={{ borderRadius: 20, padding: '32px', maxWidth: 480 }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 400, color: '#0B0F1A' }}>
            Plan a new trip
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Trip title</label>
            <input
              style={inputStyle} placeholder="Baja Spring Break 2027"
              value={title} onChange={e => setTitle(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#D95F2B'}
              onBlur={e => e.target.style.borderColor = '#C4CDD8'}
            />
          </div>

          <div>
            <label style={labelStyle}>Destination</label>
            <input
              style={inputStyle} placeholder="Baja California, Mexico"
              value={destination} onChange={e => setDestination(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#D95F2B'}
              onBlur={e => e.target.style.borderColor = '#C4CDD8'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Start date</label>
              <input
                type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#D95F2B'}
                onBlur={e => e.target.style.borderColor = '#C4CDD8'}
              />
            </div>
            <div>
              <label style={labelStyle}>End date</label>
              <input
                type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#D95F2B'}
                onBlur={e => e.target.style.borderColor = '#C4CDD8'}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes <span style={{ color: '#A0ADBC', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea
              placeholder="A week exploring the coast…"
              value={description} onChange={e => setDescription(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = '#D95F2B'}
              onBlur={e => e.target.style.borderColor = '#C4CDD8'}
            />
          </div>

          {error && (
            <div style={{ background: '#FCECEA', border: '1px solid #F5B8B4', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#C23B2E' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button type="button" className="btn-away-secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-away-primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating…' : 'Create trip'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
