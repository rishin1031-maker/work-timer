import { lazy, Suspense } from 'react'
import {
  formatClock,
  formatDuration,
  formatFriendlyDuration,
} from '../utils/time'
import { TimerActions } from './TimerActions'
import { TimerDisplay } from './TimerDisplay'

const Companion = lazy(() =>
  import('./Companion').then((mod) => ({ default: mod.Companion })),
)

function statusMeta({ checkedIn, checkedOut, onBreak, autoBreakActive }) {
  if (!checkedIn) {
    return {
      key: 'idle',
      label: 'Checked out',
      detail: 'Ready to start',
      timerLabel: 'Work duration',
    }
  }
  if (checkedOut) {
    return {
      key: 'done',
      label: 'Checked out',
      detail: 'Workday complete',
      timerLabel: 'Today’s work',
    }
  }
  if (autoBreakActive) {
    return {
      key: 'break',
      label: 'On break',
      detail: 'Auto break after 8h continuous work',
      timerLabel: 'Current break',
    }
  }
  if (onBreak) {
    return {
      key: 'break',
      label: 'On break',
      detail: 'Take your time',
      timerLabel: 'Current break',
    }
  }
  return {
    key: 'working',
    label: 'Currently working',
    detail: 'Live session',
    timerLabel: 'Work duration',
  }
}

export function CurrentStatusCard({
  checkedIn,
  checkedOut,
  onBreak,
  autoBreakActive,
  workMs,
  breakMs,
  openBreakMs,
  remainingMs,
  estimatedCheckout,
  checkInIso,
  checkOutIso,
  targetHours,
  theme,
  companionMood,
  onStartWork,
  onStartBreak,
  onResumeWork,
  onEndWorkday,
  showInlineActions = true,
}) {
  const status = statusMeta({
    checkedIn,
    checkedOut,
    onBreak,
    autoBreakActive,
  })
  const overtime = remainingMs < 0 && checkedIn
  const finishIso = checkedOut ? checkOutIso : estimatedCheckout
  const progress = Math.min(
    100,
    Math.round((Math.max(0, workMs) / Math.max(targetHours * 3600000, 1)) * 100),
  )
  const timerMs = onBreak && !checkedOut ? openBreakMs : workMs

  return (
    <section
      className={`status-card status-${status.key}`}
      aria-labelledby="status-card-heading"
    >
      <div className="status-card-hero">
        <div className="status-card-main">
          <div className="status-card-top">
            <p className="status-eyebrow" id="status-card-heading">
              <span
                className={`status-dot status-${status.key}`}
                aria-hidden="true"
              />
              <span aria-live="polite" aria-atomic="true">
                {status.label}
              </span>
            </p>
            <span className="status-detail">{status.detail}</span>
          </div>

          <TimerDisplay
            ms={timerMs}
            label={status.timerLabel}
            statusKey={status.key}
          />
        </div>

        <div className="status-companion" aria-hidden="true">
          <Suspense fallback={<div className="companion companion-fallback" />}>
            <Companion mood={companionMood} theme={theme} />
          </Suspense>
        </div>
      </div>

      <ul className="status-meta">
        <li>
          <span>Started at</span>
          <strong>{checkedIn ? formatClock(checkInIso) : '—'}</strong>
        </li>
        <li>
          <span>Worked</span>
          <strong>{checkedIn ? formatDuration(workMs) : '—'}</strong>
        </li>
        <li>
          <span>Break taken</span>
          <strong>
            {checkedIn ? formatFriendlyDuration(breakMs) : '—'}
          </strong>
        </li>
        <li>
          <span>{overtime ? 'Over target' : 'Remaining'}</span>
          <strong>
            {checkedIn
              ? formatFriendlyDuration(Math.abs(remainingMs))
              : '—'}
          </strong>
        </li>
        <li>
          <span>{checkedOut ? 'Finished' : 'Estimated finish'}</span>
          <strong>{checkedIn ? formatClock(finishIso) : '—'}</strong>
        </li>
      </ul>

      <div
        className="status-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={checkedIn ? progress : 0}
        aria-label="Progress toward daily target"
      >
        <div
          className={`status-progress-fill${overtime ? ' is-over' : ''}`}
          style={{ width: `${checkedIn ? progress : 0}%` }}
        />
      </div>
      <p className="status-progress-label">
        {checkedIn
          ? `${progress}% of ${targetHours}h target`
          : `Daily target ${targetHours}h`}
      </p>

      {showInlineActions ? (
        <TimerActions
          checkedIn={checkedIn}
          checkedOut={checkedOut}
          onBreak={onBreak}
          onStartWork={onStartWork}
          onStartBreak={onStartBreak}
          onResumeWork={onResumeWork}
          onEndWorkday={onEndWorkday}
        />
      ) : null}
    </section>
  )
}
