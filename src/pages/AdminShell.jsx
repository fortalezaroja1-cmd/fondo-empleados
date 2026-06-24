import {useState} from 'react'
import AdminInicio from './admin/AdminInicio.jsx'
import AdminSocios from './admin/AdminSocios.jsx'
import AdminPrestamos from './admin/AdminPrestamos.jsx'
import AdminPagos from './admin/AdminPagos.jsx'
import AdminPrestaya from './admin/AdminPrestaya.jsx'
import AdminCaja from './admin/AdminCaja.jsx'
import AdminAuditoria from './admin/AdminAuditoria.jsx'
import AdminConfig from './admin/AdminConfig.jsx'
import AdminUsuarios from './admin/AdminUsuarios.jsx'

const PAGES=[
  {id:'inicio',label:'Inicio',icon:'⊞'},
  {id:'socios',label:'Socios',icon:'👥'},
  {id:'prestamos',label:'Préstamos',icon:'💳'},
  {id:'pagos',label:'Pagos',icon:'✅'},
  {id:'prestaya',label:'PrestaYA',icon:'⚡'},
  {id:'caja',label:'Caja',icon:'🏦'},
  {id:'auditoria',label:'Auditoría',icon:'🛡',soloSuper:true},
  {id:'usuarios',label:'Usuarios',icon:'🔐',soloSuper:true},
  {id:'config',label:'Config',icon:'⚙'},
]

export default function AdminShell({db,refresh,perfil,onLogout}){
  const [page,setPage]=useState('inicio')
  const pendPY=db.solicitudesPrestaya.filter(s=>s.estado==='pendiente').length
  const esSuperAdmin=perfil?.rol==='superadmin'
  const pagesVisibles=PAGES.filter(p=>!p.soloSuper||esSuperAdmin)

  return <div style={{display:'flex',flexDirection:'column',height:'100dvh',background:'#f5f4f0'}}>
    {/* Header */}
    <div style={{background:'#fff',borderBottom:'1px solid rgba(0,0,0,0.08)',padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
      <div>
        <div style={{fontSize:16,fontWeight:700}}>{db.config.nombre||'Fondo de Empleados'}</div>
        <div style={{fontSize:12,color:'#6b6b66',display:'flex',alignItems:'center',gap:6}}>
          {perfil?.nombre||'Administrador'}
          <span style={{background:esSuperAdmin?'#FAEEDA':'#E6F1FB',color:esSuperAdmin?'#633806':'#0C447C',padding:'1px 7px',borderRadius:999,fontSize:10,fontWeight:600}}>
            {esSuperAdmin?'Super Admin':'Operativo'}
          </span>
        </div>
      </div>
      <button onClick={onLogout} style={{background:'rgba(0,0,0,0.06)',border:'none',borderRadius:8,padding:'8px 12px',fontSize:13,cursor:'pointer'}}>Salir</button>
    </div>

    {/* Content */}
    <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
      {page==='inicio'&&<AdminInicio db={db}/>}
      {page==='socios'&&<AdminSocios db={db} refresh={refresh} esSuperAdmin={esSuperAdmin}/>}
      {page==='prestamos'&&<AdminPrestamos db={db} refresh={refresh}/>}
      {page==='pagos'&&<AdminPagos db={db} refresh={refresh}/>}
      {page==='prestaya'&&<AdminPrestaya db={db} refresh={refresh}/>}
      {page==='caja'&&<AdminCaja db={db} refresh={refresh} esSuperAdmin={esSuperAdmin}/>}
      {page==='auditoria'&&esSuperAdmin&&<AdminAuditoria db={db}/>}
      {page==='usuarios'&&esSuperAdmin&&<AdminUsuarios db={db} refresh={refresh}/>}
      {page==='config'&&<AdminConfig db={db} refresh={refresh} esSuperAdmin={esSuperAdmin}/>}
    </div>

    {/* Bottom Nav */}
    <div style={{background:'#fff',borderTop:'1px solid rgba(0,0,0,0.08)',display:'flex',flexShrink:0,paddingBottom:'env(safe-area-inset-bottom)'}}>
      {pagesVisibles.map(p=>{
        const active=page===p.id
        return <button key={p.id} onClick={()=>setPage(p.id)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'10px 4px',border:'none',background:'transparent',cursor:'pointer',position:'relative',minWidth:0}}>
          <span style={{fontSize:18}}>{p.icon}</span>
          <span style={{fontSize:9,color:active?'#1a1a18':'#aaa',fontWeight:active?600:400,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%'}}>{p.label}</span>
          {p.id==='prestaya'&&pendPY>0&&<span style={{position:'absolute',top:6,right:'calc(50% - 14px)',background:'#854F0B',color:'#fff',borderRadius:999,fontSize:8,padding:'1px 4px',fontWeight:700}}>{pendPY}</span>}
          {active&&<div style={{position:'absolute',bottom:0,left:'20%',right:'20%',height:2,background:'#1a1a18',borderRadius:2}}/>}
        </button>
      })}
    </div>
  </div>
}
