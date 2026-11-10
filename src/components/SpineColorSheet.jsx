import { useEffect, useState } from 'react'
import Sheet from './Sheet.jsx'
import { coverPalette, textOn, tint } from '../lib/color.js'

/**
 * Second step after choosing a record for the home shelf: pick which colour of the
 * cover paints its spine (and, for the favourite album, the shelf background).
 */
export default function SpineColorSheet({ item, onClose, onSave }) {
  const [colors, setColors] = useState(null)
  const [color, setColor] = useState(item?.spine_color ?? null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!item) return
    let alive = true
    setColors(null)
    setColor(item.spine_color ?? null)
    coverPalette(item.cover_url || item.thumb_url).then((c) => alive && setColors(c))
    return () => {
      alive = false
    }
  }, [item])

  const shown = color ?? colors?.[0] ?? '#999999'
  return (
    <Sheet open={!!item} onClose={onClose} title="Farbe im Regal">
      {item && (
        <>
          <div className="spine-picker">
            <div className="spine-preview" style={{ background: tint(shown, 0.75) }}>
              {(item.thumb_url || item.cover_url) && <img src={item.thumb_url || item.cover_url} alt="" />}
              <span style={{ background: shown, color: textOn(shown) }}>{item.title}</span>
            </div>
            <div className="spine-swatches">
              {colors === null && <span className="muted small">Farben aus dem Cover werden geladen …</span>}
              {colors?.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={'spine-swatch' + (shown === c ? ' on' : '')}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Farbe ${c}`}
                />
              ))}
              <label className={'spine-swatch custom' + (colors && !colors.includes(shown) ? ' on' : '')} aria-label="Eigene Farbe">
                <input type="color" value={shown} onChange={(e) => setColor(e.target.value)} />
              </label>
            </div>
          </div>
          <p className="muted small">Gilt für den Plattenrücken und, beim Lieblingsalbum, für den Regal-Hintergrund.</p>
          <button
            className="btn primary block"
            disabled={busy || colors === null}
            onClick={async () => {
              setBusy(true)
              try {
                await onSave(shown)
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Speichern …' : 'Übernehmen'}
          </button>
          <button className="btn ghost block" onClick={onClose}>Farbe so lassen</button>
        </>
      )}
    </Sheet>
  )
}
