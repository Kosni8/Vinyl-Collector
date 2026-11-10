import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData, SHELF_SLOTS } from '../lib/store.jsx'
import { supabase, uploadPhoto, deletePhoto } from '../lib/supabase.js'
import { textOn, tint } from '../lib/color.js'
import { useWantlist } from '../lib/wantlist.js'
import Sheet from '../components/Sheet.jsx'
import ItemPicker from '../components/ItemPicker.jsx'
import Marquee from '../components/Marquee.jsx'
import ImageCropper from '../components/ImageCropper.jsx'
import SpineColorSheet from '../components/SpineColorSheet.jsx'
import { VinylDisc, VinylDot } from '../components/VinylDot.jsx'
import { discsOf } from '../lib/format.js'
import { GearIcon, PersonIcon, DiscIcon, NoteIcon } from '../components/Icons.jsx'

function TextSheet({ edit, onClose, onSave }) {
  const [value, setValue] = useState(edit?.value ?? '')
  return (
    <Sheet open={!!edit} onClose={onClose} title={edit?.title}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(value.trim())
        }}
      >
        <input className="text-input" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={edit?.placeholder} />
        <button className="btn primary block">Speichern</button>
      </form>
    </Sheet>
  )
}

function ImageButton({ className, onFile, children, label }) {
  const input = useRef(null)
  return (
    <button type="button" className={className} onClick={() => input.current.click()} aria-label={label}>
      {children}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onFile(f)
        }}
      />
    </button>
  )
}

// Records of an album that look different (colour, name or pattern); empty when all look the same.
function distinctDiscs(item) {
  if (!item) return []
  const discs = discsOf(item)
  const same = discs.every((d) => JSON.stringify(d) === JSON.stringify(discs[0]))
  return same ? [] : discs
}

/** Choose which record of the favourite album is shown on the shelf. */
function DiscChoice({ item, value, onChange }) {
  return (
    <div className="chips">
      {distinctDiscs(item).map((d, i) => (
        <button type="button" key={i} className={'chip' + ((value ?? 0) === i ? ' on' : '')} onClick={() => onChange(i)}>
          <VinylDot color={d.colors} pattern={d.pattern} cover={item.thumb_url} size={20} /> Platte {i + 1}
          {d.name ? <span className="chip-sub">{d.name}</span> : null}
        </button>
      ))}
    </div>
  )
}

/**
 * Turn the record with a finger, like on a turntable: it follows the finger around
 * its centre and keeps spinning a little when let go. A plain tap still counts as a tap.
 */
function useSpin() {
  const st = useRef({ angle: 0, v: 0, raf: 0, drag: null, moved: false })
  const apply = (el) => {
    const art = el?.querySelector('.vinyl-art')
    if (art) art.style.transform = `rotate(${st.current.angle}deg)`
  }
  const angleAt = (el, e) => {
    const r = el.getBoundingClientRect()
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI
  }
  useEffect(() => () => cancelAnimationFrame(st.current.raf), [])
  return {
    onPointerDown(e) {
      const s = st.current
      cancelAnimationFrame(s.raf)
      e.currentTarget.setPointerCapture?.(e.pointerId)
      s.drag = { a: angleAt(e.currentTarget, e), t: e.timeStamp, x: e.clientX, y: e.clientY }
      s.moved = false
      s.v = 0
    },
    onPointerMove(e) {
      const s = st.current
      if (!s.drag) return
      if (!s.moved && Math.hypot(e.clientX - s.drag.x, e.clientY - s.drag.y) < 6) return
      s.moved = true
      const a = angleAt(e.currentTarget, e)
      let d = a - s.drag.a
      if (d > 180) d -= 360
      if (d < -180) d += 360
      const dt = Math.max(1, e.timeStamp - s.drag.t)
      s.v = 0.6 * s.v + 0.4 * (d / dt) // degrees per ms, smoothed
      s.angle += d
      s.drag.a = a
      s.drag.t = e.timeStamp
      apply(e.currentTarget)
    },
    onPointerUp(e) {
      const s = st.current
      const el = e.currentTarget
      if (!s.drag) return
      s.drag = null
      if (!s.moved) return
      let last = performance.now()
      const step = (now) => {
        const dt = now - last
        last = now
        s.angle += s.v * dt
        s.v *= Math.pow(0.985, dt / 16) // slows down like a turntable left alone
        apply(el)
        if (Math.abs(s.v) > 0.005) s.raf = requestAnimationFrame(step)
      }
      if (Math.abs(s.v) > 0.02) s.raf = requestAnimationFrame(step)
    },
    // true right after a turn, so the following click does not open the picker
    wasTurned: () => st.current.moved,
  }
}

