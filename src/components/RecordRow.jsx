import { Link } from 'react-router-dom'
import { VinylColorLabel } from './VinylDot.jsx'
import { money, formatShort } from '../lib/format.js'
import { useSignedPosition } from '../lib/prefs.js'

/** One record in a list (collection or search results). */
export default function RecordRow({ to, item, owned, wanted }) {
  const signedPos = useSignedPosition()
  const isCopy = !!item.id // a copy in the collection (not a search result)
  return (
    <Link to={to} className="record-row">
      <span className="record-cover-wrap">
        <img className="record-cover" src={item.thumb_url || item.cover_url || ''} alt="" loading="lazy" />
        {isCopy && item.signed && <span className={'signed-tag ' + signedPos}>✍︎ Signiert</span>}
      </span>
      <div className="record-info">
        <div className="record-title">{item.title}</div>
        <div className="record-artist">{item.artist}</div>
        <div className="record-meta">
          {[item.year || null, item.country].filter(Boolean).join(' · ')}
        </div>
        <div className="record-meta ellipsis">{isCopy ? formatShort(item) : item.format}</div>
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
