import { useEffect, useState } from 'react'

// Display preferences of this device (not shared): stored in the browser.
const KEY = 'signed-position'
const EVENT = 'prefs-changed'

const read = () => {
  try {
    return localStorage.getItem(KEY) || 'top-right'
  } catch {
    return 'top-right'
  }
}

/** Where the "Signiert" tag sits on the cover in the collection list: 'top-right' | 'bottom-left'. */
export function useSignedPosition() {
  const [pos, setPos] = useState(read)
  useEffect(() => {
    const update = () => setPos(read())
    window.addEventListener(EVENT, update)
    return () => window.removeEventListener(EVENT, update)
  }, [])
  return pos
}

export function setSignedPosition(pos) {
  try {
    localStorage.setItem(KEY, pos)
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}
