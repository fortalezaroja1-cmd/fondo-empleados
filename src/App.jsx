import { useState, useEffect } from 'react'
import { loadAll } from './supabase.js'
import { Spinner } from './components/UI.jsx'
import Login from './pages/Login.jsx'
import AdminShell from './pages/AdminShell.jsx'
import SocioPortal from './pages/SocioPortal.jsx'

export default function App() {
  const [db, setDB] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const data = await loadAll()
    setDB(data)
    return data
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  if (loading || !db) return <Spinner />

  if (!session) return <Login db={db} onAdmin={() => setSession({ role: 'admin' })} onSocio={s => setSession({ role: 'socio', socio: s })} />
  if (session.role === 'admin') return <AdminShell db={db} refresh={refresh} onLogout={() => setSession(null)} />

  const socioActual = db.socios.find(x => x.id === session.socio.id) || session.socio
  return <SocioPortal socio={socioActual} db={db} refresh={refresh} onLogout={() => setSession(null)} />
}
