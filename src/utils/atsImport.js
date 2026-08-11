import { clampTargetHours } from './storage'
import {
  formatClock,
  formatDuration,
  formatFriendlyDuration,
  getBreakMs,
  getWorkMs,
  isSessionOrderValid,
  stampAt,
} from './time'

function toIso(value) {
  if (!value || typeof value !== 'string') return null
  const ms = new Date(value).getTime()
  if (Number.isNaN(ms)) return null
  return stampAt(ms)
}

function sortSessions(sessions) {
  return [...sessions].sort(
    (a, b) => new Date(a.punch_in).getTime() - new Date(b.punch_in).getTime(),
  )
}

/**
 * Parse pasted ATS attendance JSON into a Work Timer session draft.
 *
 * ATS uses multiple punch sessions; gaps between punch-out and the next
 * punch-in become breaks in our single-day model.
 */
export function parseAtsImport(rawText, { shift = 'day', now = Date.now() } = {}) {
  let data
  try {
    data = typeof rawText === 'string' ? JSON.parse(rawText) : rawText
  } catch {
    return {
      ok: false,
      error: 'Invalid JSON. Paste the full ATS API response and try again.',
    }
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Expected a JSON object from the ATS API.' }
  }

  const sessionsRaw = Array.isArray(data.sessions_today)
    ? data.sessions_today
    : data.current_session
      ? [data.current_session]
      : null

  if (!sessionsRaw || sessionsRaw.length === 0) {
    return {
      ok: false,
      error: 'No sessions found. Expected sessions_today or current_session.',
    }
  }

  const invalid = sessionsRaw.find(
    (s) => !s || typeof s !== 'object' || !s.punch_in,
  )
  if (invalid) {
    return {
      ok: false,
      error: 'Each session needs a valid punch_in timestamp.',
    }
  }

  const sessions = sortSessions(sessionsRaw)
  const checkIn = toIso(sessions[0].punch_in)
  if (!checkIn) {
    return { ok: false, error: 'Could not read the first punch-in time.' }
  }

  const breaks = []
  for (let i = 0; i < sessions.length - 1; i += 1) {
    const current = sessions[i]
    const next = sessions[i + 1]
    if (!current.punch_out) {
      return {
        ok: false,
        error: `Session ${i + 1} is still open, but a later session exists. Fix the ATS data or remove overlapping punches.`,
      }
    }
    const breakStart = toIso(current.punch_out)
    const breakEnd = toIso(next.punch_in)
    if (!breakStart || !breakEnd) {
      return {
        ok: false,
        error: `Could not read the gap between session ${i + 1} and ${i + 2}.`,
      }
    }
    const startMs = new Date(breakStart).getTime()
    const endMs = new Date(breakEnd).getTime()
    if (endMs < startMs) {
      return {
        ok: false,
        error: `Sessions overlap between punch ${i + 1} and ${i + 2}.`,
      }
    }
    if (endMs > startMs) {
      breaks.push({ start: breakStart, end: breakEnd })
    }
  }

  const last = sessions[sessions.length - 1]
  const checkOut = last.punch_out ? toIso(last.punch_out) : null
  if (last.punch_out && !checkOut) {
    return { ok: false, error: 'Could not read the final punch-out time.' }
  }

  const targetMinutes = Number(data.target_minutes)
  const targetHours = clampTargetHours(
    Number.isFinite(targetMinutes) && targetMinutes > 0
      ? targetMinutes / 60
      : 8,
  )

  const session = {
    checkIn,
    checkOut,
    breaks,
    targetHours,
    shift: shift === 'night' ? 'night' : 'day',
    source: 'ats',
  }

  if (!isSessionOrderValid(session)) {
    return {
      ok: false,
      error: 'Imported times are out of order. Check the ATS punch sequence.',
    }
  }

  const endMs = checkOut ? new Date(checkOut).getTime() : now
  const workMs = getWorkMs(session, endMs)
  const breakMs = getBreakMs(session.breaks, endMs)
  const reportedBreakMin = Number(data.break_minutes)
  const reportedWorkMin = Number(data.total_today_minutes)
  const warnings = []

  if (
    Number.isFinite(reportedBreakMin) &&
    Math.abs(Math.round(breakMs / 60000) - reportedBreakMin) > 1
  ) {
    warnings.push(
      `ATS reports ${reportedBreakMin} min break; imported gaps total ${Math.round(breakMs / 60000)} min.`,
    )
  }

  if (
    Number.isFinite(reportedWorkMin) &&
    checkOut &&
    Math.abs(Math.round(workMs / 60000) - reportedWorkMin) > 1
  ) {
    warnings.push(
      `ATS reports ${reportedWorkMin} min worked; imported closed work is ${Math.round(workMs / 60000)} min.`,
    )
  }

  const status =
    data.status === 'working' || data.status === 'break' || data.status === 'checked_out'
      ? data.status
      : checkOut
        ? 'checked_out'
        : 'working'

  return {
    ok: true,
    error: null,
    warnings,
    session,
    targetHours,
    preview: {
      status,
      statusLabel:
        status === 'working'
          ? 'Working'
          : status === 'break'
            ? 'On break'
            : 'Checked out',
      checkIn,
      checkInLabel: formatClock(checkIn),
      checkOut,
      checkOutLabel: checkOut ? formatClock(checkOut) : 'Still open',
      breakCount: breaks.length,
      breakMs,
      breakLabel: formatFriendlyDuration(breakMs),
      workMs,
      workLabel: formatDuration(workMs),
      targetHours,
      targetLabel: `${targetHours}h`,
      sessionCount: sessions.length,
      punches: sessions.map((s, i) => ({
        index: i + 1,
        id: s.id ?? null,
        punchIn: formatClock(toIso(s.punch_in)),
        punchOut: s.punch_out ? formatClock(toIso(s.punch_out)) : 'Open',
        durationMinutes:
          typeof s.duration_minutes === 'number' ? s.duration_minutes : null,
      })),
    },
  }
}
