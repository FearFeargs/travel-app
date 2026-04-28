const STAY_KEY = 'away_stay_logged_in'
const ACTIVE_KEY = 'away_session_active'

export function getStayLoggedIn() {
  return localStorage.getItem(STAY_KEY) === 'true'
}

export function setStayLoggedIn(value) {
  localStorage.setItem(STAY_KEY, value ? 'true' : 'false')
}

export function hasStayPreference() {
  return localStorage.getItem(STAY_KEY) !== null
}

export function markSessionActive() {
  sessionStorage.setItem(ACTIVE_KEY, '1')
}

export function isSessionActive() {
  return sessionStorage.getItem(ACTIVE_KEY) === '1'
}
