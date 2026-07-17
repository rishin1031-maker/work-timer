import { formatDuration } from './time'

/** Summarize last 7 calendar days including today. */
export function getWeekSummary({ history, todayKey, todayWorkMs, todayTargetHours }) {
  const byDate = new Map(
    history.map((h) => [
      h.date,
      {
        workMs: h.workMs,
        targetHours: h.session?.targetHours ?? todayTargetHours,
      },
    ]),
  )
  byDate.set(todayKey, {
    workMs: todayWorkMs,
    targetHours: todayTargetHours,
  })

  let totalWorkMs = 0
  let daysWithWork = 0
  let overTargetDays = 0

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-')

    const day = byDate.get(key)
    const workMs = day?.workMs ?? 0
    const targetMs = (day?.targetHours ?? todayTargetHours) * 3600000

    if (workMs > 0) {
      daysWithWork += 1
      totalWorkMs += workMs
    }
    if (workMs > 0 && targetMs > 0 && workMs >= targetMs) {
      overTargetDays += 1
    }
  }

  const avgWorkMs = daysWithWork > 0 ? totalWorkMs / daysWithWork : 0

  return {
    daysWithWork,
    overTargetDays,
    totalWorkMs,
    avgWorkMs,
    avgLabel: daysWithWork > 0 ? formatDuration(avgWorkMs) : '—',
    totalLabel: formatDuration(totalWorkMs),
  }
}
