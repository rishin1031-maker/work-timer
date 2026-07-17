import { useEffect, useState } from 'react'
import {
  clampTargetHours,
  MAX_TARGET_HOURS,
  MIN_TARGET_HOURS,
} from '../utils/storage'

function validateTargetHours(raw) {
  if (raw === '' || raw == null) {
    return 'Enter a target between 0.25 and 24 hours.'
  }
  const n = Number(raw)
  if (!Number.isFinite(n)) {
    return 'Enter a valid number of hours.'
  }
  if (n < 0) {
    return 'Target hours cannot be negative.'
  }
  if (n === 0) {
    return 'Target hours must be greater than 0.'
  }
  if (n > MAX_TARGET_HOURS) {
    return `Target hours cannot exceed ${MAX_TARGET_HOURS}.`
  }
  if (n < MIN_TARGET_HOURS) {
    return `Minimum target is ${MIN_TARGET_HOURS} hours.`
  }
  return null
}

export function TargetHours({ value, onChange, disabled }) {
  const [draft, setDraft] = useState(String(value))
  const [error, setError] = useState(null)

  useEffect(() => {
    setDraft(String(value))
    setError(null)
  }, [value])

  function commit(raw) {
    const message = validateTargetHours(raw)
    if (message) {
      setError(message)
      const hours = clampTargetHours(raw)
      setDraft(String(hours))
      onChange(hours)
      return
    }
    setError(null)
    const hours = clampTargetHours(raw)
    setDraft(String(hours))
    onChange(hours)
  }

  return (
    <label className={`target-hours${error ? ' has-error' : ''}`}>
      <span>Target work hours</span>
      <input
        type="number"
        min={MIN_TARGET_HOURS}
        max={MAX_TARGET_HOURS}
        step="0.25"
        value={draft}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'target-hours-error' : undefined}
        onChange={(e) => {
          const next = e.target.value
          setDraft(next)
          setError(validateTargetHours(next))
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur()
          }
        }}
      />
      {error ? (
        <span id="target-hours-error" className="target-hours-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
