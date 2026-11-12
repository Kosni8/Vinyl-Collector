import { useCallback } from 'react'
import { useData, SHELF_SLOTS, PRICE_FIELDS } from './store.jsx'
import { fromRelease, addToDiscogsCollection } from './discogs.js'
import { uploadPhoto, deletePhoto } from './supabase.js'
import { coverColor } from './color.js'
import { unwant } from './wantlist.js'
import { getPendingPlaceholder, setPendingPlaceholder } from './orders.js'

/**
 * Adds a Discogs release (as returned by getRelease) to the collection with the
 * details from the add form. Used by the release page and by "Platte ist da"
 * in the ordered list. Returns { item, discogsOk }.
 */
export function useAddToCollection() {
  const { profile, addItem, updateProfile, orders, deleteOrder } = useData()

  return useCallback(
    async (data, form) => {
      const record = fromRelease(data.release)
      const { photoFile, removePhoto, signatureFile, removeSignature, ...details } = form
      const [photo_url, signature_url, spine_color, discogsCopy] = await Promise.all([
        photoFile ? uploadPhoto(photoFile, 'records') : null,
        signatureFile ? uploadPhoto(signatureFile, 'signatures') : null,
        coverColor(record.cover_url),
        addToDiscogsCollection(record.discogs_release_id).catch((e) => {
          console.warn('Discogs-Sammlung', e)
          return null
        }),
      ])
      const item = await addItem({
        ...record,
        ...details,
        photo_url,
        ...(signature_url ? { signature_url } : {}),
        spine_color,
        discogs_instance_id: discogsCopy?.instance_id ?? null,
        ...PRICE_FIELDS(data.prices, details.condition),
      })

      // Put new records on the home shelf while there is room.
      const shelf = Array.from({ length: SHELF_SLOTS }, (_, i) => profile.shelf?.[i] ?? null)
      const free = shelf.indexOf(null)
      const patch = {}
      if (free !== -1) {
        shelf[free] = item.id
        patch.shelf = shelf
      }
      if (!profile.fav_album_id) patch.fav_album_id = item.id
      if (Object.keys(patch).length) await updateProfile(patch)

      // Now owned: take it off the wantlist and off the ordered list.
      // always try: the list shown may be outdated, and Discogs answers 404 if it was not wanted
      await unwant(record.discogs_release_id).catch((e) => console.warn('Wantlist', e))
      // A placeholder being looked for ("Ist da") is done now as well.
      const pending = getPendingPlaceholder()
      const done = orders.filter((o) => o.discogs_release_id === record.discogs_release_id || o.id === pending?.id)
      for (const o of done) {
        await deleteOrder(o.id).catch((e) => console.warn('Bestellt', e))
        if (o.discogs_release_id == null) deletePhoto(o.cover_url)
      }
      if (pending) setPendingPlaceholder(null)

      return { item, discogsOk: !!discogsCopy }
    },
    [profile, addItem, updateProfile, orders, deleteOrder],
  )
}

const releaseCache = new Map()
/** getRelease, kept in memory so going back and forth does not ask Discogs again. */
export async function getReleaseCached(id, getRelease) {
  const key = String(id)
  if (!releaseCache.has(key)) releaseCache.set(key, await getRelease(key))
  return releaseCache.get(key)
}
export const cachedRelease = (id) => releaseCache.get(String(id)) ?? null
