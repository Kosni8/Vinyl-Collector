import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { getRelease, fromRelease } from '../lib/discogs.js'
import { useAddToCollection, getReleaseCached, cachedRelease } from '../lib/collect.js'
import { orderDateText, getPendingPlaceholder, setPendingPlaceholder } from '../lib/orders.js'
import { deletePhoto } from '../lib/supabase.js'
import OrderSheet from '../components/OrderSheet.jsx'
import RecordDetails from '../components/RecordDetails.jsx'
import Sheet from '../components/Sheet.jsx'
import ItemForm from '../components/ItemForm.jsx'
import { vinylFormatDefaults } from '../lib/format.js'
import { useWantlist, isWanted, want, unwant } from '../lib/wantlist.js'
import { clearSearch } from './Search.jsx'

export default function ReleaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { items, orders, addOrder, updateOrder, deleteOrder } = useData()
  const addToCollection = useAddToCollection()
  const [data, setData] = useState(cachedRelease(id))
  const [ordering, setOrdering] = useState(false)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const { wants } = useWantlist()
  const [wantBusy, setWantBusy] = useState(false)

  useEffect(() => {
    if (cachedRelease(id)) return
    getReleaseCached(id, getRelease)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="page"><p className="error center">{error}</p></div>
  if (!data) return <div className="page"><p className="muted center">Lädt …</p></div>

  const record = fromRelease(data.release)
  const owned = items.filter((i) => i.discogs_release_id === record.discogs_release_id)
  const wanted = isWanted(wants, record.discogs_release_id)
  const order = orders.find((o) => o.discogs_release_id === record.discogs_release_id)
  // a placeholder from "Bestellte Platten" being looked for in the search
  const pendingId = getPendingPlaceholder()?.id
  const placeholder = orders.find((o) => o.id === pendingId && o.discogs_release_id == null)

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
      const { item, discogsOk } = await addToCollection(data, form)
      clearSearch() // start the next search from scratch
      if (!discogsOk) alert('Gespeichert. Hinweis: In deinem Discogs-Konto konnte die Platte nicht eingetragen werden.')
      navigate(`/sammlung/${item.id}`, { replace: true })
    } catch (e) {
      alert('Speichern fehlgeschlagen: ' + e.message)
      setBusy(false)
    }
  }

  const saveOrder = async (dates) => {
    if (order) await updateOrder(order.id, dates)
    else
      await addOrder({
        discogs_release_id: record.discogs_release_id,
        title: record.title,
        artist: record.artist,
        cover_url: record.cover_url,
        thumb_url: record.thumb_url,
        ...dates,
      })
    setOrdering(false)
  }

  // The placeholder becomes a normal order of this record; its date stays.
  const replacePlaceholder = async () => {
    setBusy(true)
    try {
      if (order) await deleteOrder(placeholder.id) // this record is already on the list
      else
        await updateOrder(placeholder.id, {
          discogs_release_id: record.discogs_release_id,
          title: record.title,
          artist: record.artist,
          cover_url: record.cover_url,
          thumb_url: record.thumb_url,
        })
      deletePhoto(placeholder.cover_url)
      setPendingPlaceholder(null)
      clearSearch()
      navigate('/')
    } catch (e) {
      alert('Speichern fehlgeschlagen: ' + e.message + '\n\nFalls eine Spalte fehlt: Das SQL-Update in Supabase muss noch ausgeführt werden.')
      setBusy(false)
    }
  }

  const removeOrder = async () => {
    await deleteOrder(order.id)
    setOrdering(false)
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
      {placeholder && (
        <div className="pending-note">
          <p>
            Platzhalter <strong>„{placeholder.title}“</strong>: Ist die Platte schon da, füg sie einfach zur Sammlung hinzu, der Platzhalter
            verschwindet dann. Ist sie noch unterwegs, ersetz den Platzhalter durch diese Platte.
          </p>
          <button className="btn ghost block" disabled={busy} onClick={replacePlaceholder}>Platzhalter durch diese Platte ersetzen</button>
        </div>
      )}
      <button className="btn primary block" onClick={() => setAdding(true)}>
        {owned.length ? 'Weiteres Exemplar hinzufügen' : 'Zur Sammlung hinzufügen'}
      </button>
      <button className="btn ghost block" disabled={wantBusy || !wants} onClick={toggleWant}>
        {wantBusy ? 'Wantlist …' : wanted ? '♥ Auf der Wantlist · entfernen' : '♡ Auf die Wantlist'}
      </button>
      <button className="btn ghost block" onClick={() => setOrdering(true)}>
        {order ? `Bestellt${orderDateText(order) ? ' · ' + orderDateText(order) : ''} · ändern` : 'Platte bestellt'}
      </button>
      <OrderSheet
        open={ordering}
        onClose={() => setOrdering(false)}
        title={order ? 'Bestellung ändern' : 'Platte bestellt'}
        order={order}
        submitLabel={order ? 'Speichern' : 'Zu „Bestellt“ hinzufügen'}
        onSave={saveOrder}
        onRemove={order ? removeOrder : undefined}
      />
      <Sheet open={adding} onClose={() => !busy && setAdding(false)} title="Zur Sammlung hinzufügen" full>
        <ItemForm defaults={vinylFormatDefaults(data.release.formats)} cover={record.thumb_url} submitLabel="Hinzufügen" busy={busy} onSubmit={save} />
      </Sheet>
    </RecordDetails>
  )
}
