import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { removeFromDiscogsCollection } from '../lib/discogs.js'
import { uploadPhoto, deletePhoto } from '../lib/supabase.js'
import { dateDe, formatTextDefaults, shapeName, conditionName, discsOf } from '../lib/format.js'
import RecordDetails from '../components/RecordDetails.jsx'
import Sheet from '../components/Sheet.jsx'
import Loader from '../components/Loader.jsx'
import ItemForm from '../components/ItemForm.jsx'
import { VinylColorLabel } from '../components/VinylDot.jsx'

/** Shape of the records: one name, or per record when they differ ("Platte 1: Stern · Platte 2: Rund"). */
function shapeText(item) {
  const names = discsOf(item).map((d) => (d.shape ? shapeName(d.shape) : 'Rund'))
  if (names.every((n) => n === 'Rund')) return null
  if (names.every((n) => n === names[0])) return names[0]
  return names.map((n, i) => `Platte ${i + 1}: ${n}`).join(' · ')
}

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
  const [bigSignature, setBigSignature] = useState(false)
  const [suggestions, setSuggestions] = useState(null) // all conditions, from the last price refresh

  const loadPrices = (it) => {
    setPricesLoading(true)
    setValueError(null)
    return refreshPrices(it)
      .then((r) => {
        setValueError(r.prices.value_error)
        setSuggestions(r.prices.suggestions ?? null)
      })
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

  if (!item) return <div className="page">{loading ? <Loader /> : <p className="muted center">Platte nicht gefunden.</p>}</div>

  const images = [item.photo_url, ...(item.images?.length ? item.images.map((i) => i.uri) : [item.cover_url])].filter(Boolean)

  const save = async ({ photoFile, removePhoto, signatureFile, removeSignature, ...details }) => {
    setBusy(true)
    try {
      let photo_url = item.photo_url
      if (photoFile) photo_url = await uploadPhoto(photoFile, 'records')
      else if (removePhoto) photo_url = null
      // only sent when it changes, so saving keeps working before the column exists
      const signature = {}
      if (signatureFile) signature.signature_url = await uploadPhoto(signatureFile, 'signatures')
      else if (removeSignature) signature.signature_url = null
      const updated = await updateItem(item.id, { ...details, ...signature, photo_url })
      if (photo_url !== item.photo_url) deletePhoto(item.photo_url)
      if ('signature_url' in signature) deletePhoto(item.signature_url)
      setEditing(false)
      // the value depends on the condition
      if ((updated.condition ?? null) !== (item.condition ?? null)) loadPrices(updated)
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
        suggestions,
      }}
    >
      <section className="my-copy">
        <h3>Mein Exemplar</h3>
        <VinylColorLabel item={item} />
        <dl className="facts copy-facts">
          {(item.size || item.disc_count) && (
            <div><dt>Format</dt><dd>{[item.size, `${item.disc_count ?? discsOf(item).length}× Vinyl`].filter(Boolean).join(' · ')}</dd></div>
          )}
          {shapeText(item) && <div><dt>Form</dt><dd>{shapeText(item)}</dd></div>}
          {item.number_no != null && (
            <div><dt>Nummeriert</dt><dd>Nummer {item.number_no}{item.number_total != null ? ` von ${item.number_total}` : ''}</dd></div>
          )}
          {item.condition && <div><dt>Zustand</dt><dd>{conditionName(item.condition)} ({item.condition})</dd></div>}
        </dl>
        {item.signed && item.signature_url && (
          <button type="button" className={'signature-photo' + (bigSignature ? ' big' : '')} onClick={() => setBigSignature((v) => !v)} aria-label="Foto der Signatur">
            <img src={item.signature_url} alt="Signatur" />
            <small>✍︎ Signatur</small>
          </button>
        )}
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
        <ItemForm initial={item} defaults={formatTextDefaults(item.format)} cover={item.thumb_url} submitLabel="Speichern" busy={busy} onSubmit={save} />
      </Sheet>
    </RecordDetails>
  )
}
