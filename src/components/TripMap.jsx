import { useEffect, useRef, useState } from 'react'
import { getGoogleMapsLoader } from '@/lib/googleMaps'
import { canLoadMap, recordMapLoad, getUsage } from '@/lib/mapUsage'

const TYPE_COLOR = {
  flight:    '#3B6BC4',
  lodging:   '#8B6B3D',
  transport: '#3B6BC4',
  activity:  '#1C2E4A',
  meal:      '#C47A40',
  other:     '#475563',
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

function makePinSvg(color) {
  return (
    `data:image/svg+xml;charset=UTF-8,` +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">` +
      `<path d="M16 2C8.3 2 2 8.3 2 16c0 10.5 13 23.5 14 24.5C17 39.5 30 26.5 30 16 30 8.3 23.7 2 16 2z" ` +
      `fill="${color}" stroke="white" stroke-width="2.5"/>` +
      `<circle cx="16" cy="16" r="5" fill="white" opacity="0.92"/>` +
      `</svg>`
    )
  )
}

export default function TripMap({ items }) {
  const containerRef  = useRef(null)
  const mapInstanceRef = useRef(null)   // { map, google }
  const markersRef    = useRef([])
  const infoWindowRef = useRef(null)

  const [mapReady,   setMapReady]   = useState(false)
  const [mapLimited, setMapLimited] = useState(false)
  const [usage,      setUsage]      = useState(null)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY

  // Check daily cap before mounting
  useEffect(() => {
    if (!canLoadMap()) {
      setMapLimited(true)
      setUsage(getUsage())
    }
  }, [])

  // Init Google Map
  useEffect(() => {
    if (mapLimited || !apiKey || !containerRef.current) return
    let cancelled = false

    async function init() {
      try {
        const google = await getGoogleMapsLoader().load()
        if (cancelled) return

        recordMapLoad()
        setUsage(getUsage())

        const map = new google.maps.Map(containerRef.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_TOP,
          },
        })

        infoWindowRef.current = new google.maps.InfoWindow({ maxWidth: 260 })
        mapInstanceRef.current = { map, google }
        setMapReady(true)
      } catch (err) {
        console.error('Google Maps failed to load:', err)
      }
    }

    init()
    return () => { cancelled = true }
  }, [apiKey, mapLimited])

  // Place markers whenever items or map readiness changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return
    const { map, google } = mapInstanceRef.current

    // Clear previous markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    const located = items.filter(i =>
      i.location_lat != null && i.location_lng != null && !i.is_proposal
    )
    if (located.length === 0) return

    const bounds = new google.maps.LatLngBounds()

    for (const item of located) {
      bounds.extend({ lat: item.location_lat, lng: item.location_lng })

      const color = TYPE_COLOR[item.item_type] || TYPE_COLOR.other

      const marker = new google.maps.Marker({
        position: { lat: item.location_lat, lng: item.location_lng },
        map,
        title: item.title,
        icon: {
          url: makePinSvg(color),
          scaledSize: new google.maps.Size(32, 42),
          anchor: new google.maps.Point(16, 42),
        },
      })

      marker.addListener('click', () => {
        const time = fmtTime(item.start_time)
        const end  = fmtTime(item.end_time)
        const timeStr = time ? (end ? `${time} – ${end}` : time) : null

        infoWindowRef.current.setContent(`
          <div style="font-family:DM Sans,sans-serif;padding:4px 2px 2px">
            <div style="font-weight:600;font-size:14px;color:#0B0F1A;margin-bottom:3px">${esc(item.title)}</div>
            ${item.location_name ? `<div style="font-size:12px;color:#677585;font-family:'Courier New',monospace">${esc(item.location_name)}</div>` : ''}
            ${timeStr            ? `<div style="font-size:11px;color:#8C97A6;margin-top:3px">${timeStr}</div>` : ''}
            ${item.cost_amount != null ? `<div style="font-size:13px;font-weight:600;color:#0B0F1A;margin-top:5px">${item.cost_currency === 'USD' ? '$' : (item.cost_currency + ' ')}${fmtMoney(item.cost_amount)}</div>` : ''}
            ${item.notes ? `<div style="font-size:12px;color:#A0ADBC;margin-top:4px;max-width:220px">${esc(item.notes)}</div>` : ''}
          </div>
        `)
        infoWindowRef.current.open({ map, anchor: marker })
      })

      markersRef.current.push(marker)
    }

    if (located.length === 1) {
      map.setCenter({ lat: located[0].location_lat, lng: located[0].location_lng })
      map.setZoom(14)
    } else {
      map.fitBounds(bounds, 80)
    }
  }, [items, mapReady])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!apiKey) {
    return (
      <div style={{ height: 520, borderRadius: 16, background: '#F4F6F8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 40 }}>🗺</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#475563' }}>Google Maps key not configured</div>
        <div style={{ fontSize: 13, color: '#8C97A6' }}>Add VITE_GOOGLE_MAPS_KEY to .env.local</div>
      </div>
    )
  }

  if (mapLimited) {
    return (
      <div style={{ height: 520, borderRadius: 16, background: '#F4F6F8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40 }}>
        <div style={{ fontSize: 40 }}>🗺</div>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 20, fontWeight: 400, color: '#0B0F1A' }}>Daily map limit reached</div>
        <div style={{ fontSize: 13, color: '#677585', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
          Free accounts can view maps {usage?.mapLoadCap ?? 20} times per day. Resets at midnight.
        </div>
        {usage && (
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#A0ADBC' }}>
            {usage.mapLoads} / {usage.mapLoadCap} loads used today
          </div>
        )}
      </div>
    )
  }

  const locatedCount = items.filter(i =>
    i.location_lat != null && i.location_lng != null && !i.is_proposal
  ).length

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(11,15,26,0.10)' }}>
      <div ref={containerRef} style={{ height: 560 }} />

      {/* Empty state — shown until map is ready and items have no coords */}
      {locatedCount === 0 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: 'rgba(249,247,244,0.80)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{ fontSize: 40 }}>📍</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#475563' }}>No located items yet</div>
          <div style={{ fontSize: 13, color: '#8C97A6', textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
            Search for a place when adding items and they'll appear here.
          </div>
        </div>
      )}

      {/* Usage indicator */}
      {usage && mapReady && (
        <div style={{
          position: 'absolute', bottom: 28, left: 10, zIndex: 10,
          padding: '4px 9px', borderRadius: 6,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#677585',
          background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)',
          boxShadow: '0 1px 4px rgba(11,15,26,0.10)',
        }}>
          {usage.mapLoads}/{usage.mapLoadCap} map loads today
        </div>
      )}
    </div>
  )
}
