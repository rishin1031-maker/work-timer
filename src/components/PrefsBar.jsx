export function PrefsBar({ shift, theme, onShiftChange, onThemeToggle }) {
  return (
    <div className="prefs-bar">
      <div className="pref-group" role="group" aria-label="Shift">
        <button
          type="button"
          className={`pref-btn${shift === 'day' ? ' active' : ''}`}
          onClick={() => onShiftChange('day')}
        >
          Day shift
        </button>
        <button
          type="button"
          className={`pref-btn${shift === 'night' ? ' active' : ''}`}
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
