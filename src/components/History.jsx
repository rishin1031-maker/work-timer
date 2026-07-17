import { getWeekSummary } from '../utils/weekSummary'
import {
  buildTodayExportEntry,
  exportSessionsCsv,
  filterHistoryByDays,
} from '../utils/exportCsv'
import { formatClock, formatDuration, formatShiftLabel } from '../utils/time'

export function History({
  history,
  today,
  todayWorkMs,
  todayBreakMs,
  todayTargetHours,
}) {
  const week = getWeekSummary({
    history,
    todayKey: today?.date,
    todayWorkMs: todayWorkMs ?? 0,
    todayTargetHours: todayTargetHours ?? 8,
  })

  function exportToday() {
    if (!today?.session?.checkIn) return
    exportSessionsCsv(
      [
        buildTodayExportEntry({
          date: today.date,
          session: today.session,
          workMs: todayWorkMs,
          breakMs: todayBreakMs,
        }),
      ],
      `work-timer-${today.date}.csv`,
    )
  }

  function exportDays(days) {
    const past = filterHistoryByDays(history, days)
    const entries = [...past]
    if (today?.session?.checkIn && today.date) {
      const cutoff = filterHistoryByDays(
        [
          buildTodayExportEntry({
            date: today.date,
            session: today.session,
            workMs: todayWorkMs,
            breakMs: todayBreakMs,
          }),
        ],
        days,
      )
      if (cutoff.length) {
        entries.unshift(cutoff[0])
      }
    }
    entries.sort((a, b) => b.date.localeCompare(a.date))
    if (entries.length === 0) return
    exportSessionsCsv(entries, `work-timer-last-${days}-days.csv`)
  }

  return (
    <section className="panel">
      <h2>Last 30 days</h2>

      <div className="week-summary">
        <p className="week-summary-label">This week</p>
        <div className="week-summary-grid">
          <div>
            <span className="week-summary-value">{week.avgLabel}</span>
            <span className="week-summary-meta">avg work / active day</span>
          </div>
          <div>
            <span className="week-summary-value">{week.overTargetDays}</span>
            <span className="week-summary-meta">days at/over target</span>
          </div>
          <div>
            <span className="week-summary-value">{week.totalLabel}</span>
            <span className="week-summary-meta">total work (7 days)</span>
          </div>
        </div>
      </div>

      <div className="export-actions">
        <button
          type="button"
          className="btn ghost export-btn"
          onClick={exportToday}
          disabled={!today?.session?.checkIn}
        >
          Export today
        </button>
        <button
          type="button"
          className="btn ghost export-btn"
          onClick={() => exportDays(7)}
        >
          Export 7 days
        </button>
        <button
          type="button"
          className="btn ghost export-btn"
          onClick={() => exportDays(30)}
        >
          Export 30 days
        </button>
      </div>

      {history.length === 0 ? (
        <p className="muted">
          Past days will show up here after you check out and return tomorrow.
        </p>
      ) : (
        <ul className="history">
          {history.map(({ date, session, workMs, breakMs }) => {
            const sessionShift = session.shift === 'night' ? 'night' : 'day'
            return (
              <li key={date}>
                <div className="history-top">
                  <strong>{formatShiftLabel(date, sessionShift)}</strong>
                  <span className="history-work">{formatDuration(workMs)}</span>
                </div>
                <div className="history-meta">
                  <span>
                    {formatClock(session.checkIn)}
                    {session.checkOut
                      ? ` → ${formatClock(session.checkOut)}`
                      : ' · in progress'}
                    {' · '}
                    {sessionShift === 'night' ? 'Night' : 'Day'}
                  </span>
                  <span>Break {formatDuration(breakMs)}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
