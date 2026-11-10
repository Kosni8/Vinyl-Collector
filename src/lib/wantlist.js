import { useEffect, useState } from 'react'
import { getWantlist, addToWantlist, removeFromWantlist, fromWant } from './discogs.js'

// The Discogs wantlist, kept in memory while the app is open and shared by every
// page (home row, release pages, search badges).
//
// Discogs serves the wantlist from a cache, so right after adding or removing a
// record a reload can still show the old state. Our own changes are therefore kept
// as "pending" for a while (also across app restarts) and laid over what Discogs
// returns, until Discogs shows the same.
const PENDING_KEY = 'wantlist-pending'
const PENDING_MS = 30 * 60 * 1000

let fetched = null // last list from Discogs
let list = null // fetched + pending changes, newest first
let loading = null
const listeners = new Set()

const readPending = () => {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '{}')
    const now = Date.now()
    return Object.fromEntries(Object.entries(p).filter(([, v]) => now - v.at < PENDING_MS))
  } catch {
    return {}
  }
}
const writePending = (p) => {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(p))
  } catch {}
}
let pending = readPending() // { [releaseId]: { action: 'add' | 'remove', entry?, at } }

function rebuild() {
  const base = fetched ?? []
  const ids = new Set(base.map((w) => w.discogs_release_id))
  // forget pending changes Discogs already shows
  for (const [id, p] of Object.entries(pending)) {
    if ((p.action === 'add' && ids.has(Number(id))) || (p.action === 'remove' && !ids.has(Number(id)))) delete pending[id]
  }
  writePending(pending)
  const adds = Object.values(pending)
    .filter((p) => p.action === 'add')
    .sort((a, b) => b.at - a.at)
    .map((p) => p.entry)
  const removed = new Set(Object.entries(pending).filter(([, p]) => p.action === 'remove').map(([id]) => Number(id)))
  list = fetched || adds.length ? [...adds, ...base.filter((w) => !removed.has(w.discogs_release_id))] : null
  listeners.forEach((fn) => fn(list))
}

export function loadWantlist(force = false) {
  if (loading && !force) return loading
  loading = getWantlist()
    .then((d) => {
      fetched = (d.wants ?? []).map(fromWant)
      rebuild()
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
  const id = Number(record.discogs_release_id)
  await addToWantlist(id)
  pending = readPending()
  pending[id] = {
    action: 'add',
    at: Date.now(),
    entry: {
      discogs_release_id: id,
      title: record.title,
      artist: record.artist,
      year: record.year,
      cover_url: record.cover_url,
      thumb_url: record.thumb_url,
    },
  }
  rebuild()
}

/** Removes a release from the Discogs wantlist. Not being on it counts as success. */
export async function unwant(releaseId) {
  const id = Number(releaseId)
  try {
    await removeFromWantlist(id)
  } catch (e) {
    if (!/404|not found|nicht gefunden/i.test(e.message)) throw e
  }
  pending = readPending()
  pending[id] = { action: 'remove', at: Date.now() }
  rebuild()
}
