import { formatClock, formatDuration } from '../utils/time'

function buildSegments(session, now) {
  if (!session?.checkIn) return []

  const dayStart = new Date(session.checkIn).getTime()
  const dayEnd = session.checkOut
    ? new Date(session.checkOut).getTime()
    : now

  if (dayEnd <= dayStart) return []

  const segments = []
  let cursor = dayStart

  for (const b of session.breaks ?? []) {
    const breakStart = new Date(b.start).getTime()
    const breakEnd = b.end ? new Date(b.end).getTime() : dayEnd

    if (breakStart > cursor) {
      segments.push({
        type: 'work',
        start: cursor,
        end: Math.min(breakStart, dayEnd),
      })
    }

    if (breakStart < dayEnd) {
      segments.push({
        type: 'break',
        start: Math.max(breakStart, dayStart),
        end: Math.min(breakEnd, dayEnd),
      })
    }

    cursor = Math.max(cursor, Math.min(breakEnd, dayEnd))
  }

  if (cursor < dayEnd) {
    segments.push({ type: 'work', start: cursor, end: dayEnd })
  }

  return segments.filter((s) => s.end > s.start)
}

export function DayTimeline({ session, now, workMs, breakMs, checkedIn }) {
  if (!checkedIn || !session.checkIn) {
    return (
      <section className="panel day-timeline">
        <h2>Day timeline</h2>
        <p className="muted">Check in to see work and break on one timeline.</p>
      </section>
    )
  }

  const segments = buildSegments(session, now)
  const rangeStart = new Date(session.checkIn).getTime()
  const rangeEnd = session.checkOut
    ? new Date(session.checkOut).getTime()
    : now
  const span = Math.max(rangeEnd - rangeStart, 1)

  return (
    <section className="panel day-timeline">
      <div className="day-timeline-header">
        <h2>Day timeline</h2>
        <div className="day-timeline-legend">
          <span className="legend-item work">Work {formatDuration(workMs)}</span>
          <span className="legend-item break">Break {formatDuration(breakMs)}</span>
        </div>
      </div>

      <div className="day-timeline-bar" role="img" aria-label="Work and break timeline">
        {segments.map((segment) => {
          const left = ((segment.start - rangeStart) / span) * 100
          const width = ((segment.end - segment.start) / span) * 100
          return (
            <div
              key={`${segment.type}-${segment.start}`}
              className={`day-segment ${segment.type}`}
              style={{ left: `${left}%`, width: `${Math.max(width, 0.4)}%` }}
              title={`${segment.type === 'work' ? 'Work' : 'Break'} ${formatClock(new Date(segment.start).toISOString())} – ${formatClock(new Date(segment.end).toISOString())}`}
            />
          )
        })}
      </div>

      <div className="day-timeline-ends">
        <span>{formatClock(session.checkIn)}</span>
        <span>{session.checkOut ? formatClock(session.checkOut) : 'Now'}</span>
      </div>
    </section>
  )
}
