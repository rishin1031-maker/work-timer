import { useEffect, useRef, useState } from 'react'
import { formatMinutesClock, stampNow } from '../utils/time'

function toMinutes(iso) {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

function minutesToTimeValue(minutes) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function timeValueToMinutes(timeValue) {
  if (!timeValue) return null
  const [h = 0, m = 0] = timeValue.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function buildStampList(session) {
  const stamps = [{ key: 'checkIn', iso: session.checkIn, field: { type: 'checkIn' } }]

  session.breaks.forEach((b, i) => {
    stamps.push({
      key: `break-start-${i}`,
      iso: b.start,
      field: { type: 'breakStart', index: i },
    })
    if (b.end) {
      stamps.push({
        key: `break-end-${i}`,
        iso: b.end,
        field: { type: 'breakEnd', index: i },
      })
    }
  })

  if (session.checkOut) {
    stamps.push({
      key: 'checkOut',
      iso: session.checkOut,
      field: { type: 'checkOut' },
    })
  }

  return stamps
}

function stampBounds(stamps, index, checkedOut) {
  const dayStart = 0
  const dayEnd = 23 * 60 + 59
  const nowMin = toMinutes(stampNow())

  let min = index === 0 ? dayStart : toMinutes(stamps[index - 1].iso)
  let max =
    index === stamps.length - 1
      ? checkedOut
        ? dayEnd
        : nowMin
      : toMinutes(stamps[index + 1].iso)

  if (max < min) max = min
  return { min, max }
}

function breakWindowBounds(stamps, breakIndex, checkedOut) {
  const dayStart = 0
  const dayEnd = 23 * 60 + 59
  const nowMin = toMinutes(stampNow())
  const startIdx = stamps.findIndex((s) => s.key === `break-start-${breakIndex}`)
  const endIdx = stamps.findIndex((s) => s.key === `break-end-${breakIndex}`)
  const lastIdx = endIdx >= 0 ? endIdx : startIdx

  const min = startIdx <= 0 ? dayStart : toMinutes(stamps[startIdx - 1].iso)
  const max =
    lastIdx >= stamps.length - 1
      ? checkedOut
        ? dayEnd
        : nowMin
      : toMinutes(stamps[lastIdx + 1].iso)

  return { min, max: Math.max(min, max) }
}

function TimeAdjuster({ label, iso, field, min, max, onUpdate, grayBefore = false }) {
  const syncedMinutes = toMinutes(iso)
  const [draftMinutes, setDraftMinutes] = useState(syncedMinutes)
  const [typed, setTyped] = useState(() => minutesToTimeValue(syncedMinutes))
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    setDraftMinutes(syncedMinutes)
    setTyped(minutesToTimeValue(syncedMinutes))
    setInvalid(false)
  }, [syncedMinutes])

  const locked = max < min
  const span = Math.max(max - min, 1)
  const pointPct = ((draftMinutes - min) / span) * 100

  function commitMinutes(minutes) {
    const next = Math.min(max, Math.max(min, minutes))
    setDraftMinutes(next)
    setTyped(minutesToTimeValue(next))
    setInvalid(false)
    const ok = onUpdate(field, minutesToTimeValue(next))
    if (ok === false) {
      setDraftMinutes(syncedMinutes)
      setTyped(minutesToTimeValue(syncedMinutes))
      setInvalid(true)
    }
  }

  function tryCommitTyped(value) {
    const minutes = timeValueToMinutes(value)
    if (minutes == null) return false
    if (minutes < min || minutes > max) {
      setInvalid(true)
      return false
    }
    commitMinutes(minutes)
    return true
  }

  return (
    <div className="time-adjuster">
      <div className="adjuster-heading">
        <span>{label}</span>
        <input
          className={`time-input${invalid ? ' invalid' : ''}`}
          type="time"
          step="60"
          value={typed}
          disabled={locked}
          aria-label={`Type ${label} time`}
          aria-invalid={invalid}
          onFocus={() => setInvalid(false)}
          onChange={(e) => {
            const value = e.target.value
            setTyped(value)
            setInvalid(false)
            tryCommitTyped(value)
          }}
          onBlur={() => {
            if (!tryCommitTyped(typed)) {
              setTyped(minutesToTimeValue(draftMinutes))
            }
          }}
        />
      </div>

      {grayBefore ? (
        <div className="point-edit-track">
          <div className="point-before" style={{ width: `${pointPct}%` }} />
          <div
            className="point-after"
            style={{ left: `${pointPct}%`, width: `${Math.max(100 - pointPct, 0)}%` }}
          />
          <input
            className="time-scrubber strip-slider"
            type="range"
            min={min}
            max={Math.max(min, max)}
            step={1}
            value={draftMinutes}
            disabled={locked}
            aria-label={`Adjust ${label}`}
            onChange={(e) => commitMinutes(Number(e.target.value))}
          />
        </div>
      ) : (
        <input
          className="time-scrubber"
          type="range"
          min={min}
          max={Math.max(min, max)}
          step={1}
          value={draftMinutes}
          disabled={locked}
          aria-label={`Adjust ${label}`}
          onChange={(e) => commitMinutes(Number(e.target.value))}
        />
      )}

      <div className="scrubber-ends">
        <span>{formatMinutesClock(min)}</span>
        <span>{formatMinutesClock(max)}</span>
      </div>
    </div>
  )
}

