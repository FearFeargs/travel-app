import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useRef } from 'react'
import NavBar from '@/components/NavBar'
import AddItemModal from '@/components/AddItemModal'
import AddExpenseModal from '@/components/AddExpenseModal'
import CommentPanel from '@/components/CommentPanel'
import DeleteTripModal from '@/components/DeleteTripModal'
import { uploadImage } from '@/lib/uploadImage'
import { useImageBrightness } from '@/hooks/useImageBrightness'
import TripMap from '@/components/TripMap'

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

// ── Balance calculator ───────────────────────────────────────────

function calcSettlements(expenses, allSplits, members) {
  // debt[debtorId][creditorId] = amount debtor owes creditor
  const debt = {}
  for (const exp of expenses) {
    const payerId = exp.paid_by_user_id
    if (!payerId) continue
    for (const split of allSplits.filter(s => s.expense_id === exp.id)) {
      if (split.user_id === payerId) continue
      const d = split.user_id
      if (!debt[d]) debt[d] = {}
      debt[d][payerId] = (debt[d][payerId] || 0) + parseFloat(split.share_amount)
    }
  }
  const settlements = []
  const seen = new Set()
  for (const [debtorId, creditors] of Object.entries(debt)) {
    for (const [creditorId] of Object.entries(creditors)) {
      const key = [debtorId, creditorId].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      const ab = debt[debtorId]?.[creditorId] || 0
      const ba = debt[creditorId]?.[debtorId] || 0
      const net = ab - ba
      if (Math.abs(net) < 0.005) continue
      const fromId = net > 0 ? debtorId : creditorId
      const toId   = net > 0 ? creditorId : debtorId
      const from   = members.find(m => m.user_id === fromId)
      const to     = members.find(m => m.user_id === toId)
      if (from && to) settlements.push({ from, to, amount: Math.abs(net) })
    }
  }
  return settlements.sort((a, b) => b.amount - a.amount)
}

// ── Expense card ─────────────────────────────────────────────────

