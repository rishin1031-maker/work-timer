import { pruneSessions } from './time'

const STORAGE_KEY = 'work-timer:v1'

export const MIN_TARGET_HOURS = 0.25
export const MAX_TARGET_HOURS = 24
export const DEFAULT_TARGET_HOURS = 8

/** Clamp target hours to [0.25, 24] — no negatives, max one day. */
export function clampTargetHours(value) {
  if (value === '' || value == null) return DEFAULT_TARGET_HOURS
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULT_TARGET_HOURS
  if (n <= 0) return MIN_TARGET_HOURS
  return Math.min(MAX_TARGET_HOURS, Math.max(MIN_TARGET_HOURS, n))
}

const defaultStore = () => ({
  targetHours: DEFAULT_TARGET_HOURS,
  shift: 'day',
  theme: 'light',
  sessions: {},
})

export function emptySession(targetHours = DEFAULT_TARGET_HOURS, shift = 'day') {
  return {
    checkIn: null,
    checkOut: null,
    breaks: [],
    targetHours: clampTargetHours(targetHours),
    shift: shift === 'night' ? 'night' : 'day',
  }
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStore()
    const parsed = JSON.parse(raw)
    return {
      targetHours: clampTargetHours(parsed.targetHours),
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
