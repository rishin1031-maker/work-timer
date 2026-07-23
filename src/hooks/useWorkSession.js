import { useEffect, useState } from 'react'
import { emptySession, loadStore, saveStore, clampTargetHours } from '../utils/storage'
import {
  applySessionAutomations,
  getBreakMs,
  getContinuousWorkMs,
  getEstimatedCheckout,
  getOpenBreakMs,
  getWorkMs,
  isOnBreak,
  isSessionOrderValid,
  shiftDayKey,
  shiftWindow,
  stampAt,
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
    // Use a precise timestamp so resume within the same minute still closes
    // the open break (stampNow() truncates seconds).
    const stamp = new Date().toISOString()
    updateToday((current) => {
      if (!isOnBreak(current)) return current
      const breaks = current.breaks.map((b, i) =>
        i === current.breaks.length - 1 && !b.end ? { ...b, end: stamp } : b,
      )
      return { ...current, breaks }
    })
    setNow(Date.now())
  }

  function checkOut({ switchToShift } = {}) {
    if (!checkedIn || checkedOut) return false
    const stamp = stampNow()
    const nextShift =
      switchToShift === 'night' || switchToShift === 'day'
        ? switchToShift
        : null

    setStore((prev) => {
      const currentShift = prev.shift === 'night' ? 'night' : 'day'
      const currentDate = shiftDayKey(new Date(), currentShift)
      const current = prev.sessions[currentDate]
      if (!current?.checkIn || current.checkOut) {
        return prev
      }

      const breaks = (current.breaks ?? []).map((b) => ({ ...b }))
      const last = breaks[breaks.length - 1]
      if (last && last.start && !last.end) {
        last.end = stamp
      }

      return {
        ...prev,
        shift: nextShift ?? prev.shift,
        sessions: {
          ...prev.sessions,
          [currentDate]: { ...current, breaks, checkOut: stamp },
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

  function restoreSession(sessionSnapshot) {
    if (!sessionSnapshot?.checkIn) return
    setStore((prev) => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [date]: {
          ...sessionSnapshot,
          breaks: (sessionSnapshot.breaks ?? []).map((b) => ({ ...b })),
        },
      },
    }))
    setNow(Date.now())
  }

  function replaceTodaySession(nextSession) {
    if (!nextSession?.checkIn) return false
    if (!isSessionOrderValid(nextSession)) return false

    setStore((prev) => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [date]: {
          ...nextSession,
          breaks: (nextSession.breaks ?? []).map((b) => ({ ...b })),
          targetHours: nextSession.targetHours ?? prev.targetHours,
          shift: nextSession.shift === 'night' ? 'night' : 'day',
        },
      },
    }))
    setNow(Date.now())
    return true
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

  function addBreak() {
    if (!checkedIn) return false

    let applied = false
    setStore((prev) => {
      const current = prev.sessions[date] ?? emptySession(prev.targetHours, shift)
      if (!current.checkIn) return prev

      const stamps = []
      stamps.push(new Date(current.checkIn).getTime())
      for (const b of current.breaks ?? []) {
        if (b.start) stamps.push(new Date(b.start).getTime())
        if (b.end) stamps.push(new Date(b.end).getTime())
      }
      if (current.checkOut) stamps.push(new Date(current.checkOut).getTime())

      const lastStamp = Math.max(...stamps)
      const endCap = current.checkOut
        ? new Date(current.checkOut).getTime()
        : Date.now()
      const gapEnd = endCap
      const gapStart = lastStamp

      if (gapEnd - gapStart < 2 * 60 * 1000) return prev

      const breakEnd = Math.min(gapEnd - 60 * 1000, gapStart + 16 * 60 * 1000)
      const breakStart = Math.max(gapStart + 60 * 1000, breakEnd - 15 * 60 * 1000)
      if (breakEnd <= breakStart) return prev

      const next = {
        ...current,
        breaks: [
          ...(current.breaks ?? []).map((b) => ({ ...b })),
          {
            start: stampAt(breakStart),
            end: stampAt(breakEnd),
          },
        ],
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
  const openBreakMs = getOpenBreakMs(session, now)
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
    openBreakMs,
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
    restoreSession,
    replaceTodaySession,
    deleteBreak,
    addBreak,
    updateStamp,
    updateBreakRange,
  }
}
