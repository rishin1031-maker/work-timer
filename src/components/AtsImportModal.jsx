import { useEffect, useId, useRef, useState } from 'react'
import { parseAtsImport } from '../utils/atsImport'

const SAMPLE_HINT = `{
  "status": "working",
  "sessions_today": [ ... ],
  "total_today_minutes": 256,
  "target_minutes": 480,
  "break_minutes": 10
}`

export function AtsImportModal({
  open,
  shift,
  hasExistingSession,
  onClose,
  onImport,
}) {
  const titleId = useId()
  const descId = useId()
  const dialogRef = useRef(null)
  const textareaRef = useRef(null)
  const onCloseRef = useRef(onClose)

  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined

    setRaw('')
    setParsed(null)
    setParseError(null)
    setImporting(false)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function handleParse() {
    const result = parseAtsImport(raw, { shift })
    if (!result.ok) {
      setParsed(null)
      setParseError(result.error)
      return
    }
    setParseError(null)
    setParsed(result)
  }

  function handleImport() {
    if (!parsed?.ok || importing) return
    setImporting(true)
    const ok = onImport({
      session: parsed.session,
      targetHours: parsed.targetHours,
    })
    setImporting(false)
    if (!ok) {
      setParseError('Could not apply the imported session. Check the times and try again.')
      return
    }
    onClose()
  }

  if (!open) return null

  const preview = parsed?.preview

  return (
    <div className="modal-backdrop ats-import-backdrop" onClick={onClose}>
      <div
        className="modal modal-wide ats-import-modal"
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
            <h2 id={titleId}>Import ATS data</h2>
            <p id={descId} className="edit-modal-desc">
              Paste today’s attendance API response. Punch sessions become
              check-in, breaks, and work status in Work Timer.
            </p>
          </div>
          <button
            type="button"
            className="btn-icon"
            aria-label="Close ATS import"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="edit-modal-body ats-import-body">
          <label className="ats-paste-field" htmlFor="ats-json-input">
            <span className="edit-field-label">ATS JSON</span>
            <textarea
              id="ats-json-input"
              ref={textareaRef}
              className="ats-json-input"
              rows={10}
              spellCheck={false}
              placeholder={SAMPLE_HINT}
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value)
                setParseError(null)
                setParsed(null)
              }}
            />
          </label>

          <div className="ats-parse-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleParse}
              disabled={!raw.trim()}
            >
              Preview import
            </button>
          </div>

          {parseError ? (
            <p className="field-error" role="alert">
              {parseError}
            </p>
          ) : null}

          {preview ? (
            <section className="ats-preview" aria-live="polite">
              <h3>Import preview</h3>
              <dl className="ats-preview-grid">
                <div>
                  <dt>Status</dt>
                  <dd>{preview.statusLabel}</dd>
                </div>
                <div>
                  <dt>Started</dt>
                  <dd>{preview.checkInLabel}</dd>
                </div>
                <div>
                  <dt>Finished</dt>
                  <dd>{preview.checkOutLabel}</dd>
                </div>
                <div>
                  <dt>Worked</dt>
                  <dd>{preview.workLabel}</dd>
                </div>
                <div>
                  <dt>Break</dt>
                  <dd>
                    {preview.breakLabel}
                    {preview.breakCount
                      ? ` · ${preview.breakCount} gap${preview.breakCount === 1 ? '' : 's'}`
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>{preview.targetLabel}</dd>
                </div>
              </dl>

              <ul className="ats-punch-list">
                {preview.punches.map((punch) => (
                  <li key={`${punch.index}-${punch.punchIn}`}>
                    <strong>Session {punch.index}</strong>
                    <span>
                      {punch.punchIn} – {punch.punchOut}
                      {punch.durationMinutes != null
                        ? ` · ${punch.durationMinutes} min`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>

              {parsed.warnings?.length ? (
                <ul className="ats-warnings">
                  {parsed.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}

              {hasExistingSession ? (
                <p className="ats-overwrite-note" role="status">
                  This will replace today’s current Work Timer entries. You can
                  undo from the toast after importing.
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="edit-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!parsed?.ok || importing}
            aria-busy={importing}
          >
            Import into today
          </button>
        </div>
      </div>
    </div>
  )
}
