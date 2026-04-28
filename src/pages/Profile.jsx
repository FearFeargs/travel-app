import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/uploadImage'
import { useAuth } from '@/hooks/useAuth'
import { useImageBrightness } from '@/hooks/useImageBrightness'
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
  const navigate  = useNavigate()
  const authUser  = useAuth()

  const [profile, setProfile]           = useState(null)
  const [tripCount, setTripCount]        = useState(0)
  const [trips, setTrips]               = useState([])
  const [loading, setLoading]            = useState(true)

  const [editingName, setEditingName]    = useState(false)
  const [nameInput, setNameInput]        = useState('')
  const [nameSaving, setNameSaving]      = useState(false)
  const [nameError, setNameError]        = useState(null)

  const [editingColor, setEditingColor]  = useState(false)
  const [colorSaving, setColorSaving]    = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [headerHover, setHeaderHover]    = useState(false)
  const [coverUploading, setCoverUploading]   = useState(false)
  const [coverUploadError, setCoverUploadError] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUploadError, setAvatarUploadError] = useState(null)
  const [avatarHover, setAvatarHover]    = useState(false)

  const coverFileRef  = useRef(null)
  const avatarFileRef = useRef(null)

  useEffect(() => {
    if (!authUser) return
    Promise.all([
      supabase.from('users').select('*').eq('id', authUser.id).single(),
      supabase.from('trips').select('id, destination_summary').eq('owner_id', authUser.id),
    ]).then(([profileRes, tripsRes]) => {
      if (profileRes.data) setProfile(profileRes.data)
      if (tripsRes.data) {
        setTrips(tripsRes.data)
        setTripCount(tripsRes.data.length)
      }
      setLoading(false)
    })
  }, [authUser])

  // Determine if avatar is a photo URL or hex color
  const avatarIsPhoto = profile?.avatar_url && profile.avatar_url.startsWith('http')
  const avatarColor   = !avatarIsPhoto && profile?.avatar_url?.startsWith('#')
    ? profile.avatar_url : '#D95F2B'
  const initial       = profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : '?'

  const coverUrl      = profile?.profile_cover_url || null
  const headerIsDark  = useImageBrightness(coverUrl, 'top')
  const textColor     = coverUrl ? (headerIsDark ? '#fff' : '#0B0F1A') : '#fff'
  const subColor      = coverUrl ? (headerIsDark ? 'rgba(255,255,255,0.45)' : 'rgba(11,15,26,0.55)') : 'rgba(255,255,255,0.45)'

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

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true); setCoverUploadError(null)
    try {
      const url = await uploadImage('images', `users/${authUser.id}/profile-cover`, file)
      await supabase.from('users').update({ profile_cover_url: url }).eq('id', authUser.id)
      setProfile(p => ({ ...p, profile_cover_url: url }))
    } catch (err) { setCoverUploadError(err?.message || String(err)) }
    finally { setCoverUploading(false); e.target.value = '' }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true); setAvatarUploadError(null)
    try {
      const url = await uploadImage('images', `users/${authUser.id}/avatar`, file)
      await supabase.from('users').update({ avatar_url: url }).eq('id', authUser.id)
      setProfile(p => ({ ...p, avatar_url: url }))
      setEditingColor(false)
    } catch (err) { setAvatarUploadError(err?.message || String(err)) }
    finally { setAvatarUploading(false); e.target.value = '' }
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
      <div
        style={{ marginTop: 62, position: 'relative', overflow: 'hidden' }}
        onMouseEnter={() => setHeaderHover(true)}
        onMouseLeave={() => setHeaderHover(false)}
      >
        {/* Background: cover photo or solid navy */}
        {coverUrl ? (
          <img src={coverUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: '#1C2E4A' }} />
        )}

        {/* Overlay */}
        {coverUrl && (
          <div style={{
            position: 'absolute', inset: 0,
            background: headerIsDark ? 'rgba(11,15,26,0.42)' : 'rgba(11,15,26,0.28)',
          }} />
        )}

        {/* Cover upload button */}
        <input ref={coverFileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleCoverUpload} />
        <button
          onClick={() => coverFileRef.current?.click()}
          disabled={coverUploading}
          style={{
            position: 'absolute', top: 16, right: 24, zIndex: 2,
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'rgba(0,0,0,0.45)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', backdropFilter: 'blur(6px)',
            opacity: headerHover || coverUploading ? 1 : 0, transition: 'opacity 200ms',
          }}
        >{coverUploading ? 'Uploading…' : '⬆ Cover photo'}</button>
        {coverUploadError && (
          <div style={{ position: 'absolute', top: 56, right: 24, maxWidth: 300, padding: '10px 14px', borderRadius: 8, background: 'rgba(194,59,46,0.92)', color: '#fff', fontSize: 12, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, zIndex: 3 }}>
            <div style={{ fontWeight: 600, marginBottom: 3 }}>Upload failed</div>
            <div>{coverUploadError}</div>
            <div style={{ marginTop: 4, opacity: 0.75 }}>JPEG · PNG · WebP · Max 5 MB</div>
          </div>
        )}

        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto', padding: '48px 40px 56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>

            {/* Avatar */}
            <div
              style={{ position: 'relative', flexShrink: 0 }}
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
            >
              {/* Avatar circle or photo */}
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: avatarIsPhoto ? 'transparent' : avatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32, color: '#fff',
                userSelect: 'none', overflow: 'hidden', position: 'relative',
              }}>
                {avatarIsPhoto ? (
                  <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : initial}

                {/* Avatar upload overlay on hover */}
                <div
                  onClick={() => avatarFileRef.current?.click()}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'rgba(11,15,26,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 20,
                    opacity: avatarHover || avatarUploading ? 1 : 0,
                    transition: 'opacity 150ms',
                  }}
                >{avatarUploading ? '…' : '⬆'}</div>
              </div>
              {avatarUploadError && (
                <div style={{ position: 'absolute', top: 88, left: 0, width: 220, padding: '8px 12px', borderRadius: 8, background: 'rgba(194,59,46,0.92)', color: '#fff', fontSize: 11, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, zIndex: 3 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Upload failed</div>
                  <div>{avatarUploadError}</div>
                  <div style={{ marginTop: 3, opacity: 0.75 }}>JPEG · PNG · WebP · Max 5 MB</div>
                </div>
              )}

              {/* Color picker toggle (only when no photo) */}
              {!avatarIsPhoto && (
                <button
                  onClick={() => setEditingColor(c => !c)}
                  style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 26, height: 26, borderRadius: '50%',
                    background: '#D95F2B', border: '2px solid ' + (coverUrl ? 'transparent' : '#1C2E4A'),
                    color: '#fff', fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Change color"
                >✎</button>
              )}
              <input ref={avatarFileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 34, fontWeight: 400, color: textColor, lineHeight: 1.1 }}>
                {profile?.display_name}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: subColor, marginTop: 6 }}>
                {profile?.email} · Since {memberSince}
              </div>
            </div>

            {/* Stats */}
            {tripCount > 0 && (
              <div style={{ display: 'flex', gap: 32, textAlign: 'center', flexShrink: 0 }}>
                {[
                  { value: tripCount, label: tripCount === 1 ? 'Trip' : 'Trips' },
                  {
                    value: new Set(trips.map(t => t.destination_summary?.split(',').pop()?.trim()).filter(Boolean)).size,
                    label: 'Destinations',
                  },
                ].map(({ value, label }) => value > 0 ? (
                  <div key={label}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 600, color: textColor }}>{value}</div>
                    <div style={{ fontSize: 12, color: subColor, marginTop: 3 }}>{label}</div>
                  </div>
                ) : null)}
              </div>
            )}
          </div>

          {/* Color picker */}
          {editingColor && (
            <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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
              <button
                onClick={() => avatarFileRef.current?.click()}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}
              >Upload photo</button>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 32, marginTop: 28 }}>
            {[['Trips', tripCount]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 600, color: textColor }}>{val}</div>
                <div style={{ fontSize: 13, color: subColor, marginTop: 2 }}>{label}</div>
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
