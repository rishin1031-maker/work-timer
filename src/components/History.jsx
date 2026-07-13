import { formatClock, formatDateLabel, formatDuration } from '../utils/time'

export function History({ history }) {
  if (history.length === 0) {
    return (
      <section className="panel">
        <h2>Last 30 days</h2>
        <p className="muted">Past days will show up here after you check out and return tomorrow.</p>
      </section>
    )
  }

  return (
    <section className="panel">
      <h2>Last 30 days</h2>
      <ul className="history">
        {history.map(({ date, session, workMs, breakMs }) => (
          <li key={date}>
            <div className="history-top">
              <strong>{formatDateLabel(date)}</strong>
              <span className="history-work">{formatDuration(workMs)}</span>
            </div>
            <div className="history-meta">
              <span>
                {formatClock(session.checkIn)}
                {session.checkOut ? ` → ${formatClock(session.checkOut)}` : ' · in progress'}
              </span>
              <span>Break {formatDuration(breakMs)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
