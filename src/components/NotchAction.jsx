export function NotchAction({
  onClick,
  label,
  expanded,
  variant = 'arrow',
  disabled = false,
  spinning = false,
}) {
  return (
    <button
      type="button"
      className={`notch-action${expanded ? ' is-expanded' : ''}${spinning ? ' is-spinning' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-expanded={expanded}
    >
      {variant === 'refresh' ? (
        <svg viewBox="0 0 24 24" className="notch-icon" aria-hidden="true">
          <path
            d="M19.5 12a7.5 7.5 0 1 1-1.8-4.85M19.5 4.5v4.2h-4.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="notch-icon" aria-hidden="true">
          <path
            d="M9 15L15 9M15 9H10.5M15 9V13.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
