import { useState } from 'react'
import { Btn } from '../components/UI.jsx'
import AdminInicio from './admin/AdminInicio.jsx'
import AdminSocios from './admin/AdminSocios.jsx'
import AdminPrestamos from './admin/AdminPrestamos.jsx'
import AdminPagos from './admin/AdminPagos.jsx'
import AdminPrestaya from './admin/AdminPrestaya.jsx'
import AdminCaja from './admin/AdminCaja.jsx'
import AdminAuditoria from './admin/AdminAuditoria.jsx'
import AdminConfig from './admin/AdminConfig.jsx'

const PAGES = [
  { id:'inicio', label:'Inicio', icon:'⊞' },
  { id:'socios', label:'Socios', icon:'👥' },
  { id:'prestamos', label:'Préstamos', icon:'💳' },
  { id:'pagos', label:'Pagos', icon:'✅' },
  { id:'prestaya', label:'PrestaYA', icon:'⚡' },
  { id:'caja', label:'Caja', icon:'🏦' },
  { id:'auditoria', label:'Auditoría', icon:'🛡' },
  { id:'config', label:'Configuración', icon:'⚙' },
]

export default function AdminShell({ db, refresh, onLogout }) {
  const [page, setPage] = useState('inicio')
  const pendPY = db.solicitudesPrestaya.filter(s => s.estado === 'pendiente').length

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <aside className="sidebar" style={{ width:220, background:'var(--surface)', borderRight:'0.5px solid var(--border)', display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', flexShrink:0 }}>
        <div style={{ padding:'20px 20px 16px', borderBottom:'0.5px solid var(--border)' }}>
          <h1 style={{ fontSize:15, fontWeight:600, margin:0 }}>{db.config.nombre || 'Fondo de Empleados'}</h1>
          <p style={{ fontSize:11, color:'var(--text2)', margin:'2px 0 0' }}>Administrador</p>
        </div>
        <nav style={{ padding:'12px 8px', flex:1 }}>
          {PAGES.map(p => {
            const active = page === p.id
            return (
              <button key={p.id} onClick={() => setPage(p.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:'var(--radius)', cursor:'pointer', color:active?'var(--surface)':'var(--text2)', fontSize:13, background:active?'var(--text)':'transparent', border:'none', width:'100%', textAlign:'left', marginBottom:2, fontWeight:active?500:400, position:'relative' }}>
                <span style={{ fontSize:14 }}>{p.icon}</span>{p.label}
                {p.id === 'prestaya' && pendPY > 0 && <span style={{ marginLeft:'auto', background:'var(--amber)', color:'#fff', borderRadius:999, fontSize:10, padding:'1px 6px', fontWeight:600 }}>{pendPY}</span>}
              </button>
            )
          })}
        </nav>
        <div style={{ padding:'12px 16px', borderTop:'0.5px solid var(--border)' }}>
          <button onClick={onLogout} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', borderRadius:'var(--radius)', border:'0.5px solid var(--border2)', background:'transparent', color:'var(--text2)', fontSize:11, cursor:'pointer', width:'100%' }}>← Cerrar sesión</button>
          <div style={{ marginTop:6, fontSize:10, color:'var(--text3)', textAlign:'center' }}>{db.socios.length} socios · {db.prestamos.length} préstamos</div>
        </div>
      </aside>
      <main className="main-area" style={{ flex:1, padding:'28px 32px', overflowX:'hidden', minWidth:0 }}>
        {page === 'inicio' && <AdminInicio db={db} />}
        {page === 'socios' && <AdminSocios db={db} refresh={refresh} />}
        {page === 'prestamos' && <AdminPrestamos db={db} refresh={refresh} />}
        {page === 'pagos' && <AdminPagos db={db} refresh={refresh} />}
        {page === 'prestaya' && <AdminPrestaya db={db} refresh={refresh} />}
        {page === 'caja' && <AdminCaja db={db} refresh={refresh} />}
        {page === 'auditoria' && <AdminAuditoria db={db} />}
        {page === 'config' && <AdminConfig db={db} refresh={refresh} />}
      </main>
    </div>
  )
}
