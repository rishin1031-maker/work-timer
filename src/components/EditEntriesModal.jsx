import { useEffect, useId, useRef, useState } from 'react'
import { Modal } from './Modal'
import {
  cloneSession,
  formatMinutesClock,
  isoToTimeInput,
  sessionsEqual,
  stampNow,
  suggestBreakRange,
  timeInputToIso,
  validateSessionEdits,
} from '../utils/time'

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

function getFocusable(container) {
  if (!container) return []
  return [
    ...container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => el instanceof HTMLElement && !el.closest('[hidden]'))
}

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} className="field-error" role="alert">
      {message}
    </p>
  )
}

function TimeField({
  id,
  label,
  value,
  onChange,
  error,
  disabled = false,
  hint,
}) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <label className={`edit-field${error ? ' has-error' : ''}`} htmlFor={id}>
      <span className="edit-field-label">{label}</span>
      <input
        id={id}
        type="time"
        step="60"
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [errorId, hint ? `${id}-hint` : null].filter(Boolean).join(' ') ||
          undefined
        }
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? (
        <span id={`${id}-hint`} className="edit-field-hint">
          {hint}
        </span>
      ) : null}
      <FieldError id={errorId} message={error} />
    </label>
  )
}

function RangeSlider({
  startIso,
  endIso,
  min,
  max,
  onChange,
  ariaStart,
  ariaEnd,
}) {
  const start = toMinutes(startIso)
  const end = toMinutes(endIso)
  const span = Math.max(max - min, 1)
  const startPct = ((start - min) / span) * 100
  const endPct = ((end - min) / span) * 100
  const trackRef = useRef(null)
  const [dragging, setDragging] = useState(null)
  const startRef = useRef(start)
  const endRef = useRef(end)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    startRef.current = start
    endRef.current = end
  }, [start, end])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  function minutesFromPointer(clientX) {
    const track = trackRef.current
    if (!track) return null
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return null
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return Math.round(min + ratio * span)
  }

  useEffect(() => {
    if (!dragging) return undefined

    function onMove(event) {
      const minutes = minutesFromPointer(event.clientX)
      if (minutes == null) return
      if (dragging === 'start') {
        const nextStart = Math.min(Math.max(min, minutes), endRef.current)
        onChangeRef.current(
          minutesToTimeValue(nextStart),
          minutesToTimeValue(endRef.current),
        )
      } else {
        const nextEnd = Math.max(Math.min(max, minutes), startRef.current)
        onChangeRef.current(
          minutesToTimeValue(startRef.current),
          minutesToTimeValue(nextEnd),
        )
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
  }, [dragging, min, max, span])

  return (
    <div className="edit-range">
      <div
        className="break-edit-track"
        ref={trackRef}
        role="group"
        aria-label="Break range"
      >
        <div className="break-edit-work" style={{ left: 0, width: `${startPct}%` }} />
        <div
          className="break-edit-break"
          style={{
            left: `${startPct}%`,
            width: `${Math.max(endPct - startPct, 0)}%`,
          }}
        />
        <div
          className="break-edit-work"
          style={{ left: `${endPct}%`, width: `${Math.max(100 - endPct, 0)}%` }}
        />
        <button
          type="button"
          className={`break-handle start${dragging === 'start' ? ' active' : ''}`}
          style={{ left: `${startPct}%` }}
          aria-label={ariaStart}
          onPointerDown={(e) => {
            e.preventDefault()
            setDragging('start')
          }}
        />
        <button
          type="button"
          className={`break-handle end${dragging === 'end' ? ' active' : ''}`}
          style={{ left: `${endPct}%` }}
          aria-label={ariaEnd}
          onPointerDown={(e) => {
            e.preventDefault()
            setDragging('end')
          }}
        />
      </div>
      <div className="scrubber-ends">
        <span>{formatMinutesClock(min)}</span>
        <span>{formatMinutesClock(max)}</span>
      </div>
    </div>
  )
}

function PointSlider({ iso, min, max, onChange, ariaLabel }) {
  const value = toMinutes(iso)
  return (
    <div className="edit-range">
      <input
        className="time-scrubber"
        type="range"
        min={min}
        max={Math.max(min, max)}
        step={1}
        value={Math.min(Math.max(value, min), Math.max(min, max))}
        aria-label={ariaLabel}
        onChange={(e) => onChange(minutesToTimeValue(Number(e.target.value)))}
      />
      <div className="scrubber-ends">
        <span>{formatMinutesClock(min)}</span>
        <span>{formatMinutesClock(max)}</span>
      </div>
    </div>
  )
}

export function EditEntriesModal({
  open,
  session,
  dateKey,
  shift,
  returnFocusRef,
  onClose,
  onSaveSession,
  onSaved,
}) {
  const titleId = useId()
  const descId = useId()
  const dialogRef = useRef(null)
  const bodyRef = useRef(null)
  const addBreakAnchorRef = useRef(null)
  const baselineRef = useRef(null)
  const dirtyRef = useRef(false)

  const [draft, setDraft] = useState(null)
  const [errors, setErrors] = useState({ breaks: {} })
  const [saving, setSaving] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState(null)
  const [endingBreakIndex, setEndingBreakIndex] = useState(null)
  const [endDraftTime, setEndDraftTime] = useState('')
  const [addError, setAddError] = useState(null)

  const dirty = Boolean(
    draft && baselineRef.current && !sessionsEqual(draft, baselineRef.current),
  )
  dirtyRef.current = dirty

  useEffect(() => {
    if (!open) {
      setDraft(null)
      return undefined
    }
    if (!session?.checkIn) return undefined

    const cloned = cloneSession(session)
    baselineRef.current = cloneSession(session)
    setDraft(cloned)
    setErrors({ breaks: {} })
    setSaving(false)
    setDiscardOpen(false)
    setDeleteIndex(null)
    setEndingBreakIndex(null)
    setEndDraftTime('')
    setAddError(null)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    requestAnimationFrame(() => {
      dialogRef.current?.focus()
    })

    return () => {
      document.body.style.overflow = previousOverflow
      if (returnFocusRef?.current instanceof HTMLElement) {
        returnFocusRef.current.focus()
      }
    }
    // Intentionally only when `open` flips — avoid resetting draft on live session ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (discardOpen) {
          setDiscardOpen(false)
          return
        }
        if (deleteIndex != null) {
          setDeleteIndex(null)
          return
        }
        if (dirtyRef.current) setDiscardOpen(true)
        else onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      if (discardOpen || deleteIndex != null) return

      const focusable = getFocusable(dialogRef.current)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, discardOpen, deleteIndex, onClose])

  function requestClose() {
    if (dirtyRef.current) {
      setDiscardOpen(true)
      return
    }
    onClose()
  }

  function applyTime(field, timeValue) {
    const iso = timeInputToIso(dateKey, timeValue, shift)
    if (!iso) return

    setDraft((current) => {
      if (!current) return current
      const next = cloneSession(current)
      if (field.type === 'checkIn') next.checkIn = iso
      else if (field.type === 'checkOut') next.checkOut = iso
      else if (field.type === 'breakStart' && next.breaks[field.index]) {
        next.breaks[field.index] = { ...next.breaks[field.index], start: iso }
      } else if (field.type === 'breakEnd' && next.breaks[field.index]) {
        next.breaks[field.index] = { ...next.breaks[field.index], end: iso }
      }
      return next
    })
    setErrors({ breaks: {} })
  }

  function applyBreakRange(index, startTime, endTime) {
    const startIso = timeInputToIso(dateKey, startTime, shift)
    const endIso = timeInputToIso(dateKey, endTime, shift)
    if (!startIso || !endIso) return
    setDraft((current) => {
      if (!current?.breaks[index]) return current
      const next = cloneSession(current)
      next.breaks[index] = {
        ...next.breaks[index],
        start: startIso,
        end: endIso,
      }
      return next
    })
    setErrors({ breaks: {} })
  }

  function handleAddBreak() {
    if (!draft) return
    const suggestion = suggestBreakRange(draft, Date.now())
    if (!suggestion) {
      setAddError(
        'No available gap for another break. Adjust existing times first.',
      )
      return
    }
    setAddError(null)
    setDraft((current) => {
      if (!current) return current
      const next = cloneSession(current)
      next.breaks = [
        ...next.breaks,
        { start: suggestion.start, end: suggestion.end },
      ]
      return next
    })
    requestAnimationFrame(() => {
      addBreakAnchorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
      const input = addBreakAnchorRef.current?.querySelector('input[type="time"]')
      input?.focus?.()
    })
  }

  function confirmDeleteBreak() {
    if (deleteIndex == null) return
    const index = deleteIndex
    setDraft((current) => {
      if (!current) return current
      const next = cloneSession(current)
      next.breaks = next.breaks.filter((_, i) => i !== index)
      return next
    })
    setDeleteIndex(null)
    setErrors({ breaks: {} })
  }

  function beginEndActiveBreak(index) {
    setEndingBreakIndex(index)
    setEndDraftTime(isoToTimeInput(stampNow()))
  }

  function commitActiveBreakEnd(index) {
    if (!endDraftTime) return
    applyTime({ type: 'breakEnd', index }, endDraftTime)
    setEndingBreakIndex(null)
    setEndDraftTime('')
  }

  function handleSave() {
    if (!draft || !dirty || saving) return
    const result = validateSessionEdits(draft, { now: Date.now() })
    setErrors(result.errors)
    if (!result.ok) {
      bodyRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
      return
    }

    setSaving(true)
    const ok = onSaveSession(cloneSession(draft))
    setSaving(false)
    if (!ok) {
      setErrors({
        breaks: {},
        general: 'Could not save these times. Check the order and try again.',
      })
      return
    }
    onSaved?.('Entries updated')
    baselineRef.current = cloneSession(draft)
    onClose()
  }

  if (!open || !draft?.checkIn) return null

  const checkedOut = Boolean(draft.checkOut)
  const nowMin = toMinutes(stampNow())
  const dayEnd = 23 * 60 + 59

  const stamps = [{ key: 'checkIn', iso: draft.checkIn }]
  draft.breaks.forEach((b, i) => {
    stamps.push({ key: `break-start-${i}`, iso: b.start })
    if (b.end) stamps.push({ key: `break-end-${i}`, iso: b.end })
  })
  if (draft.checkOut) stamps.push({ key: 'checkOut', iso: draft.checkOut })

  function boundsFor(key) {
    const index = stamps.findIndex((s) => s.key === key)
    let min = index <= 0 ? 0 : toMinutes(stamps[index - 1].iso)
    let max =
      index >= stamps.length - 1
        ? checkedOut
          ? dayEnd
          : nowMin
        : toMinutes(stamps[index + 1].iso)
    if (max < min) max = min
    return { min, max }
  }

  function breakWindow(i) {
    const startIdx = stamps.findIndex((s) => s.key === `break-start-${i}`)
    const endIdx = stamps.findIndex((s) => s.key === `break-end-${i}`)
    const lastIdx = endIdx >= 0 ? endIdx : startIdx
    const min = startIdx <= 0 ? 0 : toMinutes(stamps[startIdx - 1].iso)
    const max =
      lastIdx >= stamps.length - 1
        ? checkedOut
          ? dayEnd
          : nowMin
        : toMinutes(stamps[lastIdx + 1].iso)
    return { min, max: Math.max(min, max) }
  }

  const deleteLabel = deleteIndex == null ? '' : `Break ${deleteIndex + 1}`

  return (
    <>
      <div className="modal-backdrop edit-entries-backdrop" onClick={requestClose}>
        <div
          className="modal modal-wide edit-entries-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          ref={dialogRef}
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="edit-modal-header">
            <div>
              <h2 id={titleId}>Edit today’s entries</h2>
              <p id={descId} className="edit-modal-desc">
                Update your recorded work and break times.
              </p>
            </div>
            <button
              type="button"
              className="btn-icon"
              aria-label="Close edit entries"
              onClick={requestClose}
            >
              ✕
            </button>
          </div>

          <div className="edit-modal-body" ref={bodyRef}>
            {errors.general ? (
              <p className="field-error" role="alert">
                {errors.general}
              </p>
            ) : null}

            <section className="edit-block">
              <h3>Check-in / Start work</h3>
              <TimeField
                id="edit-check-in"
                label="Start time"
                value={isoToTimeInput(draft.checkIn)}
                error={errors.checkIn}
                onChange={(value) => applyTime({ type: 'checkIn' }, value)}
              />
              <PointSlider
                iso={draft.checkIn}
                min={boundsFor('checkIn').min}
                max={boundsFor('checkIn').max}
                ariaLabel="Adjust check-in time"
                onChange={(value) => applyTime({ type: 'checkIn' }, value)}
              />
            </section>

            {draft.breaks.map((b, i) => {
              const active = !b.end
              const window = breakWindow(i)
              const breakErrors = errors.breaks?.[i] ?? {}
              const isLast = i === draft.breaks.length - 1

              return (
                <section
                  key={`break-${i}-${b.start}`}
                  className={`edit-block edit-break${active ? ' is-active' : ''}`}
                  ref={isLast ? addBreakAnchorRef : undefined}
                >
                  <div className="edit-block-header">
                    <h3>
                      {b.auto ? `Break ${i + 1} (auto)` : `Break ${i + 1}`}
                      {active ? (
                        <span className="edit-active-badge">Currently active</span>
                      ) : null}
                    </h3>
                    <button
                      type="button"
                      className="btn-delete-text"
                      onClick={() => setDeleteIndex(i)}
                    >
                      Delete
                    </button>
                  </div>

                  {active ? (
                    <>
                      <p className="edit-help">
                        This break is currently active and does not have an end
                        time yet.
                      </p>
                      <TimeField
                        id={`edit-break-start-${i}`}
                        label="Start time"
                        value={isoToTimeInput(b.start)}
                        error={breakErrors.start}
                        onChange={(value) =>
                          applyTime({ type: 'breakStart', index: i }, value)
                        }
                      />
                      <PointSlider
                        iso={b.start}
                        min={boundsFor(`break-start-${i}`).min}
                        max={boundsFor(`break-start-${i}`).max}
                        ariaLabel={`Adjust break ${i + 1} start`}
                        onChange={(value) =>
                          applyTime({ type: 'breakStart', index: i }, value)
                        }
                      />

                      <div className="edit-active-end">
                        <p className="edit-field-label">End time</p>
                        <p className="edit-active-status">Currently active</p>
                        <p className="edit-help">
                          Ending this break manually will resume work from the
                          selected time when you save.
                        </p>
                        {endingBreakIndex === i ? (
                          <div className="edit-end-active-form">
                            <TimeField
                              id={`edit-break-end-${i}`}
                              label="Resume work at"
                              value={endDraftTime}
                              error={breakErrors.end}
                              hint="Saving will mark the break as ended and resume work."
                              onChange={setEndDraftTime}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => commitActiveBreakEnd(i)}
                            >
                              Apply end time to draft
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => beginEndActiveBreak(i)}
                          >
                            Set end time…
                          </button>
                        )}
                        <FieldError message={breakErrors.general} />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="edit-help">
                        Drag the left handle to change the break start and the
                        right handle to change the break end.
                      </p>
                      <div className="edit-break-times">
                        <TimeField
                          id={`edit-break-start-${i}`}
                          label="Start time"
                          value={isoToTimeInput(b.start)}
                          error={breakErrors.start}
                          onChange={(value) =>
                            applyBreakRange(i, value, isoToTimeInput(b.end))
                          }
                        />
                        <TimeField
                          id={`edit-break-end-${i}`}
                          label="End time"
                          value={isoToTimeInput(b.end)}
                          error={breakErrors.end}
                          onChange={(value) =>
                            applyBreakRange(i, isoToTimeInput(b.start), value)
                          }
                        />
                      </div>
                      <FieldError message={breakErrors.general} />
                      <RangeSlider
                        startIso={b.start}
                        endIso={b.end}
                        min={window.min}
                        max={window.max}
                        ariaStart={`Break ${i + 1} start handle`}
                        ariaEnd={`Break ${i + 1} end handle`}
                        onChange={(start, end) => applyBreakRange(i, start, end)}
                      />
                    </>
                  )}
                </section>
              )
            })}

            {draft.checkOut ? (
              <section className="edit-block">
                <h3>End workday</h3>
                <TimeField
                  id="edit-check-out"
                  label="End time"
                  value={isoToTimeInput(draft.checkOut)}
                  error={errors.checkOut}
                  onChange={(value) => applyTime({ type: 'checkOut' }, value)}
                />
                <PointSlider
                  iso={draft.checkOut}
                  min={boundsFor('checkOut').min}
                  max={boundsFor('checkOut').max}
                  ariaLabel="Adjust end workday time"
                  onChange={(value) => applyTime({ type: 'checkOut' }, value)}
                />
              </section>
            ) : null}

            <div className="edit-add-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddBreak}
              >
                + Add break
              </button>
              {addError ? (
                <p className="field-error" role="alert">
                  {addError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="edit-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={requestClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!dirty || saving}
              aria-busy={saving}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={discardOpen}
        title="Discard unsaved changes?"
        cancelLabel="Keep editing"
        confirmLabel="Discard changes"
        danger
        elevated
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false)
          onClose()
        }}
      >
        <p>
          You have unsaved edits to today’s entries. Discard them and close the
          editor?
        </p>
      </Modal>

      <Modal
        open={deleteIndex != null}
        title={`Delete ${deleteLabel}?`}
        cancelLabel="Keep break"
        confirmLabel="Delete break"
        danger
        elevated
        onCancel={() => setDeleteIndex(null)}
        onConfirm={confirmDeleteBreak}
      >
        <p>
          This removes {deleteLabel} from today’s draft. Work, break, remaining,
          and progress update when you save.
        </p>
      </Modal>
    </>
  )
}
