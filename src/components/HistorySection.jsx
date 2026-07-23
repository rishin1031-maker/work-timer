import { useMemo, useState } from 'react'
import { getWeekSummary } from '../utils/weekSummary'
import { formatClock, formatDuration, formatShiftLabel } from '../utils/time'
import { ExportMenu } from './ExportMenu'

const INITIAL_VISIBLE = 7

export function HistorySection({
  history,
  today,
  todayWorkMs,
  todayBreakMs,
  todayTargetHours,
}) {
  const [showAll, setShowAll] = useState(false)
  const [fromDraft, setFromDraft] = useState('')
  const [toDraft, setToDraft] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const hasHistory = history.length > 0

  const week = getWeekSummary({
    history,
    todayKey: today?.date,
    todayWorkMs: todayWorkMs ?? 0,
    todayTargetHours: todayTargetHours ?? 8,
  })

  const filtered = useMemo(() => {
    return history.filter((entry) => {
      if (fromDate && entry.date < fromDate) return false
      if (toDate && entry.date > toDate) return false
      return true
    })
  }, [history, fromDate, toDate])

  const visible = showAll ? filtered : filtered.slice(0, INITIAL_VISIBLE)
  const hasMore = filtered.length > INITIAL_VISIBLE

  function applyFilters() {
    setFromDate(fromDraft)
    setToDate(toDraft)
    setShowAll(true)
  }

  function clearFilters() {
    setFromDraft('')
    setToDraft('')
    setFromDate('')
    setToDate('')
    setShowAll(false)
  }

  return (
    <section className="section-card history-section">
      <div className="section-heading">
        <div>
          <h2>Recent work history</h2>
          <p className="section-sub">
            {hasHistory
              ? 'Past sessions and weekly averages'
              : 'Completed days will appear here'}
          </p>
        </div>
        <ExportMenu
          history={history}
          today={today}
          todayWorkMs={todayWorkMs}
          todayBreakMs={todayBreakMs}
        />
      </div>

      {!hasHistory ? (
        <p className="muted empty-state history-empty">
          No past sessions yet. End a workday and come back tomorrow to see your
          history, averages, and filters here.
        </p>
      ) : (
        <>
          <div className="week-summary compact">
            <div>
              <span className="week-summary-value">{week.avgLabel}</span>
              <span className="week-summary-meta">avg / active day</span>
            </div>
            <div>
              <span className="week-summary-value">{week.overTargetDays}</span>
              <span className="week-summary-meta">at/over target</span>
            </div>
            <div>
              <span className="week-summary-value">{week.totalLabel}</span>
              <span className="week-summary-meta">total (7 days)</span>
            </div>
          </div>

          <div className="history-filters">
            <label className="history-filter-field">
              <span>From date</span>
              <input
                type="date"
                value={fromDraft}
                onChange={(e) => setFromDraft(e.target.value)}
              />
            </label>
            <label className="history-filter-field">
              <span>To date</span>
              <input
                type="date"
                value={toDraft}
                onChange={(e) => setToDraft(e.target.value)}
              />
            </label>
            <div className="history-filter-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={applyFilters}
              >
                Apply
              </button>
              <button
                type="button"
                className="btn btn-tertiary btn-sm"
                onClick={clearFilters}
              >
                Clear
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="muted empty-state">No sessions match these dates.</p>
          ) : (
            <ul className="history-list">
              {visible.map(({ date, session, workMs, breakMs }) => {
                const sessionShift = session.shift === 'night' ? 'night' : 'day'
                return (
                  <li key={date} className="history-row">
                    <div className="history-row-main">
                      <strong>{formatShiftLabel(date, sessionShift)}</strong>
                      <span className="history-shift-badge">
                        {sessionShift === 'night' ? 'Night' : 'Day'}
                      </span>
                    </div>
                    <div className="history-row-meta">
                      <span>
                        {formatClock(session.checkIn)}
                        {session.checkOut
                          ? ` – ${formatClock(session.checkOut)}`
                          : ' · in progress'}
                      </span>
                      <span>Worked {formatDuration(workMs)}</span>
                      <span>Break {formatDuration(breakMs)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {hasMore ? (
            <button
              type="button"
              className="btn btn-secondary history-more"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? 'Show less' : `View all history (${filtered.length})`}
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}
