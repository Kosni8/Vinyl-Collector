import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData, SHELF_SLOTS, PRICE_FIELDS } from '../lib/store.jsx'
import { getRelease, fromRelease, addToDiscogsCollection } from '../lib/discogs.js'
import { uploadPhoto } from '../lib/supabase.js'
import { coverColor } from '../lib/color.js'
import RecordDetails from '../components/RecordDetails.jsx'
import Sheet from '../components/Sheet.jsx'
import ItemForm from '../components/ItemForm.jsx'
import { vinylFormatDefaults } from '../lib/format.js'
import { useWantlist, isWanted, want, unwant } from '../lib/wantlist.js'
import { clearSearch } from './Search.jsx'

const cache = new Map()

export default function ReleaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { items, profile, addItem, updateProfile } = useData()
  const [data, setData] = useState(cache.get(id) ?? null)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const { wants } = useWantlist()
  const [wantBusy, setWantBusy] = useState(false)

  useEffect(() => {
    if (cache.has(id)) return
    getRelease(id)
      .then((d) => {
        cache.set(id, d)
        setData(d)
      })
      .catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="page"><p className="error center">{error}</p></div>
  if (!data) return <div className="page"><p className="muted center">Lädt …</p></div>

  const record = fromRelease(data.release)
  const owned = items.filter((i) => i.discogs_release_id === record.discogs_release_id)
  const wanted = isWanted(wants, record.discogs_release_id)

  const toggleWant = async () => {
    setWantBusy(true)
    try {
      if (wanted) await unwant(record.discogs_release_id)
      else await want(record)
    } catch (e) {
      alert('Wantlist: ' + e.message)
    } finally {
      setWantBusy(false)
    }
  }

  const save = async (form) => {
    setBusy(true)
    try {
      const { photoFile, removePhoto, ...details } = form
      const [photo_url, spine_color, discogsCopy] = await Promise.all([
        photoFile ? uploadPhoto(photoFile, 'records') : null,
        coverColor(record.cover_url),
        addToDiscogsCollection(record.discogs_release_id).catch((e) => {
          console.warn('Discogs-Sammlung', e)
          return null
        }),
      ])
      const item = await addItem({
        ...record,
        ...details,
        photo_url,
        spine_color,
        discogs_instance_id: discogsCopy?.instance_id ?? null,
        ...PRICE_FIELDS(data.prices),
      })

      // Put new records on the home shelf while there is room.
      const shelf = Array.from({ length: SHELF_SLOTS }, (_, i) => profile.shelf?.[i] ?? null)
      const free = shelf.indexOf(null)
      const patch = {}
      if (free !== -1) {
        shelf[free] = item.id
        patch.shelf = shelf
      }
      if (!profile.fav_album_id) patch.fav_album_id = item.id
      if (Object.keys(patch).length) await updateProfile(patch)

      // Now owned: take it off the wantlist and start the next search from scratch.
      // always try: the list shown may be outdated, and Discogs answers 404 if it was not wanted
      await unwant(record.discogs_release_id).catch((e) => console.warn('Wantlist', e))
      clearSearch()

      if (!discogsCopy) alert('Gespeichert. Hinweis: In deinem Discogs-Konto konnte die Platte nicht eingetragen werden.')
      navigate(`/sammlung/${item.id}`, { replace: true })
    } catch (e) {
      alert('Speichern fehlgeschlagen: ' + e.message)
      setBusy(false)
    }
  }

  return (
    <RecordDetails
      images={record.images.map((i) => i.uri)}
      record={record}
      prices={{ ...data.prices, updated_at: null }}
    >
      {owned.length > 0 && (
        <p className="owned-note">
          Schon {owned.length}× in deiner Sammlung ·{' '}
          <button className="link-btn" onClick={() => navigate(`/sammlung/${owned[0].id}`)}>ansehen</button>
        </p>
      )}
      <button className="btn primary block" onClick={() => setAdding(true)}>
        {owned.length ? 'Weiteres Exemplar hinzufügen' : 'Zur Sammlung hinzufügen'}
      </button>
      <button className="btn ghost block" disabled={wantBusy || !wants} onClick={toggleWant}>
        {wantBusy ? 'Wantlist …' : wanted ? '♥ Auf der Wantlist · entfernen' : '♡ Auf die Wantlist'}
      </button>
      <Sheet open={adding} onClose={() => !busy && setAdding(false)} title="Zur Sammlung hinzufügen" full>
        <ItemForm defaults={vinylFormatDefaults(data.release.formats)} cover={record.thumb_url} submitLabel="Hinzufügen" busy={busy} onSubmit={save} />
      </Sheet>
    </RecordDetails>
  )
}
