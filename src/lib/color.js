import { fetchImageBlob } from './discogs.js'

const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/**
 * Finds the most characteristic colour of an image: pixels are bucketed by
 * colour, buckets are weighted by size and saturation so a vivid colour wins
 * over large grey/white areas.
 */
export function dominantColor(bitmap) {
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

  let best = null
  let bestScore = -1
  for (const bk of buckets.values()) {
    const r = bk.r / bk.n, g = bk.g / bk.n, b = bk.b / bk.n
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const sat = max === 0 ? 0 : (max - min) / max
    const light = (max + min) / 510
    // prefer saturated, mid-light colours, but still let large areas count
    const score = bk.n * (0.25 + sat) * (1 - Math.abs(light - 0.5))
    if (score > bestScore) {
      bestScore = score
      best = { r, g, b }
    }
  }
  return best ? hex(best.r, best.g, best.b) : '#999999'
}

/** Dominant colour of a Discogs cover (fetched through the Edge Function for CORS). */
export async function coverColor(url) {
  if (!url) return null
  try {
    const blob = await fetchImageBlob(url)
    const bitmap = await createImageBitmap(blob)
    return dominantColor(bitmap)
  } catch (e) {
    console.warn('Farbe konnte nicht ermittelt werden', e)
    return null
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
