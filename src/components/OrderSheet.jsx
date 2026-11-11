import { useEffect, useState } from 'react'
import Sheet from './Sheet.jsx'
import { CameraIcon } from './Icons.jsx'
import { DATE_KINDS } from '../lib/orders.js'

/**
 * Sheet to enter or change an order's date: delivery or release date, both optional.
 * withDetails also asks for title, artist and an optional picture (placeholders for
 * records that are not on Discogs yet); onSave then also gets title, artist, photoFile
 * and removePhoto. onRemove (optional) shows a button to take the record off the list,
 * children are shown as extra actions below the save button.
 */
export default function OrderSheet({ open, onClose, title, order, submitLabel = 'Speichern', onSave, onRemove, withDetails, children }) {
  const [kind, setKind] = useState('delivery')
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [artist, setArtist] = useState('')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setKind(order?.date_kind ?? 'delivery')
    setDate(order?.date ?? '')
    setName(order?.title ?? '')
    setArtist(order?.artist ?? '')
    setPhoto(null)
    setPreview(order?.cover_url ?? null)
    setRemovePhoto(false)
    setBusy(false)
  }, [open, order])

  const run = async (fn) => {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      alert('Speichern fehlgeschlagen: ' + e.message + '\n\nFalls die Tabelle oder eine Spalte fehlt: Das SQL-Update in Supabase muss noch ausgeführt werden.')
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => !busy && onClose()} title={title} full={withDetails}>
      <form
        className="order-form"
        onSubmit={(e) => {
          e.preventDefault()
          const dates = { date_kind: kind, date: date || null }
          run(() => onSave(withDetails ? { ...dates, title: name.trim(), artist: artist.trim(), photoFile: photo, removePhoto } : dates))
        }}
      >
        {withDetails && (
          <>
            <label className="field-label" htmlFor="order-title">Titel</label>
            <input id="order-title" className="text-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Neues Album" />
            <label className="field-label" htmlFor="order-artist">Artist</label>
            <input id="order-artist" className="text-input" required value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="z. B. Taylor Swift" />
            <label className="field-label">Bild (optional)</label>
            <div className="photo-field">
              {preview && !removePhoto ? (
                <div className="photo-preview">
                  <img src={preview} alt="" />
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setPhoto(null)
                      setPreview(null)
                      setRemovePhoto(true)
                    }}
                  >
                    Bild entfernen
                  </button>
                </div>
              ) : (
                <label className="btn ghost block">
                  <CameraIcon width={18} height={18} /> Bild aufnehmen oder wählen
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setPhoto(f)
                      setPreview(URL.createObjectURL(f))
                      setRemovePhoto(false)
                    }}
                  />
                </label>
              )}
            </div>
            <div className="field-label">Datum</div>
          </>
        )}
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
        {children}
        {onRemove && (
          <button type="button" className="btn danger block" disabled={busy} onClick={() => run(onRemove)}>
            Aus „Bestellte Platten“ entfernen
          </button>
        )}
      </form>
    </Sheet>
  )
}
