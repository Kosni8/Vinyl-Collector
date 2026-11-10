import { useState } from 'react'
import { VINYL_COLORS, VINYL_PATTERNS } from '../lib/format.js'
import { VinylDot } from './VinylDot.jsx'
import { CameraIcon } from './Icons.jsx'

/**
 * Form for the details Discogs does not know: vinyl colour, pattern,
 * own photo, comment and "signed". Used for adding and editing.
 */
export default function ItemForm({ initial = {}, cover, submitLabel, onSubmit, busy }) {
  const [color, setColor] = useState(initial.vinyl_color ?? '#1a1a1a')
  const [colorName, setColorName] = useState(initial.vinyl_color_name ?? 'Schwarz')
  const [pattern, setPattern] = useState(initial.vinyl_pattern ?? 'solid')
  const [comment, setComment] = useState(initial.comment ?? '')
  const [signed, setSigned] = useState(initial.signed ?? false)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(initial.photo_url ?? null)
  const [removePhoto, setRemovePhoto] = useState(false)

  const pickPreset = (c) => {
    setColor(c.hex)
    setColorName(c.name)
  }

  return (
    <form
      className="item-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          vinyl_color: color,
          vinyl_color_name: colorName.trim() || 'Individuell',
          vinyl_pattern: pattern,
          comment: comment.trim() || null,
          signed,
          photoFile: photo,
          removePhoto,
        })
      }}
    >
      <label className="field-label">Farbe der Platte</label>
      <div className="color-grid">
        {VINYL_COLORS.map((c) => (
          <button
            type="button"
            key={c.name}
            className={'color-swatch' + (color === c.hex && colorName === c.name ? ' on' : '')}
            onClick={() => pickPreset(c)}
          >
            <VinylDot color={c.hex} size={30} />
            <small>{c.name}</small>
          </button>
        ))}
        <label className={'color-swatch' + (!VINYL_COLORS.some((c) => c.hex === color) ? ' on' : '')}>
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value)
              if (VINYL_COLORS.some((c) => c.name === colorName)) setColorName('Individuell')
            }}
          />
          <small>Eigene</small>
        </label>
      </div>
      <input className="text-input" value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder="Name der Farbe, z. B. Ocean Blue" />

      <label className="field-label">Muster</label>
      <div className="chips">
        {VINYL_PATTERNS.map((p) => (
          <button type="button" key={p.id} className={'chip' + (pattern === p.id ? ' on' : '')} onClick={() => setPattern(p.id)}>
            <VinylDot color={color} pattern={p.id} cover={cover} size={16} /> {p.name}
          </button>
        ))}
      </div>

      <label className="field-label">Foto (optional)</label>
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
              Foto entfernen
            </button>
          </div>
        ) : (
          <label className="btn ghost block">
            <CameraIcon width={18} height={18} /> Foto aufnehmen oder wählen
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

      <label className="field-label">Kommentar (optional)</label>
      <textarea className="text-input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="z. B. Gekauft im Plattenladen in Köln" />

      <label className="check">
        <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
        Signierte Ausgabe
      </label>

      <button className="btn primary block" disabled={busy}>
        {busy ? 'Speichern …' : submitLabel}
      </button>
    </form>
  )
}
