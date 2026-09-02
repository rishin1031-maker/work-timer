import {
  formatClock,
  formatFriendlyDuration,
} from '../utils/time'

/**
 * Build chronological work/break sessions with each segment's total duration.
 * Work sessions are the stretches between check-in, breaks, and check-out.
 */
function buildSessions(session, now) {
  if (!session?.checkIn) return []

  const checkInMs = new Date(session.checkIn).getTime()
  const checkOutMs = session.checkOut
    ? new Date(session.checkOut).getTime()
    : null
  const endBoundary = checkOutMs ?? now
  const breaks = [...(session.breaks ?? [])].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  )

  const items = []
  let cursor = checkInMs
  let workIndex = 0

  for (let i = 0; i < breaks.length; i += 1) {
    const br = breaks[i]
    const breakStart = new Date(br.start).getTime()
    const breakEnd = br.end ? new Date(br.end).getTime() : null

    if (breakStart > cursor) {
      workIndex += 1
      const durationMs = Math.max(0, breakStart - cursor)
      items.push({
        id: `work-${workIndex}`,
        kind: 'work',
        label: workIndex === 1 ? 'Work session' : `Work session ${workIndex}`,
        startIso: new Date(cursor).toISOString(),
        endIso: new Date(breakStart).toISOString(),
        durationMs,
        ongoing: false,
      })
    }

    const breakDurationEnd = breakEnd ?? now
    items.push({
      id: `break-${i}`,
      kind: 'break',
      label: br.auto
        ? breakEnd
          ? 'Break (auto)'
          : 'Break in progress (auto)'
        : breakEnd
          ? 'Break'
          : 'Break in progress',
      startIso: br.start,
      endIso: br.end,
      durationMs: Math.max(0, breakDurationEnd - breakStart),
      ongoing: !breakEnd,
    })

    if (breakEnd) {
      cursor = breakEnd
    } else {
      cursor = null
      break
    }
  }

  if (cursor != null && endBoundary > cursor) {
    workIndex += 1
    const ongoing = !checkOutMs
    items.push({
      id: `work-${workIndex}`,
      kind: 'work',
      label:
        workIndex === 1
          ? ongoing
            ? 'Work in progress'
            : 'Work session'
          : ongoing
            ? `Work session ${workIndex} · in progress`
            : `Work session ${workIndex}`,
      startIso: new Date(cursor).toISOString(),
      endIso: checkOutMs ? new Date(checkOutMs).toISOString() : null,
      durationMs: Math.max(0, endBoundary - cursor),
      ongoing,
    })
  }

  if (checkOutMs) {
    items.push({
      id: 'check-out',
      kind: 'done',
      label: 'Ended workday',
      startIso: session.checkOut,
      endIso: null,
      durationMs: null,
      ongoing: false,
    })
  }

  return items
}

function formatRange(startIso, endIso, ongoing) {
  const start = formatClock(startIso)
  if (ongoing || !endIso) return `${start} – now`
  return `${start} – ${formatClock(endIso)}`
}

export function ActivityList({
  session,
  now = Date.now(),
  onEdit,
  editButtonRef,
}) {
  const activities = buildSessions(session, now)

  return (
    <section className="section-card activity-list">
      <div className="section-heading">
        <div>
          <h2>Today’s activity</h2>
          <p className="section-sub">Each session with total time</p>
        </div>
        {session?.checkIn ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-edit-entries"
            ref={editButtonRef}
            onClick={() => onEdit?.()}
          >
            <svg
              viewBox="0 0 24 24"
              className="activity-edit-icon"
              aria-hidden="true"
            >
              <path
                d="M4.5 19.5h3.1L17.8 9.3a1.5 1.5 0 0 0 0-2.1l-1-1a1.5 1.5 0 0 0-2.1 0L4.5 16.4v3.1Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M13.2 7.5l3.3 3.3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            Edit entries
          </button>
        ) : null}
      </div>

      <div className="activity-list-body">
        {activities.length === 0 ? (
          <p className="muted empty-state">
            No activity yet. Start work to begin tracking.
          </p>
        ) : (
          <ol className="activity-timeline">
            {activities.map((item) => (
              <li
                key={item.id}
                className={`activity-item kind-${item.kind}${item.ongoing ? ' is-ongoing' : ''}`}
              >
                <span className="activity-rail" aria-hidden="true">
                  <span className="activity-icon" />
                </span>
                <div className="activity-content">
                  <div className="activity-row">
                    <span className="activity-label">{item.label}</span>
                    {item.durationMs != null ? (
                      <span className="activity-duration">
                        {formatFriendlyDuration(item.durationMs)}
                      </span>
                    ) : null}
                  </div>
                  <time dateTime={item.startIso}>
                    {item.kind === 'done'
                      ? formatClock(item.startIso)
                      : formatRange(item.startIso, item.endIso, item.ongoing)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
