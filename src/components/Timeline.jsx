import { useEffect, useState } from 'react'
import { formatClock, stampNow } from '../utils/time'

function toMinutes(iso) {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

function minutesToTimeValue(minutes) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function buildItems(session) {
  const items = [
    {
      key: 'checkIn',
      label: 'Check in',
      iso: session.checkIn,
      field: { type: 'checkIn' },
    },
  ]

  session.breaks.forEach((b, i) => {
    items.push({
      key: `break-start-${i}`,
      label: b.auto ? `Break ${i + 1} in (auto)` : `Break ${i + 1} in`,
      iso: b.start,
      field: { type: 'breakStart', index: i },
      breakIndex: i,
      showDelete: true,
    })
    if (b.end) {
      items.push({
        key: `break-end-${i}`,
        label: `Break ${i + 1} out`,
        iso: b.end,
        field: { type: 'breakEnd', index: i },
      })
    }
  })

  if (session.checkOut) {
    items.push({
      key: 'checkOut',
      label: 'Check out',
      iso: session.checkOut,
      field: { type: 'checkOut' },
    })
  }

  return items
}

function stampBounds(items, index, checkedOut) {
  const dayStart = 0
  const dayEnd = 23 * 60 + 59
  const nowMin = toMinutes(stampNow())

  let min = index === 0 ? dayStart : toMinutes(items[index - 1].iso)
  let max =
    index === items.length - 1
      ? checkedOut
        ? dayEnd
        : nowMin
      : toMinutes(items[index + 1].iso)

  if (max < min) max = min
  return { min, max }
}

function StampScrubber({
  label,
  iso,
  field,
  min,
  max,
  onUpdate,
  onDelete,
  showDelete,
}) {
  const [draft, setDraft] = useState(() => toMinutes(iso))

  useEffect(() => {
    setDraft(toMinutes(iso))
  }, [iso])

  const locked = min >= max

  function commit(minutes) {
    const next = Math.min(max, Math.max(min, minutes))
    setDraft(next)
    onUpdate(field, minutesToTimeValue(next))
  }

  return (
    <li className="stamp-row">
      <div className="stamp-heading">
        <span>{label}</span>
        <div className="stamp-actions">
          <time>{formatClock(iso)}</time>
          {showDelete ? (
            <button
              type="button"
              className="btn-delete"
              onClick={onDelete}
              aria-label={`Delete ${label.replace(/ in.*/, '')}`}
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
      <input
        className="time-scrubber"
        type="range"
        min={min}
        max={Math.max(min, max)}
        step={1}
        value={draft}
        disabled={locked}
        aria-label={`Adjust ${label}`}
        onChange={(e) => commit(Number(e.target.value))}
      />
      <div className="scrubber-ends">
        <span>{minutesToTimeValue(min)}</span>
        <span>{minutesToTimeValue(max)}</span>
      </div>
    </li>
  )
}

export function Timeline({ session, onUpdateStamp, onDeleteBreak }) {
  if (!session.checkIn) {
    return (
      <section className="panel">
        <h2>Today</h2>
        <p className="muted">No stamps yet. Check in to start tracking.</p>
      </section>
    )
  }

  const items = buildItems(session)
  const checkedOut = Boolean(session.checkOut)

  return (
    <section className="panel">
      <h2>Today</h2>
      <p className="muted edit-hint">
        Drag a stamp to adjust it, or delete a break if it was added by mistake.
      </p>
      <ul className="timeline">
        {items.map((item, index) => {
          const { min, max } = stampBounds(items, index, checkedOut)
          return (
            <StampScrubber
              key={item.key}
              label={item.label}
              iso={item.iso}
              field={item.field}
              min={min}
              max={max}
              onUpdate={onUpdateStamp}
              showDelete={Boolean(item.showDelete)}
              onDelete={
                item.showDelete
                  ? () => onDeleteBreak(item.breakIndex)
                  : undefined
              }
            />
          )
        })}
      </ul>
    </section>
  )
}
