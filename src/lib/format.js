const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export const money = (v, currency = 'EUR') => {
  if (v == null || v === '') return '–'
  if (currency && currency !== 'EUR') {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(v)
  }
  return eur.format(v)
}

export const dateDe = (d) =>
  d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

export const VINYL_COLORS = [
  { name: 'Schwarz', hex: '#1a1a1a' },
  { name: 'Weiß', hex: '#f4f1ea' },
  { name: 'Transparent', hex: '#d9e4e8' },
  { name: 'Rot', hex: '#c0392b' },
  { name: 'Orange', hex: '#e67e22' },
  { name: 'Gelb', hex: '#f1c40f' },
  { name: 'Grün', hex: '#2e8b57' },
  { name: 'Blau', hex: '#2e6fd8' },
  { name: 'Hellblau', hex: '#8ec5f0' },
  { name: 'Lila', hex: '#8e44ad' },
  { name: 'Pink', hex: '#f78fb3' },
  { name: 'Gold', hex: '#c9a227' },
  { name: 'Silber', hex: '#b8bcc2' },
  { name: 'Braun', hex: '#7b4a2d' },
]

export const VINYL_PATTERNS = [
  { id: 'solid', name: 'Einfarbig' },
  { id: 'translucent', name: 'Translucent' },
  { id: 'marbled', name: 'Marmoriert' },
  { id: 'splatter', name: 'Splatter' },
  { id: 'glitter', name: 'Glitzer' },
  { id: 'split', name: 'Split' },
  { id: 'liquid', name: 'Liquid Filled' },
  { id: 'filled', name: 'Filled (anderes)' },
  { id: 'picture', name: 'Picture Disc' },
]

/**
 * A record can have several patterns, stored comma separated ("translucent,splatter").
 * Always in list order: the first one is the base, the others are drawn on top.
 */
export const patternList = (value) => {
  const ids = (value || 'solid').split(',').filter(Boolean)
  const order = (id) => {
    const i = VINYL_PATTERNS.findIndex((p) => p.id === id)
    return i < 0 ? 99 : i
  }
  return [...new Set(ids)].sort((a, b) => order(a) - order(b))
}
export const patternName = (value) =>
  patternList(value).map((id) => VINYL_PATTERNS.find((p) => p.id === id)?.name ?? id).join(' + ')

export const SIZES = ['12"', '10"', '7"', '4"']

// Fixed shapes; anything else in `shape` is the user's own text ("Eigenes").
export const SHAPES = [
  { id: 'heart', name: 'Herz' },
  { id: 'cloud', name: 'Wolke' },
  { id: 'star', name: 'Stern' },
  { id: 'moth', name: 'Motte' },
]
const LEGACY_SHAPES = { triangle: 'Dreieck', hexagon: 'Sechseck', square: 'Quadrat', other: 'Andere' }
export const isOwnShape = (shape) => !!shape && !SHAPES.some((s) => s.id === shape)
/** Fixed shape id for `shape`, also when it was typed as own text ("Wolke", "motte"); else null. */
export const shapeId = (shape) => {
  if (!shape) return null
  const t = String(shape).trim().toLowerCase()
  return SHAPES.find((s) => s.id === t || s.name.toLowerCase() === t)?.id ?? null
}
export const shapeName = (shape) => SHAPES.find((s) => s.id === shape)?.name ?? LEGACY_SHAPES[shape] ?? shape ?? ''

// Goldmine grading as Discogs uses it; `discogs` is the key of the price suggestion.
export const CONDITIONS = [
  { id: 'M', name: 'Mint', discogs: 'Mint (M)' },
  { id: 'NM', name: 'Near Mint', discogs: 'Near Mint (NM or M-)' },
  { id: 'VG+', name: 'Very Good Plus', discogs: 'Very Good Plus (VG+)' },
  { id: 'VG', name: 'Very Good', discogs: 'Very Good (VG)' },
  { id: 'G+', name: 'Good Plus', discogs: 'Good Plus (G+)' },
  { id: 'G', name: 'Good', discogs: 'Good (G)' },
  { id: 'F', name: 'Fair', discogs: 'Fair (F)' },
  { id: 'P', name: 'Poor', discogs: 'Poor (P)' },
]
export const conditionName = (id) => CONDITIONS.find((c) => c.id === id)?.name ?? ''

export const MAX_DISCS = 4
export const MAX_DISC_COLORS = 3

/** Name for a set of colours, e.g. "Rot / Weiß". Unknown hex values become "Individuell". */
export const colorsName = (colors) =>
  colors.map((hex) => VINYL_COLORS.find((c) => c.hex === hex)?.name ?? 'Individuell').join(' / ')

/**
 * The records of an item: [{ colors: [hex…], name, pattern }]. Older items only have
 * vinyl_color / vinyl_color_name / vinyl_pattern; they count as one record.
 */
