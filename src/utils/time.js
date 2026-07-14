export function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatClock(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatMinutesClock(totalMinutes) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)))
  const d = new Date()
  d.setHours(Math.floor(clamped / 60), clamped % 60, 0, 0)
  return formatClock(d.toISOString())
}

export function isoToTimeInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function timeInputToIso(dateKey, timeValue) {
  if (!dateKey || !timeValue) return null
  const [y, mo, d] = dateKey.split('-').map(Number)
  const [h = 0, mi = 0] = timeValue.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi, 0, 0).toISOString()
}

export function stampNow() {
  const d = new Date()
  d.setSeconds(0, 0)
  return d.toISOString()
}

export function stampAt(ms) {
  const d = new Date(ms)
  d.setSeconds(0, 0)
  return d.toISOString()
}

export function endOfDayIso(dateKey) {
  const [y, mo, d] = dateKey.split('-').map(Number)
  return new Date(y, mo - 1, d, 23, 59, 0, 0).toISOString()
}

/** Max continuous work before an automatic break is started. */
export const CONTINUOUS_WORK_LIMIT_MS = 8 * 60 * 60 * 1000

export function isOnBreak(session) {
  const last = session?.breaks?.[session.breaks.length - 1]
  return Boolean(last && last.start && !last.end)
}

/** Start of the current continuous work stretch (check-in or last break end). */
export function getContinuousWorkStart(session) {
  if (!session?.checkIn) return null
  let start = session.checkIn
  for (const b of session.breaks ?? []) {
    if (b.end) start = b.end
  }
  return start
}

export function getContinuousWorkMs(session, now = Date.now()) {
  if (!session?.checkIn || session.checkOut || isOnBreak(session)) return 0
  const start = getContinuousWorkStart(session)
  if (!start) return 0
  return Math.max(0, now - new Date(start).getTime())
}

/**
 * Close open sessions from previous days at 23:59, and auto break-in
 * after CONTINUOUS_WORK_LIMIT_MS of uninterrupted work today.
 */
export function applySessionAutomations(store, nowMs = Date.now()) {
  const today = todayKey(new Date(nowMs))
  let changed = false
  const sessions = { ...store.sessions }

  for (const [key, session] of Object.entries(sessions)) {
    if (!session?.checkIn || session.checkOut) continue
    if (key >= today) continue

    const endStamp = endOfDayIso(key)
    const breaks = (session.breaks ?? []).map((b) => ({ ...b }))
    const last = breaks[breaks.length - 1]
    if (last && last.start && !last.end) {
      const startMs = new Date(last.start).getTime()
      const endMs = new Date(endStamp).getTime()
      last.end = startMs <= endMs ? endStamp : stampAt(startMs)
    }

    sessions[key] = {
      ...session,
      breaks,
      checkOut: endStamp,
    }
    changed = true
  }

  const session = sessions[today]
  if (session?.checkIn && !session.checkOut && !isOnBreak(session)) {
    const continuousMs = getContinuousWorkMs(session, nowMs)
    if (continuousMs >= CONTINUOUS_WORK_LIMIT_MS) {
      const start = getContinuousWorkStart(session)
      const autoAt = new Date(start).getTime() + CONTINUOUS_WORK_LIMIT_MS
      const stamp = stampAt(Math.min(autoAt, nowMs))
      sessions[today] = {
        ...session,
        breaks: [
          ...(session.breaks ?? []).map((b) => ({ ...b })),
          { start: stamp, end: null, auto: true },
        ],
      }
      changed = true
    }
  }

  if (!changed) return store
  return { ...store, sessions }
}

export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':')
}

export function formatDateLabel(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function getBreakMs(breaks, now = Date.now()) {
  return breaks.reduce((sum, b) => {
    if (!b.start) return sum
    const end = b.end ? new Date(b.end).getTime() : now
    return sum + Math.max(0, end - new Date(b.start).getTime())
  }, 0)
}

export function getWorkMs(session, now = Date.now()) {
  if (!session?.checkIn) return 0
  const end = session.checkOut ? new Date(session.checkOut).getTime() : now
  const elapsed = Math.max(0, end - new Date(session.checkIn).getTime())
  return Math.max(0, elapsed - getBreakMs(session.breaks ?? [], now))
}

export function getEstimatedCheckout(session, targetHours, now = Date.now()) {
  if (!session?.checkIn) return null
  const targetMs = Number(targetHours) * 60 * 60 * 1000
  const breakMs = getBreakMs(session.breaks ?? [], now)
  return new Date(new Date(session.checkIn).getTime() + targetMs + breakMs).toISOString()
}

export function isSessionOrderValid(session) {
  if (!session?.checkIn) return false

  let prev = new Date(session.checkIn).getTime()
  if (Number.isNaN(prev)) return false

  for (const b of session.breaks ?? []) {
    if (!b.start) return false
    const start = new Date(b.start).getTime()
    if (Number.isNaN(start) || start < prev) return false
    prev = start
    if (b.end) {
      const end = new Date(b.end).getTime()
      if (Number.isNaN(end) || end < prev) return false
      prev = end
    }
  }

  if (session.checkOut) {
    const out = new Date(session.checkOut).getTime()
    if (Number.isNaN(out) || out < prev) return false
  }

  return true
}

export function pruneSessions(sessions, keepDays = 30) {
  const keys = Object.keys(sessions).sort()
  if (keys.length <= keepDays) return sessions

  const keep = keys.slice(-keepDays)
  const next = {}
  for (const key of keep) next[key] = sessions[key]
  return next
}
