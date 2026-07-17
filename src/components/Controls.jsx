import { usePillThumb } from '../hooks/usePillThumb'

export function Controls({
  checkedIn,
  checkedOut,
  onBreak,
  onCheckIn,
  onBreakIn,
  onBreakOut,
  onCheckOut,
  onReset,
}) {
  const activeKey = !checkedIn
    ? 'checkin'
    : checkedOut
      ? null
      : onBreak
        ? 'break'
        : 'checkout'

  const { trackRef, thumbRef } = usePillThumb(activeKey, [
    checkedIn,
    checkedOut,
    onBreak,
  ])

  return (
    <div
      className="controls"
      role="group"
      aria-label="Session actions"
      ref={trackRef}
    >
      <span className="pill-thumb" ref={thumbRef} aria-hidden="true" />

      <button
        type="button"
        data-pill="checkin"
        className={`controls-pill${activeKey === 'checkin' ? ' is-active' : ''}${checkedIn ? ' is-done' : ''}`}
        onClick={onCheckIn}
        disabled={checkedIn}
        title="Shortcut: I"
      >
        Check in
      </button>

      <button
        type="button"
        data-pill="break"
        className={`controls-pill controls-pill-break${activeKey === 'break' ? ' is-active' : ''}`}
        onClick={onBreak ? onBreakOut : onBreakIn}
        disabled={!checkedIn || checkedOut}
        title="Shortcut: B"
      >
        <span
          key={onBreak ? 'out' : 'in'}
          className="controls-pill-label"
          data-label={onBreak ? 'out' : 'in'}
        >
          {onBreak ? 'Break out' : 'Break in'}
        </span>
      </button>

      <button
        type="button"
        data-pill="checkout"
        className={`controls-pill${activeKey === 'checkout' ? ' is-active' : ''}${checkedOut ? ' is-done' : ''}`}
        onClick={onCheckOut}
        disabled={!checkedIn || checkedOut || onBreak}
        title="Shortcut: O"
      >
        Check out
      </button>

      <button
        type="button"
        data-pill="reset"
        className="controls-pill controls-pill-muted"
        onClick={onReset}
        disabled={!checkedIn}
      >
        Reset day
      </button>
    </div>
  )
}
