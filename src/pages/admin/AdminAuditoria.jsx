import {hoy,fmt} from '../../helpers.js'

export default function AdminAuditoria({db}){
  const alertas=[]
  const n=id=>(db.socios.find(x=>x.id===id)||{}).nombre||'desconocido'
  const saldo=db.caja.reduce((acc,m)=>m.tipo==='ingreso'?acc+m.monto:acc-m.monto,0)
  if(saldo<0)alertas.push({t:'error',msg:`Saldo caja negativo: ${fmt(saldo)}`})
  db.prestamos.forEach(p=>{if(!db.caja.some(m=>m.referencia===p.id&&m.tipo==='desembolso'))alertas.push({t:'warn',msg:`Préstamo de ${n(p.socioId)} sin desembolso en caja`})})
  db.prestamos.forEach(p=>{const s=db.socios.find(x=>x.id===p.socioId);if(!s)return;const esp=p.monto<=s.ahorroAcumulado?2.5:3.5;if(Math.abs(p.tasa-esp)>0.01)alertas.push({t:'error',msg:`${n(p.socioId)}: tasa ${p.tasa}%, debería ser ${esp}%`})})
  db.socios.filter(s=>s.estado==='inactivo').forEach(s=>{const a=db.prestamos.filter(p=>p.socioId===s.id&&p.estado==='activo');if(a.length>0)alertas.push({t:'warn',msg:`Socio inactivo "${s.nombre}" tiene ${a.length} préstamo(s) activo(s)`})})
  const at=db.pagos.filter(p=>p.estado==='atrasado');if(at.length>0)alertas.push({t:'warn',msg:`${at.length} pago(s) atrasados`})
  const pyVenc=db.prestaya.filter(p=>p.estado==='activo'&&p.fechaVencimiento&&p.fechaVencimiento<hoy());if(pyVenc.length>0)alertas.push({t:'error',msg:`${pyVenc.length} PrestaYA vencido(s) sin pagar`})

  const cm={error:{bg:'#FCEBEB',border:'#A32D2D',color:'#791F1F'},warn:{bg:'#FAEEDA',border:'#854F0B',color:'#633806'},ok:{bg:'#EAF3DE',border:'#3B6D11',color:'#27500A'}}

  return <div>
    <div style={{fontSize:22,fontWeight:700,marginBottom:16}}>Auditoría</div>
    {alertas.length===0
      ?<div style={{padding:'16px',borderRadius:12,border:`1px solid ${cm.ok.border}`,background:cm.ok.bg,color:cm.ok.color,fontWeight:500}}>✅ Todo en orden. Sin inconsistencias.</div>
      :<>{alertas.map((a,i)=>{const c=cm[a.t];return <div key={i} style={{padding:'14px 16px',borderRadius:12,border:`1px solid ${c.border}`,background:c.bg,color:c.color,marginBottom:10,fontSize:14}}>{a.t==='error'?'❌':'⚠️'} {a.msg}</div>})}</>}
  </div>
}
