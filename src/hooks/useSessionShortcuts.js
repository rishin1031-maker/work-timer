import { useEffect } from 'react'

function isTypingTarget(el) {
  if (!el || !(el instanceof Element)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return Boolean(el.closest('[contenteditable="true"]'))
}

export function useSessionShortcuts({
  checkedIn,
  checkedOut,
  onBreak,
  onCheckIn,
  onBreakIn,
  onBreakOut,
  onCheckOut,
  enabled = true,
}) {
  useEffect(() => {
    if (!enabled) return undefined

    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      const key = event.key.toLowerCase()

      if (key === 'i') {
        if (!checkedIn) {
          event.preventDefault()
          onCheckIn()
        }
        return
      }

      if (key === 'b') {
        if (!checkedIn || checkedOut) return
        event.preventDefault()
        if (onBreak) onBreakOut()
        else onBreakIn()
        return
      }

      if (key === 'o') {
        if (!checkedIn || checkedOut) return
        event.preventDefault()
        onCheckOut()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    enabled,
    checkedIn,
    checkedOut,
    onBreak,
    onCheckIn,
    onBreakIn,
    onBreakOut,
    onCheckOut,
  ])
}
