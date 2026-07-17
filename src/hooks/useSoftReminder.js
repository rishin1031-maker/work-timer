import { useEffect, useRef, useState } from 'react'

const THRESHOLD_MS = 30 * 60 * 1000

async function maybeNotify(title, body) {
  if (typeof Notification === 'undefined') return
  try {
    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    if (permission === 'granted') {
      new Notification(title, { body, silent: false })
    }
  } catch {
    // Ignore notification failures (unsupported / denied).
  }
}

export function useSoftReminder({
  remainingMs,
  checkedIn,
  checkedOut,
  onBreak,
  dateKey,
}) {
  const [toast, setToast] = useState(null)
  const firedForDay = useRef(null)

  useEffect(() => {
    firedForDay.current = null
  }, [dateKey])

  useEffect(() => {
    if (!checkedIn || checkedOut || onBreak) return
    if (remainingMs <= 0 || remainingMs > THRESHOLD_MS) return
    if (firedForDay.current === dateKey) return

    firedForDay.current = dateKey
    const minutes = Math.max(1, Math.ceil(remainingMs / 60000))
    const message = `About ${minutes} min left to hit today’s target.`
    setToast(message)
    maybeNotify('Work Timer', message)

    const hide = window.setTimeout(() => setToast(null), 8000)
    return () => window.clearTimeout(hide)
  }, [remainingMs, checkedIn, checkedOut, onBreak, dateKey])

  function dismissToast() {
    setToast(null)
  }

  return { toast, dismissToast }
}
