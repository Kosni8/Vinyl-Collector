import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { searchVinyl, searchBarcode, fromSearchResult } from '../lib/discogs.js'
import RecordRow from '../components/RecordRow.jsx'
import SearchField from '../components/SearchField.jsx'
import { BarcodeIcon } from '../components/Icons.jsx'
import { useWantlist, isWanted } from '../lib/wantlist.js'
import { getPendingPlaceholder, setPendingPlaceholder } from '../lib/orders.js'
import { SIZES } from '../lib/format.js'

// Keeps query and results while switching tabs or opening a detail page.
// The barcode library is large, so it is only loaded when the scanner opens.
const BarcodeScanner = lazy(() => import('../components/BarcodeScanner.jsx'))

const memory = { q: '', barcode: null, results: [], page: 1, pages: 0, country: '', sizes: [], autorun: false, scrollY: 0 }

/** Opens the search with this query already typed in and searched. */
export function startSearch(q) {
  Object.assign(memory, { q, barcode: null, results: [], page: 1, pages: 0, autorun: true })
}

/** Forgets query and results (after a record was added); the region filter stays. */
export function clearSearch() {
  Object.assign(memory, { q: '', barcode: null, results: [], page: 1, pages: 0 })
  window.dispatchEvent(new Event('search-reset'))
}

// Values as Discogs writes them in the "country" field of a release.
const REGIONS = [
  ['', 'Alle Länder'],
  ['Worldwide', 'Worldwide'],
  ['Europe', 'Europa'],
  ['UK & Europe', 'UK & Europa'],
  ['Germany', 'Deutschland'],
  ['UK', 'UK'],
  ['US', 'USA'],
  ['USA & Europe', 'USA & Europa'],
  ['Canada', 'Kanada'],
  ['Japan', 'Japan'],
]

