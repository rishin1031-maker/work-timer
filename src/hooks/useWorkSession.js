import { useEffect, useState } from 'react'
import { emptySession, loadStore, saveStore, clampTargetHours } from '../utils/storage'
import {
  applySessionAutomations,
  getBreakMs,
  getContinuousWorkMs,
  getEstimatedCheckout,
  getWorkMs,
  isOnBreak,
  isSessionOrderValid,
  shiftDayKey,
  shiftWindow,
  stampNow,
  timeInputToIso,
} from '../utils/time'

export function useWorkSession() {
  const [store, setStore] = useState(() =>
    applySessionAutomations(loadStore(), Date.now()),
  )
  const [now, setNow] = useState(() => Date.now())

  const shift = store.shift === 'night' ? 'night' : 'day'
  const theme = store.theme === 'dark' ? 'dark' : 'light'
  const date = shiftDayKey(new Date(now), shift)
  const window = shiftWindow(date, shift)
  const session = store.sessions[date] ?? emptySession(store.targetHours, shift)
  const onBreak = isOnBreak(session)
  const checkedIn = Boolean(session.checkIn)
  const checkedOut = Boolean(session.checkOut)
  const autoBreakActive = onBreak && Boolean(session.breaks.at(-1)?.auto)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setStore((prev) => applySessionAutomations(prev, now))
  }, [now, shift])

  useEffect(() => {
    saveStore(store)
  }, [store])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function updateToday(updater) {
    setStore((prev) => {
      const current = prev.sessions[date] ?? emptySession(prev.targetHours, shift)
      const nextSession = updater(current)
      return {
        ...prev,
        sessions: {
          ...prev.sessions,
          [date]: nextSession,
        },
      }
    })
  }

  function setTargetHours(value) {
    const hours = clampTargetHours(value)
    setStore((prev) => {
      const current = prev.sessions[date] ?? emptySession(hours, shift)
      return {
        ...prev,
        targetHours: hours,
        sessions: {
          ...prev.sessions,
          [date]: checkedOut
            ? current
            : { ...current, targetHours: hours, shift },
        },
      }
    })
  }

  function setShift(nextShift) {
    const value = nextShift === 'night' ? 'night' : 'day'
    if (checkedIn && !checkedOut) return false
    setStore((prev) => ({ ...prev, shift: value }))
    setNow(Date.now())
    return true
  }

  function setTheme(nextTheme) {
    const value = nextTheme === 'dark' ? 'dark' : 'light'
    setStore((prev) => ({ ...prev, theme: value }))
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  function checkIn() {
    if (checkedIn) return
    const stamp = stampNow()
    updateToday(() => ({
      checkIn: stamp,
      checkOut: null,
      breaks: [],
      targetHours: store.targetHours,
      shift,
    }))
    setNow(Date.now())
  }

  function breakIn() {
    if (!checkedIn || checkedOut || onBreak) return
    const stamp = stampNow()
    updateToday((current) => ({
      ...current,
      breaks: [...current.breaks, { start: stamp, end: null }],
    }))
    setNow(Date.now())
  }

  function breakOut() {
    if (!onBreak) return
    const stamp = stampNow()
    updateToday((current) => {
      const breaks = current.breaks.map((b, i) =>
        i === current.breaks.length - 1 && !b.end ? { ...b, end: stamp } : b,
      )
      return { ...current, breaks }
    })
    setNow(Date.now())
  }

  function checkOut({ switchToShift } = {}) {
    if (!checkedIn || checkedOut || onBreak) return false
    const stamp = stampNow()
    const nextShift =
      switchToShift === 'night' || switchToShift === 'day'
        ? switchToShift
        : null

    setStore((prev) => {
      const currentShift = prev.shift === 'night' ? 'night' : 'day'
      const currentDate = shiftDayKey(new Date(), currentShift)
      const current = prev.sessions[currentDate]
      if (!current?.checkIn || current.checkOut || isOnBreak(current)) {
        return prev
      }

      return {
        ...prev,
        shift: nextShift ?? prev.shift,
        sessions: {
          ...prev.sessions,
          [currentDate]: { ...current, checkOut: stamp },
        },
      }
    })
    setNow(Date.now())
    return true
  }

  function resetDay() {
    setStore((prev) => {
      const sessions = { ...prev.sessions }
      delete sessions[date]
      return { ...prev, sessions }
    })
    setNow(Date.now())
  }

  function deleteBreak(index) {
    updateToday((current) => {
      if (!current.breaks[index]) return current
      return {
        ...current,
        breaks: current.breaks.filter((_, i) => i !== index),
      }
    })
    setNow(Date.now())
  }

  function updateStamp(field, timeValue) {
    const iso = timeInputToIso(date, timeValue, shift)
    if (!iso) return false

    let applied = false
    setStore((prev) => {
      const current = prev.sessions[date]
      if (!current?.checkIn) return prev

      const next = {
        ...current,
        breaks: current.breaks.map((b) => ({ ...b })),
      }

      if (field.type === 'checkIn') {
        next.checkIn = iso
      } else if (field.type === 'checkOut') {
        if (!current.checkOut) return prev
        next.checkOut = iso
      } else if (field.type === 'breakStart') {
        if (!next.breaks[field.index]) return prev
        next.breaks[field.index] = { ...next.breaks[field.index], start: iso }
      } else if (field.type === 'breakEnd') {
        if (!next.breaks[field.index]?.end) return prev
        next.breaks[field.index] = { ...next.breaks[field.index], end: iso }
      } else {
        return prev
      }

      if (!isSessionOrderValid(next)) return prev

      applied = true
      return {
        ...prev,
        sessions: {
          ...prev.sessions,
          [date]: next,
        },
      }
    })

    if (applied) setNow(Date.now())
    return applied
  }

  function updateBreakRange(index, startTime, endTime) {
    const startIso = timeInputToIso(date, startTime, shift)
    const endIso = timeInputToIso(date, endTime, shift)
    if (!startIso || !endIso) return false

    let applied = false
    setStore((prev) => {
      const current = prev.sessions[date]
      if (!current?.checkIn || !current.breaks[index]?.end) return prev

      const next = {
        ...current,
        breaks: current.breaks.map((b, i) =>
          i === index ? { ...b, start: startIso, end: endIso } : { ...b },
        ),
      }

      if (!isSessionOrderValid(next)) return prev

      applied = true
      return {
        ...prev,
        sessions: {
          ...prev.sessions,
          [date]: next,
        },
      }
    })

    if (applied) setNow(Date.now())
    return applied
  }

  const workMs = getWorkMs(session, now)
  const breakMs = getBreakMs(session.breaks, now)
  const continuousWorkMs = getContinuousWorkMs(session, now)
  const estimatedCheckout = getEstimatedCheckout(
    session,
    session.targetHours ?? store.targetHours,
    now,
  )

  const history = Object.entries(store.sessions)
    .filter(([key, s]) => key !== date && s.checkIn)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, s]) => ({
      date: key,
      session: s,
      workMs: getWorkMs(s, s.checkOut ? new Date(s.checkOut).getTime() : now),
      breakMs: getBreakMs(
        s.breaks,
        s.checkOut ? new Date(s.checkOut).getTime() : now,
      ),
    }))

  return {
    date,
    shift,
    theme,
    window,
    session,
    targetHours: store.targetHours,
    now,
    workMs,
    breakMs,
    continuousWorkMs,
    estimatedCheckout,
    onBreak,
    autoBreakActive,
    checkedIn,
    checkedOut,
    history,
    setTargetHours,
    setShift,
    setTheme,
    toggleTheme,
    checkIn,
    breakIn,
    breakOut,
    checkOut,
    resetDay,
    deleteBreak,
    updateStamp,
    updateBreakRange,
  }
}
