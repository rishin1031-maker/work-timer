import { useEffect, useState } from 'react'
import { useWeather } from '../hooks/useWeather'
import { AutoRules } from './AutoRules'
import { DailyQuote } from './DailyQuote'

const WIDGETS_KEY = 'work-timer:widgets:v1'

function loadWidgetPrefs() {
  try {
    const raw = localStorage.getItem(WIDGETS_KEY)
    if (!raw) return { quote: true, weather: true, autoRules: true }
    const parsed = JSON.parse(raw)
    return {
      quote: parsed.quote !== false,
      weather: parsed.weather !== false,
      autoRules: parsed.autoRules !== false,
    }
  } catch {
    return { quote: true, weather: true, autoRules: true }
  }
}

function WeatherWidget() {
  const { weather, status, error, refresh } = useWeather()

  return (
    <div className="widget-body weather-widget">
      <div className="weather-head">
        <p className="widget-label">Weather</p>
        <button
          type="button"
          className="btn-icon btn-icon-sm"
          onClick={refresh}
          disabled={status === 'loading'}
          aria-label="Refresh weather"
        >
          ↻
        </button>
      </div>
      {status === 'error' ? (
        <p className="muted">{error}. Allow location to load weather.</p>
      ) : weather ? (
        <>
          <p className="weather-place">{weather.place || 'Local'}</p>
          <p className="weather-temp">
            {Math.round(weather.temperature)}°
            <span>{weather.label}</span>
          </p>
          <div className="weather-stats">
            <span>Feels {Math.round(weather.feelsLike)}°</span>
            <span>{weather.humidity}% humidity</span>
            <span>{Math.round(weather.windSpeed)} km/h wind</span>
          </div>
        </>
      ) : (
        <p className="muted">Loading local weather…</p>
      )}
    </div>
  )
}

export function OptionalWidgets({ dateKey, shift }) {
  const [prefs, setPrefs] = useState(loadWidgetPrefs)

  useEffect(() => {
    localStorage.setItem(WIDGETS_KEY, JSON.stringify(prefs))
  }, [prefs])

  function togglePref(key) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const anyVisible = prefs.quote || prefs.weather || prefs.autoRules

  return (
    <section className="section-card optional-widgets">
      <div className="section-heading">
        <div>
          <h2>Widgets</h2>
          <p className="section-sub">Show or hide optional extras</p>
        </div>
      </div>

      <div className="widget-visibility" role="group" aria-label="Visible widgets">
        <button
          type="button"
          className={`widget-chip${prefs.quote ? ' is-active' : ''}`}
          aria-pressed={prefs.quote}
          onClick={() => togglePref('quote')}
        >
          Quote
        </button>
        <button
          type="button"
          className={`widget-chip${prefs.weather ? ' is-active' : ''}`}
          aria-pressed={prefs.weather}
          onClick={() => togglePref('weather')}
        >
          Weather
        </button>
        <button
          type="button"
          className={`widget-chip${prefs.autoRules ? ' is-active' : ''}`}
          aria-pressed={prefs.autoRules}
          onClick={() => togglePref('autoRules')}
        >
          Auto rules
        </button>
      </div>

      {!anyVisible ? (
        <p className="muted empty-state">All widgets are hidden.</p>
      ) : (
        <div className="widgets-stack">
          {prefs.quote ? (
            <div className="widget-card is-open">
              <DailyQuote dateKey={dateKey} />
            </div>
          ) : null}
          {prefs.weather ? (
            <div className="widget-card is-open">
              <div className="widget-panel">
                <WeatherWidget />
              </div>
            </div>
          ) : null}
          {prefs.autoRules ? (
            <div className="widget-card is-open">
              <div className="widget-panel">
                <AutoRules shift={shift} alwaysOpen />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
