import { useState } from 'react'
import {
  VINYL_COLORS,
  VINYL_PATTERNS,
  SIZES,
  SHAPES,
  isOwnShape,
  CONDITIONS,
  MAX_DISCS,
  MAX_DISC_COLORS,
  colorsName,
  discsOf,
  patternList,
} from '../lib/format.js'
import { VinylDot } from './VinylDot.jsx'
import { CameraIcon } from './Icons.jsx'

/**
 * Several patterns can be combined (e.g. Translucent + Splatter). "Einfarbig" and
 * "Picture Disc" stand alone; removing the last pattern goes back to "Einfarbig".
 */
function togglePattern(value, id) {
  const cur = patternList(value)
  if (id === 'solid' || id === 'picture') return id
  const next = cur.includes(id) ? cur.filter((p) => p !== id) : [...cur.filter((p) => p !== 'solid' && p !== 'picture'), id]
  return next.length ? patternList(next.join(',')).join(',') : 'solid'
}

const SIGNED_ITEMS = ['Art-Card', 'Vinyl Sized', 'Poster', 'Cover']

/** Photo picker with preview and a remove link. */
function PhotoField({ preview, label, removeLabel, onFile, onRemove, small = false }) {
  return (
    <div className={'photo-field' + (small ? ' small-photo' : '')}>
      {preview ? (
        <div className="photo-preview">
          <img src={preview} alt="" />
          <button type="button" className="link-btn" onClick={onRemove}>{removeLabel}</button>
        </div>
      ) : (
        <label className="btn ghost block">
          <CameraIcon width={18} height={18} /> {label}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
              e.target.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}

/** Colours (up to three), name and pattern of one record. */
function DiscEditor({ disc, onChange, cover }) {
  // Which colour slot the palette below fills: 0 = base colour, 1/2 = extra colours.
  const [slot, setSlot] = useState(0)
  const [ownShape, setOwnShape] = useState(isOwnShape(disc.shape))
  const setColors = (colors) => onChange({ ...disc, colors, name: colorsName(colors) })
  const setSlotColor = (hex) => {
    const next = [...disc.colors]
    next[Math.min(slot, next.length)] = hex
    setColors(next)
  }
  const removeSlot = (i) => {
    setColors(disc.colors.filter((_, j) => j !== i))
    setSlot(0)
  }
  const current = disc.colors[slot]
  const adding = slot >= disc.colors.length

  return (
    <>
      <div className="color-slots">
        {disc.colors.map((c, i) => (
          <span key={i} className={'color-slot' + (slot === i ? ' on' : '')}>
            <button type="button" onClick={() => setSlot(i)}>
              <VinylDot color={c} size={20} />
              {i === 0 ? 'Grundfarbe' : `Farbe ${i + 1}`}
            </button>
            {i > 0 && (
              <button type="button" className="color-slot-x" onClick={() => removeSlot(i)} aria-label="Farbe entfernen">
                ×
              </button>
            )}
          </span>
        ))}
        {adding && <span className="color-slot on pending">Farbe {disc.colors.length + 1} wählen …</span>}
        {!adding && disc.colors.length < MAX_DISC_COLORS && (
          <button type="button" className="color-slot add" onClick={() => setSlot(disc.colors.length)}>
            + Farbe
          </button>
        )}
      </div>
      <p className="muted small hint">
        Für Splatter, halb/halb usw. weitere Farben hinzufügen. Die Grundfarbe ist die Platte selbst, Farbe 2 und 3 z. B. die Spritzer.
      </p>
      <div className="color-grid">
        {VINYL_COLORS.map((c) => (
          <button type="button" key={c.name} className={'color-swatch' + (current === c.hex ? ' on' : '')} onClick={() => setSlotColor(c.hex)}>
            <VinylDot color={c.hex} size={30} />
            <small>{c.name}</small>
          </button>
        ))}
        <label className={'color-swatch' + (current && !VINYL_COLORS.some((p) => p.hex === current) ? ' on' : '')}>
          <input type="color" value={current && !VINYL_COLORS.some((p) => p.hex === current) ? current : '#888888'} onChange={(e) => setSlotColor(e.target.value)} />
          <small>Eigene</small>
        </label>
      </div>
      <input
        className="text-input"
        value={disc.name}
        onChange={(e) => onChange({ ...disc, name: e.target.value })}
        placeholder="Name der Farbe, z. B. Ocean Blue"
      />

      <label className="field-label">Muster <span className="field-hint">mehrere möglich</span></label>
      <div className="chips">
        {VINYL_PATTERNS.map((p) => (
          <button type="button" key={p.id} className={'chip' + (patternList(disc.pattern).includes(p.id) ? ' on' : '')} onClick={() => onChange({ ...disc, pattern: togglePattern(disc.pattern, p.id) })}>
            <VinylDot color={disc.colors} pattern={p.id} cover={cover} size={16} /> {p.name}
          </button>
        ))}
      </div>

      <label className="field-label">Form</label>
      <div className="chips">
        <button type="button" className={'chip' + (!disc.shape && !ownShape ? ' on' : '')} onClick={() => { setOwnShape(false); onChange({ ...disc, shape: null }) }}>
          <VinylDot color={disc.colors} pattern={disc.pattern} cover={cover} size={18} /> Rund
        </button>
        {SHAPES.map((sh) => (
          <button
            type="button"
            key={sh.id}
            className={'chip' + (!ownShape && disc.shape === sh.id ? ' on' : '')}
            onClick={() => { setOwnShape(false); onChange({ ...disc, shape: sh.id }) }}
          >
            <VinylDot color={disc.colors} pattern={disc.pattern} cover={cover} size={18} shape={sh.id} /> {sh.name}
          </button>
        ))}
        <button type="button" className={'chip' + (ownShape ? ' on' : '')} onClick={() => { setOwnShape(true); onChange({ ...disc, shape: isOwnShape(disc.shape) ? disc.shape : '' }) }}>
          Eigenes
        </button>
      </div>
      {!ownShape && disc.shape === 'moth' && (
        <p className="muted small hint">Die Motte sieht immer aus wie das Original, die Farbe oben wird dafür nicht verwendet.</p>
      )}
      {ownShape && (
        <input
          className="text-input own-shape"
          value={disc.shape ?? ''}
          onChange={(e) => onChange({ ...disc, shape: e.target.value })}
          placeholder="z.B. Blume oder Herzchen"
        />
      )}
    </>
  )
}

/**
 * Form for the details Discogs does not know: size, number of records, colours and
 * pattern per record, shape, condition, own photo, comment and "signed".
 * Used for adding and editing. `defaults` = { size, count } guessed from Discogs.
 */
export default function ItemForm({ initial = {}, defaults = {}, cover, submitLabel, onSubmit, busy }) {
  const [size, setSize] = useState(initial.size ?? defaults.size ?? null)
  const [count, setCount] = useState(initial.disc_count ?? defaults.count ?? discsOf(initial).length)
  const [discs, setDiscs] = useState(() => {
    const d = discsOf(initial)
    const n = initial.disc_count ?? defaults.count ?? d.length
    return Array.from({ length: Math.max(n, d.length) }, (_, i) => d[i] ?? d[d.length - 1])
  })
  const [active, setActive] = useState(0)
  const [condition, setCondition] = useState(initial.condition ?? null)
  const [comment, setComment] = useState(initial.comment ?? '')
  const [signed, setSigned] = useState(initial.signed ?? false)
  const [signedItems, setSignedItems] = useState(initial.signed_items ?? [])
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(initial.photo_url ?? null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [signature, setSignature] = useState(null) // new photo of the signature
  const [signaturePreview, setSignaturePreview] = useState(initial.signature_url ?? null)

  const changeCount = (n) => {
    setCount(n)
    // new records start as a copy of the last one
    setDiscs((prev) => Array.from({ length: Math.max(n, prev.length) }, (_, i) => prev[i] ?? prev[prev.length - 1]))
    if (active >= n) setActive(n - 1)
  }
  const updateDisc = (i, d) => setDiscs((prev) => prev.map((x, j) => (j === i ? d : x)))
  const sameAsFirst = (i) => JSON.stringify(discs[i]) === JSON.stringify(discs[0])

  return (
    <form
      className="item-form"
      onSubmit={(e) => {
        e.preventDefault()
        const used = discs.slice(0, count).map((d) => ({ ...d, name: d.name.trim() || colorsName(d.colors), shape: d.shape?.trim() || null }))
        onSubmit({
          size,
          disc_count: count,
          discs: used,
          // first record also in the old single-colour fields (filters, lists)
          vinyl_color: used[0].colors[0],
          vinyl_color_name: used[0].name,
          vinyl_pattern: used[0].pattern,
          // shape is per record now (in discs); the old field keeps the first shaped one
          shape: used.find((d) => d.shape)?.shape ?? null,
          condition,
          comment: comment.trim() || null,
          signed,
          // only sent when used, so saving keeps working before the column exists
          ...(signed || initial.signed_items?.length ? { signed_items: signed && signedItems.length ? signedItems : null } : {}),
          photoFile: photo,
          removePhoto,
          // the signature photo only counts while "signed" is ticked
          signatureFile: signed ? signature : null,
          removeSignature: !!initial.signature_url && (!signed || !signaturePreview),
        })
      }}
    >
      <label className="field-label">Größe</label>
      <div className="chips">
        {SIZES.map((s) => (
          <button type="button" key={s} className={'chip' + (size === s ? ' on' : '')} onClick={() => setSize(size === s ? null : s)}>
            {s.replace('"', ' Zoll')}
          </button>
        ))}
      </div>

      <label className="field-label">Anzahl Platten</label>
      <div className="chips">
        {Array.from({ length: MAX_DISCS }, (_, i) => i + 1).map((n) => (
          <button type="button" key={n} className={'chip' + (count === n ? ' on' : '')} onClick={() => changeCount(n)}>
            {n}×
          </button>
        ))}
      </div>

      <label className="field-label">{count > 1 ? 'Farbe und Form der Platten' : 'Farbe und Form der Platte'}</label>
      {count > 1 && (
        <>
          <div className="segmented disc-tabs">
            {Array.from({ length: count }, (_, i) => (
              <button type="button" key={i} className={active === i ? 'on' : ''} onClick={() => setActive(i)}>
                <VinylDot color={discs[i].colors} pattern={discs[i].pattern} cover={cover} size={16} shape={discs[i].shape} /> Platte {i + 1}
              </button>
            ))}
          </div>
          {active > 0 && !sameAsFirst(active) && (
            <button type="button" className="link-btn small-link" onClick={() => updateDisc(active, discs[0])}>
              Wie Platte 1 übernehmen
            </button>
          )}
        </>
      )}
      <DiscEditor key={active} disc={discs[active]} onChange={(d) => updateDisc(active, d)} cover={cover} />

      <label className="field-label">Zustand</label>
      <div className="chips">
        {CONDITIONS.map((c) => (
          <button
            type="button"
            key={c.id}
            className={'chip' + (condition === c.id ? ' on' : '')}
            onClick={() => setCondition(condition === c.id ? null : c.id)}
            title={c.name}
          >
            <strong>{c.id}</strong> <span className="chip-sub">{c.name}</span>
          </button>
        ))}
      </div>

      <label className="field-label">Foto (optional)</label>
      <PhotoField
        preview={removePhoto ? null : preview}
        label="Foto aufnehmen oder wählen"
        removeLabel="Foto entfernen"
        onFile={(f) => { setPhoto(f); setPreview(URL.createObjectURL(f)); setRemovePhoto(false) }}
        onRemove={() => { setPhoto(null); setPreview(null); setRemovePhoto(true) }}
      />

      <label className="field-label">Kommentar (optional)</label>
      <textarea className="text-input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="z. B. Gekauft im Plattenladen in Köln" />

      <label className="check">
        <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
        Signierte Ausgabe
      </label>
      {signed && (
        <>
          <label className="field-label">Was ist signiert?</label>
          <div className="chips">
            {SIGNED_ITEMS.map((t) => (
              <button
                type="button"
                key={t}
                className={'chip' + (signedItems.includes(t) ? ' on' : '')}
                onClick={() => setSignedItems((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="field-label">Foto der Signatur (optional)</label>
          <PhotoField
            small
            preview={signaturePreview}
            label="Signatur fotografieren oder wählen"
            removeLabel="Signatur-Foto entfernen"
            onFile={(f) => { setSignature(f); setSignaturePreview(URL.createObjectURL(f)) }}
            onRemove={() => { setSignature(null); setSignaturePreview(null) }}
          />
        </>
      )}

      <button className="btn primary block" disabled={busy}>
        {busy ? 'Speichern …' : submitLabel}
      </button>
    </form>
  )
}
