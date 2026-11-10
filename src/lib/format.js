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
  { id: 'split', name: 'Split' },
  { id: 'filled', name: 'Filled' },
  { id: 'liquid', name: 'Liquid Filled' },
  { id: 'picture', name: 'Picture Disc' },
]

export const patternName = (id) => VINYL_PATTERNS.find((p) => p.id === id)?.name ?? ''

export const SIZES = ['12"', '10"', '7"', '4"']

// Fixed shapes; anything else in `shape` is the user's own text ("Eigenes").
export const SHAPES = [
  { id: 'heart', name: 'Herz' },
  { id: 'star', name: 'Stern' },
]
const LEGACY_SHAPES = { triangle: 'Dreieck', hexagon: 'Sechseck', square: 'Quadrat', other: 'Andere' }
export const isOwnShape = (shape) => !!shape && !SHAPES.some((s) => s.id === shape)
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
