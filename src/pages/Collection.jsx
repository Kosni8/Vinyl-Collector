import { useMemo, useState } from 'react'
import { useData } from '../lib/store.jsx'
import RecordRow from '../components/RecordRow.jsx'
import { SortIcon } from '../components/Icons.jsx'
import { money } from '../lib/format.js'

const SORTS = {
  added: { label: 'Hinzugefügt', fn: (a, b) => new Date(a.added_at) - new Date(b.added_at), defaultAsc: false },
  year: { label: 'Jahr', fn: (a, b) => (a.year ?? 0) - (b.year ?? 0), defaultAsc: false },
  title: { label: 'Album A–Z', fn: (a, b) => a.title.localeCompare(b.title, 'de'), defaultAsc: true },
  artist: {
    label: 'Künstler A–Z',
    fn: (a, b) => a.artist.localeCompare(b.artist, 'de') || (a.year ?? 0) - (b.year ?? 0),
    defaultAsc: true,
  },
  value: { label: 'Wert', fn: (a, b) => (Number(a.value_eur) || 0) - (Number(b.value_eur) || 0), defaultAsc: false },
}

// Remember the view between tab switches.
const memory = { q: '', sort: 'added', asc: false }

export default function Collection() {
  const { items, loading } = useData()
  const [q, setQ] = useState(memory.q)
  const [sort, setSort] = useState(memory.sort)
  const [asc, setAsc] = useState(memory.asc)
  Object.assign(memory, { q, sort, asc })

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const filtered = items.filter(
      (i) => !s || i.title.toLowerCase().includes(s) || i.artist.toLowerCase().includes(s),
    )
    const fn = SORTS[sort].fn
    return filtered.sort((a, b) => (asc ? fn(a, b) : fn(b, a)))
  }, [items, q, sort, asc])

  const total = items.reduce((sum, i) => sum + (Number(i.value_eur) || 0), 0)

  return (
    <div className="page">
      <header className="page-header">
        <h1>Sammlung</h1>
        <p className="muted">
          {items.length} Platten · Wert {money(total)}
        </p>
      </header>
      <div className="toolbar sticky">
        <input className="search-input" type="search" placeholder="Album oder Künstler suchen" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="row">
          <select
            className="select"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
              setAsc(SORTS[e.target.value].defaultAsc)
            }}
          >
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button className="icon-btn bordered" onClick={() => setAsc(!asc)} aria-label={asc ? 'Aufsteigend' : 'Absteigend'}>
            <SortIcon asc={asc} width={20} height={20} />
          </button>
        </div>
      </div>
      {loading && <p className="muted center">Lädt …</p>}
      {!loading && !items.length && <p className="muted center">Noch keine Platten. Über „Suche“ kannst du die erste hinzufügen.</p>}
      {!loading && items.length > 0 && !list.length && <p className="muted center">Nichts gefunden.</p>}
      <div className="record-list">
        {list.map((it) => (
          <RecordRow key={it.id} to={`/sammlung/${it.id}`} item={it} />
        ))}
      </div>
    </div>
  )
}
