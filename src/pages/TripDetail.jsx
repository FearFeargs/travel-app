import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import NavBar from '@/components/NavBar'
import AddItemModal from '@/components/AddItemModal'
import AddExpenseModal from '@/components/AddExpenseModal'
import CommentPanel from '@/components/CommentPanel'

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

function formatExpenseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function diffDays(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 86400000) + 1
}

function fmtMoney(n, decimals = 0) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
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

function ItemCard({ item, onClick }) {
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
      onClick={onClick}
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
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#677585', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          {fmtMoney(item.cost_amount)}
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

// ── Expense card ─────────────────────────────────────────────────

function ExpenseCard({ expense, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff', borderRadius: 14, padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: hover ? '0 4px 16px rgba(11,15,26,0.10)' : '0 2px 8px rgba(11,15,26,0.07)',
        cursor: 'pointer', transition: 'box-shadow 150ms',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        💸
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#0B0F1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {expense.description}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#8C97A6', marginTop: 3 }}>
          {formatExpenseDate(expense.expense_date)} · Paid by you
        </div>
        {expense.notes && (
          <div style={{ fontSize: 12, color: '#A0ADBC', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {expense.notes}
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600, color: '#0B0F1A', flexShrink: 0 }}>
        {expense.currency === 'USD' ? '$' : expense.currency + ' '}{fmtMoney(expense.amount)}
      </div>
      <div style={{ color: '#C4CDD8', fontSize: 20, flexShrink: 0 }}>›</div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuth()

  const [displayName, setDisplayName]   = useState('')
  const [trip, setTrip]                 = useState(null)
  const [days, setDays]                 = useState([])
  const [items, setItems]               = useState([])
  const [expenses, setExpenses]         = useState([])
  const [activeDay, setActiveDay]       = useState(0)
  const [activeView, setActiveView]     = useState('itinerary')
  const [loading, setLoading]           = useState(true)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingItem, setEditingItem]   = useState(null)
  const [expenseModal, setExpenseModal]     = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [budgetEditing, setBudgetEditing]   = useState(false)
  const [budgetInput, setBudgetInput]       = useState('')
  const [budgetCurrencyInput, setBudgetCurrencyInput] = useState('USD')
  const [commentPanelOpen, setCommentPanelOpen] = useState(false)
  const [commentCount, setCommentCount]     = useState(0)
  const [recentComments, setRecentComments] = useState([])

  const loadItems = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('trip_id', id)
      .order('order_index', { ascending: true })
    if (data) setItems(data)
  }, [id])

  const loadExpenses = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', id)
      .order('expense_date', { ascending: true })
    if (data) setExpenses(data)
  }, [id])

  const loadCommentPreview = useCallback(async () => {
    if (!id) return
    const { data, count } = await supabase
      .from('comments')
      .select('id, body, created_at, users(display_name)', { count: 'exact' })
      .eq('trip_id', id)
      .is('item_id', null)
      .order('created_at', { ascending: false })
      .limit(2)
    if (count != null) setCommentCount(count)
    if (data) setRecentComments(data.reverse())
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
    loadExpenses()
    loadCommentPreview()
  }, [id, user, loadItems, loadExpenses, loadCommentPreview])

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

  const nights      = diffDays(trip.start_date, trip.end_date)
  const activeDay_obj = days[activeDay] ?? null
  const dayItems    = activeDay_obj
    ? items
        .filter(i => i.day_id === activeDay_obj.id)
        .sort((a, b) => {
          if (!a.start_time && !b.start_time) return 0
          if (!a.start_time) return 1
          if (!b.start_time) return -1
          return new Date(a.start_time) - new Date(b.start_time)
        })
    : []

  const plannedTotal = items.reduce((sum, i) => sum + (parseFloat(i.cost_amount) || 0), 0)
  const spentTotal   = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const totalUsed    = plannedTotal + spentTotal
  const budget       = parseFloat(trip?.budget_amount) || 0
  const rawBarPct    = budget > 0 ? (totalUsed / budget) * 100 : 0
  const barPct       = Math.min(100, rawBarPct)
  const budgetStatus = budget > 0 ? (rawBarPct >= 100 ? 'exceeded' : rawBarPct >= 80 ? 'warning' : 'ok') : 'unset'
  const barColor     = budgetStatus === 'exceeded' ? '#C23B2E' : budgetStatus === 'warning' ? '#E8932A' : '#D95F2B'

  async function saveBudget() {
    const amount = parseFloat(budgetInput)
    if (!amount || amount <= 0) return
    const { error } = await supabase
      .from('trips')
      .update({ budget_amount: amount, budget_currency: budgetCurrencyInput })
      .eq('id', id)
    if (!error) {
      setTrip(t => ({ ...t, budget_amount: amount, budget_currency: budgetCurrencyInput }))
      setBudgetEditing(false)
    }
  }

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

        {/* Left: main content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {['itinerary', 'expenses'].map(v => (
              <button key={v} onClick={() => setActiveView(v)} style={{
                padding: '9px 20px', borderRadius: 9999, fontSize: 13, fontWeight: 600,
                background: activeView === v ? '#1C2E4A' : '#fff',
                color: activeView === v ? '#fff' : '#677585',
                border: `1.5px solid ${activeView === v ? '#1C2E4A' : '#C4CDD8'}`,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
              }}>
                {v === 'itinerary' ? 'Itinerary' : `Expenses${expenses.length > 0 ? ` (${expenses.length})` : ''}`}
              </button>
            ))}
          </div>

          {/* ── Itinerary view ── */}
          {activeView === 'itinerary' && (
            days.length === 0 ? (
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
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: activeDay === i ? 600 : 400 }}>{formatDateShort(day.date)}</div>
                    </button>
                  ))}
                </div>

                {/* Items for active day */}
                <div className="fade-in" key={activeDay}>
                  {activeDay_obj && (
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#8C97A6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                      {formatDateShort(activeDay_obj.date)}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {dayItems.length === 0 && (
                      <div style={{ color: '#A0ADBC', fontSize: 14, padding: '8px 0' }}>Nothing planned yet.</div>
                    )}
                    {dayItems.map(item => (
                      <ItemCard key={item.id} item={item} onClick={() => setEditingItem(item)} />
                    ))}
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
            )
          )}

          {/* ── Expenses view ── */}
          {activeView === 'expenses' && (
            <div className="fade-in">
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#8C97A6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · ${fmtMoney(spentTotal)} total
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {expenses.length === 0 && (
                  <div style={{ color: '#A0ADBC', fontSize: 14, padding: '8px 0' }}>No expenses recorded yet.</div>
                )}
                {expenses.map(expense => (
                  <ExpenseCard key={expense.id} expense={expense} onClick={() => setEditingExpense(expense)} />
                ))}
                <button
                  onClick={() => setExpenseModal(true)}
                  style={{
                    background: '#fff', border: '2px dashed #C4CDD8', borderRadius: 14,
                    padding: '16px 20px', fontSize: 14, color: '#8C97A6',
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#D95F2B'; e.currentTarget.style.color = '#D95F2B' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#C4CDD8'; e.currentTarget.style.color = '#8C97A6' }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add expense
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div style={{ width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Budget card */}
          <div style={{ background: '#1C2E4A', borderRadius: 16, padding: '22px 22px 24px' }}>

            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                Trip budget
              </div>
              {!budgetEditing && budget > 0 && (
                <button
                  onClick={() => { setBudgetInput(String(trip.budget_amount)); setBudgetCurrencyInput(trip.budget_currency || 'USD'); setBudgetEditing(true) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', padding: '2px 6px', borderRadius: 6, transition: 'color 150ms' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >Edit</button>
              )}
            </div>

            {/* Inline editor */}
            {budgetEditing ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <select value={budgetCurrencyInput} onChange={e => setBudgetCurrencyInput(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontFamily: 'DM Sans, sans-serif', fontSize: 13, padding: '8px 10px', outline: 'none', width: 76, flexShrink: 0 }}>
                    {['USD','EUR','GBP','MXN','JPY','CAD','AUD'].map(c => <option key={c} style={{ color: '#0B0F1A' }}>{c}</option>)}
                  </select>
                  <input
                    type="number" min="0" step="1" placeholder="0"
                    value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveBudget(); if (e.key === 'Escape') setBudgetEditing(false) }}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 600, padding: '8px 12px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setBudgetEditing(false)}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    Cancel
                  </button>
                  <button onClick={saveBudget}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#D95F2B', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    Save
                  </button>
                </div>
              </div>
            ) : budget > 0 ? (
              <>
                {/* Budget target + planned bar */}
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 32, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                  {trip.budget_currency === 'USD' ? '$' : trip.budget_currency + ' '}{fmtMoney(budget)}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: budgetStatus === 'ok' ? 'rgba(255,255,255,0.45)' : barColor, marginBottom: 10, transition: 'color 300ms' }}>
                  ${fmtMoney(totalUsed)} of ${fmtMoney(budget)} · {Math.round(rawBarPct)}%
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ height: '100%', width: `${barPct}%`, background: barColor, borderRadius: 3, transition: 'width 600ms ease, background 300ms' }} />
                </div>

                {/* Planned vs spent breakdown */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  {plannedTotal > 0 && (
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Planned</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>${fmtMoney(plannedTotal)}</div>
                    </div>
                  )}
                  {spentTotal > 0 && (
                    <div style={{ textAlign: plannedTotal > 0 ? 'right' : 'left' }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Spent</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>${fmtMoney(spentTotal, 2)}</div>
                    </div>
                  )}
                </div>

                {budgetStatus === 'warning' && (
                  <div style={{ background: 'rgba(232,147,42,0.18)', border: '1px solid rgba(232,147,42,0.35)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>⚠</span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#E8932A', fontWeight: 500 }}>Approaching budget — {Math.round(rawBarPct)}% planned</span>
                  </div>
                )}
                {budgetStatus === 'exceeded' && (
                  <div style={{ background: 'rgba(194,59,46,0.18)', border: '1px solid rgba(194,59,46,0.35)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🚨</span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#F28070', fontWeight: 500 }}>
                      Over budget by {trip.budget_currency === 'USD' ? '$' : trip.budget_currency + ' '}{fmtMoney(totalUsed - budget, 2)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => { setBudgetInput(''); setBudgetCurrencyInput('USD'); setBudgetEditing(true) }}
                style={{ width: '100%', marginTop: 8, marginBottom: 8, padding: '14px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: 'none', color: 'rgba(255,255,255,0.5)', border: '2px dashed rgba(255,255,255,0.2)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
              >
                + Set a budget
              </button>
            )}

            {/* Per-category breakdown of itinerary costs */}
            {(() => {
              const byType = {}
              items.forEach(i => {
                if (!i.cost_amount) return
                byType[i.item_type] = (byType[i.item_type] || 0) + parseFloat(i.cost_amount)
              })
              const entries = Object.entries(byType).sort((a, b) => b[1] - a[1])
              if (entries.length === 0) return null
              return entries.map(([type, amount]) => {
                const pct = plannedTotal > 0 ? Math.round((amount / plannedTotal) * 100) : 0
                return (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{TYPE_CONFIG[type]?.label || type}</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{pct}%</div>
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: '#fff' }}>
                      ${fmtMoney(amount)}
                    </span>
                  </div>
                )
              })
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
              ['Expenses', expenses.length > 0 ? `${expenses.length} recorded` : null],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F4F6F8' }}>
                <span style={{ fontSize: 13, color: '#8C97A6' }}>{label}</span>
                <span style={{ fontFamily: label === 'Items' || label === 'Expenses' || label === 'Duration' ? 'JetBrains Mono, monospace' : 'inherit', fontSize: 13, fontWeight: 500, color: '#0B0F1A' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Discussion card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0B0F1A' }}>
                Discussion
                {commentCount > 0 && (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#8C97A6', marginLeft: 8 }}>
                    {commentCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setCommentPanelOpen(true)}
                style={{ fontSize: 13, color: '#D95F2B', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, padding: 0 }}
              >{commentCount > 0 ? 'View all →' : 'Open →'}</button>
            </div>

            {recentComments.length === 0 ? (
              <p style={{ fontSize: 13, color: '#A0ADBC', margin: 0 }}>No comments yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentComments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', background: '#D95F2B',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0,
                    }}>
                      {(c.users?.display_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#475563', marginBottom: 1 }}>{c.users?.display_name || 'Unknown'}</div>
                      <div style={{ fontSize: 12, color: '#677585', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setCommentPanelOpen(true)}
              style={{
                marginTop: 12, width: '100%', padding: '10px', borderRadius: 9,
                fontSize: 13, fontWeight: 500, background: '#F9F7F4',
                color: '#475563', border: '1.5px solid #E4E9EF',
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#D95F2B'; e.currentTarget.style.color = '#D95F2B' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E4E9EF'; e.currentTarget.style.color = '#475563' }}
            >+ Add comment</button>
          </div>

          {/* Members placeholder */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0B0F1A', marginBottom: 8 }}>Travelers</div>
            <p style={{ fontSize: 13, color: '#8C97A6' }}>Invite and manage members — coming soon.</p>
          </div>
        </div>
      </div>

      {/* Add / edit item modal */}
      {activeDay_obj && (
        <AddItemModal
          open={modalOpen || editingItem !== null}
          onClose={() => { setModalOpen(false); setEditingItem(null) }}
          day={activeDay_obj}
          tripId={id}
          userId={user?.id}
          onAdded={loadItems}
          item={editingItem}
        />
      )}

      {/* Add / edit expense modal */}
      <AddExpenseModal
        open={expenseModal || editingExpense !== null}
        onClose={() => { setExpenseModal(false); setEditingExpense(null) }}
        tripId={id}
        userId={user?.id}
        onAdded={loadExpenses}
        expense={editingExpense}
      />

      {/* Trip discussion panel */}
      <CommentPanel
        open={commentPanelOpen}
        onClose={() => { setCommentPanelOpen(false); loadCommentPreview() }}
        tripId={id}
        userId={user?.id}
        tripTitle={trip.title}
      />
    </div>
  )
}
