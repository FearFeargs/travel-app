import { useEffect } from 'react'
import CommentThread from './CommentThread'

export default function CommentPanel({ open, onClose, tripId, userId, tripTitle }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(11,15,26,0.35)',
            backdropFilter: 'blur(2px)',
            animation: 'fadeIn 150ms ease',
          }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 62, right: 0, bottom: 0, zIndex: 201,
        width: 420,
        background: '#fff',
        boxShadow: '-4px 0 32px rgba(11,15,26,0.14)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 280ms cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #E4E9EF',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, fontWeight: 400, color: '#0B0F1A' }}>
              Trip discussion
            </div>
            {tripTitle && (
              <div style={{ fontSize: 12, color: '#8C97A6', marginTop: 2 }}>{tripTitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#F4F6F8', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#677585', transition: 'background 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#E4E9EF'}
            onMouseLeave={e => e.currentTarget.style.background = '#F4F6F8'}
          >×</button>
        </div>

        {/* Thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>
          {open && (
            <CommentThread tripId={tripId} itemId={null} userId={userId} />
          )}
        </div>
      </div>
    </>
  )
}
