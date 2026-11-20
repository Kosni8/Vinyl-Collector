import { useState } from 'react'
import { Link } from 'react-router-dom'
import { VinylColorLabel } from './VinylDot.jsx'
import { money, formatShort } from '../lib/format.js'

// search results opened with "Mehr" stay open when coming back from a record
const openRows = new Set()

/** One record in a list (collection or search results). */
export default function RecordRow({ to, item, owned, wanted, fav }) {
  const isCopy = !!item.id // a copy in the collection (not a search result)
  const [open, setOpen] = useState(() => openRows.has(item.discogs_release_id))
  const details = [item.formatDesc, item.edition].filter(Boolean).join(' · ')
  const canOpen = !isCopy && !!item.edition
  const toggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const next = !open
    if (next) openRows.add(item.discogs_release_id)
    else openRows.delete(item.discogs_release_id)
    setOpen(next)
  }
  return (
    <Link to={to} className={'record-row' + (isCopy ? ' copy' : ' result') + (isCopy && item.signed ? ' signed' : '') + (canOpen ? ' expandable' : '')}>
      <span className="record-cover-wrap">
        <img className="record-cover" src={item.thumb_url || item.cover_url || ''} alt="" loading="lazy" />
        {fav && (
          <span className="fav-heart" title="Lieblingsalbum" aria-label="Lieblingsalbum">
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path d="M12 21s-7.5-4.6-9.6-9.3C1 8.4 3 5 6.4 5c2.2 0 3.6 1.3 4.4 2.6.4.6 1.9.6 2.4 0C14 6.3 15.4 5 17.6 5 21 5 23 8.4 21.6 11.7 19.5 16.4 12 21 12 21z" fill="currentColor" />
            </svg>
          </span>
        )}
      </span>
      <div className="record-info">
        <div className="record-title">{item.title}</div>
        {isCopy && item.signed && <span className="signed-dot" title="Signiert" aria-label="Signiert">✍︎</span>}
        <div className="record-artist">{item.artist}</div>
        {isCopy ? (
          <>
            <div className="record-meta">{[item.year || null, item.country].filter(Boolean).join(' · ')}</div>
            <div className="record-meta ellipsis">{formatShort(item)}</div>
          </>
        ) : (
          <>
            {/* search result: same size as before; "Mehr" opens formats + edition / colour text like Discogs */}
            <div className="record-meta">{[item.year || null, item.country].filter(Boolean).join(' · ')}</div>
            {open && canOpen ? (
              <>
                {item.formatDesc && <div className="record-format">{item.formatDesc}</div>}
                <div className="record-edition">{item.edition}</div>
              </>
            ) : (
              <div className="record-meta ellipsis">{details || item.format}</div>
            )}
          </>
        )}
        {item.vinyl_color_name && <VinylColorLabel item={item} showSigned={false} />}
        {owned > 0 && <span className="badge owned">In Sammlung{owned > 1 ? ` (${owned}×)` : ''}</span>}
        {wanted && <span className="badge wanted">♥ Wantlist</span>}
      </div>
      {canOpen && (
        <button type="button" className="more-btn" onClick={toggle} aria-expanded={open}>
          {open ? 'Weniger' : 'Mehr Infos'}
          <svg viewBox="0 0 10 6" width="9" height="6" aria-hidden="true" style={open ? { transform: 'rotate(180deg)' } : undefined}>
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {isCopy && (
        <div className="record-value">
          <span>{money(item.value_eur)}</span>
        </div>
      )}
    </Link>
  )
}
