import { useEffect, useId, useRef, useState } from 'react'
import { usePillThumb } from '../hooks/usePillThumb'
import { parseAtsImport } from '../utils/atsImport'
import {
  ensureAtsSession,
  getAtsAuth,
  getRememberedEmail,
  logoutAts,
  syncAtsToday,
} from '../utils/zilmoneyApi'

const SAMPLE_HINT = `{
  "status": "working",
  "sessions_today": [ ... ],
  "total_today_minutes": 256,
  "target_minutes": 480,
  "break_minutes": 10
}`

function PreviewPanel({ parsed, hasExistingSession }) {
  const preview = parsed?.preview
  if (!preview) return null

  return (
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
          This will replace today’s current Work Timer entries. You can undo
          from the toast after importing.
        </p>
      ) : null}
    </section>
  )
}

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
  const onCloseRef = useRef(onClose)

  const [mode, setMode] = useState('sync')
  const [email, setEmail] = useState(getRememberedEmail())
  const [password, setPassword] = useState('')
  const [signedInEmail, setSignedInEmail] = useState(
    () => getAtsAuth()?.email || '',
  )
  const [signedInName, setSignedInName] = useState(
    () => getAtsAuth()?.name || '',
  )
  const [sessionChecking, setSessionChecking] = useState(false)
  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [importing, setImporting] = useState(false)
  const { trackRef, thumbRef } = usePillThumb(mode, [mode, open])

  const signedIn = Boolean(signedInEmail || signedInName)
  const displayName = signedInName || signedInEmail || 'ATS user'

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined

    let cancelled = false

    setMode('sync')
    setEmail(getRememberedEmail())
    setPassword('')
    setSignedInEmail(getAtsAuth()?.email || '')
    setSignedInName(getAtsAuth()?.name || '')
    setRaw('')
    setParsed(null)
    setParseError(null)
    setBusy(false)
    setImporting(false)
    setSessionChecking(true)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      dialogRef.current?.focus()
    })

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    ;(async () => {
      const auth = await ensureAtsSession()
      if (cancelled) return
      if (auth?.session) {
        setSignedInEmail(auth.email || getRememberedEmail())
        setSignedInName(auth.name || '')
        setEmail(auth.email || getRememberedEmail())
      } else {
        setSignedInEmail('')
        setSignedInName('')
      }
      setSessionChecking(false)
    })()

    return () => {
      cancelled = true
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function handleSync() {
    setBusy(true)
    setParseError(null)
    setParsed(null)
    try {
      const result = await syncAtsToday({
        email,
        password: signedIn ? '' : password,
        shift,
        refreshSync: true,
      })
      setSignedInEmail(result.auth?.email ?? email)
      setSignedInName(result.auth?.name || '')
      setEmail(result.auth?.email ?? email)
      setPassword('')
      setParsed(result)
      setRaw(JSON.stringify(result.raw, null, 2))
    } catch (error) {
      if (error?.code === 'unauthorized') {
        setSignedInEmail('')
        setSignedInName('')
        setPassword('')
      }
      setParseError(error?.message || 'Could not sync from ZilMoney ATS.')
    } finally {
      setBusy(false)
    }
  }

  function handleParsePaste() {
    const result = parseAtsImport(raw, { shift })
    if (!result.ok) {
      setParsed(null)
      setParseError(result.error)
      return
    }
    setParseError(null)
    setParsed(result)
  }

  async function handleSignOutAts() {
    await logoutAts()
    setSignedInEmail('')
    setSignedInName('')
    setPassword('')
    setParsed(null)
    setParseError(null)
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
      setParseError(
        'Could not apply the imported session. Check the times and try again.',
      )
      return
    }
    onClose()
  }

  if (!open) return null

  const canFetch =
    !busy &&
    !sessionChecking &&
    (signedIn || (email.trim() && password))

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
              Sync today’s punches from ZilMoney, or paste an API response.
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
          <div
            className="ats-mode-tabs"
            role="tablist"
            aria-label="Import method"
            ref={trackRef}
          >
            <span className="pill-thumb" ref={thumbRef} aria-hidden="true" />
            <button
              type="button"
              role="tab"
              data-pill="sync"
              aria-selected={mode === 'sync'}
              className={`ats-mode-tab${mode === 'sync' ? ' is-active' : ''}`}
              onClick={() => setMode('sync')}
            >
              Sync
            </button>
            <button
              type="button"
              role="tab"
              data-pill="paste"
              aria-selected={mode === 'paste'}
              className={`ats-mode-tab${mode === 'paste' ? ' is-active' : ''}`}
              onClick={() => setMode('paste')}
            >
              Paste
            </button>
          </div>

          {mode === 'sync' ? (
            <div className="ats-sync-panel">
              {sessionChecking ? (
                <p className="edit-help" role="status">
                  Checking saved ZilMoney session…
                </p>
              ) : signedIn ? (
                <div className="ats-signed-in">
                  <p>
                    Signed in as <strong>{displayName}</strong>
                  </p>
                  {signedInName && signedInEmail ? (
                    <p className="ats-signed-in-email">{signedInEmail}</p>
                  ) : null}
                  <p className="edit-help">
                    Your session is saved — no password needed until it expires.
                  </p>
                  <button
                    type="button"
                    className="btn btn-tertiary btn-sm"
                    onClick={handleSignOutAts}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="ats-login-fields">
                  <p className="edit-help">
                    Sign in once. Work Timer keeps the ZilMoney session cookie
                    and only asks again after it expires.
                  </p>
                  <label className="edit-field" htmlFor="ats-email">
                    <span className="edit-field-label">ZilMoney email</span>
                    <input
                      id="ats-email"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label className="edit-field" htmlFor="ats-password">
                    <span className="edit-field-label">Password</span>
                    <input
                      id="ats-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                </div>
              )}

              <div className="ats-parse-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSync}
                  disabled={!canFetch}
                  aria-busy={busy}
                >
                  {busy
                    ? 'Syncing…'
                    : signedIn
                      ? 'Fetch today’s session'
                      : 'Sign in & fetch today'}
                </button>
              </div>
            </div>
          ) : (
            <div className="ats-paste-panel">
              <label className="ats-paste-field" htmlFor="ats-json-input">
                <span className="edit-field-label">ATS JSON</span>
                <textarea
                  id="ats-json-input"
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
                  onClick={handleParsePaste}
                  disabled={!raw.trim()}
                >
                  Preview import
                </button>
              </div>
            </div>
          )}

          {parseError ? (
            <p className="form-error" role="alert">
              {parseError}
            </p>
          ) : null}

          <PreviewPanel
            parsed={parsed}
            hasExistingSession={hasExistingSession}
          />
        </div>

        <div className="edit-modal-footer">
          <button type="button" className="btn btn-tertiary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!parsed?.ok || importing}
            aria-busy={importing}
          >
            {importing ? 'Importing…' : 'Import into today'}
          </button>
        </div>
      </div>
    </div>
  )
}
