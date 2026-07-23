import { formatDuration, formatFriendlyDuration } from '../utils/time'
import { DayTimeline } from './DayTimeline'
import { TargetHours } from './TargetHours'

export function ProgressSummary({
  workMs,
  remainingMs,
  targetHours,
  prefTargetHours,
  onTargetHoursChange,
  targetHoursDisabled,
  checkedIn,
  session,
  now,
  windowStart,
  windowEnd,
  shift,
  breakMs,
}) {
  const overtime = remainingMs < 0 && checkedIn
  const targetMs = Math.max(targetHours * 3600000, 1)
  const progress = checkedIn
    ? Math.min(100, Math.round((Math.max(0, workMs) / targetMs) * 100))
    : 0

  return (
    <section className="section-card progress-summary">
      <div className="section-heading">
        <div>
          <h2>Today’s progress</h2>
          <p className="section-sub">Worked versus remaining toward your target</p>
        </div>
        <TargetHours
          value={prefTargetHours ?? targetHours}
          onChange={onTargetHoursChange}
          disabled={targetHoursDisabled}
        />
      </div>

      <div className="progress-ring-row">
        <div
          className="progress-ring"
          style={{ '--progress': `${progress}` }}
          role="img"
          aria-label={`${progress}% of daily target`}
        >
          <strong>{progress}%</strong>
          <span>of target</span>
        </div>

        <dl className="progress-stats">
          <div>
            <dt>Worked</dt>
            <dd>{formatDuration(workMs)}</dd>
          </div>
          <div>
            <dt>{overtime ? 'Over' : 'Remaining'}</dt>
            <dd>
              {checkedIn
                ? formatFriendlyDuration(Math.abs(remainingMs))
                : '—'}
            </dd>
          </div>
          <div>
            <dt>Daily target</dt>
            <dd>{targetHours}h</dd>
          </div>
        </dl>
      </div>

      <DayTimeline
        session={session}
        now={now}
        workMs={workMs}
        breakMs={breakMs}
        checkedIn={checkedIn}
        windowStart={windowStart}
        windowEnd={windowEnd}
        shift={shift}
        compact
      />
    </section>
  )
}
