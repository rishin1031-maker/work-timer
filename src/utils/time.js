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

/** Human-readable duration, e.g. "5 minutes" or "2h 48m". */
export function formatFriendlyDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`
  }
  if (minutes === 0) {
    return hours === 1 ? '1h' : `${hours}h`
  }
  return `${hours}h ${minutes}m`
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

/** Duration of the currently open break, or 0. */
export function getOpenBreakMs(session, now = Date.now()) {
  if (!isOnBreak(session)) return 0
  const last = session.breaks[session.breaks.length - 1]
  if (!last?.start) return 0
  return Math.max(0, now - new Date(last.start).getTime())
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

export function cloneSession(session) {
  if (!session) return null
  return {
    ...session,
    breaks: (session.breaks ?? []).map((b) => ({ ...b })),
  }
}

export function sessionsEqual(a, b) {
  if (!a && !b) return true
  if (!a || !b) return false
  return JSON.stringify({
    checkIn: a.checkIn,
    checkOut: a.checkOut ?? null,
    breaks: (a.breaks ?? []).map((br) => ({
      start: br.start,
      end: br.end ?? null,
      auto: Boolean(br.auto),
    })),
  }) ===
    JSON.stringify({
      checkIn: b.checkIn,
      checkOut: b.checkOut ?? null,
      breaks: (b.breaks ?? []).map((br) => ({
        start: br.start,
        end: br.end ?? null,
        auto: Boolean(br.auto),
      })),
    })
}

/**
 * Field-level validation for the edit-entries draft.
 * Returns { ok, errors } where errors has checkIn, checkOut, general,
 * and breaks: { [index]: { start?, end?, general? } }.
 */
export function validateSessionEdits(session, { now = Date.now() } = {}) {
  const errors = { breaks: {} }
  let ok = true

  function fail(path, message) {
    ok = false
    if (path.startsWith('breaks.')) {
      const [, index, field] = path.split('.')
      if (!errors.breaks[index]) errors.breaks[index] = {}
      errors.breaks[index][field] = message
    } else {
      errors[path] = message
    }
  }

  if (!session?.checkIn) {
    fail('checkIn', 'Check-in time is required.')
    return { ok: false, errors }
  }

  const checkInMs = new Date(session.checkIn).getTime()
  if (Number.isNaN(checkInMs)) {
    fail('checkIn', 'Enter a valid check-in time.')
    return { ok: false, errors }
  }

  if (!session.checkOut && checkInMs > now) {
    fail('checkIn', 'Check-in cannot be in the future.')
  }

  let prev = checkInMs
  let prevLabel = 'check-in'
  const seen = new Set()

  ;(session.breaks ?? []).forEach((b, i) => {
    if (!b.start) {
      fail(`breaks.${i}.start`, 'Break start is required.')
      return
    }
    const startMs = new Date(b.start).getTime()
    if (Number.isNaN(startMs)) {
      fail(`breaks.${i}.start`, 'Enter a valid break start time.')
      return
    }

    const key = `${b.start}|${b.end ?? 'open'}`
    if (seen.has(key)) {
      fail(`breaks.${i}.general`, 'Duplicate break times are not allowed.')
    }
    seen.add(key)

    if (startMs < prev) {
      fail(
        `breaks.${i}.start`,
        `Break start must be after ${prevLabel}.`,
      )
    }
    if (!session.checkOut && startMs > now) {
      fail(`breaks.${i}.start`, 'Break start cannot be in the future.')
    }

    prev = Math.max(prev, startMs)
    prevLabel = `break ${i + 1} start`

    if (b.end) {
      const endMs = new Date(b.end).getTime()
      if (Number.isNaN(endMs)) {
        fail(`breaks.${i}.end`, 'Enter a valid break end time.')
        return
      }
      if (endMs < startMs) {
        fail(`breaks.${i}.end`, 'Break end must be after break start.')
      }
      if (endMs === startMs) {
        fail(`breaks.${i}.end`, 'Break must be longer than 0 minutes.')
      }
      if (!session.checkOut && endMs > now) {
        fail(`breaks.${i}.end`, 'Break end cannot be in the future.')
      }
      if (endMs < prev && endMs >= startMs) {
        // still chronological if end >= start; prev was start
      }
      prev = Math.max(prev, endMs)
      prevLabel = `break ${i + 1} end`
    }
  })

  if (session.checkOut) {
    const outMs = new Date(session.checkOut).getTime()
    if (Number.isNaN(outMs)) {
      fail('checkOut', 'Enter a valid end time.')
    } else if (outMs < prev) {
      fail('checkOut', 'End workday must be after the last stamp.')
    }
  }

  if (ok && !isSessionOrderValid(session)) {
    fail('general', 'Times must stay in chronological order without overlaps.')
  }

  const workMs = getWorkMs(session, session.checkOut ? new Date(session.checkOut).getTime() : now)
  const breakMs = getBreakMs(session.breaks ?? [], session.checkOut ? new Date(session.checkOut).getTime() : now)
  if (workMs < 0 || breakMs < 0) {
    fail('general', 'Work and break durations cannot be negative.')
  }

  return { ok, errors }
}

/** Suggest a non-overlapping completed break inside an available gap. */
export function suggestBreakRange(session, now = Date.now()) {
  if (!session?.checkIn) return null

  const stamps = [new Date(session.checkIn).getTime()]
  for (const b of session.breaks ?? []) {
    if (b.start) stamps.push(new Date(b.start).getTime())
    if (b.end) stamps.push(new Date(b.end).getTime())
  }
  if (session.checkOut) stamps.push(new Date(session.checkOut).getTime())

  const lastStamp = Math.max(...stamps)
  const endCap = session.checkOut ? new Date(session.checkOut).getTime() : now
  if (endCap - lastStamp < 2 * 60 * 1000) return null

  const breakEnd = Math.min(endCap - 60 * 1000, lastStamp + 16 * 60 * 1000)
  const breakStart = Math.max(lastStamp + 60 * 1000, breakEnd - 15 * 60 * 1000)
  if (breakEnd <= breakStart) return null

  return { start: stampAt(breakStart), end: stampAt(breakEnd) }
}

export function pruneSessions(sessions, keepDays = 30) {
  const keys = Object.keys(sessions).sort()
  if (keys.length <= keepDays) return sessions

  const keep = keys.slice(-keepDays)
  const next = {}
  for (const key of keep) next[key] = sessions[key]
  return next
}
