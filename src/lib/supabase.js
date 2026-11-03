import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

const BUCKET = 'photos'

/** Shrinks an image file to max `maxSize` px and re-encodes it as JPEG. */
export async function resizeImage(file, maxSize = 1600, quality = 0.85) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/** Uploads an image to the public "photos" bucket and returns its URL. */
export async function uploadPhoto(file, prefix, maxSize) {
  const blob = await resizeImage(file, maxSize)
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** Deletes a previously uploaded photo (ignores foreign URLs and errors). */
export async function deletePhoto(url) {
  if (!url) return
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return
  await supabase.storage.from(BUCKET).remove([url.slice(i + marker.length)]).catch(() => {})
}
