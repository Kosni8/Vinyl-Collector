import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { supabase, isConfigured } from './lib/supabase.js'
import { DataProvider, useData } from './lib/store.jsx'
import TabBar from './components/TabBar.jsx'
import Loader from './components/Loader.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Collection from './pages/Collection.jsx'
import ItemDetail from './pages/ItemDetail.jsx'
import Search from './pages/Search.jsx'
import ReleaseDetail from './pages/ReleaseDetail.jsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    // iOS 26 only works out whether to blur the top edge when the page scrolls (a scroll
    // down and up made the blur go away), so give it a tiny scroll after each page change.
    const t = setTimeout(() => {
      if (window.scrollY > 2) return // the page restored its own position (search)
      document.documentElement.style.minHeight = 'calc(100dvh + 2px)'
      window.scrollTo(0, 1)
      requestAnimationFrame(() => {
        if (window.scrollY <= 1) window.scrollTo(0, 0)
        document.documentElement.style.minHeight = ''
      })
    }, 120)
    return () => clearTimeout(t)
  }, [pathname])
  return null
}

/** Solid strip behind the clock on the list pages (see .status-strip); home shows its own top. */
function StatusStrip() {
  const { pathname } = useLocation()
  if (pathname === '/' || pathname.startsWith('/release/') || /^\/sammlung\/./.test(pathname)) return null
  return <div className="status-strip" aria-hidden="true" />
}

function Shell() {
  const { profile, error } = useData()
  if (!profile) {
    if (!error) return <Loader full text="" size={120} />
    return (
      <div className="splash">
        <p className="error">Datenbank nicht erreichbar: {error}</p>
      </div>
    )
  }
  return (
    <>
      <ScrollToTop />
      <StatusStrip />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sammlung" element={<Collection />} />
          <Route path="/sammlung/:id" element={<ItemDetail />} />
          <Route path="/suche" element={<Search />} />
          <Route path="/release/:id" element={<ReleaseDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isConfigured) {
    return (
      <div className="splash">
        <p>Supabase ist noch nicht konfiguriert. Siehe README.</p>
      </div>
    )
  }
  if (session === undefined) return <Loader full text="" size={120} />
  if (!session) return <Login />
  return (
    <DataProvider key={session.user.id}>
      <Shell />
    </DataProvider>
  )
}
