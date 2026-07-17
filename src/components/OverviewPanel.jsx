import { useMemo, useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useWeather } from '../hooks/useWeather'
import { formatDateLabel, formatDuration } from '../utils/time'
import { NotchAction } from './NotchAction'
import { TargetHours } from './TargetHours'

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polar(cx, cy, r, endAngle)
  const end = polar(cx, cy, r, startAngle)
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`
}

function WorkDonut({ workMs, breakMs, remainingMs, targetMs }) {
  const safeWork = Math.max(0, workMs)
  const safeBreak = Math.max(0, breakMs)
  const overtime = remainingMs < 0
  const remaining = Math.max(0, remainingMs)
  const total = Math.max(targetMs, safeWork + safeBreak, 1)

  const slices = [
    { key: 'work', value: safeWork, color: 'var(--blue)' },
    { key: 'break', value: safeBreak, color: 'var(--break)' },
    {
      key: overtime ? 'over' : 'left',
      value: overtime ? Math.abs(remainingMs) : remaining,
      color: overtime ? 'var(--danger)' : 'var(--track-idle)',
    },
  ].filter((s) => s.value > 0)

  let angle = 0
  const arcs = slices.map((slice) => {
    const span = (slice.value / total) * 360
    const start = angle
    const end = angle + Math.max(span, 0.5)
    angle = end
    return { ...slice, start, end }
  })

  const workHours = (safeWork / 3600000).toFixed(1)
  const targetHours = (targetMs / 3600000).toFixed(0)

  return (
    <div className="chart-donut-wrap">
      <svg viewBox="0 0 120 120" className="chart-donut" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r="42"
          fill="none"
          stroke="var(--track-idle)"
          strokeWidth="14"
        />
        {arcs.map((arc) => (
          <path
            key={arc.key}
            d={arcPath(60, 60, 42, arc.start, Math.min(arc.end, 359.9))}
            fill="none"
            stroke={arc.color}
            strokeWidth="14"
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="chart-donut-center">
        <strong>{workHours}h</strong>
        <span>of {targetHours}h</span>
      </div>
    </div>
  )
}

function WeekBars({ days }) {
  const max = Math.max(...days.map((d) => d.workMs), 1)

  return (
    <div className="week-bars" role="img" aria-label="Work hours for recent days">
      {days.map((day) => {
        const height = Math.max(6, (day.workMs / max) * 100)
        return (
          <div key={day.key} className="week-bar-col">
            <div className="week-bar-track">
              <div
                className={`week-bar${day.isToday ? ' is-today' : ''}`}
                style={{ height: `${height}%` }}
                title={`${day.label}: ${formatDuration(day.workMs)}`}
              />
            </div>
            <span className="week-bar-label">{day.short}</span>
          </div>
        )
      })}
    </div>
  )
}

function buildWeekDays(history, todayKey, todayWorkMs) {
  const byDate = new Map(history.map((h) => [h.date, h.workMs]))
  byDate.set(todayKey, todayWorkMs)

  const days = []
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-')
    days.push({
      key,
      short: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      label: formatDateLabel(key),
      workMs: byDate.get(key) ?? 0,
      isToday: key === todayKey,
    })
  }
  return days
}

function formatLiveClock(ms) {
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function formatLiveDate(ms) {
  return new Date(ms).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function OverviewPanel({
  now,
  dateKey,
  workMs,
  breakMs,
  remainingMs,
  targetHours,
  prefTargetHours,
  onTargetHoursChange,
  targetHoursDisabled,
  history,
  checkedIn,
}) {
  const isPhone = useMediaQuery('(max-width: 720px)')
  const [expanded, setExpanded] = useState(!isPhone)
  const { weather, status, error, refresh } = useWeather()
  const targetMs = targetHours * 60 * 60 * 1000
  const weekDays = useMemo(
    () => buildWeekDays(history, dateKey, workMs),
    [history, dateKey, workMs],
  )

  const workPct = targetMs
    ? Math.min(100, Math.round((Math.max(0, workMs) / targetMs) * 100))
    : 0

  return (
    <section
      className={`notch-card overview-panel${expanded ? ' is-expanded' : ''}`}
    >
      <NotchAction
        variant="arrow"
        label={expanded ? 'Collapse day overview' : 'Expand day overview'}
        expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      />

      <div className="notch-shell overview-shell">
        <div className="overview-top">
          <div>
            <h2>Day overview</h2>
            <p className="overview-sub">Work, time & weather</p>
          </div>
          <div className="overview-target overview-target-top">
            <TargetHours
              value={prefTargetHours ?? targetHours}
              onChange={onTargetHoursChange}
              disabled={targetHoursDisabled}
            />
          </div>
        </div>

        <div className="overview-grid">
          <article className="overview-card clock-card">
            <p className="overview-card-label">Current time</p>
            <p className="live-clock">{formatLiveClock(now)}</p>
            <p className="live-date">{formatLiveDate(now)}</p>
            <p className="overview-meta">
              {checkedIn ? `Worked ${formatDuration(workMs)}` : 'Not checked in'}
            </p>
          </article>

          <article className="overview-card weather-card">
            <div className="weather-head">
              <p className="overview-card-label">Weather</p>
              <button
                type="button"
                className="weather-refresh"
                onClick={refresh}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? '…' : '↻'}
              </button>
            </div>
            {status === 'error' ? (
              <p className="overview-meta">
                {error}. Allow location to load weather.
              </p>
            ) : weather ? (
              <>
                <p className="weather-place">{weather.place || 'Local'}</p>
                <p className="weather-temp">
                  {Math.round(weather.temperature)}°
                  <span>{weather.label}</span>
                </p>
                <div className="weather-stats">
                  <span>Feels {Math.round(weather.feelsLike)}°</span>
                  <span>{weather.humidity}% humidity</span>
                  <span>{Math.round(weather.windSpeed)} km/h wind</span>
                </div>
              </>
            ) : (
              <p className="overview-meta">Loading local weather…</p>
            )}
          </article>

          <article className="overview-card chart-card">
            <p className="overview-card-label">Today’s work hours</p>
            <div className="chart-layout">
              <WorkDonut
                workMs={workMs}
                breakMs={breakMs}
                remainingMs={remainingMs}
                targetMs={targetMs}
              />
              <ul className="chart-legend">
                <li>
                  <i className="swatch work" /> Work {formatDuration(workMs)}
                </li>
                <li>
                  <i className="swatch break" /> Break {formatDuration(breakMs)}
                </li>
                <li>
                  <i className={`swatch ${remainingMs < 0 ? 'over' : 'left'}`} />
                  {remainingMs < 0 ? 'Over' : 'Left'}{' '}
                  {formatDuration(Math.abs(remainingMs))}
                </li>
                <li className="chart-pct">{workPct}% of target</li>
              </ul>
            </div>
          </article>
        </div>

        <div className={`overview-expand-wrap${expanded ? ' is-open' : ''}`}>
          <div className="overview-expand-inner">
            <div className="overview-expanded">
              <article className="overview-card week-card">
                <p className="overview-card-label">Last 7 days</p>
                <WeekBars days={weekDays} />
                <p className="overview-meta">
                  Today highlighted · bars show work time only
                </p>
              </article>

              <article className="overview-card detail-card">
                <p className="overview-card-label">Session snapshot</p>
                <dl className="overview-dl">
                  <div>
                    <dt>Target</dt>
                    <dd>{targetHours}h</dd>
                  </div>
                  <div>
                    <dt>Work</dt>
                    <dd>{formatDuration(workMs)}</dd>
                  </div>
                  <div>
                    <dt>Break</dt>
                    <dd>{formatDuration(breakMs)}</dd>
                  </div>
                  <div>
                    <dt>Remaining</dt>
                    <dd>
                      {checkedIn
                        ? formatDuration(Math.max(0, remainingMs))
                        : '—'}
                    </dd>
                  </div>
                </dl>
                {weather ? (
                  <dl className="overview-dl weather-extra">
                    <div>
                      <dt>Precip</dt>
                      <dd>{weather.precipitation ?? 0} mm</dd>
                    </div>
                    <div>
                      <dt>Sky</dt>
                      <dd>{weather.isDay ? 'Day' : 'Night'}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>Open-Meteo</dd>
                    </div>
                  </dl>
                ) : null}
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
