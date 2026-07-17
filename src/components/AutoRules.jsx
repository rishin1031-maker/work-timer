export function AutoRules({ shift = 'day' }) {
  const shiftEnd =
    shift === 'night' ? '12:00 PM (noon)' : '12:00 AM (midnight)'

  return (
    <aside className="auto-rules" aria-label="Automatic session rules">
      <p className="auto-rules-label">Auto rules</p>
      <ul>
        <li>
          <span className="auto-rule-name">Auto break</span>
          Starts after <strong>8 hours</strong> of continuous work without a
          break.
        </li>
        <li>
          <span className="auto-rule-name">Auto check out</span>
          Ends the session at the close of your{' '}
          {shift === 'night' ? 'night' : 'day'} shift ({shiftEnd}).
        </li>
      </ul>
    </aside>
  )
}
