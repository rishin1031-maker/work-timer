import { useCallback, useEffect, useRef, useState } from 'react'

let toastId = 0

export function useToast() {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setToast(null)
  }, [])

  const showToast = useCallback(
    (message, { undo, duration = 4500 } = {}) => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      const id = ++toastId
      setToast({ id, message, undo: typeof undo === 'function' ? undo : null })
      timerRef.current = window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current))
        timerRef.current = null
      }, duration)
    },
    [],
  )

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  return { toast, showToast, dismissToast: dismiss }
}
