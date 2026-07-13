import { pruneSessions } from './time'

const STORAGE_KEY = 'work-timer:v1'

const defaultStore = () => ({
  targetHours: 8,
  sessions: {},
})

export function emptySession(targetHours = 8) {
  return {
    checkIn: null,
    checkOut: null,
    breaks: [],
    targetHours,
  }
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStore()
    const parsed = JSON.parse(raw)
    return {
      targetHours: Number(parsed.targetHours) > 0 ? Number(parsed.targetHours) : 8,
      sessions: pruneSessions(parsed.sessions ?? {}, 30),
    }
  } catch {
    return defaultStore()
  }
}

export function saveStore(store) {
  const next = {
    targetHours: store.targetHours,
    sessions: pruneSessions(store.sessions ?? {}, 30),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}
