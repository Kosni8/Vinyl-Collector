import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData, SHELF_SLOTS } from '../lib/store.jsx'
import { supabase, uploadPhoto, deletePhoto } from '../lib/supabase.js'
import { textOn, tint } from '../lib/color.js'
import { getWantlist, fromWant } from '../lib/discogs.js'
import Sheet from '../components/Sheet.jsx'
import ItemPicker from '../components/ItemPicker.jsx'
import Marquee from '../components/Marquee.jsx'
import ImageCropper from '../components/ImageCropper.jsx'
import SpineColorSheet from '../components/SpineColorSheet.jsx'
import { VinylDisc } from '../components/VinylDot.jsx'
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
  const { profile, updateProfile, refreshAllPrices, progress } = useData()
  const bg = profile.home_bg || DEFAULT_BG
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
          <button key={id} className={(profile.fav_display || 'cover') === id ? 'on' : ''} onClick={() => save({ fav_display: id })}>
            {name}
          </button>
        ))}
      </div>

      <button className="btn ghost block" disabled={!!progress} onClick={refreshAllPrices}>
        {progress ? `Preise aktualisieren: ${progress.done + 1} / ${progress.total}` : 'Alle Preise aktualisieren'}
      </button>
      <button className="btn danger block" onClick={() => supabase.auth.signOut()}>Abmelden</button>
    </Sheet>
  )
}

/** The Discogs wantlist as a row of covers. */
let wantCache = null // keeps the last list while the app is open, so Home does not flicker

function Wantlist() {
  const [wants, setWants] = useState(wantCache)
  const [error, setError] = useState(null)
  useEffect(() => {
    getWantlist()
      .then((d) => setWants((wantCache = (d.wants ?? []).map(fromWant))))
      .catch((e) => !wantCache && setError(e.message))
  }, [])

  return (
    <section className="wantlist">
      <h2 className="section-title">Wantlist{wants?.length ? <span className="count">{wants.length}</span> : null}</h2>
      {error && <p className="muted small pad">Wantlist nicht ladbar: {error}</p>}
      {!error && !wants && <p className="muted small pad">Lädt …</p>}
      {wants && !wants.length && <p className="muted small pad">Deine Discogs-Wantlist ist leer.</p>}
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

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const fav = profile.fav_album_id ? byId.get(profile.fav_album_id) : null
  const shelf = Array.from({ length: SHELF_SLOTS }, (_, i) => byId.get(profile.shelf?.[i]) ?? null)
  const shelfBg = tint(fav?.spine_color ?? '#e8a0a0', 0.75)
  const pageBg = profile.home_bg || DEFAULT_BG
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
      await updateProfile({ fav_album_id: item?.id ?? null })
    } else {
      const next = Array.from({ length: SHELF_SLOTS }, (_, i) => profile.shelf?.[i] ?? null)
      next[picker] = item?.id ?? null
      await updateProfile({ shelf: next })
    }
    setPicker(null)
    if (item) setColorFor(item) // second step: choose the colour from the cover
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

      <section className="favorites">
        <button onClick={() => openEdit('artist')}>
          <PersonIcon className="fav-icon" />
          <span className="fav-text">{profile.fav_artist || 'Künstler:in'}</span>
        </button>
        <button onClick={() => setPicker('fav')}>
          <DiscIcon className="fav-icon" />
          <span className="fav-text">{fav?.title || 'Album'}</span>
        </button>
        <button onClick={() => openEdit('song')}>
          <NoteIcon className="fav-icon" />
          <span className="fav-text">{profile.fav_song || 'Song'}</span>
        </button>
      </section>

      <h2 className="section-title">
        <Link to="/sammlung">Meine Sammlung <span className="chevron">›</span></Link>
      </h2>

      <section className="shelf" style={{ background: shelfBg }}>
        <button
          className={'shelf-front' + (fav && profile.fav_display === 'vinyl' ? ' as-vinyl' : '')}
          onClick={() => setPicker('fav')}
          aria-label="Lieblingsalbum"
        >
          {fav && profile.fav_display === 'vinyl' ? (
            <VinylDisc item={fav} />
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
          aspect={crop.field === 'banner_url' ? 2 : 1}
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
