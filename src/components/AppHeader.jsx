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
  compactShift = false,
  onShiftChange,
  onThemeToggle,
  onResetRequest,
  canReset,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const menuId = useId()
  const clockMs = now ?? Date.now()
  const clock = formatLiveClock(clockMs)

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
        <ShiftSelector
          shift={shift}
          compact={compactShift}
          onShiftChange={onShiftChange}
        />

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
              <button
                type="button"
                role="menuitem"
                className="header-menu-item"
                onClick={() => {
                  setMenuOpen(false)
                  onThemeToggle()
                }}
              >
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
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
