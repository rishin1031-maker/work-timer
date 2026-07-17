import { useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { NotchAction } from './NotchAction'

export function AutoRules({ shift = 'day' }) {
  const isPhone = useMediaQuery('(max-width: 720px)')
  const [open, setOpen] = useState(!isPhone)
  const shiftEnd =
    shift === 'night' ? '12:00 PM (noon)' : '12:00 AM (midnight)'

  return (
    <aside
      className={`notch-card auto-rules${open ? ' is-open' : ''}`}
      aria-label="Automatic session rules"
    >
      <NotchAction
        variant="arrow"
        label={open ? 'Hide auto rules' : 'Show auto rules'}
        expanded={open}
        onClick={() => setOpen((v) => !v)}
      />
      <div className="notch-shell auto-rules-shell">
        <p className="auto-rules-label">Auto rules</p>
        <p
          className={`auto-rules-hint${open ? ' is-hidden' : ''}`}
          aria-hidden={open}
        >
          Tap the arrow to view break and checkout rules.
        </p>
        <div className={`overview-expand-wrap${open ? ' is-open' : ''}`}>
          <div className="overview-expand-inner">
            <div className="auto-rules-grid">
              <div className="auto-rule-card tone-mint">
                <span className="auto-rule-name">Auto break</span>
                <p>
                  Starts after <strong>8 hours</strong> of continuous work without
                  a break.
                </p>
              </div>
              <div className="auto-rule-card tone-blue">
                <span className="auto-rule-name">Auto check out</span>
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
