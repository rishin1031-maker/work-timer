import { useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { NotchAction } from './NotchAction'

export function AutoRules({ shift = 'day', alwaysOpen = false }) {
  const isPhone = useMediaQuery('(max-width: 720px)')
  const [open, setOpen] = useState(alwaysOpen || !isPhone)
  const shiftEnd =
    shift === 'night' ? '12:00 PM (noon)' : '12:00 AM (midnight)'
  const isOpen = alwaysOpen || open

  if (alwaysOpen) {
    return (
      <div className="auto-rules-inline" aria-label="Automatic session rules">
        <div className="auto-rules-grid">
          <div className="auto-rule-card">
            <span className="auto-rule-name">Auto break</span>
            <p>
              Starts after <strong>8 hours</strong> of continuous work without a
              break.
            </p>
          </div>
          <div className="auto-rule-card">
            <span className="auto-rule-name">Auto end workday</span>
            <p>
              Ends the session at the close of your{' '}
              {shift === 'night' ? 'night' : 'day'} shift ({shiftEnd}).
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <aside
      className={`notch-card auto-rules${isOpen ? ' is-open' : ''}`}
      aria-label="Automatic session rules"
    >
      <NotchAction
        variant="arrow"
        label={isOpen ? 'Hide auto rules' : 'Show auto rules'}
        expanded={isOpen}
        onClick={() => setOpen((v) => !v)}
      />
      <div className="notch-shell auto-rules-shell">
        <p className="auto-rules-label">Auto rules</p>
        <p
          className={`auto-rules-hint${isOpen ? ' is-hidden' : ''}`}
          aria-hidden={isOpen}
        >
          Tap the arrow to view break and checkout rules.
        </p>
        <div className={`overview-expand-wrap${isOpen ? ' is-open' : ''}`}>
          <div className="overview-expand-inner">
            <div className="auto-rules-grid">
              <div className="auto-rule-card">
                <span className="auto-rule-name">Auto break</span>
                <p>
                  Starts after <strong>8 hours</strong> of continuous work
                  without a break.
                </p>
              </div>
              <div className="auto-rule-card">
                <span className="auto-rule-name">Auto end workday</span>
                <p>
                  Ends the session at the close of your{' '}
                  {shift === 'night' ? 'night' : 'day'} shift ({shiftEnd}).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
