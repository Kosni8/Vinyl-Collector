import { patternName, discsOf } from '../lib/format.js'

/**
 * CSS background that paints a record in the given colour(s) and pattern.
 * `colors` is one hex string or a list (splatter, split, marbled … use the extra colours).
 */
export function vinylBackground(colors = '#1a1a1a', pattern = 'solid', cover) {
  const list = (Array.isArray(colors) ? colors : [colors]).filter(Boolean)
  const [c0 = '#1a1a1a', c1, c2] = list
  const sectors = (cs, alpha = '') =>
    `conic-gradient(${cs.map((c, i) => `${c}${alpha} ${(i * 100) / cs.length}% ${((i + 1) * 100) / cs.length}%`).join(', ')})`
  const stripes = (cs) =>
    `linear-gradient(90deg, ${cs.map((c, i) => `${c} ${(i * 100) / cs.length}% ${((i + 1) * 100) / cs.length}%`).join(', ')})`

  if (pattern === 'picture' && cover) return `center / cover url("${cover}")`
  if (pattern === 'marbled') {
    const cs = list.length > 1 ? list : [c0, '#ffffffaa', c0, '#00000055']
    return `conic-gradient(from 30deg, ${[...cs, ...cs, cs[0]].join(', ')})`
  }
  if (pattern === 'splatter') {
    const a = c1 ?? '#111111', b = c2 ?? (c1 ? c1 : '#ffffff')
    return `radial-gradient(circle at 30% 30%, ${a} 0 8%, transparent 9%), radial-gradient(circle at 70% 60%, ${b} 0 7%, transparent 8%), radial-gradient(circle at 40% 75%, ${a} 0 6%, transparent 7%), radial-gradient(circle at 68% 26%, ${b} 0 5%, transparent 6%), ${c0}`
  }
  if (pattern === 'translucent') return list.length > 1 ? sectors(list, '88') : `${c0}88`
  if (pattern === 'filled') return `radial-gradient(circle, ${c1 ?? '#f4f1ea'} 0 45%, ${c0} 46%)`
  if (pattern === 'liquid')
    return `radial-gradient(ellipse 60% 30% at 40% 35%, ${c1 ?? '#ffffff'}aa, transparent 70%), radial-gradient(ellipse 50% 25% at 65% 70%, ${c2 ?? c1 ?? '#ffffff'}88, transparent 70%), ${c0}cc`
  if (pattern === 'split') return stripes(list.length > 1 ? list : [c0, '#1a1a1a'])
  return list.length > 1 ? sectors(list) : c0
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
    <span className="vinyl-disc" style={{ background: vinylBackground(discsOf(item)[0].colors, discsOf(item)[0].pattern, item.cover_url) }}>
      <span className="vinyl-disc-grooves" />
      <span className="vinyl-disc-label" style={item.cover_url ? { backgroundImage: `url("${item.cover_url}")` } : undefined}>
        <span className="vinyl-disc-hole" />
      </span>
    </span>
  )
}

export function VinylColorLabel({ item }) {
  const discs = discsOf(item)
  const name = (d) => d.name + (d.pattern && d.pattern !== 'solid' ? ` · ${patternName(d.pattern)}` : '')
  const allSame = discs.every((d) => name(d) === name(discs[0]))
  return (
    <span className="vinyl-label">
      <span className="vinyl-dots">
        {discs.map((d, i) => (
          <VinylDot key={i} color={d.colors} pattern={d.pattern} cover={item.thumb_url} />
        ))}
      </span>
      <span className="vinyl-label-text">{allSame ? name(discs[0]) : discs.map(name).join(' + ')}</span>
      {item.signed && <span className="badge">✍︎ Signiert</span>}
    </span>
  )
}
