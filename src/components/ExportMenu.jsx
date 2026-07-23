import { useEffect, useId, useRef, useState } from 'react'
import {
  buildTodayExportEntry,
  exportSessionsCsv,
  filterHistoryByDays,
} from '../utils/exportCsv'

export function ExportMenu({
  history,
  today,
  todayWorkMs,
  todayBreakMs,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined

    function onPointerDown(event) {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function exportToday() {
    if (!today?.session?.checkIn) return
    exportSessionsCsv(
      [
        buildTodayExportEntry({
          date: today.date,
          session: today.session,
          workMs: todayWorkMs,
          breakMs: todayBreakMs,
        }),
      ],
      `work-timer-${today.date}.csv`,
    )
    setOpen(false)
  }

  function exportDays(days) {
    const past = filterHistoryByDays(history, days)
    const entries = [...past]
    if (today?.session?.checkIn && today.date) {
      const cutoff = filterHistoryByDays(
        [
          buildTodayExportEntry({
            date: today.date,
            session: today.session,
            workMs: todayWorkMs,
            breakMs: todayBreakMs,
          }),
        ],
        days,
      )
      if (cutoff.length) entries.unshift(cutoff[0])
    }
    entries.sort((a, b) => b.date.localeCompare(a.date))
    if (entries.length === 0) return
    exportSessionsCsv(entries, `work-timer-last-${days}-days.csv`)
    setOpen(false)
  }

  return (
    <div className="export-menu" ref={ref}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        Export
      </button>
      {open ? (
        <div className="export-menu-panel" id={menuId} role="menu">
          <button
            type="button"
            role="menuitem"
            disabled={!today?.session?.checkIn}
            onClick={exportToday}
          >
            Export today
          </button>
          <button type="button" role="menuitem" onClick={() => exportDays(7)}>
            Export 7 days
          </button>
          <button type="button" role="menuitem" onClick={() => exportDays(30)}>
            Export 30 days
          </button>
        </div>
      ) : null}
    </div>
  )
}
