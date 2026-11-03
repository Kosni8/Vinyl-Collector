import { useNavigate } from 'react-router-dom'
import Gallery from './Gallery.jsx'
import { BackIcon } from './Icons.jsx'
import { money, dateDe } from '../lib/format.js'

/** Shared top part of the record detail pages. */
export default function RecordDetails({ images, record, prices, pricesLoading, children }) {
  const navigate = useNavigate()
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
          <div className="price-card">
            <small>Wert (VG+)</small>
            <strong>{pricesLoading && prices?.value == null ? '…' : money(prices?.value)}</strong>
          </div>
          <div className="price-card">
            <small>Angebote</small>
            <strong>{pricesLoading && prices?.num_for_sale == null ? '…' : prices?.num_for_sale ?? '–'}</strong>
          </div>
          <div className="price-card">
            <small>Günstigstes</small>
            <strong>{pricesLoading && prices?.lowest_price == null ? '…' : money(prices?.lowest_price)}</strong>
          </div>
        </div>
        {prices?.updated_at && <p className="muted small">Preise vom {dateDe(prices.updated_at)}</p>}
        {children}
        <a className="link-btn discogs-link" href={`https://www.discogs.com/release/${record.discogs_release_id}`} target="_blank" rel="noreferrer">
          Auf Discogs ansehen ↗
        </a>
      </div>
    </div>
  )
}
