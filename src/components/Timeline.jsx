import { useState } from 'react'
import { isoToTimeInput } from '../utils/time'

function EditableStamp({ label, iso, field, onUpdate }) {
  const [draft, setDraft] = useState(() => isoToTimeInput(iso))
  const [invalid, setInvalid] = useState(false)
  const synced = isoToTimeInput(iso)

  return (
    <li>
      <span>{label}</span>
      <input
        className={`time-input${invalid ? ' invalid' : ''}`}
        type="time"
        step="60"
        value={draft}
        aria-invalid={invalid}
        onFocus={() => setInvalid(false)}
        onChange={(e) => {
          setDraft(e.target.value)
          setInvalid(false)
        }}
        onBlur={() => {
          if (!draft) {
            setDraft(synced)
            return
          }
          const ok = onUpdate(field, draft)
          if (!ok) {
            setDraft(synced)
            setInvalid(true)
          }
        }}
      />
    </li>
  )
}

export function Timeline({ session, onUpdateStamp }) {
  if (!session.checkIn) {
    return (
      <section className="panel">
        <h2>Today</h2>
        <p className="muted">No stamps yet. Check in to start tracking.</p>
      </section>
    )
  }

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
      key: `break-start-${i}-${b.start}`,
      label: b.auto ? `Break ${i + 1} in (auto)` : `Break ${i + 1} in`,
      iso: b.start,
      field: { type: 'breakStart', index: i },
    })
    if (b.end) {
      items.push({
        key: `break-end-${i}-${b.end}`,
        label: `Break ${i + 1} out`,
        iso: b.end,
        field: { type: 'breakEnd', index: i },
      })
    }
  })

  if (session.checkOut) {
    items.push({
      key: `checkOut-${session.checkOut}`,
      label: 'Check out',
      iso: session.checkOut,
      field: { type: 'checkOut' },
    })
  }

  return (
    <section className="panel">
      <h2>Today</h2>
      <p className="muted edit-hint">Edit times below if a stamp was late.</p>
      <ul className="timeline">
        {items.map((item) => (
          <EditableStamp
            key={item.key}
            label={item.label}
            iso={item.iso}
            field={item.field}
            onUpdate={onUpdateStamp}
          />
        ))}
      </ul>
    </section>
  )
}
