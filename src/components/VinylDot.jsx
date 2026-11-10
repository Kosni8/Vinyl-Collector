import { useId } from 'react'
import { patternName, discsOf } from '../lib/format.js'

// ---------------------------------------------------------------------------
// Records are drawn as SVG (viewBox 0 0 100 100, centre 50/50, radius 50), so the
// same picture works as a 16 px dot and as the big record on the home shelf.
// ---------------------------------------------------------------------------

const C = 50

/** Small deterministic random generator, so a record looks the same every time. */
function rng(seedText) {
  let h = 2166136261
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

const luminance = (hex = '#000000') => {
  const n = parseInt(hex.slice(1, 7), 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}
/** A colour that stands out on `hex` (for patterns without a second colour). */
const contrast = (hex) => (luminance(hex) > 0.55 ? '#1a1a1a' : '#f4f1ea')

const polar = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)]

/** Closed wavy ring path around the centre: radius r with a gentle wobble. */
function blobPath(r, wobble, rand) {
  const k1 = 3 + Math.floor(rand() * 3), k2 = 5 + Math.floor(rand() * 3)
  const p1 = rand() * 6, p2 = rand() * 6
  const pts = []
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    pts.push(polar(r + wobble * (0.6 * Math.sin(k1 * a + p1) + 0.4 * Math.sin(k2 * a + p2)), a))
  }
  return 'M' + pts.map((p) => p.map((v) => v.toFixed(2)).join(' ')).join('L') + 'Z'
}

function sectorPath(i, n) {
  if (n === 1) return null
  const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2
  const [x0, y0] = polar(51, a0), [x1, y1] = polar(51, a1)
  return `M${C} ${C}L${x0} ${y0}A51 51 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}Z`
}

/**
 * Marble swirls: soft-edged blobs of one colour from low-frequency noise, pulled
 * into swirls by a second noise (displacement), like colours stirred into the vinyl.
 */
