export function TargetHours({ value, onChange, disabled }) {
  return (
    <label className="target-hours">
      <span>Target work hours</span>
      <input
        type="number"
        min="0.25"
        max="24"
        step="0.25"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
