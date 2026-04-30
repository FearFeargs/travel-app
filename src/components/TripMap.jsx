import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const TYPE_ICONS = {
  flight: '✈', lodging: '🏠', transport: '🚗',
  activity: '⊕', meal: '🍽', other: '◎',
}
const TYPE_BG = {
  flight: '#3B6BC4', lodging: '#8B6B3D', transport: '#3B6BC4',
  activity: '#1C2E4A', meal: '#C47A40', other: '#475563',
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtTime(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtMoney(n) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function TripMap({ items }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef([])
  const token = import.meta.env.VITE_MAPBOX_TOKEN

  // Init map once
  useEffect(() => {
    if (!token || !containerRef.current) return
    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [0, 20],
      zoom: 1.5,
      attributionControl: false,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [token])

  // Sync markers whenever items change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const located = items.filter(i =>
      i.location_lat != null && i.location_lng != null && !i.is_proposal
    )

    function placeMarkers() {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      if (located.length === 0) return

      const bounds = new mapboxgl.LngLatBounds()

      for (const item of located) {
        bounds.extend([item.location_lng, item.location_lat])

        const bg   = TYPE_BG[item.item_type]   || TYPE_BG.other
        const icon = TYPE_ICONS[item.item_type] || '◎'
        const time = fmtTime(item.start_time)

        // Teardrop pin element
        const el = document.createElement('div')
        el.innerHTML = `<span style="transform:rotate(45deg);display:block;line-height:1;user-select:none">${icon}</span>`
        Object.assign(el.style, {
          width: '36px', height: '36px',
          borderRadius: '50% 50% 50% 0',
          background: bg,
          border: '2.5px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(11,15,26,0.28)',
          transform: 'rotate(-45deg)',
          transition: 'transform 150ms, box-shadow 150ms',
        })
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'rotate(-45deg) scale(1.2)'
          el.style.boxShadow = '0 4px 18px rgba(11,15,26,0.38)'
        })
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'rotate(-45deg)'
          el.style.boxShadow = '0 2px 8px rgba(11,15,26,0.28)'
        })

        const popupHtml = `
          <div style="font-family:DM Sans,sans-serif;min-width:170px;max-width:240px">
            <div style="font-weight:600;font-size:14px;color:#0B0F1A;margin-bottom:2px">${esc(item.title)}</div>
            ${item.location_name ? `<div style="font-size:12px;color:#677585;font-family:JetBrains Mono,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(item.location_name)}</div>` : ''}
            ${time ? `<div style="font-size:11px;color:#8C97A6;margin-top:3px;font-family:JetBrains Mono,monospace">${time}</div>` : ''}
            ${item.cost_amount != null ? `<div style="font-size:13px;font-weight:600;color:#0B0F1A;margin-top:5px;font-family:JetBrains Mono,monospace">$${fmtMoney(item.cost_amount)}</div>` : ''}
          </div>
        `

        const popup = new mapboxgl.Popup({ offset: 30, closeButton: false, maxWidth: '260px' })
          .setHTML(popupHtml)

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([item.location_lng, item.location_lat])
          .setPopup(popup)
          .addTo(map)

        markersRef.current.push(marker)
      }

      if (located.length === 1) {
        map.flyTo({ center: [located[0].location_lng, located[0].location_lat], zoom: 13, duration: 1200 })
      } else {
        map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 1200 })
      }
    }

    if (map.loaded()) placeMarkers()
    else map.once('load', placeMarkers)

    return () => { markersRef.current.forEach(m => m.remove()); markersRef.current = [] }
  }, [items])

  if (!token) {
    return (
      <div style={{ height: 520, borderRadius: 16, background: '#F4F6F8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 40 }}>🗺</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#475563' }}>Mapbox token not configured</div>
        <div style={{ fontSize: 13, color: '#8C97A6' }}>Add VITE_MAPBOX_TOKEN to .env.local to enable maps.</div>
      </div>
    )
  }

  const locatedCount = items.filter(i => i.location_lat != null && i.location_lng != null && !i.is_proposal).length

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(11,15,26,0.10)' }}>
      <div ref={containerRef} style={{ height: 560 }} />
      {locatedCount === 0 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: 'rgba(249,247,244,0.78)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{ fontSize: 40 }}>📍</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#475563' }}>No located items yet</div>
          <div style={{ fontSize: 13, color: '#8C97A6', textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
            Search for a place when adding items and they'll appear here.
          </div>
        </div>
      )}
    </div>
  )
}
