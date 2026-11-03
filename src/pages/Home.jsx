import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData, SHELF_SLOTS } from '../lib/store.jsx'
import { supabase, uploadPhoto, deletePhoto } from '../lib/supabase.js'
import { textOn, tint } from '../lib/color.js'
import { money } from '../lib/format.js'
import Sheet from '../components/Sheet.jsx'
import ItemPicker from '../components/ItemPicker.jsx'
import Marquee from '../components/Marquee.jsx'
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

function Settings({ open, onClose, onEdit }) {
  const { profile, items, refreshAllPrices, progress } = useData()
  const total = items.reduce((s, i) => s + (Number(i.value_eur) || 0), 0)

  return (
    <Sheet open={open} onClose={onClose} title="Einstellungen">
      <div className="settings-stats">
        <div><strong>{items.length}</strong><small>Platten</small></div>
        <div><strong>{money(total)}</strong><small>Gesamtwert</small></div>
      </div>
      <button className="btn ghost block" onClick={() => onEdit('name')}>Name ändern ({profile.name})</button>
      <button className="btn ghost block" onClick={() => onEdit('handle')}>Untertitel ändern ({profile.handle})</button>
      <button className="btn ghost block" disabled={!!progress} onClick={refreshAllPrices}>
        {progress ? `Preise aktualisieren: ${progress.done + 1} / ${progress.total}` : 'Alle Preise aktualisieren'}
      </button>
      <button className="btn danger block" onClick={() => supabase.auth.signOut()}>Abmelden</button>
    </Sheet>
  )
}

export default function Home() {
  const { profile, items, updateProfile } = useData()
  const [edit, setEdit] = useState(null)
  const [picker, setPicker] = useState(null) // 'fav' | slot index
  const [settings, setSettings] = useState(false)
  const [busy, setBusy] = useState(null)

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const fav = profile.fav_album_id ? byId.get(profile.fav_album_id) : null
  const shelf = Array.from({ length: SHELF_SLOTS }, (_, i) => byId.get(profile.shelf?.[i]) ?? null)
  const shelfBg = tint(fav?.spine_color ?? '#e8a0a0', 0.75)

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
  }

  return (
    <div className="page home">
      <ImageButton className="banner" label="Titelbild ändern" onFile={(f) => uploadTo('banner_url', f, 1600)}>
        {profile.banner_url ? <img src={profile.banner_url} alt="" /> : <span className="banner-empty">Titelbild wählen</span>}
        {busy === 'banner_url' && <span className="uploading">Lädt …</span>}
      </ImageButton>

      <section className="profile-card">
        <button className="icon-btn settings-btn" onClick={() => setSettings(true)} aria-label="Einstellungen">
          <GearIcon />
        </button>
        <ImageButton className="avatar" label="Profilbild ändern" onFile={(f) => uploadTo('avatar_url', f, 600)}>
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <PersonIcon width={48} height={48} />}
          {busy === 'avatar_url' && <span className="uploading">…</span>}
        </ImageButton>
        <button className="profile-name" onClick={() => openEdit('name')}>{profile.name}</button>
        <button className="profile-handle" onClick={() => openEdit('handle')}>{profile.handle}</button>
      </section>

      <section className="favorites">
        <button onClick={() => openEdit('artist')}>
          <PersonIcon className="fav-icon" />
          <Marquee text={profile.fav_artist || 'Künstler:in'} />
        </button>
        <button onClick={() => setPicker('fav')}>
          <DiscIcon className="fav-icon" />
          <Marquee text={fav?.title || 'Album'} />
        </button>
        <button onClick={() => openEdit('song')}>
          <NoteIcon className="fav-icon" />
          <Marquee text={profile.fav_song || 'Song'} />
        </button>
      </section>

      <h2 className="section-title">
        <Link to="/sammlung">Meine Sammlung</Link>
      </h2>

      <section className="shelf" style={{ background: shelfBg }}>
        <button className="shelf-front" onClick={() => setPicker('fav')} aria-label="Lieblingsalbum">
          {fav?.cover_url ? <img src={fav.cover_url} alt={fav.title} /> : <span>Lieblingsalbum wählen</span>}
        </button>
        <div className="shelf-spines">
          {shelf.map((it, i) => (
            <button
              key={i}
              className={'spine' + (it ? '' : ' empty')}
              style={it ? { background: it.spine_color ?? '#888', color: textOn(it.spine_color ?? '#888') } : undefined}
              onClick={() => setPicker(i)}
              aria-label={it ? `${it.title} – ${it.artist}` : 'Leerer Platz'}
            >
              {it && (
                <span className="spine-text">
                  <Marquee vertical speed={22} text={`${it.title} – ${it.artist}`} />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

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
