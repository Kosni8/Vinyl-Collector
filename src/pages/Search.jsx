import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { searchVinyl, searchBarcode, fromSearchResult } from '../lib/discogs.js'
import RecordRow from '../components/RecordRow.jsx'
import { BarcodeIcon } from '../components/Icons.jsx'

// Keeps query and results while switching tabs or opening a detail page.
// The barcode library is large, so it is only loaded when the scanner opens.
const BarcodeScanner = lazy(() => import('../components/BarcodeScanner.jsx'))

const memory = { q: '', barcode: null, results: [], page: 1, pages: 0, country: '' }

// Values as Discogs writes them in the "country" field of a release.
const REGIONS = [
  ['', 'Alle Länder'],
  ['Europe', 'Europa'],
  ['UK & Europe', 'UK & Europa'],
  ['Germany', 'Deutschland'],
  ['UK', 'UK'],
  ['US', 'USA'],
  ['USA & Europe', 'USA & Europa'],
  ['Canada', 'Kanada'],
  ['Japan', 'Japan'],
  ['Australia', 'Australien'],
  ['France', 'Frankreich'],
  ['Netherlands', 'Niederlande'],
  ['Italy', 'Italien'],
]

export default function Search() {
  const { items } = useData()
  const navigate = useNavigate()
  const [q, setQ] = useState(memory.q)
  const [barcode, setBarcode] = useState(memory.barcode)
  const [results, setResults] = useState(memory.results)
  const [page, setPage] = useState(memory.page)
  const [pages, setPages] = useState(memory.pages)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [country, setCountry] = useState(memory.country)
  const lastRun = useRef(memory.q)
  Object.assign(memory, { q, barcode, results, page, pages, country })

  const owned = useMemo(() => {
    const m = new Map()
    items.forEach((i) => m.set(i.discogs_release_id, (m.get(i.discogs_release_id) ?? 0) + 1))
    return m
  }, [items])

  const run = useCallback(async (query, p = 1, code = null, region = '') => {
    if (!code && !query.trim()) {
      setResults([])
      setPages(0)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = code ? await searchBarcode(code) : await searchVinyl(query.trim(), p, region)
      const rows = data.results.map(fromSearchResult)
      if (code) {
        // Exactly one pressing with this barcode: go straight to its page.
        const digits = String(code).replace(/\D/g, '')
        const exact = rows.filter((r) => r.barcodes.includes(digits))
        const match = exact.length === 1 ? exact[0] : rows.length === 1 ? rows[0] : null
        if (match) navigate(`/release/${match.discogs_release_id}`)
      }
      setResults((prev) => (p > 1 ? [...prev, ...rows] : rows))
      setPage(p)
      setPages(data.pagination?.pages ?? 1)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // live search while typing (debounced)
  useEffect(() => {
    if (barcode || q === lastRun.current) return
    const t = setTimeout(() => {
      lastRun.current = q
      run(q, 1, null, country)
    }, 500)
    return () => clearTimeout(t)
  }, [q, barcode, run, country])

  const onScan = useCallback(
    (code) => {
      setScanning(false)
      setBarcode(code)
      setQ('')
      lastRun.current = ''
      run('', 1, code)
    },
    [run],
  )

  return (
    <div className="page">
      <header className="page-header">
        <h1>Suche</h1>
      </header>
      <div className="toolbar sticky">
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            document.activeElement?.blur()
            lastRun.current = q
            run(q, 1, null, country)
          }}
        >
          <input
            className="search-input"
            type="search"
            enterKeyHint="search"
            placeholder="Album oder Künstler"
            value={q}
            onChange={(e) => {
              setBarcode(null)
              setQ(e.target.value)
            }}
          />
          <button type="button" className="icon-btn bordered" onClick={() => setScanning(true)} aria-label="Barcode scannen">
            <BarcodeIcon />
          </button>
        </form>
        {!barcode && (
          <select
            className="select"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value)
              lastRun.current = q
              run(q, 1, null, e.target.value)
            }}
          >
            {REGIONS.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        )}
        {barcode && (
          <p className="muted small">
            Barcode {barcode} ·{' '}
            <button className="link-btn" onClick={() => { setBarcode(null); setResults([]) }}>zurücksetzen</button>
          </p>
        )}
      </div>

      {error && <p className="error center">{error}</p>}
      {!loading && !error && (q || barcode) && !results.length && <p className="muted center">Keine Vinyls gefunden.</p>}
      {!q && !barcode && !results.length && <p className="muted center">Suche nach Album oder Künstler, oder scanne den Barcode auf der Rückseite der Platte.</p>}

      <div className="record-list">
        {results.map((r, i) => (
          <RecordRow key={r.discogs_release_id + '-' + i} to={`/release/${r.discogs_release_id}`} item={r} owned={owned.get(r.discogs_release_id)} />
        ))}
      </div>
      {loading && <p className="muted center">Sucht …</p>}
      {!loading && !barcode && page < pages && (
        <button className="btn ghost block" onClick={() => run(q, page + 1, null, country)}>Mehr laden</button>
      )}
      {scanning && (
        <Suspense fallback={null}>
          <BarcodeScanner onResult={onScan} onClose={() => setScanning(false)} />
        </Suspense>
      )}
    </div>
  )
}
