import { Link } from 'react-router-dom'
import { VinylColorLabel } from './VinylDot.jsx'
import { money } from '../lib/format.js'

/** One record in a list (collection or search results). */
export default function RecordRow({ to, item, owned, wanted }) {
  return (
    <Link to={to} className="record-row">
      <img className="record-cover" src={item.thumb_url || item.cover_url || ''} alt="" loading="lazy" />
      <div className="record-info">
        <div className="record-title">{item.title}</div>
        <div className="record-artist">{item.artist}</div>
        <div className="record-meta">
          {[item.year || null, item.country].filter(Boolean).join(' · ')}
        </div>
        <div className="record-meta ellipsis">{item.format}</div>
        {item.vinyl_color_name && <VinylColorLabel item={item} />}
        {owned > 0 && <span className="badge owned">In Sammlung{owned > 1 ? ` (${owned}×)` : ''}</span>}
        {wanted && <span className="badge wanted">♥ Wantlist</span>}
      </div>
      {item.id && (
        <div className="record-value">
          <span>{money(item.value_eur)}</span>
        </div>
      )}
    </Link>
  )
}
