import { formatClock, formatDuration } from '../utils/time'

function buildSegments(session, now, rangeStart, rangeEnd) {
  if (!session?.checkIn) return []

  const sessionStart = new Date(session.checkIn).getTime()
  const sessionEnd = session.checkOut
    ? new Date(session.checkOut).getTime()
    : now

  const clipStart = Math.max(sessionStart, rangeStart)
  const clipEnd = Math.min(sessionEnd, rangeEnd)
  if (clipEnd <= clipStart) return []

  const segments = []
  let cursor = clipStart

  for (const b of session.breaks ?? []) {
    const breakStart = Math.max(new Date(b.start).getTime(), rangeStart)
    const breakEnd = Math.min(
      b.end ? new Date(b.end).getTime() : sessionEnd,
      rangeEnd,
      clipEnd,
    )

    if (breakStart > cursor && breakStart < clipEnd) {
      segments.push({
        type: 'work',
        start: cursor,
        end: Math.min(breakStart, clipEnd),
      })
    }

    if (breakStart < clipEnd && breakEnd > breakStart) {
      segments.push({
        type: 'break',
        start: Math.max(breakStart, clipStart),
        end: Math.min(breakEnd, clipEnd),
      })
      cursor = Math.max(cursor, Math.min(breakEnd, clipEnd))
    }
  }

  if (cursor < clipEnd) {
    segments.push({ type: 'work', start: cursor, end: clipEnd })
  }

  return segments.filter((s) => s.end > s.start)
}

function hourMarks(rangeStart, shift) {
  const marks = []
  for (let i = 0; i <= 24; i += 6) {
    const ms = rangeStart + i * 60 * 60 * 1000
    marks.push({
      pct: (i / 24) * 100,
      label:
        i === 0 || i === 24
          ? shift === 'night'
            ? '12 PM'
            : '12 AM'
          : formatClock(new Date(ms).toISOString()).replace(':00', ''),
    })
  }
  return marks
}

export function DayTimeline({
  session,
  now,
  workMs,
  breakMs,
  checkedIn,
  windowStart,
  windowEnd,
  shift,
}) {
  const rangeStart = windowStart.getTime()
  const rangeEnd = windowEnd.getTime()
  const span = Math.max(rangeEnd - rangeStart, 1)
  const segments = checkedIn
    ? buildSegments(session, now, rangeStart, rangeEnd)
    : []
  const nowPct = Math.min(100, Math.max(0, ((now - rangeStart) / span) * 100))
  const marks = hourMarks(rangeStart, shift)

  return (
    <section className="panel day-timeline">
      <div className="day-timeline-header">
        <div>
          <h2>24-hour timeline</h2>
          <p className="muted timeline-sub">
            {shift === 'night' ? 'Night shift · 12 PM → 12 PM' : 'Day shift · 12 AM → 12 AM'}
          </p>
        </div>
        <div className="day-timeline-legend">
          <span className="legend-item work">Work {formatDuration(workMs)}</span>
          <span className="legend-item break">Break {formatDuration(breakMs)}</span>
        </div>
      </div>

      <div className="day-timeline-bar fixed-day" role="img" aria-label="24 hour work and break timeline">
        {segments.map((segment) => {
          const left = ((segment.start - rangeStart) / span) * 100
          const width = ((segment.end - segment.start) / span) * 100
          return (
            <div
              key={`${segment.type}-${segment.start}`}
              className={`day-segment ${segment.type}`}
              style={{ left: `${left}%`, width: `${Math.max(width, 0.25)}%` }}
              title={`${segment.type === 'work' ? 'Work' : 'Break'} ${formatClock(new Date(segment.start).toISOString())} – ${formatClock(new Date(segment.end).toISOString())}`}
            />
          )
        })}
        {now >= rangeStart && now <= rangeEnd ? (
          <div className="now-marker" style={{ left: `${nowPct}%` }} title="Now" />
        ) : null}
      </div>

      <div className="day-timeline-marks">
        {marks.map((mark) => (
          <span key={`${mark.pct}-${mark.label}`} style={{ left: `${mark.pct}%` }}>
            {mark.label}
          </span>
        ))}
      </div>
    </section>
  )
}
