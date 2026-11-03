import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { supabase, isConfigured } from './lib/supabase.js'
import { DataProvider, useData } from './lib/store.jsx'
import TabBar from './components/TabBar.jsx'
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
  }, [pathname])
  return null
}

function Shell() {
  const { profile, error } = useData()
  if (!profile) {
    return (
      <div className="splash">
        {error ? <p className="error">Datenbank nicht erreichbar: {error}</p> : <p className="muted">Lädt …</p>}
      </div>
    )
  }
  return (
    <>
      <ScrollToTop />
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
  if (session === undefined) return <div className="splash" />
  if (!session) return <Login />
  return (
    <DataProvider key={session.user.id}>
      <Shell />
    </DataProvider>
  )
}
