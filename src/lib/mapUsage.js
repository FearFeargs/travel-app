// Per-device daily caps stored in localStorage.
// Google Maps Platform gives $200/month free credit (~28k map loads, ~70k Places requests).
// These caps protect against accidental runaway usage before a server-side subscription system exists.

const MAP_LOADS_CAP   = 20   // Google Maps JS loads per device per day
const PLACES_CALLS_CAP = 50  // Google Places Autocomplete calls per device per day

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
  return read() || { mapLoads: 0, placesCalls: 0 }
}

export function canLoadMap() {
  return getOrInit().mapLoads < MAP_LOADS_CAP
}

export function recordMapLoad() {
  const d = getOrInit()
  write({ ...d, mapLoads: d.mapLoads + 1 })
}

export function canCallPlaces() {
  return getOrInit().placesCalls < PLACES_CALLS_CAP
}

export function recordPlacesCall() {
  const d = getOrInit()
  write({ ...d, placesCalls: d.placesCalls + 1 })
}

export function getUsage() {
  const d = getOrInit()
  return {
    mapLoads:    d.mapLoads,    mapLoadCap:    MAP_LOADS_CAP,
    placesCalls: d.placesCalls, placesCallCap: PLACES_CALLS_CAP,
  }
}
