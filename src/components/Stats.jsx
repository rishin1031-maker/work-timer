import { formatClock, formatDuration } from '../utils/time'

export function Stats({
  workMs,
  breakMs,
  remainingMs,
  estimatedCheckout,
  checkedIn,
  checkedOut,
}) {
  const overtime = remainingMs < 0 && checkedIn
  const remainingLabel = overtime ? 'Over target' : 'Remaining'

  return (
    <div className="stats">
      <div className="stat tone-navy">
        <span className="stat-label">Work time</span>
        <span className="stat-value">{formatDuration(workMs)}</span>
      </div>
      <div className="stat tone-mint">
        <span className="stat-label">Break time</span>
        <span className="stat-value">{formatDuration(breakMs)}</span>
      </div>
      <div className="stat tone-blue">
        <span className="stat-label">{remainingLabel}</span>
        <span className={`stat-value${overtime ? ' overtime' : ''}`}>
          {checkedIn
            ? formatDuration(overtime ? Math.abs(remainingMs) : remainingMs)
            : '—'}
        </span>
      </div>
      <div className="stat tone-pink">
        <span className="stat-label">
          {checkedOut ? 'Checked out' : 'Est. check out'}
        </span>
        <span className="stat-value">
          {checkedIn ? formatClock(estimatedCheckout) : '—'}
        </span>
      </div>
    </div>
  )
}