function ExpenseCard({ expense, onClick, payerName, splitCount }) {
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
          {formatExpenseDate(expense.expense_date)}
          {payerName && <> · <span style={{ color: '#677585' }}>Paid by {payerName}</span></>}
          {splitCount > 1 && <span style={{ color: '#A0ADBC' }}> · {splitCount} ways</span>}
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
  const [deleteTripOpen, setDeleteTripOpen]   = useState(false)
  const [heroHover, setHeroHover]             = useState(false)
  const [coverUploading, setCoverUploading]   = useState(false)
  const [coverUploadError, setCoverUploadError] = useState(null)
  const coverFileRef  = useRef(null)
  const heroIsDark    = useImageBrightness(trip?.cover_image_url)
  const [members, setMembers]               = useState([])
  const [allSplits, setAllSplits]           = useState([])
  const [invites, setInvites]               = useState([])
  const [inviteEmail, setInviteEmail]       = useState('')
  const [inviteRole, setInviteRole]         = useState('editor')
  const [inviteSending, setInviteSending]   = useState(false)
  const [inviteError, setInviteError]       = useState(null)
  const [copiedToken, setCopiedToken]       = useState(null)
  const [addingDay, setAddingDay]           = useState(false)
  const [sharecopied, setShareCopied]       = useState(false)

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
    if (data) {
      setExpenses(data)
      if (data.length > 0) {
        const expIds = data.map(e => e.id)
        const { data: splits } = await supabase
          .from('expense_splits').select('*').in('expense_id', expIds)
        if (splits) setAllSplits(splits)
      } else {
        setAllSplits([])
      }
    }
  }, [id])

  const loadMembers = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('trip_members')
      .select('user_id, role, joined_at, users(display_name, avatar_url)')
      .eq('trip_id', id)
    if (data) setMembers(data)
  }, [id])

  const loadInvites = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('invites')
      .select('id, email, role, token, accepted_at, expires_at')
      .eq('trip_id', id)
      .order('created_at', { ascending: false })
    if (data) setInvites(data)
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
    loadInvites()
    loadMembers()
  }, [id, user, loadItems, loadExpenses, loadCommentPreview, loadInvites, loadMembers])

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

  const confirmedItems  = dayItems.filter(i => !i.is_proposal)
  const proposalItems   = items.filter(i => i.is_proposal)  // all days
  const dayProposals    = dayItems.filter(i => i.is_proposal)

  const plannedTotal = items.filter(i => !i.is_proposal).reduce((sum, i) => sum + (parseFloat(i.cost_amount) || 0), 0)
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

  const isOwner = trip?.owner_id === user?.id

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    setCoverUploadError(null)
    try {
      const url = await uploadImage('images', `trips/${id}/cover`, file)
      await supabase.from('trips').update({ cover_image_url: url }).eq('id', id)
      setTrip(t => ({ ...t, cover_image_url: url }))
    } catch (err) {
      setCoverUploadError(err?.message || String(err))
    } finally {
      setCoverUploading(false)
      e.target.value = ''
    }
  }

  async function sendInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteSending(true); setInviteError(null)

    const token     = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase.from('invites').insert({
      trip_id:            id,
      email:              inviteEmail.trim().toLowerCase(),
      invited_by_user_id: user.id,
      role:               inviteRole,
      token,
      expires_at:         expiresAt,
    })
    if (error) { setInviteError(error.message); setInviteSending(false); return }

    const { error: fnError } = await supabase.functions.invoke('send-invite', {
      body: {
        email:       inviteEmail.trim().toLowerCase(),
        inviterName: displayName || 'A traveler',
        tripTitle:   trip.title,
        token,
        appUrl:      window.location.origin,
      },
    })

    if (fnError) {
      setInviteError('Invite saved — but the email failed to send. Share the link manually.')
    }

    setInviteEmail('')
    await loadInvites()
    setInviteSending(false)
  }

  async function approveProposal(itemId) {
    await supabase.from('items').update({ is_proposal: false }).eq('id', itemId)
    loadItems()
  }

  async function dismissProposal(itemId) {
    await supabase.from('items').delete().eq('id', itemId)
    loadItems()
  }

  async function handleAddDay() {
    if (addingDay || days.length === 0) return
    setAddingDay(true)
    const lastDay = days[days.length - 1]
    const [y, m, d] = lastDay.date.split('-').map(Number)
    const next = new Date(y, m - 1, d + 1)
    const nextDate = next.toISOString().slice(0, 10)
    const { error } = await supabase.from('days').insert({
      trip_id:    id,
      date:       nextDate,
      day_number: lastDay.day_number + 1,
    })
    if (!error) {
      const { data } = await supabase.from('days').select('*').eq('trip_id', id).order('day_number', { ascending: true })
      if (data) {
        setDays(data)
        setActiveDay(data.length - 1)
      }
    }
    setAddingDay(false)
  }

  async function handleShareTrip() {
    if (!trip.is_public) {
      await supabase.from('trips').update({ is_public: true }).eq('id', id)
      setTrip(t => ({ ...t, is_public: true }))
    }
    const url = `${window.location.origin}/trips/${id}/share`
    navigator.clipboard.writeText(url)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2500)
  }

  async function revokeInvite(inviteId) {
    await supabase.from('invites').delete().eq('id', inviteId)
    setInvites(prev => prev.filter(i => i.id !== inviteId))
  }

  function copyInviteLink(token) {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4' }}>
      <NavBar displayName={displayName} />

      {/* Hero */}
      <div
        style={{ height: 320, position: 'relative', overflow: 'hidden', marginTop: 62 }}
        onMouseEnter={() => setHeroHover(true)}
        onMouseLeave={() => setHeroHover(false)}
      >
        {/* Background: photo or gradient */}
        {trip.cover_image_url ? (
          <img src={trip.cover_image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,#2E5080 0%,#8B6B3D 55%,#C4956A 100%)' }} />
        )}

        {/* Adaptive overlay — denser when image is bright so text stays readable */}
        <div style={{
          position: 'absolute', inset: 0,
          background: trip.cover_image_url
            ? (heroIsDark
                ? 'linear-gradient(to bottom, rgba(11,15,26,0.22) 0%, rgba(11,15,26,0.60) 100%)'
                : 'linear-gradient(to bottom, rgba(11,15,26,0.38) 0%, rgba(11,15,26,0.78) 100%)')
            : 'linear-gradient(to bottom, rgba(11,15,26,0.25) 0%, rgba(11,15,26,0.65) 100%)',
        }} />

        {/* Text — always white over the darkened overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 40px 32px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 52, fontWeight: 400, color: '#fff', lineHeight: 1.1 }}>{trip.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>
                  {formatDateLong(trip.start_date)} → {formatDateLong(trip.end_date)} · {nights} {nights === 1 ? 'night' : 'nights'}
                </span>
                {trip.destination_summary && (
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{trip.destination_summary}</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              {isOwner && (
                <>
                  <input ref={coverFileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleCoverUpload} />
                  <button
                    onClick={() => coverFileRef.current?.click()}
                    disabled={coverUploading}
                    style={{
                      padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: 'rgba(0,0,0,0.45)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
                      cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', backdropFilter: 'blur(6px)',
                      opacity: heroHover || coverUploading ? 1 : 0, transition: 'opacity 200ms',
                    }}
                  >{coverUploading ? 'Uploading…' : '⬆ Cover photo'}</button>
                  {coverUploadError && (
                    <div style={{ position: 'absolute', bottom: 80, right: 40, maxWidth: 300, padding: '10px 14px', borderRadius: 8, background: 'rgba(194,59,46,0.92)', color: '#fff', fontSize: 12, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 600, marginBottom: 3 }}>Upload failed</div>
                      <div>{coverUploadError}</div>
                      <div style={{ marginTop: 4, opacity: 0.75 }}>JPEG · PNG · WebP · Max 5 MB</div>
                    </div>
                  )}
                </>
              )}
              <button className="btn-away-secondary" onClick={() => navigate('/dashboard')}>
                ← All trips
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 40px 80px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>

        {/* Left: main content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {[
              { key: 'itinerary', label: 'Itinerary' },
              { key: 'expenses',  label: expenses.length > 0 ? `Expenses (${expenses.length})` : 'Expenses' },
              { key: 'map',       label: 'Map' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setActiveView(key)} style={{
                padding: '9px 20px', borderRadius: 9999, fontSize: 13, fontWeight: 600,
                background: activeView === key ? '#1C2E4A' : '#fff',
                color: activeView === key ? '#fff' : '#677585',
                border: `1.5px solid ${activeView === key ? '#1C2E4A' : '#C4CDD8'}`,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
              }}>{label}</button>
            ))}
          </div>

          {/* ── Itinerary view ── */}
          {activeView === 'itinerary' && (
            days.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', textAlign: 'center', boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 500, color: '#0B0F1A', marginBottom: 8 }}>No days yet</div>
                <p style={{ fontSize: 14, color: '#677585' }}>This trip was created before day generation was added. Create a new trip to get a full itinerary.</p>
              </div>
            ) : (
              <>
                {/* Day tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
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
                  {isOwner && (
                    <button
                      onClick={handleAddDay}
                      disabled={addingDay}
                      style={{
                        padding: '9px 16px', borderRadius: 10, cursor: addingDay ? 'not-allowed' : 'pointer',
                        fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
                        background: '#fff', color: '#D95F2B',
                        border: '1.5px solid #D95F2B', fontSize: 13, fontWeight: 600,
                        opacity: addingDay ? 0.6 : 1,
                      }}
                      onMouseEnter={e => { if (!addingDay) { e.currentTarget.style.background = '#FEF5F0' } }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                    >
                      {addingDay ? '…' : '+ Add day'}
                    </button>
                  )}
                </div>

                {/* Items for active day */}
                <div className="fade-in" key={activeDay}>
                  {activeDay_obj && (
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#8C97A6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                      {formatDateShort(activeDay_obj.date)}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {confirmedItems.length === 0 && dayProposals.length === 0 && (
                      <div style={{ color: '#A0ADBC', fontSize: 14, padding: '8px 0' }}>Nothing planned yet.</div>
                    )}
                    {confirmedItems.map(item => (
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

                  {/* Proposals for this day */}
                  {dayProposals.length > 0 && (
                    <div style={{ marginTop: 28 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#D95F2B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Proposals
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 9999, fontSize: 11, fontWeight: 700, padding: '2px 8px', background: '#FEF5F0', color: '#D95F2B' }}>
                          {dayProposals.length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {dayProposals.map(item => {
                          const cfg = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.other
                          const timeStr = formatTime(item.start_time)
                          const subtitle = [timeStr, item.location_name].filter(Boolean).join(' · ')
                          return (
                            <div key={item.id} style={{
                              background: '#fff', borderRadius: 14, padding: '14px 16px',
                              border: '1.5px dashed #F5C4A8',
                              display: 'flex', alignItems: 'center', gap: 12,
                              boxShadow: '0 2px 8px rgba(11,15,26,0.06)',
                            }}>
                              <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, opacity: 0.75 }}>
                                {cfg.icon}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#475563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.title}
                                </div>
                                {subtitle && (
                                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#A0ADBC', marginTop: 2 }}>{subtitle}</div>
                                )}
                              </div>
                              {item.cost_amount != null && (
                                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: '#8C97A6', flexShrink: 0 }}>
                                  ${fmtMoney(item.cost_amount)}
                                </div>
                              )}
                              {/* Actions */}
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button
                                  onClick={() => approveProposal(item.id)}
                                  title="Approve"
                                  style={{
                                    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: '#E8F5F0', color: '#2A7D5F', fontSize: 15, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#2A7D5F'; e.currentTarget.style.color = '#fff' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#E8F5F0'; e.currentTarget.style.color = '#2A7D5F' }}
                                >✓</button>
                                <button
                                  onClick={() => setEditingItem(item)}
                                  title="Edit"
                                  style={{
                                    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: '#F4F6F8', color: '#677585', fontSize: 13,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#E4E9EF'; e.currentTarget.style.color = '#0B0F1A' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#F4F6F8'; e.currentTarget.style.color = '#677585' }}
                                >✎</button>
                                <button
                                  onClick={() => dismissProposal(item.id)}
                                  title="Dismiss"
                                  style={{
                                    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: '#F4F6F8', color: '#A0ADBC', fontSize: 16,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#FCECEA'; e.currentTarget.style.color = '#C23B2E' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#F4F6F8'; e.currentTarget.style.color = '#A0ADBC' }}
                                >×</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          )}

          {/* ── Map view ── */}
          {activeView === 'map' && (
            <div className="fade-in">
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#8C97A6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                {items.filter(i => i.location_lat != null && !i.is_proposal).length} located item{items.filter(i => i.location_lat != null && !i.is_proposal).length !== 1 ? 's' : ''} · all days
              </div>
              <TripMap items={items} />
            </div>
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
                {expenses.map(expense => {
                  const payer      = members.find(m => m.user_id === expense.paid_by_user_id)
                  const payerName  = payer?.users?.display_name || (expense.paid_by_user_id === user?.id ? 'You' : null)
                  const splitCount = allSplits.filter(s => s.expense_id === expense.id).length
                  return (
                    <ExpenseCard key={expense.id} expense={expense}
                      onClick={() => setEditingExpense(expense)}
                      payerName={payerName}
                      splitCount={splitCount} />
                  )
                })}
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

              {/* Balances */}
              {(() => {
                if (members.length < 2 || expenses.length === 0) return null
                const settlements = calcSettlements(expenses, allSplits, members)
                if (settlements.length === 0) {
                  return (
                    <div style={{ marginTop: 32, padding: '20px 24px', background: '#E8F5F0', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>✓</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#2A7D5F' }}>All settled up</div>
                        <div style={{ fontSize: 12, color: '#4A9B7F', marginTop: 2 }}>No outstanding balances.</div>
                      </div>
                    </div>
                  )
                }
                return (
                  <div style={{ marginTop: 32 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#8C97A6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                      Balances
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {settlements.map((s, i) => (
                        <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#D95F2B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {(s.from.users?.display_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, fontSize: 14, color: '#0B0F1A' }}>
                            <span style={{ fontWeight: 600 }}>{s.from.users?.display_name || 'Unknown'}</span>
                            <span style={{ color: '#8C97A6' }}> owes </span>
                            <span style={{ fontWeight: 600 }}>{s.to.users?.display_name || 'Unknown'}</span>
                          </div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#C23B2E' }}>
                            ${fmtMoney(s.amount, 2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
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

          {/* Trip details */}
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

          {/* Documents — items that have a URL */}
          {items.filter(i => i.url).length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0B0F1A', marginBottom: 14 }}>Documents</div>
              {items.filter(i => i.url).map((item, idx, arr) => {
                const cfg = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.other
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: idx < arr.length - 1 ? '1px solid #F4F6F8' : 'none' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{cfg.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#0B0F1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#8C97A6', marginTop: 1 }}>{cfg.label}</div>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 14, color: '#D95F2B', fontWeight: 500, textDecoration: 'none', flexShrink: 0 }}
                    >↗</a>
                  </div>
                )
              })}
            </div>
          )}

          {/* Share trip */}
          <div style={{ background: '#F5F0E8', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0B0F1A', marginBottom: 6 }}>Share this trip</div>
            <div style={{ fontSize: 13, color: '#677585', marginBottom: 14, lineHeight: 1.5 }}>
              {trip.is_public ? 'Anyone with the link can view this itinerary.' : 'Invite travel companions or share a read-only view.'}
            </div>
            <button
              onClick={handleShareTrip}
              style={{
                width: '100%', padding: '11px', borderRadius: 9999, fontSize: 13, fontWeight: 600,
                background: sharecopied ? '#2A7D5F' : '#1C2E4A', color: '#fff',
                border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                transition: 'background 200ms', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              {sharecopied ? (
                <><span>✓</span> Link copied!</>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>
                  </svg>
                  Share trip link
                </>
              )}
            </button>
            {trip.is_public && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#8C97A6', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
                Public · read-only
              </div>
            )}
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

          {/* Travelers / invites card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0B0F1A' }}>Travelers</div>
              {members.length > 0 && (
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#8C97A6' }}>{members.length}</span>
              )}
            </div>

            {/* Accepted members roster */}
            {members.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {members.map(m => {
                  const name    = m.users?.display_name || 'Unknown'
                  const isMe    = m.user_id === user?.id
                  const roleMap = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' }
                  return (
                    <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#F9F7F4' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#D95F2B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#0B0F1A' }}>
                          {name}{isMe && <span style={{ color: '#8C97A6', fontWeight: 400 }}> (you)</span>}
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#8C97A6', marginTop: 1 }}>
                          {roleMap[m.role] || m.role}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {isOwner && (
              <form onSubmit={sendInvite} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #C4CDD8', fontSize: 13, color: '#0B0F1A', background: '#fff', outline: 'none', fontFamily: 'DM Sans, sans-serif', transition: 'border-color 150ms' }}
                    onFocus={e => e.target.style.borderColor = '#D95F2B'}
                    onBlur={e => e.target.style.borderColor = '#C4CDD8'}
                  />
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #C4CDD8', fontSize: 13, color: '#0B0F1A', background: '#fff', outline: 'none', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={inviteSending || !inviteEmail.trim()}
                  style={{
                    width: '100%', padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: inviteSending || !inviteEmail.trim() ? '#E4E9EF' : '#1C2E4A',
                    color: inviteSending || !inviteEmail.trim() ? '#8C97A6' : '#fff',
                    border: 'none', cursor: inviteSending || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
                  }}
                >{inviteSending ? 'Sending…' : '+ Send invite'}</button>
                {inviteError && <div style={{ fontSize: 12, color: '#C23B2E', marginTop: 6 }}>{inviteError}</div>}
              </form>
            )}

            {invites.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8C97A6', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>Pending invites</div>
                {invites.map(inv => {
                  const expired  = new Date(inv.expires_at) < new Date()
                  const accepted = Boolean(inv.accepted_at)
                  return (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: '#F9F7F4' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#0B0F1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: accepted ? '#2A7D5F' : expired ? '#C23B2E' : '#8C97A6', marginTop: 1 }}>
                          {accepted ? 'Accepted' : expired ? 'Expired' : inv.role}
                        </div>
                      </div>
                      {!accepted && !expired && (
                        <button
                          onClick={() => copyInviteLink(inv.token)}
                          title="Copy invite link"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: copiedToken === inv.token ? '#2A7D5F' : '#8C97A6', padding: '2px 4px', borderRadius: 4, transition: 'color 150ms', flexShrink: 0 }}
                        >{copiedToken === inv.token ? '✓' : '⎘'}</button>
                      )}
                      {isOwner && !accepted && (
                        <button
                          onClick={() => revokeInvite(inv.id)}
                          title="Revoke invite"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#C4CDD8', padding: '2px 4px', borderRadius: 4, transition: 'color 150ms', flexShrink: 0 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#C23B2E'}
                          onMouseLeave={e => e.currentTarget.style.color = '#C4CDD8'}
                        >×</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {invites.length === 0 && !isOwner && (
              <p style={{ fontSize: 13, color: '#8C97A6', margin: 0 }}>No pending invites.</p>
            )}
          </div>

          {/* Delete trip */}
          {isOwner && (
            <button
              onClick={() => setDeleteTripOpen(true)}
              style={{ width: '100%', padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: '#fff', color: '#C23B2E', border: '1.5px solid #C23B2E', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms', boxShadow: '0 2px 8px rgba(11,15,26,0.07)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FCECEA' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            >Delete trip</button>
          )}
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
        members={members}
      />

      {/* Delete trip modal */}
      <DeleteTripModal
        open={deleteTripOpen}
        onClose={() => setDeleteTripOpen(false)}
        trip={trip}
        userEmail={user?.email}
        onDeleted={() => navigate('/dashboard')}
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
