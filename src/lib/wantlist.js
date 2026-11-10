import { useEffect, useState } from 'react'
import { getWantlist, addToWantlist, removeFromWantlist, fromWant } from './discogs.js'

// The Discogs wantlist, kept in memory while the app is open and shared by every
// page (home row, release pages, search badges).
let list = null // [{ discogs_release_id, title, artist, … }] newest first
let loading = null
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn(list))

export function loadWantlist(force = false) {
  if (loading && !force) return loading
  loading = getWantlist()
    .then((d) => {
      list = (d.wants ?? []).map(fromWant)
      emit()
      return list
    })
    .catch((e) => {
      loading = null
      throw e
    })
  return loading
}

/** { wants, error } – wants is null until loaded. refresh: reload even if already loaded. */
export function useWantlist({ refresh = false } = {}) {
  const [wants, setWants] = useState(list)
  const [error, setError] = useState(null)
  useEffect(() => {
    listeners.add(setWants)
    loadWantlist(refresh).catch((e) => !list && setError(e.message))
    return () => listeners.delete(setWants)
  }, [refresh])
  return { wants, error }
}

export const isWanted = (wants, releaseId) => !!wants?.some((w) => w.discogs_release_id === Number(releaseId))

/** Adds a release to the Discogs wantlist; `record` is shown right away. */
export async function want(record) {
  await addToWantlist(record.discogs_release_id)
  const entry = {
    discogs_release_id: Number(record.discogs_release_id),
    title: record.title,
    artist: record.artist,
    year: record.year,
    cover_url: record.cover_url,
    thumb_url: record.thumb_url,
  }
  list = [entry, ...(list ?? []).filter((w) => w.discogs_release_id !== entry.discogs_release_id)]
  emit()
}

export async function unwant(releaseId) {
  await removeFromWantlist(releaseId)
  list = (list ?? []).filter((w) => w.discogs_release_id !== Number(releaseId))
  emit()
}