const ICON_COLORS = [
  { name: 'Rot', hex: '#d9565f' },
  { name: 'Rosa', hex: '#e88aa6' },
  { name: 'Orange', hex: '#e67e22' },
  { name: 'Gold', hex: '#c9a227' },
  { name: 'Grün', hex: '#2e8b57' },
  { name: 'Blau', hex: '#2e6fd8' },
  { name: 'Lila', hex: '#8e44ad' },
  { name: 'Schwarz', hex: '#1a1a1a' },
]
const DEFAULT_ICON = ICON_COLORS[0].hex

const DEFAULT_BG = '#fff8ef'
const HOME_BGS = [
  { name: 'Creme', hex: DEFAULT_BG },
  { name: 'Sand', hex: '#f3e6d3' },
  { name: 'Rosé', hex: '#fbe4e1' },
  { name: 'Salbei', hex: '#e4ecdf' },
  { name: 'Himmel', hex: '#e2ebf5' },
  { name: 'Lavendel', hex: '#ebe5f4' },
  { name: 'Grau', hex: '#e9e7e4' },
  { name: 'Nacht', hex: '#24211e' },
]

function Settings({ open, onClose, onEdit }) {
  const { profile, items, updateProfile, refreshAllPrices, progress } = useData()
  const bg = profile.home_bg || DEFAULT_BG
  const icon = profile.fav_icon_color || DEFAULT_ICON
  const fav = items.find((i) => i.id === profile.fav_album_id)
  const save = (patch) =>
    updateProfile(patch).catch((e) =>
      alert('Speichern fehlgeschlagen: ' + e.message + '\n\nFalls eine Spalte fehlt: Das SQL-Update in Supabase muss noch ausgeführt werden.'),
    )

  return (
    <Sheet open={open} onClose={onClose} title="Einstellungen">
      <button className="btn ghost block" onClick={() => onEdit('name')}>Name ändern</button>
      <button className="btn ghost block" onClick={() => onEdit('handle')}>Untertitel ändern</button>

      <label className="field-label">Hintergrundfarbe der Startseite</label>
      <div className="bg-swatches">
        {HOME_BGS.map((c) => (
          <button
            key={c.hex}
            className={'bg-swatch' + (bg.toLowerCase() === c.hex ? ' on' : '')}
            onClick={() => save({ home_bg: c.hex === DEFAULT_BG ? null : c.hex })}
          >
            <span style={{ background: c.hex }} />
            <small>{c.name}</small>
          </button>
        ))}
        <label className={'bg-swatch' + (!HOME_BGS.some((c) => c.hex === bg.toLowerCase()) ? ' on' : '')}>
          <input type="color" value={bg} onChange={(e) => save({ home_bg: e.target.value })} />
          <small>Eigene</small>
        </label>
      </div>

      <label className="field-label">Lieblingsalbum im Regal zeigen als</label>
      <div className="segmented">
        {[
          ['cover', 'Cover'],
          ['vinyl', 'Platte'],
        ].map(([id, name]) => (
          <button key={id} className={(profile.fav_display || 'vinyl') === id ? 'on' : ''} onClick={() => save({ fav_display: id })}>
            {name}
          </button>
        ))}
      </div>

      {fav && profile.fav_display !== 'cover' && distinctDiscs(fav).length > 0 && (
        <>
          <label className="field-label">Welche Platte vom Lieblingsalbum zeigen?</label>
          <DiscChoice item={fav} value={profile.fav_disc} onChange={(i) => save({ fav_disc: i })} />
        </>
      )}

      <label className="field-label">Farbe der Favoriten-Symbole</label>
      <div className="bg-swatches">
        {ICON_COLORS.map((c) => (
          <button
            key={c.hex}
            className={'bg-swatch' + (icon.toLowerCase() === c.hex ? ' on' : '')}
            onClick={() => save({ fav_icon_color: c.hex === DEFAULT_ICON ? null : c.hex })}
          >
            <span style={{ background: c.hex }} />
            <small>{c.name}</small>
          </button>
        ))}
        <label className={'bg-swatch' + (!ICON_COLORS.some((c) => c.hex === icon.toLowerCase()) ? ' on' : '')}>
          <input type="color" value={icon} onChange={(e) => save({ fav_icon_color: e.target.value })} />
          <small>Eigene</small>
        </label>
      </div>

      <button className="btn ghost block settings-gap" disabled={!!progress} onClick={refreshAllPrices}>
        {progress ? `Preise aktualisieren: ${progress.done + 1} / ${progress.total}` : 'Alle Preise aktualisieren'}
      </button>
      <button className="btn danger block" onClick={() => supabase.auth.signOut()}>Abmelden</button>
    </Sheet>
  )
}