export function discsOf(item = {}) {
  if (Array.isArray(item.discs) && item.discs.length) return item.discs
  return [
    {
      colors: [item.vinyl_color ?? '#1a1a1a'],
      name: item.vinyl_color_name ?? 'Schwarz',
      pattern: item.vinyl_pattern ?? 'solid',
    },
  ]
}

/** Size and number of records from a Discogs release's formats ({ size, count }). */
export function vinylFormatDefaults(formats = []) {
  const vinyl = formats.filter((f) => f.name === 'Vinyl')
  const count = vinyl.reduce((n, f) => n + (Number(f.qty) || 1), 0)
  const descs = vinyl.flatMap((f) => f.descriptions ?? [])
  let size = SIZES.find((s) => descs.includes(s)) ?? null
  if (!size && descs.includes('LP')) size = '12"'
  return { size, count: Math.min(MAX_DISCS, Math.max(1, count || 1)) }
}

/** Same as vinylFormatDefaults, read from a stored format text like '2× Vinyl (LP, 12", Album)'. */
export function formatTextDefaults(text = '') {
  const count = (text ?? '')
    .split(' + ')
    .map((part) => part.match(/^(?:(\d+)×\s*)?Vinyl/))
    .filter(Boolean)
    .reduce((n, m) => n + (Number(m[1]) || 1), 0)
  const size = SIZES.find((s) => text?.includes(s)) ?? (/\bLP\b/.test(text ?? '') ? '12"' : null)
  return { size, count: Math.min(MAX_DISCS, Math.max(1, count || 1)) }
}

/** Size of an item; older items without a stored size fall back to their Discogs format text. */
export const sizeOf = (item) => item.size ?? formatTextDefaults(item.format).size

/** Short format line for the collection list, e.g. '7" • 2x Vinyl'. */
export function formatShort(item) {
  const count = item.disc_count ?? formatTextDefaults(item.format).count
  return [sizeOf(item), `${count}x Vinyl`].filter(Boolean).join(' • ')
}

// Rough colour groups for the collection filter, so the list stays short however
// many shades are in the collection.
export const COLOR_GROUPS = [
  { id: 'red', name: 'Rot', hex: '#c0392b' },
  { id: 'blue', name: 'Blau', hex: '#2e6fd8' },
  { id: 'green', name: 'Grün', hex: '#2e8b57' },
  { id: 'yellow', name: 'Gelb', hex: '#f1c40f' },
  { id: 'brown', name: 'Braun', hex: '#7b4a2d' },
  { id: 'black', name: 'Schwarz', hex: '#1a1a1a' },
  { id: 'white', name: 'Weiß', hex: '#f4f1ea' },
  { id: 'clear', name: 'Durchsichtig', hex: '#d9e4e8', pattern: 'translucent' },
  { id: 'pink', name: 'Pink', hex: '#f78fb3' },
]

/** Group of one colour: by hue, grey/black/white by low saturation. */
export function colorGroupOf(hex = '#000000') {
  const n = parseInt(hex.slice(1, 7), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))
  // greys go to whichever of black or white is closer
  if (sat < 0.18 || l < 0.12 || l > 0.9) return l < 0.5 ? 'black' : 'white'
  let h = 0
  if (max === r) h = ((g - b) / (max - min)) % 6
  else if (max === g) h = (b - r) / (max - min) + 2
  else h = (r - g) / (max - min) + 4
  h = (h * 60 + 360) % 360
  // brown = dark or dull orange
  if (h >= 10 && h < 50 && (l < 0.45 || (sat < 0.5 && l < 0.7))) return 'brown'
  if (h >= 290 || h < 15) return l > 0.68 || (h >= 290 && h < 340) ? 'pink' : 'red'
  if (h < 68) return 'yellow' // incl. orange and gold
  if (h < 170) return 'green'
  if (h < 265) return 'blue' // incl. light blue and violet-blue
  return 'pink' // purple / magenta
}

/** All colour groups of an item (every colour of every record, clear ones too). */
export function colorGroupsOfItem(item) {
  const groups = new Set()
  for (const d of discsOf(item)) {
    for (const c of d.colors) {
      // the preset "Transparent" is a pale blue-grey: count it as clear only
      if (c.toLowerCase() === '#d9e4e8') groups.add('clear')
      else groups.add(colorGroupOf(c))
    }
    if (patternList(d.pattern).some((p) => p === 'translucent' || p === 'liquid') || /transparent|clear|durchsichtig|klar/i.test(d.name ?? '')) groups.add('clear')
  }
  return groups
}

/** All patterns of an item (every record). */
export const patternsOfItem = (item) => new Set(discsOf(item).flatMap((d) => patternList(d.pattern)))
