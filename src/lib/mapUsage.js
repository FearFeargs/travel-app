// Per-device daily caps stored in localStorage.
// These protect against Mapbox map-load costs and Foursquare free-tier limits.
// When a subscription model is introduced, move enforcement server-side.

const MAP_LOADS_CAP  = 20   // Mapbox map loads per device per day
const FSQ_CALLS_CAP  = 25   // Foursquare Places API calls per device per day

function today() {
  return new Date().toISOString().slice(0, 10)
}

function read() {
  try {
    const raw = localStorage.getItem('away_map_usage')
    if (!raw) return null
    const d = JSON.parse(raw)
    return d.date === today() ? d : null
  } catch {
    return null
  }
}

function write(data) {
  try {
    localStorage.setItem('away_map_usage', JSON.stringify({ date: today(), ...data }))
  } catch {}
}

function getOrInit() {
  return read() || { mapLoads: 0, fsqCalls: 0 }
}

export function canLoadMap() {
  return getOrInit().mapLoads < MAP_LOADS_CAP
}

export function recordMapLoad() {
  const d = getOrInit()
  write({ ...d, mapLoads: d.mapLoads + 1 })
}

export function canCallFSQ() {
  return getOrInit().fsqCalls < FSQ_CALLS_CAP
}

export function recordFSQCall() {
  const d = getOrInit()
  write({ ...d, fsqCalls: d.fsqCalls + 1 })
}

export function getUsage() {
  const d = getOrInit()
  return {
    mapLoads:   d.mapLoads,  mapLoadCap:  MAP_LOADS_CAP,
    fsqCalls:   d.fsqCalls,  fsqCallCap:  FSQ_CALLS_CAP,
  }
}
