import { Link } from 'react-router-dom'
import { VinylColorLabel } from './VinylDot.jsx'
import { money, formatShort } from '../lib/format.js'

/** One record in a list (collection or search results). */
export default function RecordRow({ to, item, owned, wanted, fav }) {
  const isCopy = !!item.id // a copy in the collection (not a search result)
  return (
    <Link to={to} className={'record-row' + (isCopy ? ' copy' : '') + (isCopy && item.signed ? ' signed' : '')}>
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
            {/* search result: like Discogs, formats + edition / colour text, then year and country */}
            {item.formatDesc && <div className="record-format">{item.formatDesc}</div>}
            {item.edition && <div className="record-edition">{item.edition}</div>}
            <div className="record-meta">{[item.year || null, item.country].filter(Boolean).join(' · ')}</div>
          </>
        )}
        {item.vinyl_color_name && <VinylColorLabel item={item} showSigned={false} />}
        {owned > 0 && <span className="badge owned">In Sammlung{owned > 1 ? ` (${owned}×)` : ''}</span>}
        {wanted && <span className="badge wanted">♥ Wantlist</span>}
      </div>
      {isCopy && (
        <div className="record-value">
          <span>{money(item.value_eur)}</span>
        </div>
      )}
    </Link>
  )
}
