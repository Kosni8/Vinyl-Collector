/** Helpers for the list of ordered records that have not arrived yet. */

export const DATE_KINDS = [
  { id: 'delivery', label: 'Lieferdatum', short: 'Lieferung' },
  { id: 'release', label: 'Release-Datum', short: 'Release' },
]

const DAY = 86400000
const today = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
// 'YYYY-MM-DD' as a local date (new Date('YYYY-MM-DD') would be UTC midnight)
const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Text for an order's date, e.g. "Lieferung · 12. Nov. · morgen". */
export function orderDateText(order) {
  if (!order.date) return null
  const kind = DATE_KINDS.find((k) => k.id === order.date_kind) ?? DATE_KINDS[0]
  const d = parse(order.date)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  const text = d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
  const days = Math.round((d - today()) / DAY)
  const rel = days === 0 ? 'heute' : days === 1 ? 'morgen' : days > 1 && days <= 7 ? `in ${days} Tagen` : null
  return `${kind.short} · ${text}${rel ? ' · ' + rel : ''}`
}

/** True when the date is today or already passed. */
export const isDue = (order) => !!order.date && parse(order.date) <= today()

/** Soonest date first, orders without a date at the end (oldest first). */
export const sortOrders = (orders) =>
  [...orders].sort((a, b) => {
    if (a.date && b.date) return a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    if (a.date) return -1
    if (b.date) return 1
    return a.created_at < b.created_at ? -1 : 1
  })

/** A placeholder is an ordered record that is not on Discogs yet. */
export const isPlaceholder = (order) => order.discogs_release_id == null

// The placeholder being looked for in the search ("Ist da" or "Auf Discogs suchen").
// Kept in sessionStorage so it survives a reload of the app.
const KEY = 'pending-placeholder'
export function getPendingPlaceholder() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) ?? null
  } catch {
    return null
  }
}
export function setPendingPlaceholder(order) {
  try {
    if (order) sessionStorage.setItem(KEY, JSON.stringify({ id: order.id, title: order.title, artist: order.artist }))
    else sessionStorage.removeItem(KEY)
  } catch {
    /* private mode: works until the page is closed */
  }
  window.dispatchEvent(new Event('pending-placeholder'))
}
