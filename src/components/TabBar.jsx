import { NavLink } from 'react-router-dom'
import { HomeIcon, SearchIcon, ShelfIcon } from './Icons.jsx'

export default function TabBar() {
  const cls = ({ isActive }) => 'tab' + (isActive ? ' active' : '')
  return (
    <nav className="tabbar">
      <NavLink to="/" end className={cls} aria-label="Home">
        <HomeIcon width={30} height={30} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/suche" className={cls} aria-label="Suche">
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
