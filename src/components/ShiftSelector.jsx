import { usePillThumb } from '../hooks/usePillThumb'

export function ShiftSelector({ shift, onShiftChange, compact = false }) {
  const { trackRef, thumbRef } = usePillThumb(shift, [shift, compact])

  return (
    <div
      className={`shift-selector${compact ? ' is-compact' : ''}`}
      role="group"
      aria-label="Work shift"
      ref={trackRef}
    >
      <span className="pill-thumb" ref={thumbRef} aria-hidden="true" />
      <button
        type="button"
        data-pill="day"
        className={`shift-btn${shift === 'day' ? ' active' : ''}`}
        onClick={() => onShiftChange('day')}
      >
        <span className="shift-label-full">Day shift</span>
        <span className="shift-label-short">Day</span>
      </button>
      <button
        type="button"
        data-pill="night"
        className={`shift-btn${shift === 'night' ? ' active' : ''}`}
        onClick={() => onShiftChange('night')}
      >
        <span className="shift-label-full">Night shift</span>
        <span className="shift-label-short">Night</span>
      </button>
    </div>
  )
}
