import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { canLoadMap, recordMapLoad, canCallFSQ, recordFSQCall, getUsage } from '@/lib/mapUsage'

const TYPE_ICONS = {
  flight: '✈', lodging: '🏠', transport: '🚗',
  activity: '⊕', meal: '🍽', other: '◎',
}
const TYPE_BG = {
  flight: '#3B6BC4', lodging: '#8B6B3D', transport: '#3B6BC4',
  activity: '#1C2E4A', meal: '#C47A40', other: '#475563',
}

const EMPTY_FC = { type: 'FeatureCollection', features: [] }

// Foursquare category names → display label
function fsqCategoryLabel(name) {
  const n = name?.toLowerCase() || ''
  if (n.includes('restaurant') || n.includes('food') || n.includes('dining')) return 'Restaurant'
  if (n.includes('café') || n.includes('cafe') || n.includes('coffee')) return 'Café'
  if (n.includes('bar') || n.includes('pub') || n.includes('nightlife')) return 'Bar'
  if (n.includes('hotel') || n.includes('hostel') || n.includes('resort') || n.includes('lodging')) return 'Hotel'
  if (n.includes('museum') || n.includes('gallery') || n.includes('art')) return 'Museum'
  if (n.includes('park') || n.includes('garden') || n.includes('beach') || n.includes('nature')) return 'Outdoors'
  if (n.includes('shop') || n.includes('store') || n.includes('market') || n.includes('mall')) return 'Shopping'
  if (n.includes('airport') || n.includes('station') || n.includes('transit') || n.includes('transport')) return 'Transit'
  if (n.includes('attraction') || n.includes('landmark') || n.includes('monument')) return 'Landmark'
  return name || 'Place'
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

// Radius (metres) for Foursquare search based on zoom level
function zoomToRadius(zoom) {
  if (zoom >= 15) return 400
  if (zoom >= 14) return 800
  if (zoom >= 13) return 1500
  return 3000
}

// Coarse grid key to avoid refetching the same area
function poiCacheKey(lat, lng, radius) {
  const la = Math.round(lat * 50) / 50   // ~2 km grid
  const lo = Math.round(lng * 50) / 50
  return `${la},${lo},${radius}`
}

export default function TripMap({ items }) {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  const markersRef    = useRef([])
  const poiCacheRef   = useRef({})
  const fetchDebounce = useRef(null)
  const showPOIsRef   = useRef(true)    // ref mirror of showPOIs for use inside callbacks

  const [showPOIs,       setShowPOIs]       = useState(true)
  const [poiCount,       setPOICount]       = useState(0)
  const [fsqLimited,     setFsqLimited]     = useState(false)
  const [mapLimited,     setMapLimited]     = useState(false)
  const [usage,          setUsage]          = useState(null)

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
  const fsqKey      = import.meta.env.VITE_FSQ_KEY

  // Check map-load cap before mounting anything
  useEffect(() => {
    if (!canLoadMap()) {
      setMapLimited(true)
      setUsage(getUsage())
    }
  }, [])

  // Keep ref in sync so map callbacks can read the latest value without stale closures
  useEffect(() => { showPOIsRef.current = showPOIs }, [showPOIs])

  // Update Mapbox layer visibility when toggle changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getLayer('fsq-circles')) return
    map.setLayoutProperty('fsq-circles', 'visibility', showPOIs ? 'visible' : 'none')
    if (!showPOIs) { setPOICount(0) }
  }, [showPOIs])

  // Init Mapbox map
  useEffect(() => {
    if (mapLimited || !mapboxToken || !containerRef.current) return

    recordMapLoad()
    setUsage(getUsage())

    mapboxgl.accessToken = mapboxToken
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/fearfeargs/cmolryjb9002w01rgh5d46h2b',
      center: [0, 20],
      zoom: 1.5,
      attributionControl: false,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    mapRef.current = map

    map.on('load', () => {
      // ── Foursquare POI layer ──────────────────────────────────────
      map.addSource('fsq-pois', { type: 'geojson', data: EMPTY_FC })

      // Outer halo
      map.addLayer({
        id: 'fsq-halo',
        type: 'circle',
        source: 'fsq-pois',
        paint: {
          'circle-radius': 11,
          'circle-color': '#D95F2B',
          'circle-opacity': 0.12,
        },
      })

      // Main dot
      map.addLayer({
        id: 'fsq-circles',
        type: 'circle',
        source: 'fsq-pois',
        paint: {
          'circle-radius': 6,
          'circle-color': '#fff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#D95F2B',
          'circle-opacity': 0.9,
        },
      })

      map.on('mouseenter', 'fsq-circles', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'fsq-circles', () => { map.getCanvas().style.cursor = '' })

      map.on('click', 'fsq-circles', e => {
        const f = e.features[0]
        const { name, category } = f.properties
        new mapboxgl.Popup({ closeButton: false, offset: 14, maxWidth: '220px' })
          .setLngLat(f.geometry.coordinates)
          .setHTML(`
            <div style="font-family:DM Sans,sans-serif;padding:2px 0">
              <div style="font-weight:600;font-size:14px;color:#0B0F1A">${esc(name)}</div>
              ${category ? `<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#8C97A6;margin-top:3px">${esc(fsqCategoryLabel(category))}</div>` : ''}
              <div style="font-size:11px;color:#C4CDD8;margin-top:4px">via Foursquare</div>
            </div>
          `)
          .addTo(map)
      })

      // Fetch POIs on move/zoom (debounced)
      function scheduleFetch() {
        clearTimeout(fetchDebounce.current)
        fetchDebounce.current = setTimeout(() => fetchFSQPOIs(map), 1500)
      }
      map.on('moveend', scheduleFetch)
      map.on('zoomend', scheduleFetch)
    })

    return () => {
      clearTimeout(fetchDebounce.current)
      map.remove()
      mapRef.current = null
    }
  }, [mapboxToken, mapLimited])

  // Place trip item markers whenever items change
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

        const el = document.createElement('div')
        el.innerHTML = `<span style="transform:rotate(45deg);display:block;line-height:1;user-select:none">${icon}</span>`
        Object.assign(el.style, {
          width: '36px', height: '36px',
          borderRadius: '50% 50% 50% 0',
          background: bg, border: '2.5px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(11,15,26,0.28)',
          transform: 'rotate(-45deg)',
          transition: 'transform 150ms, box-shadow 150ms',
          zIndex: '10',
        })
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'rotate(-45deg) scale(1.2)'
          el.style.boxShadow = '0 4px 18px rgba(11,15,26,0.38)'
        })
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'rotate(-45deg)'
          el.style.boxShadow = '0 2px 8px rgba(11,15,26,0.28)'
        })

        const popup = new mapboxgl.Popup({ offset: 30, closeButton: false, maxWidth: '260px' })
          .setHTML(`
            <div style="font-family:DM Sans,sans-serif;min-width:170px;max-width:240px">
              <div style="font-weight:600;font-size:14px;color:#0B0F1A;margin-bottom:2px">${esc(item.title)}</div>
              ${item.location_name ? `<div style="font-size:12px;color:#677585;font-family:JetBrains Mono,monospace">${esc(item.location_name)}</div>` : ''}
              ${time ? `<div style="font-size:11px;color:#8C97A6;margin-top:3px;font-family:JetBrains Mono,monospace">${time}</div>` : ''}
              ${item.cost_amount != null ? `<div style="font-size:13px;font-weight:600;color:#0B0F1A;margin-top:5px;font-family:JetBrains Mono,monospace">$${fmtMoney(item.cost_amount)}</div>` : ''}
            </div>
          `)

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

  // ── Foursquare fetch ───────────────────────────────────────────────────────
  async function fetchFSQPOIs(map) {
    if (!fsqKey || !showPOIsRef.current) return

    const zoom = map.getZoom()
    if (zoom < 11) {
      // Zoomed out too far — clear POIs to avoid stale data
      const src = map.getSource('fsq-pois')
      if (src) { src.setData(EMPTY_FC); setPOICount(0) }
      return
    }

    if (!canCallFSQ()) {
      setFsqLimited(true)
      return
    }

    const center = map.getCenter()
    const radius = zoomToRadius(zoom)
    const key    = poiCacheKey(center.lat, center.lng, radius)

    // Serve from cache if we already fetched this grid cell
    if (poiCacheRef.current[key]) {
      updatePOILayer(map, poiCacheRef.current[key])
      return
    }

    recordFSQCall()
    setUsage(getUsage())

    try {
      const r = await fetch(
        `https://api.foursquare.com/v3/places/search` +
        `?ll=${center.lat},${center.lng}` +
        `&radius=${radius}` +
        `&limit=30` +
        `&fields=name,categories,geocodes`,
        { headers: { Authorization: fsqKey, Accept: 'application/json' } }
      )
      if (!r.ok) return
      const data = await r.json()

      const features = (data.results || [])
        .filter(p => p.geocodes?.main)
        .map(p => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [p.geocodes.main.longitude, p.geocodes.main.latitude],
          },
          properties: {
            name:     p.name,
            category: p.categories?.[0]?.name ?? null,
          },
        }))

      poiCacheRef.current[key] = features
      updatePOILayer(map, features)
    } catch {
      // Silently fail — don't surface network errors to the user
    }
  }

  function updatePOILayer(map, features) {
    const src = map.getSource('fsq-pois')
    if (!src) return
    src.setData({ type: 'FeatureCollection', features })
    setPOICount(features.length)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!mapboxToken) {
    return (
      <div style={{ height: 520, borderRadius: 16, background: '#F4F6F8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 40 }}>🗺</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#475563' }}>Mapbox token not configured</div>
        <div style={{ fontSize: 13, color: '#8C97A6' }}>Add VITE_MAPBOX_TOKEN to .env.local</div>
      </div>
    )
  }

  // Daily map-load limit hit
  if (mapLimited) {
    return (
      <div style={{ height: 520, borderRadius: 16, background: '#F4F6F8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40 }}>
        <div style={{ fontSize: 40 }}>🗺</div>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 20, fontWeight: 400, color: '#0B0F1A' }}>Daily map limit reached</div>
        <div style={{ fontSize: 13, color: '#677585', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
          Free accounts can view maps {usage?.mapLoadCap ?? 20} times per day.
          Map views reset at midnight.
        </div>
        {usage && (
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#A0ADBC' }}>
            {usage.mapLoads} / {usage.mapLoadCap} loads used today
          </div>
        )}
      </div>
    )
  }

  const locatedCount = items.filter(i => i.location_lat != null && i.location_lng != null && !i.is_proposal).length

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(11,15,26,0.10)' }}>
      <div ref={containerRef} style={{ height: 560 }} />

      {/* Empty state overlay */}
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

      {/* Controls bar — top left */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {/* Foursquare POI toggle */}
        {fsqKey && (
          <button
            onClick={() => setShowPOIs(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', border: 'none',
              background: showPOIs ? '#fff' : 'rgba(255,255,255,0.6)',
              color: showPOIs ? '#0B0F1A' : '#8C97A6',
              boxShadow: '0 1px 6px rgba(11,15,26,0.15)',
              transition: 'all 150ms',
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: showPOIs ? '#D95F2B' : '#C4CDD8',
              border: '1.5px solid',
              borderColor: showPOIs ? '#D95F2B' : '#C4CDD8',
            }} />
            Nearby places
            {showPOIs && poiCount > 0 && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8C97A6', fontWeight: 400 }}>
                {poiCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Usage indicator — bottom left */}
      {usage && (
        <div style={{
          position: 'absolute', bottom: 28, left: 12, zIndex: 10,
          display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-start',
        }}>
          <div style={{
            padding: '4px 9px', borderRadius: 6, fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace', color: '#677585',
            background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)',
            boxShadow: '0 1px 4px rgba(11,15,26,0.10)',
          }}>
            {usage.mapLoads}/{usage.mapLoadCap} map loads · {usage.fsqCalls}/{usage.fsqCallCap} place lookups · today
          </div>
          {fsqLimited && (
            <div style={{
              padding: '4px 9px', borderRadius: 6, fontSize: 10,
              fontFamily: 'DM Sans, monospace', color: '#C23B2E', fontWeight: 600,
              background: 'rgba(255,255,255,0.92)',
              boxShadow: '0 1px 4px rgba(11,15,26,0.10)',
            }}>
              Place lookup limit reached — resets tomorrow
            </div>
          )}
        </div>
      )}
    </div>
  )
}
