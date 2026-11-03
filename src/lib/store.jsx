import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'
import { getPrices } from './discogs.js'

const DataContext = createContext(null)
export const SHELF_SLOTS = 14

const PRICE_FIELDS = (p) => ({
  // keep the last known value if Discogs returns none this time
  ...(p.value != null && (!p.value_currency || p.value_currency === 'EUR') ? { value_eur: p.value } : {}),
  lowest_price_eur: p.lowest_price,
  num_for_sale: p.num_for_sale,
  prices_updated_at: new Date().toISOString(),
})

export function DataProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setError(null)
    const [p, i] = await Promise.all([
      supabase.from('profile').select('*').eq('id', 1).single(),
      supabase.from('collection_items').select('*').order('added_at', { ascending: false }),
    ])
    if (p.error || i.error) setError((p.error || i.error).message)
    if (p.data) setProfile(p.data)
    if (i.data) setItems(i.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const updateProfile = useCallback(async (patch) => {
    setProfile((prev) => ({ ...prev, ...patch }))
    const { data, error } = await supabase
      .from('profile')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }, [])

  const addItem = useCallback(async (row) => {
    const { data, error } = await supabase.from('collection_items').insert(row).select().single()
    if (error) throw error
    setItems((prev) => [data, ...prev])
    return data
  }, [])

  const updateItem = useCallback(async (id, patch) => {
    const { data, error } = await supabase.from('collection_items').update(patch).eq('id', id).select().single()
    if (error) throw error
    setItems((prev) => prev.map((it) => (it.id === id ? data : it)))
    return data
  }, [])

  const deleteItem = useCallback(
    async (id) => {
      const { error } = await supabase.from('collection_items').delete().eq('id', id)
      if (error) throw error
      setItems((prev) => prev.filter((it) => it.id !== id))
      if (profile?.shelf?.includes(id)) {
        await updateProfile({ shelf: profile.shelf.map((s) => (s === id ? null : s)) })
      }
      if (profile?.fav_album_id === id) setProfile((p) => ({ ...p, fav_album_id: null }))
    },
    [profile, updateProfile],
  )

  const refreshPrices = useCallback(
    async (item) => {
      const p = await getPrices(item.discogs_release_id)
      const updated = await updateItem(item.id, PRICE_FIELDS(p))
      return { item: updated, prices: p }
    },
    [updateItem],
  )

  // Refreshes every record one after another (Discogs allows 60 requests/min,
  // each refresh uses two). progress = { done, total } while running.
  const [progress, setProgress] = useState(null)
  const refreshAllPrices = useCallback(async () => {
    if (progress) return
    const list = items
    for (let n = 0; n < list.length; n++) {
      setProgress({ done: n, total: list.length })
      try {
        await refreshPrices(list[n])
      } catch (e) {
        console.warn(e)
      }
      if (n < list.length - 1) await new Promise((r) => setTimeout(r, 2100))
    }
    setProgress(null)
  }, [items, progress, refreshPrices])

  const value = useMemo(
    () => ({ profile, items, loading, error, reload, updateProfile, addItem, updateItem, deleteItem, refreshPrices, refreshAllPrices, progress }),
    [profile, items, loading, error, reload, updateProfile, addItem, updateItem, deleteItem, refreshPrices, refreshAllPrices, progress],
  )
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
export { PRICE_FIELDS }
