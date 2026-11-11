import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { HomeIcon, SearchIcon, ShelfIcon } from './Icons.jsx'

const typesText = (el) =>
  el?.tagName === 'TEXTAREA' ||
  (el?.tagName === 'INPUT' && ['text', 'search', 'number', 'email', 'url', 'tel', 'password', ''].includes(el.type))

/**
 * True while a text field has focus, i.e. the on-screen keyboard is open. On iOS a
 * fixed bar would otherwise ride up above the keyboard while scrolling.
 */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const update = () => setTimeout(() => setOpen(typesText(document.activeElement)), 0)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    return () => {
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
    }
  }, [])
  return open
}

export default function TabBar() {
  const cls = ({ isActive }) => 'tab' + (isActive ? ' active' : '')
  const { pathname } = useLocation()
  const keyboard = useKeyboardOpen()
  if (keyboard) return null
  return (
    <nav className="tabbar">
      <NavLink to="/" end className={cls} aria-label="Home">
        <HomeIcon width={30} height={30} />
        <span>Home</span>
      </NavLink>
      <NavLink
        to="/suche"
        className={cls}
        aria-label="Suche"
        onClick={() => {
          // tapping "Suche" while already on it clears the search
          if (pathname === '/suche') {
            window.dispatchEvent(new Event('search-reset'))
            window.scrollTo(0, 0)
          }
        }}
      >
        <SearchIcon width={30} height={30} />
        <span>Suche</span>
      </NavLink>
      <NavLink to="/sammlung" className={cls} aria-label="Sammlung">
        <ShelfIcon width={30} height={30} />
        <span>Sammlung</span>
      </NavLink>
    </nav>
  )
}
