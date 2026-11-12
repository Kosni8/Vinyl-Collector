import { useMemo, useState } from 'react'
import { useData } from '../lib/store.jsx'
import RecordRow from '../components/RecordRow.jsx'
import { SortIcon, FilterIcon, RefreshIcon } from '../components/Icons.jsx'
import Sheet from '../components/Sheet.jsx'
import Loader from '../components/Loader.jsx'
import SearchField from '../components/SearchField.jsx'
import { VinylDot } from '../components/VinylDot.jsx'
import { money, VINYL_PATTERNS, SIZES, sizeOf, COLOR_GROUPS, colorGroupsOfItem, patternsOfItem } from '../lib/format.js'

const SORTS = {
  added: { label: 'Hinzugefügt', fn: (a, b) => new Date(a.added_at) - new Date(b.added_at), defaultAsc: false },
  year: { label: 'Jahr', fn: (a, b) => (a.year ?? 0) - (b.year ?? 0), defaultAsc: false },
  title: { label: 'Album A–Z', fn: (a, b) => a.title.localeCompare(b.title, 'de'), defaultAsc: true },
  artist: {
    label: 'Künstler A–Z',
    // albums of the same artist alphabetically, always A–Z
    fn: (a, b, asc) => a.artist.localeCompare(b.artist, 'de') * (asc ? 1 : -1) || a.title.localeCompare(b.title, 'de'),
    directional: true,
    defaultAsc: true,
  },
  value: { label: 'Wert', fn: (a, b) => (Number(a.value_eur) || 0) - (Number(b.value_eur) || 0), defaultAsc: false },
}

// Remember the view between tab switches.
const memory = { q: '', sort: 'artist', asc: true, colors: [], patterns: [], sizes: [], signed: false }

const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

export default function Collection() {
  const { items, loading, refreshAllPrices, progress } = useData()
  const [q, setQ] = useState(memory.q)
  const [sort, setSort] = useState(memory.sort)
  const [asc, setAsc] = useState(memory.asc)
  const [colors, setColors] = useState(memory.colors)
  const [patterns, setPatterns] = useState(memory.patterns)
  const [signed, setSigned] = useState(memory.signed)
  const [sizes, setSizes] = useState(memory.sizes)
  const [filterOpen, setFilterOpen] = useState(false)
  Object.assign(memory, { q, sort, asc, colors, patterns, sizes, signed })
  const activeFilters = colors.length + patterns.length + sizes.length + (signed ? 1 : 0)

  const sizeOptions = useMemo(() => SIZES.filter((sz) => items.some((i) => sizeOf(i) === sz)), [items])
  const groupsById = useMemo(() => new Map(items.map((i) => [i.id, colorGroupsOfItem(i)])), [items])
  const patternsById = useMemo(() => new Map(items.map((i) => [i.id, patternsOfItem(i)])), [items])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const filtered = items.filter(
      (i) =>
        (!s || i.title.toLowerCase().includes(s) || i.artist.toLowerCase().includes(s)) &&
        (!colors.length || colors.some((g) => groupsById.get(i.id).has(g))) &&
        (!patterns.length || patterns.some((p) => patternsById.get(i.id).has(p))) &&
        (!sizes.length || sizes.includes(sizeOf(i))) &&
        (!signed || i.signed),
    )
    const { fn, directional } = SORTS[sort]
    return filtered.sort((a, b) => (directional ? fn(a, b, asc) : asc ? fn(a, b) : fn(b, a)))
  }, [items, q, sort, asc, colors, patterns, sizes, signed, groupsById, patternsById])

  const total = items.reduce((sum, i) => sum + (Number(i.value_eur) || 0), 0)

  return (
    <div className="page">
      <header className="page-header">
        <button
          className="icon-btn bordered header-action"
          onClick={() => confirm(`Preise aller ${items.length} Platten aktualisieren? Das dauert etwa ${Math.ceil((items.length * 2.3) / 60)} Min.`) && refreshAllPrices()}
          disabled={!!progress || !items.length}
          aria-label="Alle Preise aktualisieren"
        >
          {progress ? <small>{progress.done + 1}/{progress.total}</small> : <RefreshIcon width={20} height={20} />}
        </button>
        <h1>Sammlung</h1>
        <p className="muted">
          {items.length} Platten · Wert {money(total)}
        </p>
      </header>
      <div className="toolbar sticky">
        <SearchField placeholder="Album oder Künstler suchen" value={q} onChange={setQ} />
        <div className="row">
          <button className={'chip filter-btn' + (activeFilters ? ' on' : '')} onClick={() => setFilterOpen(true)}>
            <FilterIcon width={16} height={16} /> Filter{activeFilters ? ` (${activeFilters})` : ''}
          </button>
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
      {loading && <Loader />}
      {!loading && !items.length && <p className="muted center">Noch keine Platten. Über „Suche“ kannst du die erste hinzufügen.</p>}
      {activeFilters > 0 && list.length > 0 && (
        <p className="muted small">{list.length} von {items.length} Platten</p>
      )}
      {!loading && items.length > 0 && !list.length && <p className="muted center">Nichts gefunden.</p>}
      <div className="record-list">
        {list.map((it) => (
          <RecordRow key={it.id} to={`/sammlung/${it.id}`} item={it} />
        ))}
      </div>
      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter">
        <label className="field-label">Farbe</label>
        <div className="chips">
          {COLOR_GROUPS.map((g) => (
            <button key={g.id} className={'chip' + (colors.includes(g.id) ? ' on' : '')} onClick={() => setColors(toggle(colors, g.id))}>
              <VinylDot color={g.hex} pattern={g.pattern ?? (Array.isArray(g.hex) ? 'split' : 'solid')} size={16} /> {g.name}
            </button>
          ))}
        </div>
        {sizeOptions.length > 0 && (
          <>
            <label className="field-label">Größe</label>
            <div className="chips">
              {sizeOptions.map((sz) => (
                <button key={sz} className={'chip' + (sizes.includes(sz) ? ' on' : '')} onClick={() => setSizes(toggle(sizes, sz))}>
                  {sz.replace('"', ' Zoll')}
                </button>
              ))}
            </div>
          </>
        )}
        <label className="field-label">Muster</label>
        <div className="chips">
          {VINYL_PATTERNS.map((p) => (
            <button key={p.id} className={'chip' + (patterns.includes(p.id) ? ' on' : '')} onClick={() => setPatterns(toggle(patterns, p.id))}>
              <VinylDot color={['#2e6fd8', '#f4f1ea']} pattern={p.id} size={16} /> {p.name}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
          Nur signierte
        </label>
        <button className="btn primary block" onClick={() => setFilterOpen(false)}>
          {list.length} Platten anzeigen
        </button>
        {activeFilters > 0 && (
          <button
            className="btn ghost block"
            onClick={() => {
              setColors([])
              setPatterns([])
              setSizes([])
              setSigned(false)
            }}
          >
            Filter zurücksetzen
          </button>
        )}
      </Sheet>
    </div>
  )
}
