import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Gallery from './Gallery.jsx'
import Sheet from './Sheet.jsx'
import { BackIcon } from './Icons.jsx'
import { money, dateDe, CONDITIONS, conditionName } from '../lib/format.js'
import { getPrices } from '../lib/discogs.js'

/** Explains where the three numbers come from; shows the suggestion for every condition. */
function PriceInfo({ open, topic, onClose, releaseId, prices, valueCondition, ownCondition }) {
  const [suggestions, setSuggestions] = useState(prices?.suggestions ?? null)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (!open || suggestions) return
    getPrices(releaseId)
      .then((p) => setSuggestions(p.suggestions ?? {}))
      .catch((e) => setError(e.message))
  }, [open, suggestions, releaseId])

  return (
    <Sheet open={open} onClose={onClose} title="Woher kommen die Preise?">
      <section className={'price-info' + (topic === 'value' ? ' on' : '')}>
        <h3>Wert ({valueCondition})</h3>
        <p>
          Die <strong>Preisempfehlung von Discogs</strong> für diese Pressung im Zustand{' '}
          <strong>{conditionName(valueCondition)}</strong>. Discogs berechnet sie aus den bisherigen Verkäufen auf dem
          Marktplatz.{' '}
          {ownCondition
            ? valueCondition === ownCondition
              ? 'Genommen wird der Zustand, den du bei deinem Exemplar angegeben hast.'
              : `Für deinen Zustand (${ownCondition}) hat Discogs keine Empfehlung, deshalb gilt VG+.`
            : 'Ist bei deinem Exemplar kein Zustand angegeben, nimmt die App Very Good Plus (VG+).'}
        </p>
        <table className="price-table">
          <tbody>
            {CONDITIONS.map((c) => (
              <tr key={c.id} className={c.id === valueCondition ? 'on' : ''}>
                <td><strong>{c.id}</strong> {c.name}</td>
                <td>{suggestions ? money(suggestions[c.discogs]) : error ? '–' : '…'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <p className="error small">{error}</p>}
      </section>
      <section className={'price-info' + (topic === 'count' ? ' on' : '')}>
        <h3>Angebote</h3>
        <p>So viele Exemplare genau dieser Pressung werden gerade auf dem Discogs-Marktplatz verkauft, in jedem Zustand.</p>
      </section>
      <section className={'price-info' + (topic === 'lowest' ? ' on' : '')}>
        <h3>Günstigstes</h3>
        <p>Der niedrigste Preis unter diesen Angeboten, ohne Versand und egal in welchem Zustand.</p>
      </section>
      <p className="muted small">
        Alle Preise in Euro{prices?.updated_at ? `, Stand ${dateDe(prices.updated_at)}` : ''}. Aktualisiert werden sie beim
        Öffnen der Platte (höchstens alle 12 Stunden) oder mit „Preise aktualisieren“.
      </p>
    </Sheet>
  )
}

/** Shared top part of the record detail pages. */
export default function RecordDetails({ images, record, prices, pricesLoading, children }) {
  const navigate = useNavigate()
  const [info, setInfo] = useState(null) // 'value' | 'count' | 'lowest'
  const valueCondition = record.value_condition ?? 'VG+'
  return (
    <div className="page detail">
      <button className="back-btn" onClick={() => navigate(-1)} aria-label="Zurück">
        <BackIcon />
      </button>
      <Gallery images={images} />
      <div className="detail-body">
        <h1>{record.title}</h1>
        <p className="detail-artist">{record.artist}</p>
        <dl className="facts">
          <div><dt>Jahr</dt><dd>{record.year || '–'}</dd></div>
          <div><dt>Format</dt><dd>{record.format || '–'}</dd></div>
          {record.label && <div><dt>Label</dt><dd>{record.label}</dd></div>}
          {record.country && <div><dt>Land</dt><dd>{record.country}</dd></div>}
        </dl>
        <div className="price-cards">
          <button type="button" className="price-card" onClick={() => setInfo('value')}>
            <small>Wert ({valueCondition}) ⓘ</small>
            <strong>{pricesLoading && prices?.value == null ? '…' : money(prices?.value)}</strong>
          </button>
          <button type="button" className="price-card" onClick={() => setInfo('count')}>
            <small>Angebote ⓘ</small>
            <strong>{pricesLoading && prices?.num_for_sale == null ? '…' : prices?.num_for_sale ?? '–'}</strong>
          </button>
          <button type="button" className="price-card" onClick={() => setInfo('lowest')}>
            <small>Günstigstes ⓘ</small>
            <strong>{pricesLoading && prices?.lowest_price == null ? '…' : money(prices?.lowest_price)}</strong>
          </button>
        </div>
        <PriceInfo
          key={prices?.updated_at ?? 'x'}
          open={!!info}
          topic={info}
          onClose={() => setInfo(null)}
          releaseId={record.discogs_release_id}
          prices={prices}
          valueCondition={valueCondition}
          ownCondition={record.condition}
        />
        {prices?.value == null && prices?.value_error && <p className="error small">Wert: {prices.value_error}</p>}
        {prices?.updated_at && <p className="muted small">Preise vom {dateDe(prices.updated_at)}</p>}
        {children}
        <a className="link-btn discogs-link" href={`https://www.discogs.com/release/${record.discogs_release_id}`} target="_blank" rel="noreferrer">
          Auf Discogs ansehen ↗
        </a>
      </div>
    </div>
  )
}
