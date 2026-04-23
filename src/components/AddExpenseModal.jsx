import { useState, useEffect } from 'react'
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

function focusDusk(e)  { e.target.style.borderColor = '#D95F2B' }
function blurSlate(e)  { e.target.style.borderColor = '#C4CDD8' }

export default function AddExpenseModal({ open, onClose, tripId, userId, onAdded, expense }) {
  const isEdit = Boolean(expense)

  const [description, setDescription] = useState('')
  const [amount, setAmount]           = useState('')
  const [currency, setCurrency]       = useState('USD')
  const [date, setDate]               = useState('')
  const [notes, setNotes]             = useState('')
  const [error, setError]             = useState(null)
  const [loading, setLoading]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (expense) {
      setDescription(expense.description || '')
      setAmount(expense.amount != null ? String(expense.amount) : '')
      setCurrency(expense.currency || 'USD')
      setDate(expense.expense_date || '')
      setNotes(expense.notes || '')
      setError(null)
      setConfirmDelete(false)
    } else {
      reset()
    }
  }, [expense, open])

  function reset() {
    setDescription(''); setAmount(''); setCurrency('USD')
    setDate(new Date().toISOString().slice(0, 10))
    setNotes(''); setError(null); setConfirmDelete(false); setLoading(false)
  }

  function handleClose() {
    if (loading) return
    reset(); onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!description.trim()) { setError('Description is required.'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount.'); return }
    if (!date) { setError('Date is required.'); return }
    setError(null)
    setLoading(true)

    const fields = {
      description:    description.trim(),
      amount:         parseFloat(amount),
      currency,
      expense_date:   date,
      notes:          notes.trim() || null,
    }

    if (isEdit) {
      const { error: updateError } = await supabase
        .from('expenses').update(fields).eq('id', expense.id)
      if (updateError) { setError(updateError.message); setLoading(false); return }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('expenses')
        .insert({ ...fields, trip_id: tripId, paid_by_user_id: userId })
        .select('id')
        .single()

      if (insertError) { setError(insertError.message); setLoading(false); return }

      // Record a split for the payer covering the full amount
      await supabase.from('expense_splits').insert({
        expense_id:   inserted.id,
        user_id:      userId,
        share_amount: parseFloat(amount),
      })
    }

    reset()
    onAdded()
    onClose()
  }

  async function handleDelete() {
    setLoading(true)
    const { error: deleteError } = await supabase
      .from('expenses').delete().eq('id', expense.id)
    if (deleteError) { setError(deleteError.message); setLoading(false); return }
    reset()
    onAdded()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent style={{ borderRadius: 20, padding: '32px', maxWidth: 480, maxHeight: 'calc(90vh - 62px)', overflowY: 'auto', top: 'calc(50% + 31px)' }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 400, color: '#0B0F1A' }}>
            {isEdit ? 'Edit expense' : 'Add expense'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <input style={inputStyle} placeholder="Dinner, taxi, entrance fee…"
              value={description} onChange={e => setDescription(e.target.value)}
              onFocus={focusDusk} onBlur={blurSlate} />
          </div>

          {/* Amount */}
          <div>
            <label style={labelStyle}>Amount</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                style={{ ...inputStyle, width: 90, flexShrink: 0 }}
                onFocus={focusDusk} onBlur={blurSlate}>
                {['USD','EUR','GBP','MXN','JPY','CAD','AUD'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input type="number" min="0" step="0.01" placeholder="0.00"
                value={amount} onChange={e => setAmount(e.target.value)}
                style={inputStyle} onFocus={focusDusk} onBlur={blurSlate} />
            </div>
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={inputStyle}
              onFocus={focusDusk}
              onBlur={blurSlate}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes <span style={{ color: '#A0ADBC', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea rows={2} placeholder="Split details, receipt notes…"
              value={notes} onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={focusDusk} onBlur={blurSlate} />
          </div>

          {/* Splits notice */}
          {!isEdit && (
            <div style={{ background: '#F4F6F8', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#677585' }}>
              Recorded as paid by you. Expense splitting across travelers coming soon.
            </div>
          )}

          {error && (
            <div style={{ background: '#FCECEA', border: '1px solid #F5B8B4', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#C23B2E' }}>
              {error}
            </div>
          )}

          {isEdit && confirmDelete && (
            <div style={{ background: '#FCECEA', border: '1px solid #F5B8B4', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#C23B2E', fontWeight: 500 }}>Delete this expense?</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-away-secondary" style={{ padding: '6px 14px', fontSize: 13 }}
                  onClick={() => setConfirmDelete(false)} disabled={loading}>Cancel</button>
                <button type="button" disabled={loading} onClick={handleDelete}
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
                Delete expense
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-away-secondary" onClick={handleClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn-away-primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save changes' : 'Add expense')}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
