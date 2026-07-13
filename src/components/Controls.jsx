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
  return (
    <div className="controls">
      <button type="button" className="btn primary" onClick={onCheckIn} disabled={checkedIn}>
        Check in
      </button>
      {onBreak ? (
        <button type="button" className="btn" onClick={onBreakOut} disabled={!checkedIn || checkedOut}>
          Break out
        </button>
      ) : (
        <button
          type="button"
          className="btn"
          onClick={onBreakIn}
          disabled={!checkedIn || checkedOut}
        >
          Break in
        </button>
      )}
      <button
        type="button"
        className="btn"
        onClick={onCheckOut}
        disabled={!checkedIn || checkedOut || onBreak}
      >
        Check out
      </button>
      <button type="button" className="btn ghost" onClick={onReset} disabled={!checkedIn}>
        Reset day
      </button>
    </div>
  )
}
