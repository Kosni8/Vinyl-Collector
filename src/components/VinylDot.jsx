import { patternName } from '../lib/format.js'

/** CSS background that paints a record in the given colour and pattern. */
export function vinylBackground(color = '#1a1a1a', pattern = 'solid', cover) {
  if (pattern === 'marbled') return `conic-gradient(from 30deg, ${color}, #ffffffaa, ${color}, #00000055, ${color})`
  if (pattern === 'splatter')
    return `radial-gradient(circle at 30% 30%, #111 0 8%, transparent 9%), radial-gradient(circle at 70% 60%, #fff 0 7%, transparent 8%), radial-gradient(circle at 40% 75%, #111 0 6%, transparent 7%), ${color}`
  if (pattern === 'translucent') return `${color}88`
  if (pattern === 'filled') return `radial-gradient(circle, #f4f1ea 0 45%, ${color} 46%)`
  if (pattern === 'liquid')
    return `radial-gradient(ellipse 60% 30% at 40% 35%, #ffffffaa, transparent 70%), radial-gradient(ellipse 50% 25% at 65% 70%, #ffffff66, transparent 70%), ${color}cc`
  if (pattern === 'split') return `linear-gradient(90deg, ${color} 50%, #1a1a1a 50%)`
  if (pattern === 'picture' && cover) return `center / cover url("${cover}")`
  return color
}

/** Small record disc showing the vinyl colour and pattern. */
export function VinylDot({ color = '#1a1a1a', pattern = 'solid', cover, size = 18 }) {
  return (
    <span className="vinyl-dot" style={{ width: size, height: size, background: vinylBackground(color, pattern, cover) }}>
      <span className="vinyl-dot-hole" />
    </span>
  )
}

/** Large record with grooves, sheen and the cover as centre label. */
export function VinylDisc({ item }) {
  return (
    <span className="vinyl-disc" style={{ background: vinylBackground(item.vinyl_color, item.vinyl_pattern, item.cover_url) }}>
      <span className="vinyl-disc-grooves" />
      <span className="vinyl-disc-label" style={item.cover_url ? { backgroundImage: `url("${item.cover_url}")` } : undefined}>
        <span className="vinyl-disc-hole" />
      </span>
    </span>
  )
}

export function VinylColorLabel({ item }) {
  const pattern = item.vinyl_pattern && item.vinyl_pattern !== 'solid' ? ` · ${patternName(item.vinyl_pattern)}` : ''
  return (
    <span className="vinyl-label">
      <VinylDot color={item.vinyl_color} pattern={item.vinyl_pattern} cover={item.thumb_url} />
      <span className="vinyl-label-text">
        {item.vinyl_color_name}
        {pattern}
      </span>
      {item.signed && <span className="badge">✍︎ Signiert</span>}
    </span>
  )
}