function MarbleLayer({ id, color, seed, opacity = 1, freq = "0.012 0.04", cut = 0.52 }) {
  // alpha = (noise - cut) * 9  → blob shapes with a soft edge
  const alpha = `9 0 0 0 ${(-cut * 9).toFixed(2)}`
  return (
    <>
      <filter id={id} x="0" y="0" width="100" height="100" filterUnits="userSpaceOnUse">
        <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="2" seed={seed} result="noise" />
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="1" seed={seed + 11} result="warp" />
        <feDisplacementMap in="noise" in2="warp" scale="40" xChannelSelector="R" yChannelSelector="G" result="swirl" />
        <feColorMatrix in="swirl" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${alpha}`} result="blobs" />
        <feGaussianBlur in="blobs" stdDeviation="0.5" result="soft" />
        <feFlood floodColor={color} floodOpacity={opacity} />
        <feComposite operator="in" in2="soft" />
      </filter>
      <rect width="100" height="100" filter={`url(#${id})`} />
    </>
  )
}

function PatternFill({ uid, colors, pattern, cover, seedText }) {
  const [c0 = '#1a1a1a', c1, c2] = colors
  const rand = rng(seedText)
  switch (pattern) {
    case 'picture':
      return cover ? (
        <image href={cover} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" />
      ) : (
        <rect width="100" height="100" fill={c0} />
      )
    case 'translucent':
      return (
        <>
          {colors.length > 1 ? (
            colors.map((c, i) => <path key={i} d={sectorPath(i, colors.length)} fill={c} opacity="0.55" />)
          ) : (
            <rect width="100" height="100" fill={c0} opacity="0.55" />
          )}
          <circle cx="36" cy="32" r="30" fill="#ffffff" opacity="0.18" />
        </>
      )
    case 'marbled': {
      const second = c1 ?? (luminance(c0) > 0.55 ? '#6b6b6b' : '#f4f1ea')
      return (
        <>
          <rect width="100" height="100" fill={c0} />
          <MarbleLayer id={`${uid}m1`} color={second} seed={Math.floor(rand() * 90) + 1} cut={0.5} />
          {c2 && <MarbleLayer id={`${uid}m2`} color={c2} seed={Math.floor(rand() * 90) + 1} freq="0.016 0.05" cut={0.56} />}
          {!c2 && <MarbleLayer id={`${uid}m2`} color={contrast(second)} seed={Math.floor(rand() * 90) + 1} freq="0.02 0.06" cut={0.62} opacity={0.3} />}
        </>
      )
    }
    case 'splatter': {
      const splat = colors.length > 1 ? colors.slice(1) : [contrast(c0)]
      const dots = []
      for (let i = 0; i < 38; i++) {
        const big = rand() < 0.3
        const r = big ? 2.6 + rand() * 3 : 0.7 + rand() * 1.6
        const [x, y] = polar(Math.sqrt(rand()) * 47, rand() * Math.PI * 2)
        const fill = splat[i % splat.length]
        dots.push(
          big ? (
            <path key={i} d={blobPath(r, r * 0.22, rand)} transform={`translate(${x - C} ${y - C})`} fill={fill} />
          ) : (
            <circle key={i} cx={x} cy={y} r={r} fill={fill} />
          ),
        )
        if (big) {
          // little droplets around a big splash
          for (let j = 0; j < 3; j++) {
            const [dx, dy] = [x + (rand() - 0.5) * r * 3.2, y + (rand() - 0.5) * r * 3.2]
            dots.push(<circle key={`${i}-${j}`} cx={dx} cy={dy} r={0.4 + rand() * 0.8} fill={fill} />)
          }
        }
      }
      return (
        <>
          <rect width="100" height="100" fill={c0} />
          {dots}
        </>
      )
    }
    case 'split':
      return (colors.length > 1 ? colors : [c0, contrast(c0)]).map((c, i, all) => (
        <rect key={i} x={(i * 100) / all.length} y="0" width={100 / all.length + 0.5} height="100" fill={c} />
      ))
    case 'filled': // one colour inside another
      return (
        <>
          <rect width="100" height="100" fill={c0} />
          <path d={blobPath(31, 3.5, rand)} fill={c1 ?? contrast(c0)} />
          {c2 && <path d={blobPath(22, 2.5, rand)} fill={c2} />}
        </>
      )
    case 'liquid': { // clear record with a ring of liquid (and glitter) inside
      const liquid = c1 ?? (colors.length === 1 ? c0 : '#5bc0eb')
      const glitter = []
      for (let i = 0; i < 40; i++) {
        const [x, y] = polar(22 + rand() * 17, rand() * Math.PI * 2)
        glitter.push(<circle key={i} cx={x} cy={y} r={0.35 + rand() * 0.7} fill={c2 ?? '#ffffff'} opacity={0.6 + rand() * 0.4} />)
      }
      return (
        <>
          <rect width="100" height="100" fill={c1 ? c0 : '#d9e4e8'} opacity="0.6" />
          <mask id={`${uid}lq`}>
            <path d={blobPath(39, 2.2, rand)} fill="#fff" />
            <path d={blobPath(21, 1.5, rand)} fill="#000" />
          </mask>
          <rect width="100" height="100" fill={liquid} opacity="0.9" mask={`url(#${uid}lq)`} />
          <ellipse cx="40" cy="30" rx="10" ry="4" fill="#fff" opacity="0.45" transform="rotate(-30 40 30)" />
          {glitter}
          <circle cx={C} cy={C} r="40" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.8" />
        </>
      )
    }
    default: // solid; several colours become equal sectors
      return colors.length > 1 ? (
        colors.map((c, i) => <path key={i} d={sectorPath(i, colors.length)} fill={c} />)
      ) : (
        <rect width="100" height="100" fill={c0} />
      )
  }
}

/**
 * A record in its colours and pattern. Small (dot) version has a plain hole;
 * `big` adds grooves, sheen and the cover as centre label.
 */
export function VinylArt({ colors = '#1a1a1a', pattern = 'solid', cover, size, big = false, label }) {
  const uid = 'v' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const list = (Array.isArray(colors) ? colors : [colors]).filter(Boolean)
  const holeR = big ? 2.2 : 15
  return (
    <svg
      className={big ? 'vinyl-art big' : 'vinyl-art'}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`${uid}c`}>
          <circle cx={C} cy={C} r={C} />
        </clipPath>
        <mask id={`${uid}h`}>
          <rect width="100" height="100" fill="#fff" />
          <circle cx={C} cy={C} r={holeR} fill="#000" />
        </mask>
        {big && label && (
          <clipPath id={`${uid}l`}>
            <circle cx={C} cy={C} r="18" />
          </clipPath>
        )}
      </defs>
      <g mask={`url(#${uid}h)`}>
        <g clipPath={`url(#${uid}c)`}>
          <PatternFill uid={uid} colors={list} pattern={pattern} cover={cover} seedText={list.join() + pattern} />
          {big && (
            <>
              {Array.from({ length: 24 }, (_, i) => (
                <circle key={i} cx={C} cy={C} r={20 + i * 1.2} fill="none" stroke="#000" strokeOpacity="0.07" strokeWidth="0.35" />
              ))}
              <path d={`M${C} ${C}L${polar(52, -2.4).join(' ')}L${polar(52, -2.0).join(' ')}Z`} fill="#fff" opacity="0.14" />
              <path d={`M${C} ${C}L${polar(52, 0.75).join(' ')}L${polar(52, 1.1).join(' ')}Z`} fill="#fff" opacity="0.1" />
            </>
          )}
        </g>
        {big && label && (
          <>
            <image href={label} x="32" y="32" width="36" height="36" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${uid}l)`} />
            <circle cx={C} cy={C} r="18" fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="0.6" />
          </>
        )}
      </g>
      <circle cx={C} cy={C} r={C - 0.5} fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <circle cx={C} cy={C} r={holeR} fill="none" stroke="#000" strokeOpacity="0.15" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Small record disc showing the vinyl colour(s) and pattern. */
export function VinylDot({ color = '#1a1a1a', pattern = 'solid', cover, size = 18 }) {
  return <VinylArt colors={color} pattern={pattern} cover={cover} size={size} />
}

/** Large record with grooves, sheen and the cover as centre label. */
export function VinylDisc({ item }) {
  const d = discsOf(item)[0]
  return (
    <span className="vinyl-disc">
      <VinylArt big colors={d.colors} pattern={d.pattern} cover={item.cover_url} label={item.cover_url} />
    </span>
  )
}

export function VinylColorLabel({ item, showSigned = true }) {
  const discs = discsOf(item)
  // pattern always shown, also "Einfarbig", so every record reads the same way
  const name = (d) => `${d.name} · ${patternName(d.pattern || 'solid')}`
  const allSame = discs.every((d) => name(d) === name(discs[0]))
  return (
    <span className="vinyl-label">
      <span className="vinyl-dots">
        {discs.map((d, i) => (
          <VinylDot key={i} color={d.colors} pattern={d.pattern} cover={item.thumb_url} />
        ))}
      </span>
      <span className="vinyl-label-text">{allSame ? name(discs[0]) : discs.map(name).join(' + ')}</span>
      {showSigned && item.signed && <span className="badge">✍︎ Signiert</span>}
    </span>
  )
}