/** The Discogs wantlist as a row of covers. */
function Wantlist() {
  const { wants, error } = useWantlist({ refresh: true })

  return (
    <section className="wantlist">
      <h2 className="section-title">Wantlist{wants?.length ? <span className="count">{wants.length}</span> : null}</h2>
      {error && <p className="muted small pad">Wantlist nicht ladbar: {error}</p>}
      {!error && !wants && <p className="muted small pad">Lädt …</p>}
      {wants && !wants.length && <p className="muted small pad">Wantlist ist leer.</p>}
      {wants?.length > 0 && (
        <div className="want-row">
          {wants.map((w) => (
            <Link key={w.discogs_release_id} to={`/release/${w.discogs_release_id}`} className="want">
              {w.cover_url || w.thumb_url ? <img src={w.cover_url || w.thumb_url} alt="" loading="lazy" /> : <span className="want-empty" />}
              <strong>{w.title}</strong>
              <small>{w.artist}</small>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function Spine({ item, label, onClick }) {
  return (
    <button
      className={'spine' + (item ? '' : ' empty')}
      style={item ? { background: item.spine_color ?? '#888', color: textOn(item.spine_color ?? '#888') } : undefined}
      onClick={onClick}
      aria-label={item ? `${label ? label + ': ' : ''}${item.title} – ${item.artist}` : 'Leerer Platz'}
    >
      {item && (
        <span className="spine-text">
          <Marquee vertical speed={22} text={`${item.title} – ${item.artist}`} />
        </span>
      )}
    </button>
  )
}

export default function Home() {
  const { profile, items, updateProfile, updateItem } = useData()
  const [edit, setEdit] = useState(null)
  const [picker, setPicker] = useState(null) // 'fav' | slot index
  const [settings, setSettings] = useState(false)
  const [busy, setBusy] = useState(null)
  const [crop, setCrop] = useState(null) // { field, file }
  const [colorFor, setColorFor] = useState(null) // record whose shelf colour is being chosen
  const [discFor, setDiscFor] = useState(null) // new favourite album with several different records
  const spin = useSpin()

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const fav = profile.fav_album_id ? byId.get(profile.fav_album_id) : null
  const shelf = Array.from({ length: SHELF_SLOTS }, (_, i) => byId.get(profile.shelf?.[i]) ?? null)
  const shelfBg = tint(fav?.spine_color ?? '#e8a0a0', 0.75)
  const pageBg = profile.home_bg || DEFAULT_BG
  const showVinyl = profile.fav_display !== 'cover' // the record is the default
  const pageInk = textOn(pageBg)
  const dark = pageInk === '#ffffff'

  // Paint the whole screen (incl. overscroll areas) in the chosen colour while Home is shown.
  useEffect(() => {
    const els = [document.documentElement, document.body]
    els.forEach((el) => (el.style.background = pageBg))
    return () => els.forEach((el) => (el.style.background = ''))
  }, [pageBg])

  const edits = {
    name: { field: 'name', title: 'Name', placeholder: 'z. B. Nikos & Anni' },
    handle: { field: 'handle', title: 'Untertitel', placeholder: 'z. B. @vinylliebe' },
    artist: { field: 'fav_artist', title: 'Lieblingskünstler:in', placeholder: 'z. B. Taylor Swift' },
    song: { field: 'fav_song', title: 'Lieblingssong', placeholder: 'z. B. Best' },
  }
  const openEdit = (key) => {
    setSettings(false)
    const e = edits[key]
    setEdit({ ...e, value: profile[e.field] ?? '' })
  }

  const uploadTo = async (field, file, maxSize) => {
    setBusy(field)
    try {
      const old = profile[field]
      const url = await uploadPhoto(file, field === 'banner_url' ? 'banner' : 'avatar', maxSize)
      await updateProfile({ [field]: url })
      deletePhoto(old)
    } catch (e) {
      alert('Upload fehlgeschlagen: ' + e.message)
    } finally {
      setBusy(null)
    }
  }

  const onPick = async (item) => {
    if (picker === 'fav') {
      // fav_disc only sent when the column exists (SQL update done)
      await updateProfile({ fav_album_id: item?.id ?? null, ...(profile.fav_disc != null ? { fav_disc: null } : {}) })
    } else {
      const next = Array.from({ length: SHELF_SLOTS }, (_, i) => profile.shelf?.[i] ?? null)
      next[picker] = item?.id ?? null
      await updateProfile({ shelf: next })
    }
    const wasFav = picker === 'fav'
    setPicker(null)
    if (item && wasFav && showVinyl && distinctDiscs(item).length > 0) setDiscFor(item) // first: which record
    else if (item) setColorFor(item) // second step: choose the colour from the cover
  }

  return (
    <div
      className={'page home' + (dark ? ' dark' : '')}
      style={{ '--home-bg': pageBg, '--home-ink': pageInk }}
    >
      <ImageButton className="banner" label="Titelbild ändern" onFile={(f) => setCrop({ field: 'banner_url', file: f })}>
        {profile.banner_url ? <img src={profile.banner_url} alt="" /> : <span className="banner-empty">Titelbild wählen</span>}
        {busy === 'banner_url' && <span className="uploading">Lädt …</span>}
      </ImageButton>

      <section className="profile-card">
        <button className="icon-btn settings-btn" onClick={() => setSettings(true)} aria-label="Einstellungen">
          <GearIcon />
        </button>
        <ImageButton className="avatar" label="Profilbild ändern" onFile={(f) => setCrop({ field: 'avatar_url', file: f })}>
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <PersonIcon width={48} height={48} />}
          {busy === 'avatar_url' && <span className="uploading">…</span>}
        </ImageButton>
        <button className="profile-name" onClick={() => openEdit('name')}>{profile.name}</button>
        <button className="profile-handle" onClick={() => openEdit('handle')}>{profile.handle}</button>
      </section>

      <section className="favorites" style={profile.fav_icon_color ? { '--fav-icon': profile.fav_icon_color } : undefined}>
        <button onClick={() => openEdit('artist')}>
          <PersonIcon className="fav-icon" />
          <Marquee speed={16} text={profile.fav_artist || 'Künstler:in'} />
        </button>
        <button onClick={() => setPicker('fav')}>
          <DiscIcon className="fav-icon" />
          <Marquee speed={16} text={fav?.title || 'Album'} />
        </button>
        <button onClick={() => openEdit('song')}>
          <NoteIcon className="fav-icon" />
          <Marquee speed={16} text={profile.fav_song || 'Song'} />
        </button>
      </section>

      <h2 className="section-title">
        <Link to="/sammlung">Meine Sammlung <span className="chevron">›</span></Link>
      </h2>

      <section className="shelf" style={{ background: shelfBg }}>
        <button
          className={'shelf-front' + (fav && showVinyl ? ' as-vinyl' : '')}
          onClick={() => !(fav && showVinyl && spin.wasTurned()) && setPicker('fav')}
          aria-label="Lieblingsalbum"
          {...(fav && showVinyl ? { onPointerDown: spin.onPointerDown, onPointerMove: spin.onPointerMove, onPointerUp: spin.onPointerUp, onPointerCancel: spin.onPointerUp } : {})}
        >
          {fav && showVinyl ? (
            <VinylDisc item={fav} disc={profile.fav_disc ?? 0} />
          ) : fav?.cover_url ? (
            <img src={fav.cover_url} alt={fav.title} />
          ) : (
            <span>Lieblingsalbum wählen</span>
          )}
        </button>
        <div className="shelf-spines">
          {fav && (
            <Spine item={fav} label="Lieblingsalbum" onClick={() => setPicker('fav')} />
          )}
          {shelf.map((it, i) => (
            <Spine key={i} item={it} onClick={() => setPicker(i)} />
          ))}
        </div>
      </section>

      <Wantlist />

      {crop && (
        <ImageCropper
          file={crop.file}
          aspect={crop.field === 'banner_url' ? 2.5 : 1}
          round={crop.field === 'avatar_url'}
          maxSize={crop.field === 'banner_url' ? 1600 : 600}
          title={crop.field === 'banner_url' ? 'Titelbild' : 'Profilbild'}
          onCancel={() => setCrop(null)}
          onDone={(blob) => {
            const { field } = crop
            setCrop(null)
            uploadTo(field, blob, field === 'banner_url' ? 1600 : 600)
          }}
        />
      )}

      <Sheet open={!!discFor} onClose={() => { setColorFor(discFor); setDiscFor(null) }} title="Welche Platte zeigen?">
        <p className="muted small">Das Album hat mehrere Platten. Welche soll im Regal liegen?</p>
        {discFor && (
          <DiscChoice
            item={discFor}
            value={null}
            onChange={async (i) => {
              try {
                await updateProfile({ fav_disc: i })
              } catch (e) {
                alert('Speichern fehlgeschlagen: ' + e.message + '\n\nFalls eine Spalte fehlt: Das SQL-Update in Supabase muss noch ausgeführt werden.')
              }
              setColorFor(discFor)
              setDiscFor(null)
            }}
          />
        )}
      </Sheet>

      <SpineColorSheet
        item={colorFor}
        onClose={() => setColorFor(null)}
        onSave={async (color) => {
          try {
            if (color !== colorFor.spine_color) await updateItem(colorFor.id, { spine_color: color })
            setColorFor(null)
          } catch (e) {
            alert('Speichern fehlgeschlagen: ' + e.message)
          }
        }}
      />

      <TextSheet
        key={edit?.field}
        edit={edit}
        onClose={() => setEdit(null)}
        onSave={async (v) => {
          const required = edit.field === 'name' || edit.field === 'handle'
          if (!(required && !v)) await updateProfile({ [edit.field]: v || null })
          setEdit(null)
        }}
      />
      <ItemPicker
        open={picker !== null}
        title={picker === 'fav' ? 'Lieblingsalbum wählen' : 'Platte fürs Regal wählen'}
        allowClear={picker !== null}
        onClose={() => setPicker(null)}
        onPick={onPick}
      />
      <Settings open={settings} onClose={() => setSettings(false)} onEdit={openEdit} />
    </div>
  )
}
