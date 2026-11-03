import { patternName } from '../lib/format.js'

/** Small record disc showing the vinyl colour and pattern. */
export function VinylDot({ color = '#1a1a1a', pattern = 'solid', cover, size = 18 }) {
  let background = color
  if (pattern === 'marbled') background = `conic-gradient(from 30deg, ${color}, #ffffffaa, ${color}, #00000055, ${color})`
  if (pattern === 'splatter')
    background = `radial-gradient(circle at 30% 30%, #111 0 8%, transparent 9%), radial-gradient(circle at 70% 60%, #fff 0 7%, transparent 8%), radial-gradient(circle at 40% 75%, #111 0 6%, transparent 7%), ${color}`
  if (pattern === 'split') background = `linear-gradient(90deg, ${color} 50%, #1a1a1a 50%)`
  if (pattern === 'picture' && cover) background = `center / cover url("${cover}")`
  return (
    <span className="vinyl-dot" style={{ width: size, height: size, background }}>
      <span className="vinyl-dot-hole" />
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
