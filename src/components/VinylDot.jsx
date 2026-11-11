import { useId } from 'react'
import { patternName, patternList, discsOf } from '../lib/format.js'

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

/** A smoky streak that follows the groove direction (around the centre) and drifts in and out. */
function wispPath(rand, short = false) {
  const steps = 16
  let a = rand() * Math.PI * 2
  let r = 20 + rand() * 28
  const span = short ? 0.15 + rand() * 0.55 : 0.5 + rand() * 1.5
  const drift = (rand() - 0.5) * 9 // radius change over the whole streak
  const wobble = 0.6 + rand() * 1.6
  const phase = rand() * 6
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const rr = Math.min(49, Math.max(19, r + drift * t + wobble * Math.sin(phase + t * 7)))
    pts.push(polar(rr, a + span * t))
  }
  return 'M' + pts.map((p) => p.map((v) => v.toFixed(2)).join(' ')).join('L')
}

/** Splash streak: round head nearer the centre, tapering to a point outwards. */
function streakPath(rand) {
  const a = rand() * Math.PI * 2 + (rand() - 0.5) * 0.15
  const r0 = 19 + rand() * 27
  const len = 2 + rand() * rand() * 15
  const w = 0.3 + rand() * 1.15
  const [hx, hy] = polar(r0, a)
  const [tx, ty] = polar(Math.min(50, r0 + len), a + (rand() - 0.5) * 0.04)
  const nx = -Math.sin(a) * w, ny = Math.cos(a) * w
  const f = (v) => v.toFixed(2)
  return `M${f(hx + nx)} ${f(hy + ny)}A${f(w)} ${f(w)} 0 0 1 ${f(hx - nx)} ${f(hy - ny)}L${f(tx)} ${f(ty)}Z`
}

/** Four-pointed sparkle star. */
function starPath(x, y, r) {
  const f = (v) => v.toFixed(2)
  const k = r * 0.22
  return `M${f(x)} ${f(y - r)}Q${f(x + k)} ${f(y - k)} ${f(x + r)} ${f(y)}Q${f(x + k)} ${f(y + k)} ${f(x)} ${f(y + r)}Q${f(x - k)} ${f(y + k)} ${f(x - r)} ${f(y)}Q${f(x - k)} ${f(y - k)} ${f(x)} ${f(y - r)}Z`
}

/**
 * One pattern. `overlay`: drawn on top of another pattern, so only the marks are drawn
 * (no background); patterns that are only a background then draw nothing.
 */
function PatternFill({ uid, colors, pattern, cover, seedText, overlay = false }) {
  const [c0 = '#1a1a1a', c1, c2] = colors
  const rand = rng(seedText)
  if (overlay && ['solid', 'split', 'picture'].includes(pattern)) return null
  const base = (fill, props) => (overlay ? null : <rect width="100" height="100" fill={fill} {...props} />)
  switch (pattern) {
    case 'glitter': { // dense, fine metallic sparkle with a few bright glints
      const sparkle = colors.length > 1 ? colors.slice(1) : [luminance(c0) > 0.6 ? '#b8912a' : '#fff1c4']
      const shades = [...sparkle, '#ffffff', luminance(c0) > 0.5 ? '#00000055' : '#ffffff99']
      const specks = []
      // grain: light and dark flecks in the record's own colour, so the whole surface shimmers
      for (let i = 0; i < 700; i++) {
        const [x, y] = polar(16 + Math.sqrt(rand()) * 34, rand() * Math.PI * 2)
        specks.push(<circle key={`g${i}`} cx={x} cy={y} r={0.25 + rand() * 0.45} fill={i % 2 ? '#ffffff' : '#000000'} opacity={0.08 + rand() * 0.18} />)
      }
      // the glitter itself
      for (let i = 0; i < 650; i++) {
        const [x, y] = polar(16 + Math.sqrt(rand()) * 34, rand() * Math.PI * 2)
        specks.push(<circle key={i} cx={x} cy={y} r={0.15 + rand() * 0.4} fill={shades[i % shades.length]} opacity={0.4 + rand() * 0.6} />)
      }
      for (let i = 0; i < 5; i++) {
        const [x, y] = polar(22 + rand() * 25, rand() * Math.PI * 2)
        specks.push(<path key={`s${i}`} d={starPath(x, y, 0.9 + rand() * 0.9)} fill="#ffffff" opacity={0.9} />)
      }
      return (
        <>
          <radialGradient id={`${uid}gl`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.12" />
          </radialGradient>
          {base(c0)}
          {specks}
          <rect width="100" height="100" fill={`url(#${uid}gl)`} />
        </>
      )
    }
    case 'picture':
      return cover ? (
        <image href={cover} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" />
      ) : (
        <rect width="100" height="100" fill={c0} />
      )
    case 'translucent':
      if (overlay) return <circle cx="36" cy="32" r="30" fill="#ffffff" opacity="0.18" />
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
    case 'marbled': { // smoky colour swirls running around the record
      const smoke = colors.length > 1 ? colors.slice(1) : [luminance(c0) > 0.55 ? '#2b2622' : '#e9e4dc']
      const soft = [], sharp = []
      for (let i = 0; i < 42; i++) {
        soft.push(
          <path key={i} d={wispPath(rand)} stroke={smoke[i % smoke.length]} strokeWidth={3 + rand() * 6}
            strokeOpacity={0.1 + rand() * 0.22} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
        )
      }
      for (let i = 0; i < 22; i++) {
        sharp.push(
          <path key={i} d={wispPath(rand, true)} stroke={smoke[i % smoke.length]} strokeWidth={0.5 + rand() * 1.6}
            strokeOpacity={0.35 + rand() * 0.45} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
        )
      }
      return (
        <>
          <filter id={`${uid}sm`} x="-10" y="-10" width="120" height="120" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <filter id={`${uid}sh`} x="-10" y="-10" width="120" height="120" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
          {base(c0)}
          <g filter={`url(#${uid}sm)`}>{soft}</g>
          <g filter={`url(#${uid}sh)`}>{sharp}</g>
        </>
      )
    }
    case 'splatter': { // splashes flung outwards from the centre
      const splat = colors.length > 1 ? colors.slice(1) : [contrast(c0)]
      const marks = []
      for (let i = 0; i < 90; i++) {
        marks.push(<path key={i} d={streakPath(rand)} fill={splat[i % splat.length]} />)
      }
      for (let i = 0; i < 40; i++) {
        const [x, y] = polar(19 + rand() * 30, rand() * Math.PI * 2)
        marks.push(<circle key={`d${i}`} cx={x} cy={y} r={0.25 + rand() * 0.7} fill={splat[i % splat.length]} />)
      }
      return (
        <>
          {base(c0)}
          {marks}
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
          {base(c0)}
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
          {base(c1 ? c0 : '#d9e4e8', { opacity: 0.6 })}
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
          {patternList(pattern).map((p, i, all) => (
            <PatternFill
              key={p}
              uid={uid + i}
              // a clear base under other patterns keeps to the first colour; the others are for the marks on top
              colors={i === 0 && all.length > 1 && p === 'translucent' ? list.slice(0, 1) : list}
              pattern={p}
              cover={cover}
              seedText={list.join() + p}
              overlay={i > 0}
            />
          ))}
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
export function VinylDisc({ item, disc = 0 }) {
  const all = discsOf(item)
  const d = all[disc] ?? all[0]
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
      {showSigned && item.signed && <span className="badge">✍︎ Signiert{item.signed_items?.length ? ': ' + item.signed_items.join(', ') : ''}</span>}
    </span>
  )
}
