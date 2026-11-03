import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase.js'

/** Calls the "discogs" Edge Function (the Discogs token lives only there). */
async function call(action, params = {}, { raw = false } = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(`${SUPABASE_URL}/functions/v1/discogs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...params }),
  })
  if (!res.ok) {
    let msg = `Fehler ${res.status}`
    try {
      msg = (await res.json()).error ?? msg
    } catch {}
    if (res.status === 429) msg = 'Discogs-Limit erreicht, bitte kurz warten.'
    throw new Error(msg)
  }
  return raw ? res : res.json()
}

export const searchVinyl = (q, page = 1) => call('search', { q, page })
export const searchBarcode = (barcode) => call('search', { barcode })
export const getRelease = (id) => call('release', { id })
export const getPrices = (id) => call('prices', { id })
export const addToDiscogsCollection = (id) => call('addToCollection', { id })
export const removeFromDiscogsCollection = (id, instance_id) =>
  call('removeFromCollection', { id, instance_id })
export const fetchImageBlob = async (url) => (await call('image', { url }, { raw: true })).blob()

// --- normalisation helpers --------------------------------------------------

/** Removes Discogs' disambiguation suffix: "Prince (2)" -> "Prince". */
export const cleanName = (name = '') => name.replace(/\s\(\d+\)$/, '').replace(/\*$/, '')

export function artistString(artists = []) {
  return artists
    .map((a, i) => {
      const sep = i < artists.length - 1 ? (a.join && a.join !== ',' ? ` ${a.join} ` : ', ') : ''
      return cleanName(a.anv || a.name) + sep
    })
    .join('')
}

/** "Vinyl (LP, Album, Limited Edition)" from a release's formats array. */
export function formatString(formats = []) {
  return formats
    .map((f) => {
      const qty = Number(f.qty) > 1 ? `${f.qty}× ` : ''
      const desc = [...(f.descriptions ?? []), f.text].filter(Boolean)
      return `${qty}${f.name}${desc.length ? ` (${desc.join(', ')})` : ''}`
    })
    .join(' + ')
}

/** Search result -> list row shape shared with collection items. */
export function fromSearchResult(r) {
  const [artist, ...rest] = (r.title ?? '').split(' - ')
  const fmt = r.format ?? []
  const vinylIdx = fmt.indexOf('Vinyl')
  const details = fmt.filter((f, i) => i !== vinylIdx && f !== 'Vinyl')
  return {
    discogs_release_id: r.id,
    title: rest.length ? rest.join(' - ') : artist,
    artist: rest.length ? cleanName(artist) : '',
    year: r.year ? Number(r.year) : null,
    format: `Vinyl${details.length ? ` (${details.join(', ')})` : ''}`,
    country: r.country,
    label: r.label?.[0],
    cover_url: r.cover_image,
    thumb_url: r.thumb,
  }
}

/** Full release -> fields stored on a collection item. */
export function fromRelease(release) {
  const images = (release.images ?? []).map((i) => ({ uri: i.uri, uri150: i.uri150, type: i.type }))
  const primary = images.find((i) => i.type === 'primary') ?? images[0]
  return {
    discogs_release_id: release.id,
    title: release.title,
    artist: artistString(release.artists),
    year: release.year || null,
    format: formatString(release.formats),
    country: release.country ?? null,
    label: release.labels?.[0] ? cleanName(release.labels[0].name) : null,
    cover_url: primary?.uri ?? null,
    thumb_url: primary?.uri150 ?? release.thumb ?? null,
    images,
  }
}
