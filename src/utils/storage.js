import { pruneSessions } from './time'

const STORAGE_KEY = 'work-timer:v1'

const defaultStore = () => ({
  targetHours: 8,
  shift: 'day',
  theme: 'light',
  sessions: {},
})

export function emptySession(targetHours = 8, shift = 'day') {
  return {
    checkIn: null,
    checkOut: null,
    breaks: [],
    targetHours,
    shift: shift === 'night' ? 'night' : 'day',
  }
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStore()
    const parsed = JSON.parse(raw)
    return {
      targetHours: Number(parsed.targetHours) > 0 ? Number(parsed.targetHours) : 8,
      shift: parsed.shift === 'night' ? 'night' : 'day',
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      sessions: pruneSessions(parsed.sessions ?? {}, 30),
    }
  } catch {
    return defaultStore()
  }
}

export function saveStore(store) {
  const next = {
    targetHours: store.targetHours,
    shift: store.shift === 'night' ? 'night' : 'day',
    theme: store.theme === 'dark' ? 'dark' : 'light',
    sessions: pruneSessions(store.sessions ?? {}, 30),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}
