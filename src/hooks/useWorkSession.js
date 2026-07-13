import { useEffect, useState } from 'react'
import { emptySession, loadStore, saveStore } from '../utils/storage'
import {
  applySessionAutomations,
  getBreakMs,
  getContinuousWorkMs,
  getEstimatedCheckout,
  getWorkMs,
  isOnBreak,
  isSessionOrderValid,
  stampNow,
  timeInputToIso,
  todayKey,
} from '../utils/time'

export function useWorkSession() {
  const [store, setStore] = useState(() =>
    applySessionAutomations(loadStore(), Date.now()),
  )
  const [now, setNow] = useState(() => Date.now())

  const date = todayKey(new Date(now))
  const session = store.sessions[date] ?? emptySession(store.targetHours)
  const onBreak = isOnBreak(session)
  const checkedIn = Boolean(session.checkIn)
  const checkedOut = Boolean(session.checkOut)
  const autoBreakActive = onBreak && Boolean(session.breaks.at(-1)?.auto)

  useEffect(() => {
    if (!checkedIn || checkedOut) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [checkedIn, checkedOut])

  useEffect(() => {
    setStore((prev) => applySessionAutomations(prev, now))
  }, [now])

  useEffect(() => {
    saveStore(store)
  }, [store])

  function updateToday(updater) {
    setStore((prev) => {
      const current = prev.sessions[date] ?? emptySession(prev.targetHours)
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
    const hours = Math.min(24, Math.max(0.25, Number(value) || 8))
    setStore((prev) => {
      const current = prev.sessions[date] ?? emptySession(hours)
      return {
        ...prev,
        targetHours: hours,
        sessions: {
          ...prev.sessions,
          [date]: checkedOut
            ? current
            : { ...current, targetHours: hours },
        },
      }
    })
  }

  function checkIn() {
    if (checkedIn) return
    const stamp = stampNow()
    updateToday(() => ({
      checkIn: stamp,
      checkOut: null,
      breaks: [],
      targetHours: store.targetHours,
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

  function checkOut() {
    if (!checkedIn || checkedOut || onBreak) return
    const stamp = stampNow()
    updateToday((current) => ({ ...current, checkOut: stamp }))
    setNow(Date.now())
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
    const iso = timeInputToIso(date, timeValue)
    if (!iso) return false

    const current = store.sessions[date]
    if (!current?.checkIn) return false

    const next = {
      ...current,
      breaks: current.breaks.map((b) => ({ ...b })),
    }

    if (field.type === 'checkIn') {
      next.checkIn = iso
    } else if (field.type === 'checkOut') {
      if (!current.checkOut) return false
      next.checkOut = iso
    } else if (field.type === 'breakStart') {
      if (!next.breaks[field.index]) return false
      next.breaks[field.index] = { ...next.breaks[field.index], start: iso }
    } else if (field.type === 'breakEnd') {
      if (!next.breaks[field.index]?.end) return false
      next.breaks[field.index] = { ...next.breaks[field.index], end: iso }
    } else {
      return false
    }

    if (!isSessionOrderValid(next)) return false

    setStore((prev) => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [date]: next,
      },
    }))
    setNow(Date.now())
    return true
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
    checkIn,
    breakIn,
    breakOut,
    checkOut,
    resetDay,
    deleteBreak,
    updateStamp,
  }
}
