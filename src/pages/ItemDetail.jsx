import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { removeFromDiscogsCollection } from '../lib/discogs.js'
import { uploadPhoto, deletePhoto } from '../lib/supabase.js'
import { dateDe } from '../lib/format.js'
import RecordDetails from '../components/RecordDetails.jsx'
import Sheet from '../components/Sheet.jsx'
import ItemForm from '../components/ItemForm.jsx'
import { VinylColorLabel } from '../components/VinylDot.jsx'

const STALE_MS = 12 * 60 * 60 * 1000

export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { items, loading, profile, updateItem, deleteItem, updateProfile, refreshPrices } = useData()
  const item = items.find((i) => i.id === id)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pricesLoading, setPricesLoading] = useState(false)
  const [valueError, setValueError] = useState(null)

  const loadPrices = (it) => {
    setPricesLoading(true)
    setValueError(null)
    return refreshPrices(it)
      .then((r) => setValueError(r.prices.value_error))
      .catch((e) => setValueError(e.message))
      .finally(() => setPricesLoading(false))
  }
  const refreshed = useRef(false)

  // Refresh market data when it is older than 12 hours.
  useEffect(() => {
    if (!item || refreshed.current) return
    refreshed.current = true
    if (item.prices_updated_at && Date.now() - new Date(item.prices_updated_at) < STALE_MS) return
    loadPrices(item)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item])

  if (!item) return <div className="page"><p className="muted center">{loading ? 'Lädt …' : 'Platte nicht gefunden.'}</p></div>

  const images = [item.photo_url, ...(item.images?.length ? item.images.map((i) => i.uri) : [item.cover_url])].filter(Boolean)

  const save = async ({ photoFile, removePhoto, ...details }) => {
    setBusy(true)
    try {
      let photo_url = item.photo_url
      if (photoFile) photo_url = await uploadPhoto(photoFile, 'records')
      else if (removePhoto) photo_url = null
      await updateItem(item.id, { ...details, photo_url })
      if (photo_url !== item.photo_url) deletePhoto(item.photo_url)
      setEditing(false)
    } catch (e) {
      alert('Speichern fehlgeschlagen: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm(`„${item.title}“ wirklich aus der Sammlung löschen?`)) return
    setBusy(true)
    try {
      if (item.discogs_instance_id) {
        await removeFromDiscogsCollection(item.discogs_release_id, item.discogs_instance_id).catch((e) => console.warn(e))
      }
      await deleteItem(item.id)
      deletePhoto(item.photo_url)
      navigate('/sammlung', { replace: true })
    } catch (e) {
      alert('Löschen fehlgeschlagen: ' + e.message)
      setBusy(false)
    }
  }

  const isFav = profile.fav_album_id === item.id

  return (
    <RecordDetails
      images={images}
      record={item}
      pricesLoading={pricesLoading}
      prices={{
        value: item.value_eur,
        num_for_sale: item.num_for_sale,
        lowest_price: item.lowest_price_eur,
        updated_at: item.prices_updated_at,
        value_error: valueError,
      }}
    >
      <section className="my-copy">
        <h3>Mein Exemplar</h3>
        <VinylColorLabel item={item} />
        {item.comment && <p className="comment">{item.comment}</p>}
        <p className="muted small">Hinzugefügt am {dateDe(item.added_at)}</p>
      </section>
      <div className="actions">
        <button className="btn primary block" onClick={() => setEditing(true)}>Bearbeiten</button>
        <button className="btn ghost block" disabled={isFav} onClick={() => updateProfile({ fav_album_id: item.id })}>
          {isFav ? '★ Lieblingsalbum' : '☆ Als Lieblingsalbum setzen'}
        </button>
        <button className="btn ghost block" disabled={pricesLoading} onClick={() => loadPrices(item)}>
          {pricesLoading ? 'Preise werden geladen …' : 'Preise aktualisieren'}
        </button>
        <button className="btn danger block" disabled={busy} onClick={remove}>Aus Sammlung löschen</button>
      </div>
      <Sheet open={editing} onClose={() => !busy && setEditing(false)} title="Exemplar bearbeiten" full>
        <ItemForm initial={item} cover={item.thumb_url} coverFull={item.cover_url} submitLabel="Speichern" busy={busy} onSubmit={save} />
      </Sheet>
    </RecordDetails>
  )
}
