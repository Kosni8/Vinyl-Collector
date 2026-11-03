/** Search input with a small clear (×) button on the right. */
export default function SearchField({ value, onChange, onClear, ...props }) {
  return (
    <div className="search-field">
      <input className="search-input" type="search" value={value} onChange={(e) => onChange(e.target.value)} {...props} />
      {value && (
        <button
          type="button"
          className="search-clear"
          aria-label="Eingabe löschen"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (onClear ? onClear() : onChange(''))}
        >
          ×
        </button>
      )}
    </div>
  )
}
