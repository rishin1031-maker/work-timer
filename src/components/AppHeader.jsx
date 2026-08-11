import { useEffect, useId, useRef, useState } from 'react'
import { ShiftSelector } from './ShiftSelector'

function formatLiveClock(ms) {
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function AppHeader({
  dateLabel,
  now,
  shift,
  theme,
  onShiftChange,
  onThemeToggle,
  onResetRequest,
  onAtsImportRequest,
  canReset,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const menuId = useId()
  const clockMs = now ?? Date.now()
  const clock = formatLiveClock(clockMs)
  const themeLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  useEffect(() => {
    if (!menuOpen) return undefined

    function onPointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  return (
    <header className="app-header">
      <div className="app-header-brand">
        <p className="brand">Work Timer</p>
        <div className="app-header-datetime">
          <h1>{dateLabel}</h1>
          <time
            className="header-clock"
            dateTime={new Date(clockMs).toISOString()}
          >
            {clock}
          </time>
        </div>
      </div>

      <div className="app-header-actions">
        <button
          type="button"
          className="btn-icon theme-toggle-btn"
          onClick={onThemeToggle}
          aria-label={themeLabel}
          title={themeLabel}
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" className="theme-toggle-icon" aria-hidden="true">
              <circle cx="12" cy="12" r="4.25" fill="currentColor" />
              <path
                d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.05 5.05l1.4 1.4M17.55 17.55l1.4 1.4M5.05 18.95l1.4-1.4M17.55 6.45l1.4-1.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="theme-toggle-icon" aria-hidden="true">
              <path
                d="M15.1 3.6A8.5 8.5 0 1 0 20.4 14a6.8 6.8 0 0 1-5.3-10.4Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>

        <div className="header-menu" ref={menuRef}>
          <button
            type="button"
            className="btn-icon header-menu-trigger"
            aria-label="Settings and more"
            title="Settings and more"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span aria-hidden="true">⋯</span>
          </button>

          {menuOpen ? (
            <div className="header-menu-panel" id={menuId} role="menu">
              <div className="header-menu-section" role="none">
                <p className="header-menu-label" id={`${menuId}-shift-label`}>
                  Work shift
                </p>
                <ShiftSelector
                  shift={shift}
                  compact
                  onShiftChange={(next) => {
                    onShiftChange(next)
                    setMenuOpen(false)
                  }}
                />
              </div>

              <button
                type="button"
                role="menuitem"
                className="header-menu-item"
                onClick={() => {
                  setMenuOpen(false)
                  onAtsImportRequest?.()
                }}
              >
                Import ATS data…
              </button>

              <button
                type="button"
                role="menuitem"
                className="header-menu-item danger"
                disabled={!canReset}
                onClick={() => {
                  setMenuOpen(false)
                  onResetRequest()
                }}
              >
                Reset day…
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
