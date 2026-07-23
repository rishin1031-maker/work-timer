export function TimerActions({
  checkedIn,
  checkedOut,
  onBreak,
  onStartWork,
  onStartBreak,
  onResumeWork,
  onEndWorkday,
  busy = false,
  sticky = false,
}) {
  let primary = null
  let secondary = null

  if (!checkedIn) {
    primary = {
      label: 'Start work',
      onClick: onStartWork,
      title: 'Shortcut: I',
    }
  } else if (checkedOut) {
    primary = null
  } else if (onBreak) {
    primary = {
      label: 'Resume work',
      onClick: onResumeWork,
      title: 'Shortcut: B',
    }
    secondary = {
      label: 'End workday',
      onClick: onEndWorkday,
      title: 'Shortcut: O',
    }
  } else {
    primary = {
      label: 'Start break',
      onClick: onStartBreak,
      title: 'Shortcut: B',
    }
    secondary = {
      label: 'End workday',
      onClick: onEndWorkday,
      title: 'Shortcut: O',
    }
  }

  if (!primary && !secondary) {
    return (
      <div className={`timer-actions${sticky ? ' is-sticky' : ''}`}>
        <p className="timer-actions-done">Workday complete</p>
      </div>
    )
  }

  return (
    <div className={`timer-actions${sticky ? ' is-sticky' : ''}`}>
      {primary ? (
        <button
          type="button"
          className="btn btn-primary btn-action"
          onClick={primary.onClick}
          title={primary.title}
          disabled={busy}
          aria-busy={busy}
        >
          {primary.label}
        </button>
      ) : null}
      {secondary ? (
        <button
          type="button"
          className="btn btn-quiet btn-action"
          onClick={secondary.onClick}
          title={secondary.title}
          disabled={busy}
        >
          {secondary.label}
        </button>
      ) : null}
    </div>
  )
}
