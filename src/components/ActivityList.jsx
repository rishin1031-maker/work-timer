import {
  formatClock,
  formatFriendlyDuration,
} from '../utils/time'

function buildActivities(session, now) {
  if (!session?.checkIn) return []

  const items = [
    {
      id: 'check-in',
      iso: session.checkIn,
      label: 'Started work',
      kind: 'work',
      ongoing: false,
    },
  ]

  ;(session.breaks ?? []).forEach((b, i) => {
    const isOpen = !b.end
    items.push({
      id: `break-start-${i}`,
      iso: b.start,
      label: isOpen
        ? `Break in progress · ${formatFriendlyDuration(
            Math.max(0, now - new Date(b.start).getTime()),
          )}`
        : b.auto
          ? 'Started break (auto)'
          : 'Started break',
      kind: 'break',
      ongoing: isOpen,
      breakIndex: i,
    })
    if (b.end) {
      items.push({
        id: `break-end-${i}`,
        iso: b.end,
        label: 'Resumed work',
        kind: 'work',
        ongoing: false,
        breakIndex: i,
      })
    }
  })

  if (session.checkOut) {
    items.push({
      id: 'check-out',
      iso: session.checkOut,
      label: 'Ended workday',
      kind: 'done',
      ongoing: false,
    })
  } else if (session.checkIn && !session.breaks?.some((b) => !b.end)) {
    const last = items[items.length - 1]
    if (last && last.kind === 'work') {
      last.ongoing = true
      last.label =
        last.id === 'check-in'
          ? `Work in progress · ${formatFriendlyDuration(
              Math.max(0, now - new Date(session.checkIn).getTime()),
            )}`
          : `Work in progress · ${formatFriendlyDuration(
              Math.max(0, now - new Date(last.iso).getTime()),
            )}`
    }
  }

  return items.sort(
    (a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime(),
  )
}

export function ActivityList({
  session,
  now = Date.now(),
  onEdit,
  editButtonRef,
}) {
  const activities = buildActivities(session, now)

  return (
    <section className="section-card activity-list">
      <div className="section-heading">
        <div>
          <h2>Today’s activity</h2>
          <p className="section-sub">Chronological session timeline</p>
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
                  <time dateTime={item.iso}>{formatClock(item.iso)}</time>
                  <span className="activity-label">{item.label}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
