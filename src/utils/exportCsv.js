import { formatClock, formatDuration, getBreakMs, getWorkMs } from './time'

function escapeCsv(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function rowToLine(cells) {
  return cells.map(escapeCsv).join(',')
}

function sessionRows(entries) {
  const header = [
    'date',
    'shift',
    'check_in',
    'check_out',
    'work',
    'break',
    'target_hours',
  ]
  const lines = [rowToLine(header)]

  for (const { date, session, workMs, breakMs } of entries) {
    const end = session.checkOut
      ? new Date(session.checkOut).getTime()
      : Date.now()
    lines.push(
      rowToLine([
        date,
        session.shift === 'night' ? 'night' : 'day',
        formatClock(session.checkIn),
        session.checkOut ? formatClock(session.checkOut) : '',
        formatDuration(workMs ?? getWorkMs(session, end)),
        formatDuration(breakMs ?? getBreakMs(session.breaks, end)),
        session.targetHours ?? '',
      ]),
    )
  }

  return lines.join('\n')
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportSessionsCsv(entries, filename) {
  downloadCsv(filename, sessionRows(entries))
}

export function buildTodayExportEntry({ date, session, workMs, breakMs }) {
  return { date, session, workMs, breakMs }
}

export function filterHistoryByDays(history, days) {
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - (days - 1))
  const cutoffKey = [
    cutoff.getFullYear(),
    String(cutoff.getMonth() + 1).padStart(2, '0'),
    String(cutoff.getDate()).padStart(2, '0'),
  ].join('-')

  return history.filter((h) => h.date >= cutoffKey)
}
