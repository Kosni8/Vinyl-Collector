import { useMemo, useState } from 'react'
import Sheet from './Sheet.jsx'
import SearchField from './SearchField.jsx'
import { useData } from '../lib/store.jsx'

/** Lets the user choose a record from the collection. */
export default function ItemPicker({ open, onClose, onPick, title = 'Platte wählen', allowClear, filter, hint }) {
  const { items } = useData()
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return items
      .filter((i) => !filter || filter(i))
      .filter((i) => !s || i.title.toLowerCase().includes(s) || i.artist.toLowerCase().includes(s))
      .sort((a, b) => a.artist.localeCompare(b.artist, 'de') || a.title.localeCompare(b.title, 'de'))
  }, [items, q, filter])

  return (
    <Sheet open={open} onClose={onClose} title={title} full>
      <SearchField placeholder="Album oder Künstler suchen" value={q} onChange={setQ} />
      {hint && <p className="muted small">{hint}</p>}
      {allowClear && (
        <button className="btn ghost block" onClick={() => onPick(null)}>Platz leeren</button>
      )}
      {!items.length && <p className="muted center">Deine Sammlung ist noch leer. Füge zuerst über die Suche Platten hinzu.</p>}
      <div className="picker-list">
        {list.map((it) => (
          <button key={it.id} className="picker-row" onClick={() => onPick(it)}>
            <img src={it.thumb_url || it.cover_url || ''} alt="" loading="lazy" />
            <span>
              <strong>{it.title}</strong>
              <small>{it.artist}</small>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
