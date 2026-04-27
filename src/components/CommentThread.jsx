import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CommentThread({ tripId, itemId = null, userId }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [body, setBody]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const bottomRef = useRef(null)

  async function load() {
    let q = supabase
      .from('comments')
      .select('id, body, created_at, user_id, users(display_name)')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true })

    if (itemId) q = q.eq('item_id', itemId)
    else        q = q.is('item_id', null)

    const { data } = await q
    setComments(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!tripId) return
    setLoading(true)
    load()
  }, [tripId, itemId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  async function submit(e) {
    e.preventDefault()
    if (!body.trim() || submitting) return
    setSubmitting(true)
    const payload = {
      trip_id: tripId,
      item_id: itemId ?? null,
      user_id: userId,
      body:    body.trim(),
    }
    const { error } = await supabase.from('comments').insert(payload)
    if (!error) {
      setBody('')
      await load()
    }
    setSubmitting(false)
  }

  async function deleteComment(id) {
    setDeletingId(id)
    await supabase.from('comments').delete().eq('id', id)
    setComments(c => c.filter(x => x.id !== id))
    setDeletingId(null)
  }

  if (loading) return (
    <div style={{ padding: '16px 0', fontSize: 13, color: '#8C97A6' }}>Loading…</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Comment list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: comments.length > 0 ? 16 : 8 }}>
        {comments.length === 0 && (
          <div style={{ fontSize: 13, color: '#A0ADBC', padding: '4px 0' }}>
            No comments yet. Be the first.
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {/* Avatar dot */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: c.user_id === userId ? '#D95F2B' : '#1C2E4A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0, marginTop: 1,
            }}>
              {(c.users?.display_name || '?').charAt(0).toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0B0F1A' }}>
                  {c.users?.display_name || 'Unknown'}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#A0ADBC' }}>
                  {timeAgo(c.created_at)}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#475563', lineHeight: 1.5, wordBreak: 'break-word' }}>
                {c.body}
              </div>
            </div>

            {c.user_id === userId && (
              <button
                onClick={() => deleteComment(c.id)}
                disabled={deletingId === c.id}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#C4CDD8', fontSize: 14, padding: '2px 4px',
                  borderRadius: 4, transition: 'color 150ms', flexShrink: 0, marginTop: 2,
                  opacity: deletingId === c.id ? 0.4 : 1,
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#C23B2E'}
                onMouseLeave={e => e.currentTarget.style.color = '#C4CDD8'}
                title="Delete comment"
              >×</button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          placeholder="Add a comment…"
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e) } }}
          rows={2}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 10,
            border: '1.5px solid #C4CDD8', fontSize: 13, color: '#0B0F1A',
            background: '#fff', outline: 'none', resize: 'none',
            fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5,
            transition: 'border-color 150ms',
          }}
          onFocus={e => e.target.style.borderColor = '#D95F2B'}
          onBlur={e => e.target.style.borderColor = '#C4CDD8'}
        />
        <button
          type="submit"
          disabled={!body.trim() || submitting}
          style={{
            padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: '#D95F2B', color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', transition: 'opacity 150ms',
            opacity: !body.trim() || submitting ? 0.5 : 1,
          }}
        >{submitting ? '…' : '→'}</button>
      </form>
    </div>
  )
}