export default function Search() {
  const { items } = useData()
  const { wants } = useWantlist()
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
  const [sizes, setSizes] = useState(memory.sizes)
  const lastRun = useRef(memory.autorun ? '' : memory.q) // '' lets a started search run at once
  memory.autorun = false
  const [pending, setPending] = useState(getPendingPlaceholder)
  useEffect(() => {
    const update = () => setPending(getPendingPlaceholder())
    window.addEventListener('pending-placeholder', update)
    return () => window.removeEventListener('pending-placeholder', update)
  }, [])
  Object.assign(memory, { q, barcode, results, page, pages, country, sizes })

  // Back from a record: return to the same place in the list instead of the top.
  // The position is taken when leaving, in a layout effect: that runs before the next page
  // replaces the list, so the browser has not jumped to the top yet. (Scroll events were not
  // reliable: page changes run as transitions, and the jump to the top could be saved first.)
  const restoreY = useRef(memory.results.length ? memory.scrollY : 0)
  useLayoutEffect(() => {
    if (restoreY.current > 0) window.scrollTo(0, restoreY.current)
    return () => {
      memory.scrollY = window.scrollY
    }
  }, [])
  // again after the app's scroll-to-top on page change (it runs before this) and once more
  // after the next frames, when everything is laid out
  useEffect(() => {
    const y = restoreY.current
    if (!(y > 0)) return
    window.scrollTo(0, y)
    let n = 0
    const again = () => {
      if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y)
      if (++n < 3) raf = requestAnimationFrame(again)
    }
    let raf = requestAnimationFrame(again)
    return () => cancelAnimationFrame(raf)
  }, [])

  const owned = useMemo(() => {
    const m = new Map()
    items.forEach((i) => m.set(i.discogs_release_id, (m.get(i.discogs_release_id) ?? 0) + 1))
    return m
  }, [items])

  // With exactly one size Discogs can filter already; otherwise the results are filtered here.
  const serverSize = sizes.length === 1 ? sizes[0] : ''
  const shown = useMemo(
    () => (sizes.length ? results.filter((r) => r.isVinyl && sizes.includes(r.size)) : results),
    [results, sizes],
  )

  const run = useCallback(async (query, p = 1, code = null, region = '', size = '') => {
    if (!code && !query.trim()) {
      setResults([])
      setPages(0)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = code ? await searchBarcode(code, region) : await searchVinyl(query.trim(), p, region, size)
      const rows = data.results.map(fromSearchResult)
      if (code) {
        // Exactly one pressing with this barcode: go straight to its page.
        const digits = String(code).replace(/\D/g, '')
        const exact = rows.filter((r) => r.barcodes.includes(digits))
        const match = exact.length === 1 ? exact[0] : rows.length === 1 ? rows[0] : null
        if (match) navigate(`/release/${match.discogs_release_id}`)
      }
      if (p === 1) memory.scrollY = 0
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
      run(q, 1, null, country, serverSize)
    }, 500)
    return () => clearTimeout(t)
  }, [q, barcode, run, country, serverSize])

  // Clears query, barcode and results (× button or tapping the Suche tab again).
  const reset = useCallback(() => {
    setQ('')
    setBarcode(null)
    setResults([])
    setPages(0)
    setPage(1)
    setError(null)
    lastRun.current = ''
  }, [])

  useEffect(() => {
    window.addEventListener('search-reset', reset)
    return () => window.removeEventListener('search-reset', reset)
  }, [reset])

  const onScan = useCallback(
    (code) => {
      setScanning(false)
      setBarcode(code)
      setQ('')
      lastRun.current = ''
      run('', 1, code, country)
    },
    [run, country],
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
            run(q, 1, null, country, serverSize)
          }}
        >
          <SearchField
            enterKeyHint="search"
            placeholder="Album oder Künstler"
            value={q}
            onChange={(v) => {
              setBarcode(null)
              setQ(v)
            }}
            onClear={reset}
          />
          <button type="button" className="icon-btn bordered" onClick={() => setScanning(true)} aria-label="Barcode scannen">
            <BarcodeIcon />
          </button>
        </form>
        <select
          className="select"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value)
            if (barcode) return run('', 1, barcode, e.target.value)
            lastRun.current = q
            run(q, 1, null, e.target.value, serverSize)
          }}
        >
          {REGIONS.map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <div className="chips size-chips">
          {SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              className={'chip' + (sizes.includes(sz) ? ' on' : '')}
              onClick={() => {
                const next = sizes.includes(sz) ? sizes.filter((x) => x !== sz) : [...sizes, sz]
                setSizes(next)
                if (barcode || !q.trim()) return
                lastRun.current = q
                run(q, 1, null, country, next.length === 1 ? next[0] : '')
              }}
            >
              {sz.replace('"', ' Zoll')}
            </button>
          ))}
        </div>
        {barcode && (
          <p className="muted small">
            Barcode {barcode} ·{' '}
            <button className="link-btn" onClick={() => { setBarcode(null); setResults([]) }}>zurücksetzen</button>
          </p>
        )}
      </div>

      {pending && (
        <div className="pending-note">
          <p>
            Du suchst die Platte für den Platzhalter <strong>„{pending.title}“</strong>. Öffne die passende Platte: Dort kannst du sie zur
            Sammlung hinzufügen oder den Platzhalter ersetzen.
          </p>
          <button className="link-btn" onClick={() => setPendingPlaceholder(null)}>Abbrechen</button>
        </div>
      )}
      {error && <p className="error center">{error}</p>}
      {!loading && !error && (q || barcode) && !shown.length && <p className="muted center">Keine Vinyls gefunden.</p>}
      {!q && !barcode && !results.length && <p className="muted center">Suche nach Album oder Künstler, oder scanne den Barcode auf der Rückseite der Platte.</p>}

      <div className="record-list">
        {shown.map((r, i) => (
          <RecordRow key={r.discogs_release_id + '-' + i} to={`/release/${r.discogs_release_id}`} item={r} owned={owned.get(r.discogs_release_id)} wanted={isWanted(wants, r.discogs_release_id)} />
        ))}
      </div>
      {loading && <p className="muted center">Sucht …</p>}
      {!loading && !barcode && page < pages && (
        <button className="btn ghost block" onClick={() => run(q, page + 1, null, country, serverSize)}>Mehr laden</button>
      )}
      {scanning && (
        <Suspense fallback={null}>
          <BarcodeScanner onResult={onScan} onClose={() => setScanning(false)} />
        </Suspense>
      )}
    </div>
  )
}
