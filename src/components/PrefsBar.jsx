import { usePillThumb } from '../hooks/usePillThumb'

export function PrefsBar({ shift, theme, onShiftChange, onThemeToggle }) {
  const { trackRef, thumbRef } = usePillThumb(shift, [shift])

  return (
    <div className="prefs-bar">
      <div
        className="pref-group"
        role="group"
        aria-label="Shift"
        ref={trackRef}
      >
        <span className="pill-thumb" ref={thumbRef} aria-hidden="true" />
        <button
          type="button"
          data-pill="day"
          className={`pref-btn pref-btn-shift${shift === 'day' ? ' active' : ''}`}
          onClick={() => onShiftChange('day')}
        >
          Day shift
        </button>
        <button
          type="button"
          data-pill="night"
          className={`pref-btn pref-btn-shift${shift === 'night' ? ' active' : ''}`}
          onClick={() => onShiftChange('night')}
        >
          Night shift
        </button>
      </div>
      <button type="button" className="pref-btn theme-btn" onClick={onThemeToggle}>
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
    </div>
  )
}
