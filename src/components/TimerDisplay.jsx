import { formatDuration } from '../utils/time'

export function TimerDisplay({ ms, label, statusKey }) {
  return (
    <div className={`timer-display-block status-${statusKey}`}>
      <p className="timer-label">{label}</p>
      <p className="timer-display" aria-label={`${label}: ${formatDuration(ms)}`}>
        {formatDuration(ms)}
      </p>
    </div>
  )
}
