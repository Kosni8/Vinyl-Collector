const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export const money = (v, currency = 'EUR') => {
  if (v == null || v === '') return '–'
  if (currency && currency !== 'EUR') {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(v)
  }
  return eur.format(v)
}

export const dateDe = (d) => (d ? new Date(d).toLocaleDateString('de-DE') : '')

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
