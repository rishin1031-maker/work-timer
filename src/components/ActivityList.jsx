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

export function ActivityList({ session, now = Date.now(), onEdit, editButtonRef }) {
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
            <span className="edit-icon" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Edit entries
          </button>
        ) : null}
      </div>

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
    </section>
  )
}
