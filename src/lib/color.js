import { fetchImageBlob } from './discogs.js'

const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/**
 * Scores the colours of an image: pixels are bucketed by colour, buckets are
 * weighted by size and saturation so a vivid colour wins over large grey/white areas.
 * Returns the buckets best first.
 */
function scoredColors(bitmap) {
  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size)

  const buckets = new Map()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 }
    bucket.r += r; bucket.g += g; bucket.b += b; bucket.n++
    buckets.set(key, bucket)
  }

  return [...buckets.values()]
    .map((bk) => {
      const r = bk.r / bk.n, g = bk.g / bk.n, b = bk.b / bk.n
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const sat = max === 0 ? 0 : (max - min) / max
      const light = (max + min) / 510
      // prefer saturated, mid-light colours, but still let large areas count
      const score = bk.n * (0.25 + sat) * (1 - Math.abs(light - 0.5))
      return { r, g, b, n: bk.n, score }
    })
    .sort((x, y) => y.score - x.score)
}

/** The most characteristic colour of an image. */
export function dominantColor(bitmap) {
  const best = scoredColors(bitmap)[0]
  return best ? hex(best.r, best.g, best.b) : '#999999'
}

/**
 * Up to `count` clearly different colours of an image, most characteristic first.
 * Similar buckets are merged so the choice is not five shades of the same red.
 */
export function palette(bitmap, count = 8) {
  const picked = []
  const all = scoredColors(bitmap)
  const pick = (minDist) => {
    for (const c of all) {
      if (picked.length >= count) return
      if (picked.includes(c)) continue
      if (picked.every((p) => Math.hypot(p.r - c.r, p.g - c.g, p.b - c.b) > minDist)) picked.push(c)
    }
  }
  pick(70)
  pick(40) // fill up with closer shades if the cover has few colours
  return picked.map((c) => hex(c.r, c.g, c.b))
}

async function loadCover(url) {
  const blob = await fetchImageBlob(url)
  return createImageBitmap(blob)
}

/** Dominant colour of a Discogs cover (fetched through the Edge Function for CORS). */
export async function coverColor(url) {
  if (!url) return null
  try {
    return dominantColor(await loadCover(url))
  } catch (e) {
    console.warn('Farbe konnte nicht ermittelt werden', e)
    return null
  }
}

/** Colour choices from a Discogs cover; empty list if the cover cannot be loaded. */
export async function coverPalette(url, count) {
  if (!url) return []
  try {
    return palette(await loadCover(url), count)
  } catch (e) {
    console.warn('Farben konnten nicht ermittelt werden', e)
    return []
  }
}

/** Black or white text, whichever reads better on `bg`. */
export function textOn(bg = '#999999') {
  const n = parseInt(bg.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1d1b19' : '#ffffff'
}

/** Mixes `color` with white; amount 0..1 of white. */
export function tint(color = '#999999', amount = 0.8) {
  const n = parseInt(color.slice(1), 16)
  const mix = (c) => c + (255 - c) * amount
  return hex(mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255))
}
