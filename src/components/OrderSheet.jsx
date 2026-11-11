import { useEffect, useState } from 'react'
import Sheet from './Sheet.jsx'
import { DATE_KINDS } from '../lib/orders.js'

/**
 * Sheet to enter or change an order's date: delivery or release date, both optional.
 * onRemove (optional) shows a button to take the record off the ordered list.
 */
export default function OrderSheet({ open, onClose, title, order, submitLabel = 'Speichern', onSave, onRemove }) {
  const [kind, setKind] = useState('delivery')
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setKind(order?.date_kind ?? 'delivery')
    setDate(order?.date ?? '')
    setBusy(false)
  }, [open, order])

  const run = async (fn) => {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      alert('Speichern fehlgeschlagen: ' + e.message + '\n\nFalls die Tabelle fehlt: Das SQL-Update in Supabase muss noch ausgeführt werden.')
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => !busy && onClose()} title={title}>
      <form
        className="order-form"
        onSubmit={(e) => {
          e.preventDefault()
          run(() => onSave({ date_kind: kind, date: date || null }))
        }}
      >
        <div className="segmented">
          {DATE_KINDS.map((k) => (
            <button type="button" key={k.id} className={kind === k.id ? 'on' : ''} onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <label className="field-label" htmlFor="order-date">
          {DATE_KINDS.find((k) => k.id === kind).label} (optional)
        </label>
        <div className="row">
          <input id="order-date" className="text-input date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {date && (
            <button type="button" className="btn ghost" onClick={() => setDate('')}>
              Leeren
            </button>
          )}
        </div>
        <button className="btn primary block" disabled={busy}>{busy ? 'Speichert …' : submitLabel}</button>
        {onRemove && (
          <button type="button" className="btn danger block" disabled={busy} onClick={() => run(onRemove)}>
            Aus „Bestellt“ entfernen
          </button>
        )}
      </form>
    </Sheet>
  )
}
