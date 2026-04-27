import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #C4CDD8', fontSize: 14, color: '#0B0F1A',
  background: '#fff', outline: 'none', fontFamily: 'DM Sans, sans-serif',
  transition: 'border-color 150ms',
}

export default function DeleteTripModal({ open, onClose, trip, userEmail, onDeleted }) {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  function handleClose() {
    if (loading) return
    setPassword(''); setError(null); onClose()
  }

  async function handleConfirm(e) {
    e.preventDefault()
    if (!password) { setError('Password is required.'); return }
    setLoading(true); setError(null)

    // Re-authenticate to verify identity
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    })

    if (authError) {
      setError('Incorrect password. Please try again.')
      setLoading(false)
      return
    }

    // Delete the trip — cascade handles days, items, expenses, comments
    const { error: deleteError } = await supabase
      .from('trips')
      .delete()
      .eq('id', trip.id)

    if (deleteError) {
      setError(deleteError.message)
      setLoading(false)
      return
    }

    setPassword(''); setError(null)
    onDeleted()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent style={{ borderRadius: 20, padding: '32px', maxWidth: 460, top: 'calc(50% + 31px)' }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 400, color: '#0B0F1A' }}>
            Delete trip
          </DialogTitle>
        </DialogHeader>

        <div style={{ marginTop: 8 }}>
          <div style={{ background: '#FCECEA', border: '1px solid #F5B8B4', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#C23B2E', marginBottom: 4 }}>
              This cannot be undone
            </div>
            <div style={{ fontSize: 13, color: '#677585', lineHeight: 1.5 }}>
              Deleting <strong style={{ color: '#0B0F1A' }}>{trip?.title}</strong> will permanently remove all days, itinerary items, expenses, and comments.
            </div>
          </div>

          <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#677585', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                Confirm with your password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C23B2E'}
                onBlur={e => e.target.style.borderColor = '#C4CDD8'}
              />
            </div>

            {error && (
              <div style={{ fontSize: 13, color: '#C23B2E', background: '#FCECEA', border: '1px solid #F5B8B4', borderRadius: 8, padding: '10px 14px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-away-secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !password}
                style={{
                  padding: '10px 20px', borderRadius: 9999, fontSize: 13, fontWeight: 600,
                  background: loading || !password ? '#E8A09A' : '#C23B2E',
                  color: '#fff', border: 'none', cursor: loading || !password ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif', transition: 'background 150ms',
                }}
              >
                {loading ? 'Verifying…' : 'Delete trip'}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
