export function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Day shift: midnight→midnight. Night shift: noon→noon (12pm–12pm). */
export function shiftDayKey(date = new Date(), shift = 'day') {
  const d = new Date(date)
  if (shift === 'night' && d.getHours() < 12) {
    d.setDate(d.getDate() - 1)
  }
  return todayKey(d)
}

export function shiftWindow(dateKey, shift = 'day') {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (shift === 'night') {
    return {
      start: new Date(y, m - 1, d, 12, 0, 0, 0),
      end: new Date(y, m - 1, d + 1, 12, 0, 0, 0),
    }
  }
  return {
    start: new Date(y, m - 1, d, 0, 0, 0, 0),
    end: new Date(y, m - 1, d + 1, 0, 0, 0, 0),
  }
}

export function endOfShiftIso(dateKey, shift = 'day') {
  const { end } = shiftWindow(dateKey, shift)
  return stampAt(end.getTime() - 60 * 1000)
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

export function formatShiftLabel(dateKey, shift = 'day') {
  const { start, end } = shiftWindow(dateKey, shift)
  const startLabel = start.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  if (shift === 'day') return startLabel
  const endLabel = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  return `${startLabel} → ${endLabel}`
}

export function isoToTimeInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function timeInputToIso(dateKey, timeValue, shift = 'day') {
  if (!dateKey || !timeValue) return null
  const [y, mo, d] = dateKey.split('-').map(Number)
  const [h = 0, mi = 0] = timeValue.split(':').map(Number)
  if (shift === 'night' && h < 12) {
    return new Date(y, mo - 1, d + 1, h, mi, 0, 0).toISOString()
  }
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

/** Max continuous work before an automatic break is started. */
export const CONTINUOUS_WORK_LIMIT_MS = 8 * 60 * 60 * 1000

export function isOnBreak(session) {
  const last = session?.breaks?.[session.breaks.length - 1]
  return Boolean(last && last.start && !last.end)
}

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

export function applySessionAutomations(store, nowMs = Date.now()) {
  const currentShift = store.shift === 'night' ? 'night' : 'day'
  const currentToday = shiftDayKey(new Date(nowMs), currentShift)
  let changed = false
  const sessions = { ...store.sessions }

  for (const [key, session] of Object.entries(sessions)) {
    if (!session?.checkIn || session.checkOut) continue

    const sessionShift = session.shift === 'night' ? 'night' : 'day'
    const sessionToday = shiftDayKey(new Date(nowMs), sessionShift)
    if (key >= sessionToday) continue

    const endStamp = endOfShiftIso(key, sessionShift)
    const breaks = (session.breaks ?? []).map((b) => ({ ...b }))
    const last = breaks[breaks.length - 1]
    if (last && last.start && !last.end) {
      const startMs = new Date(last.start).getTime()
      const endMs = new Date(endStamp).getTime()
      last.end = startMs <= endMs ? endStamp : stampAt(startMs)
    }

    sessions[key] = {
      ...session,
      shift: sessionShift,
      breaks,
      checkOut: endStamp,
    }
    changed = true
  }

  const session = sessions[currentToday]
  if (session?.checkIn && !session.shift) {
    sessions[currentToday] = { ...session, shift: currentShift }
    changed = true
  }

  const active = sessions[currentToday]
  if (active?.checkIn && !active.checkOut && !isOnBreak(active)) {
    const continuousMs = getContinuousWorkMs(active, nowMs)
    if (continuousMs >= CONTINUOUS_WORK_LIMIT_MS) {
      const start = getContinuousWorkStart(active)
      const autoAt = new Date(start).getTime() + CONTINUOUS_WORK_LIMIT_MS
      const stamp = stampAt(Math.min(autoAt, nowMs))
      sessions[currentToday] = {
        ...active,
        shift: active.shift === 'night' ? 'night' : currentShift,
        breaks: [
          ...(active.breaks ?? []).map((b) => ({ ...b })),
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
  return date.toLocaleDateString('en-US', {
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