function BreakRangeAdjuster({
  breakIndex,
  startIso,
  endIso,
  windowMin,
  windowMax,
  onUpdateRange,
}) {
  const trackRef = useRef(null)
  const syncedStart = toMinutes(startIso)
  const syncedEnd = toMinutes(endIso)
  const startRef = useRef(syncedStart)
  const endRef = useRef(syncedEnd)

  const [start, setStart] = useState(syncedStart)
  const [end, setEnd] = useState(syncedEnd)
  const [typedStart, setTypedStart] = useState(() => minutesToTimeValue(syncedStart))
  const [typedEnd, setTypedEnd] = useState(() => minutesToTimeValue(syncedEnd))
  const [invalidStart, setInvalidStart] = useState(false)
  const [invalidEnd, setInvalidEnd] = useState(false)
  const [dragging, setDragging] = useState(null)

  useEffect(() => {
    setStart(syncedStart)
    setEnd(syncedEnd)
    startRef.current = syncedStart
    endRef.current = syncedEnd
    setTypedStart(minutesToTimeValue(syncedStart))
    setTypedEnd(minutesToTimeValue(syncedEnd))
    setInvalidStart(false)
    setInvalidEnd(false)
  }, [syncedStart, syncedEnd])

  const locked = windowMax <= windowMin
  const span = Math.max(windowMax - windowMin, 1)
  const startPct = ((start - windowMin) / span) * 100
  const endPct = ((end - windowMin) / span) * 100

  function applyRange(nextStart, nextEnd) {
    const s = Math.min(nextEnd, Math.max(windowMin, nextStart))
    const e = Math.min(windowMax, Math.max(s, nextEnd))
    startRef.current = s
    endRef.current = e
    setStart(s)
    setEnd(e)
    setTypedStart(minutesToTimeValue(s))
    setTypedEnd(minutesToTimeValue(e))
    setInvalidStart(false)
    setInvalidEnd(false)

    const ok = onUpdateRange(
      breakIndex,
      minutesToTimeValue(s),
      minutesToTimeValue(e),
    )
    if (ok === false) {
      startRef.current = syncedStart
      endRef.current = syncedEnd
      setStart(syncedStart)
      setEnd(syncedEnd)
      setTypedStart(minutesToTimeValue(syncedStart))
      setTypedEnd(minutesToTimeValue(syncedEnd))
      setInvalidStart(true)
      setInvalidEnd(true)
      return false
    }
    return true
  }

  function minutesFromPointer(clientX) {
    const track = trackRef.current
    if (!track) return null
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return null
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return Math.round(windowMin + ratio * span)
  }

  useEffect(() => {
    if (!dragging) return undefined

    function onMove(event) {
      const minutes = minutesFromPointer(event.clientX)
      if (minutes == null) return
      if (dragging === 'start') {
        applyRange(Math.min(minutes, endRef.current), endRef.current)
      } else {
        applyRange(startRef.current, Math.max(minutes, startRef.current))
      }
    }

    function onUp() {
      setDragging(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging, windowMin, windowMax, span, breakIndex])

  return (
    <div className="time-adjuster break-range">
      <div className="break-times">
        <label className="break-time-field">
          <span>Break in</span>
          <input
            className={`time-input${invalidStart ? ' invalid' : ''}`}
            type="time"
            step="60"
            value={typedStart}
            disabled={locked}
            aria-invalid={invalidStart}
            onFocus={() => setInvalidStart(false)}
            onChange={(e) => {
              const value = e.target.value
              setTypedStart(value)
              setInvalidStart(false)
              const minutes = timeValueToMinutes(value)
              if (minutes != null && minutes >= windowMin && minutes <= end) {
                applyRange(minutes, end)
              }
            }}
            onBlur={() => {
              const minutes = timeValueToMinutes(typedStart)
              if (minutes == null || minutes < windowMin || minutes > end) {
                setTypedStart(minutesToTimeValue(start))
                setInvalidStart(true)
                return
              }
              applyRange(minutes, end)
            }}
          />
        </label>
        <label className="break-time-field">
          <span>Break out</span>
          <input
            className={`time-input${invalidEnd ? ' invalid' : ''}`}
            type="time"
            step="60"
            value={typedEnd}
            disabled={locked}
            aria-invalid={invalidEnd}
            onFocus={() => setInvalidEnd(false)}
            onChange={(e) => {
              const value = e.target.value
              setTypedEnd(value)
              setInvalidEnd(false)
              const minutes = timeValueToMinutes(value)
              if (minutes != null && minutes >= start && minutes <= windowMax) {
                applyRange(start, minutes)
              }
            }}
            onBlur={() => {
              const minutes = timeValueToMinutes(typedEnd)
              if (minutes == null || minutes < start || minutes > windowMax) {
                setTypedEnd(minutesToTimeValue(end))
                setInvalidEnd(true)
                return
              }
              applyRange(start, minutes)
            }}
          />
        </label>
      </div>

      <div
        className="break-edit-track"
        ref={trackRef}
        role="group"
        aria-label="Break range"
      >
        <div className="break-edit-work" style={{ left: 0, width: `${startPct}%` }} />
        <div
          className="break-edit-break"
          style={{ left: `${startPct}%`, width: `${Math.max(endPct - startPct, 0)}%` }}
        />
        <div
          className="break-edit-work"
          style={{ left: `${endPct}%`, width: `${Math.max(100 - endPct, 0)}%` }}
        />

        <button
          type="button"
          className={`break-handle start${dragging === 'start' ? ' active' : ''}`}
          style={{ left: `${startPct}%` }}
          aria-label="Drag break in"
          disabled={locked}
          onPointerDown={(e) => {
            e.preventDefault()
            e.currentTarget.setPointerCapture?.(e.pointerId)
            setDragging('start')
          }}
        />
        <button
          type="button"
          className={`break-handle end${dragging === 'end' ? ' active' : ''}`}
          style={{ left: `${endPct}%` }}
          aria-label="Drag break out"
          disabled={locked}
          onPointerDown={(e) => {
            e.preventDefault()
            e.currentTarget.setPointerCapture?.(e.pointerId)
            setDragging('end')
          }}
        />
      </div>

      <div className="scrubber-ends">
        <span>{formatMinutesClock(windowMin)}</span>
        <span>{formatMinutesClock(windowMax)}</span>
      </div>
    </div>
  )
}

function StampCard({ title, onDelete, children }) {
  return (
    <li className="stamp-card">
      <div className="stamp-card-header">
        <strong>{title}</strong>
        {onDelete ? (
          <button
            type="button"
            className="btn-delete"
            onClick={onDelete}
            aria-label={`Delete ${title}`}
          >
            Delete
          </button>
        ) : null}
      </div>
      <div className="stamp-card-body">{children}</div>
    </li>
  )
}

export function Timeline({
  session,
  onUpdateStamp,
  onUpdateBreakRange,
  onDeleteBreak,
}) {
  if (!session.checkIn) {
    return (
      <section className="panel">
        <h2>Today</h2>
        <p className="muted">No stamps yet. Check in to start tracking.</p>
      </section>
    )
  }

  const stamps = buildStampList(session)
  const checkedOut = Boolean(session.checkOut)
  const boundsByKey = Object.fromEntries(
    stamps.map((stamp, index) => [
      stamp.key,
      stampBounds(stamps, index, checkedOut),
    ]),
  )

  return (
    <section className="panel">
      <h2>Today</h2>
      <p className="muted edit-hint">
        Type times, or drag the break handles (left = in, right = out).
      </p>
      <ul className="timeline">
        <StampCard title="Check in">
          <TimeAdjuster
            label="Time"
            iso={session.checkIn}
            field={{ type: 'checkIn' }}
            min={boundsByKey.checkIn.min}
            max={boundsByKey.checkIn.max}
            onUpdate={onUpdateStamp}
            grayBefore
          />
        </StampCard>

        {session.breaks.map((b, i) => {
          const startKey = `break-start-${i}`
          const window = breakWindowBounds(stamps, i, checkedOut)

          return (
            <StampCard
              key={startKey}
              title={b.auto ? `Break ${i + 1} (auto)` : `Break ${i + 1}`}
              onDelete={() => onDeleteBreak(i)}
            >
              {b.end ? (
                <BreakRangeAdjuster
                  breakIndex={i}
                  startIso={b.start}
                  endIso={b.end}
                  windowMin={window.min}
                  windowMax={window.max}
                  onUpdateRange={onUpdateBreakRange}
                />
              ) : (
                <>
                  <TimeAdjuster
                    label="Break in"
                    iso={b.start}
                    field={{ type: 'breakStart', index: i }}
                    min={boundsByKey[startKey].min}
                    max={boundsByKey[startKey].max}
                    onUpdate={onUpdateStamp}
                  />
                  <p className="muted break-open">On break — out not stamped yet</p>
                </>
              )}
            </StampCard>
          )
        })}

        {session.checkOut ? (
          <StampCard title="Check out">
            <TimeAdjuster
              label="Time"
              iso={session.checkOut}
              field={{ type: 'checkOut' }}
              min={boundsByKey.checkOut.min}
              max={boundsByKey.checkOut.max}
              onUpdate={onUpdateStamp}
            />
          </StampCard>
        ) : null}
      </ul>
    </section>
  )
}
