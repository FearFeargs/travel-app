import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import NavBar from '@/components/NavBar'

const AVATAR_COLORS = [
  '#D95F2B', '#1C2E4A', '#2A7D5F', '#8B3D5F', '#3D2E5F',
  '#5F3D1A', '#1A4A6B', '#6B1A2E', '#1A5F3D', '#4A4A1A',
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

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(11,15,26,0.07)', marginBottom: 16 }}>
      <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid #F4F6F8' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#677585', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</div>
      </div>
      <div style={{ padding: '16px 24px 20px' }}>{children}</div>
    </div>
  )
}

function SettingRow({ label, value, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F4F6F8' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#0B0F1A' }}>{label}</div>
        {value && <div style={{ fontSize: 13, color: '#8C97A6', marginTop: 2 }}>{value}</div>}
      </div>
      {children}
    </div>
  )
}

export default function Profile() {
  const user     = useNavigate ? useNavigate() : null
  const navigate = useNavigate()
  const authUser = useAuth()

  const [profile, setProfile]           = useState(null)
  const [tripCount, setTripCount]        = useState(0)
  const [loading, setLoading]            = useState(true)

  // Edit display name
  const [editingName, setEditingName]    = useState(false)
  const [nameInput, setNameInput]        = useState('')
  const [nameSaving, setNameSaving]      = useState(false)
  const [nameError, setNameError]        = useState(null)

  // Edit avatar color
  const [editingColor, setEditingColor]  = useState(false)
  const [colorSaving, setColorSaving]    = useState(false)

  // Delete account
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (!authUser) return
    Promise.all([
      supabase.from('users').select('*').eq('id', authUser.id).single(),
      supabase.from('trip_members').select('trip_id', { count: 'exact' }).eq('user_id', authUser.id),
    ]).then(([profileRes, tripsRes]) => {
      if (profileRes.data) setProfile(profileRes.data)
      if (tripsRes.count != null) setTripCount(tripsRes.count)
      setLoading(false)
    })
  }, [authUser])

  async function saveName() {
    if (!nameInput.trim()) { setNameError('Name cannot be empty.'); return }
    setNameSaving(true); setNameError(null)
    const { error } = await supabase
      .from('users').update({ display_name: nameInput.trim() }).eq('id', authUser.id)
    if (error) { setNameError(error.message); setNameSaving(false); return }
    setProfile(p => ({ ...p, display_name: nameInput.trim() }))
    setEditingName(false); setNameSaving(false)
  }

  async function saveColor(color) {
    setColorSaving(true)
    await supabase.from('users').update({ avatar_url: color }).eq('id', authUser.id)
    setProfile(p => ({ ...p, avatar_url: color }))
    setEditingColor(false); setColorSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : ''

  const avatarColor = profile?.avatar_url && profile.avatar_url.startsWith('#')
    ? profile.avatar_url
    : '#D95F2B'

  const initial = profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : '?'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4' }}>
      <NavBar displayName={profile?.display_name} />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '110px 40px', color: '#8C97A6' }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9F7F4' }}>
      <NavBar displayName={profile?.display_name} />

      {/* Header */}
      <div style={{ background: '#1C2E4A', marginTop: 62 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 40px 56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>

            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: avatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Georgia, serif', fontSize: 32, color: '#fff',
                userSelect: 'none',
              }}>{initial}</div>
              <button
                onClick={() => setEditingColor(c => !c)}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#D95F2B', border: '2px solid #1C2E4A',
                  color: '#fff', fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title="Change color"
              >✎</button>
            </div>

            {/* Name + meta */}
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 34, fontWeight: 400, color: '#fff', lineHeight: 1.1 }}>
                {profile?.display_name}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
                {profile?.email} · Since {memberSince}
              </div>
            </div>
          </div>

          {/* Color picker */}
          {editingColor && (
            <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map(c => (
                <button
                  key={c} onClick={() => saveColor(c)} disabled={colorSaving}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', background: c,
                    border: c === avatarColor ? '3px solid #fff' : '3px solid transparent',
                    cursor: 'pointer', transition: 'border 150ms', flexShrink: 0,
                  }}
                />
              ))}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 32, marginTop: 28 }}>
            {[['Trips', tripCount]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 600, color: '#fff' }}>{val}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 40px 80px' }}>

        <Section title="Account">
          <SettingRow label="Display name" value={profile?.display_name}>
            {editingName ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  style={{ ...inputStyle, width: 200 }}
                  value={nameInput} onChange={e => setNameInput(e.target.value)}
                  onFocus={focusDusk} onBlur={blurSlate}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                  autoFocus
                />
                <button className="btn-away-primary" style={{ padding: '8px 16px', fontSize: 13 }}
                  onClick={saveName} disabled={nameSaving}>
                  {nameSaving ? 'Saving…' : 'Save'}
                </button>
                <button className="btn-away-secondary" style={{ padding: '8px 16px', fontSize: 13 }}
                  onClick={() => { setEditingName(false); setNameError(null) }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button className="btn-away-secondary" style={{ padding: '7px 16px', fontSize: 13 }}
                onClick={() => { setNameInput(profile?.display_name || ''); setEditingName(true) }}>
                Edit
              </button>
            )}
          </SettingRow>
          {nameError && (
            <div style={{ fontSize: 13, color: '#C23B2E', marginTop: 6 }}>{nameError}</div>
          )}
          <SettingRow label="Email" value={profile?.email} />
          <SettingRow label="Member since" value={memberSince} />
          <div style={{ paddingTop: 16 }}>
            <button className="btn-away-secondary" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </Section>

        <Section title="Danger zone">
          {confirmDelete ? (
            <div style={{ background: '#FCECEA', border: '1px solid #F5B8B4', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#C23B2E', marginBottom: 6 }}>Are you sure?</div>
              <div style={{ fontSize: 13, color: '#677585', marginBottom: 16 }}>
                This will sign you out. To fully delete your account and data, contact support.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-away-secondary" style={{ fontSize: 13, padding: '8px 16px' }}
                  onClick={() => setConfirmDelete(false)}>Cancel</button>
                <button onClick={handleDeleteAccount} disabled={deleteLoading}
                  style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, background: '#C23B2E', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: deleteLoading ? 0.7 : 1 }}>
                  {deleteLoading ? 'Signing out…' : 'Confirm'}
                </button>
              </div>
            </div>
          ) : (
            <SettingRow label="Delete account" value="Permanently remove your account and all data.">
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, background: '#fff', color: '#C23B2E', border: '1.5px solid #C23B2E', borderRadius: 9999, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms', whiteSpace: 'nowrap' }}>
                Delete
              </button>
            </SettingRow>
          )}
        </Section>

      </div>
    </div>
  )
}
