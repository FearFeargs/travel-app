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

function focusDusk(e) { e.target.style.borderColor = '#D95F2B' }
function blurSlate(e) { e.target.style.borderColor = '#C4CDD8' }

function MiniAvatar({ name, size = 24 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#D95F2B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.43), fontWeight: 600, color: '#fff', flexShrink: 0,
    }}>{name ? name.charAt(0).toUpperCase() : '?'}</div>
  )
}

export default function AddExpenseModal({ open, onClose, tripId, userId, onAdded, expense, members = [] }) {
  const isEdit   = Boolean(expense)
  const hasGroup = members.length >= 2

  const [description, setDescription]     = useState('')
  const [amount, setAmount]               = useState('')
  const [currency, setCurrency]           = useState('USD')
  const [date, setDate]                   = useState('')
  const [notes, setNotes]                 = useState('')
  const [paidBy, setPaidBy]               = useState(userId)
  const [splitMode, setSplitMode]         = useState('even')
  const [includedIds, setIncludedIds]     = useState([])
  const [customAmounts, setCustomAmounts] = useState({})
  const [error, setError]                 = useState(null)
  const [loading, setLoading]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    const memberIds = members.map(m => m.user_id)
    if (expense) {
      setDescription(expense.description || '')
      setAmount(expense.amount != null ? String(expense.amount) : '')
      setCurrency(expense.currency || 'USD')
      setDate(expense.expense_date || '')
      setNotes(expense.notes || '')
      setPaidBy(expense.paid_by_user_id || userId)
      setError(null); setConfirmDelete(false)
      if (hasGroup) {
        supabase.from('expense_splits').select('*').eq('expense_id', expense.id).then(({ data }) => {
          if (!data || data.length === 0) {
            setSplitMode('even'); setIncludedIds(memberIds); setCustomAmounts({}); return
          }
          const ids = data.map(s => s.user_id)
          setIncludedIds(ids)
          const amts = {}
          data.forEach(s => { amts[s.user_id] = String(s.share_amount) })
          setCustomAmounts(amts)
          const vals = data.map(s => parseFloat(s.share_amount))
          setSplitMode(vals.length > 1 && vals.every(v => Math.abs(v - vals[0]) < 0.02) ? 'even' : 'custom')
        })
      }
    } else {
      setDescription(''); setAmount(''); setCurrency('USD')
      setDate(new Date().toISOString().slice(0, 10))
      setNotes(''); setPaidBy(userId); setSplitMode('even')
      setIncludedIds(memberIds); setCustomAmounts({})
      setError(null); setConfirmDelete(false); setLoading(false)
    }
  }, [open, expense, userId, members, hasGroup])

  function toggleMember(uid) {
    setIncludedIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])
  }

  const parsedAmount = parseFloat(amount) || 0
  const n            = includedIds.length
  const customTotal  = Object.values(customAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const customValid  = parsedAmount === 0 || Math.abs(customTotal - parsedAmount) < 0.02

  function buildSplits(expenseId) {
    if (!hasGroup) return [{ expense_id: expenseId, user_id: userId, share_amount: parsedAmount }]
    if (splitMode === 'even') {
      if (n === 0) return []
      const base      = Math.floor(parsedAmount * 100 / n) / 100
      const remainder = Math.round((parsedAmount - base * n) * 100) / 100
      return includedIds.map((uid, i) => ({
        expense_id: expenseId, user_id: uid,
        share_amount: i === 0 ? base + remainder : base,
      }))
    }
    return Object.entries(customAmounts)
      .filter(([, v]) => parseFloat(v) > 0)
      .map(([uid, v]) => ({ expense_id: expenseId, user_id: uid, share_amount: parseFloat(v) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!description.trim())          { setError('Description is required.'); return }
    if (!amount || parsedAmount <= 0) { setError('Enter a valid amount.'); return }
    if (!date)                        { setError('Date is required.'); return }
    if (hasGroup && splitMode === 'custom' && !customValid) {
      setError(`Custom split must sum to ${parsedAmount.toFixed(2)} (currently ${customTotal.toFixed(2)}).`); return
    }
    setError(null); setLoading(true)

    const fields = {
      description: description.trim(), amount: parsedAmount, currency,
      expense_date: date, notes: notes.trim() || null, paid_by_user_id: paidBy,
    }

    let expenseId = expense?.id
    if (isEdit) {
      const { error: e } = await supabase.from('expenses').update(fields).eq('id', expenseId)
      if (e) { setError(e.message); setLoading(false); return }
      await supabase.from('expense_splits').delete().eq('expense_id', expenseId)
    } else {
      const { data: ins, error: e } = await supabase
        .from('expenses').insert({ ...fields, trip_id: tripId }).select('id').single()
      if (e) { setError(e.message); setLoading(false); return }
      expenseId = ins.id
    }

    const splits = buildSplits(expenseId)
    if (splits.length > 0) {
      const { error: se } = await supabase.from('expense_splits').insert(splits)
      if (se) { setError(se.message); setLoading(false); return }
    }
    setLoading(false); onAdded(); onClose()
  }

  async function handleDelete() {
    setLoading(true)
    await supabase.from('expense_splits').delete().eq('expense_id', expense.id)
    const { error: e } = await supabase.from('expenses').delete().eq('id', expense.id)
    if (e) { setError(e.message); setLoading(false); return }
    onAdded(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={() => { if (!loading) onClose() }}>
      <DialogContent style={{ borderRadius: 20, padding: '32px', maxWidth: 480, maxHeight: 'calc(92vh - 62px)', overflowY: 'auto', top: 'calc(50% + 31px)' }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 400, color: '#0B0F1A' }}>
            {isEdit ? 'Edit expense' : 'Add expense'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            <label style={labelStyle}>Description</label>
            <input style={inputStyle} placeholder="Dinner, taxi, entrance fee…"
              value={description} onChange={e => setDescription(e.target.value)}
              onFocus={focusDusk} onBlur={blurSlate} />
          </div>

          <div>
            <label style={labelStyle}>Amount</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                style={{ ...inputStyle, width: 90, flexShrink: 0 }} onFocus={focusDusk} onBlur={blurSlate}>
                {['USD','EUR','GBP','MXN','JPY','CAD','AUD'].map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="number" min="0" step="0.01" placeholder="0.00"
                value={amount} onChange={e => setAmount(e.target.value)}
                style={inputStyle} onFocus={focusDusk} onBlur={blurSlate} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={inputStyle} onFocus={focusDusk} onBlur={blurSlate} />
          </div>

          {hasGroup && (
            <div>
              <label style={labelStyle}>Paid by</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {members.map(m => {
                  const name   = m.users?.display_name || 'Unknown'
                  const active = paidBy === m.user_id
                  return (
                    <button key={m.user_id} type="button" onClick={() => setPaidBy(m.user_id)} style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 9999,
                      border: `1.5px solid ${active ? '#1C2E4A' : '#C4CDD8'}`,
                      background: active ? '#1C2E4A' : '#fff', color: active ? '#fff' : '#475563',
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
                    }}>
                      <MiniAvatar name={name} size={20} />
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {hasGroup && parsedAmount > 0 && (
            <div style={{ background: '#F9F7F4', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ ...labelStyle, margin: 0 }}>Split between</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['even', 'custom'].map(mode => (
                    <button key={mode} type="button" onClick={() => setSplitMode(mode)} style={{
                      padding: '5px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
                      background: splitMode === mode ? '#1C2E4A' : '#fff',
                      color: splitMode === mode ? '#fff' : '#8C97A6',
                      border: `1.5px solid ${splitMode === mode ? '#1C2E4A' : '#C4CDD8'}`,
                      cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
                    }}>{mode === 'even' ? 'Even' : 'Custom'}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {members.map(m => {
                  const name     = m.users?.display_name || 'Unknown'
                  const uid      = m.user_id
                  const included = includedIds.includes(uid)
                  return (
                    <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button type="button" onClick={() => toggleMember(uid)} style={{
                        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${included ? '#D95F2B' : '#C4CDD8'}`,
                        background: included ? '#D95F2B' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 150ms',
                      }}>
                        {included && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                      <MiniAvatar name={name} size={26} />
                      <span style={{ flex: 1, fontSize: 14, color: included ? '#0B0F1A' : '#A0ADBC', fontWeight: included ? 500 : 400 }}>{name}</span>
                      {splitMode === 'even' ? (
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: included ? '#0B0F1A' : '#C4CDD8', minWidth: 68, textAlign: 'right' }}>
                          {included && n > 0 ? `$${(parsedAmount / n).toFixed(2)}` : '—'}
                        </span>
                      ) : (
                        <input type="number" min="0" step="0.01" placeholder="0.00"
                          value={customAmounts[uid] || ''}
                          onChange={e => setCustomAmounts(prev => ({ ...prev, [uid]: e.target.value }))}
                          style={{ width: 82, padding: '6px 10px', borderRadius: 8, textAlign: 'right', border: '1.5px solid #C4CDD8', fontSize: 13, color: '#0B0F1A', background: '#fff', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }} />
                      )}
                    </div>
                  )
                })}
              </div>

              {splitMode === 'custom' && parsedAmount > 0 && (
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: customValid ? '#E8F5F0' : '#FEF3E2' }}>
                  <span style={{ fontSize: 12, color: customValid ? '#2A7D5F' : '#C47A10' }}>
                    {customValid ? '✓ Balanced' : `${Math.abs(parsedAmount - customTotal).toFixed(2)} remaining`}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: customValid ? '#2A7D5F' : '#C47A10' }}>
                    {customTotal.toFixed(2)} / {parsedAmount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label style={labelStyle}>Notes <span style={{ color: '#A0ADBC', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea rows={2} placeholder="Split details, receipt notes…"
              value={notes} onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={focusDusk} onBlur={blurSlate} />
          </div>

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
              <button type="button" disabled={loading || confirmDelete} onClick={() => setConfirmDelete(true)}
                style={{ fontSize: 13, color: '#C23B2E', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, padding: 0, opacity: confirmDelete ? 0.4 : 1 }}>
                Delete expense
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-away-secondary" onClick={onClose} disabled={loading}>Cancel</button>
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
