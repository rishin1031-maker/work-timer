import { useEffect, useState } from 'react'
import { fetchCurrentWeather, getBrowserPosition } from '../utils/weather'

const CACHE_KEY = 'work-timer:weather:v2'
const CACHE_MS = 20 * 60 * 1000

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), data }),
    )
  } catch {
    /* ignore */
  }
}

export function useWeather() {
  const [weather, setWeather] = useState(() => readCache())
  const [status, setStatus] = useState(() => (readCache() ? 'ready' : 'idle'))
  const [error, setError] = useState(null)

  async function load(force = false) {
    if (!force) {
      const cached = readCache()
      if (cached) {
        setWeather(cached)
        setStatus('ready')
        return
      }
    }

    setStatus('loading')
    setError(null)
    try {
      const coords = await getBrowserPosition()
      const data = await fetchCurrentWeather(coords.latitude, coords.longitude)
      writeCache(data)
      setWeather(data)
      setStatus('ready')
    } catch (err) {
      setError(err?.message || 'Could not load weather')
      setStatus('error')
    }
  }

  useEffect(() => {
    load(false)
  }, [])

  return { weather, status, error, refresh: () => load(true) }
}
