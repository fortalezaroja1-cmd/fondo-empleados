import {sb} from '../../supabase.js'
import {uid,hoy,fmt,PRESTAYA_MONTOS} from '../../helpers.js'
import {Badge,Btn,Card,EmptyState} from '../../components/UI.jsx'

export default function AdminPrestaya({db,refresh}){
  const pendientes=db.solicitudesPrestaya.filter(s=>s.estado==='pendiente')

  const aprobar=async id=>{
    const sol=db.solicitudesPrestaya.find(x=>x.id===id)
    const s=db.socios.find(x=>x.id===sol.socioId)
    const pyId=uid()
    await sb.from('prestaya').insert({id:pyId,socio_id:sol.socioId,monto:sol.monto,interes:sol.interes,total:sol.total,fecha_aprobacion:hoy(),fecha_vencimiento:sol.fechaVencimiento,estado:'activo',solicitud_id:id})
    await sb.from('caja').insert({id:uid(),tipo:'desembolso',fecha:hoy(),concepto:`PrestaYA - ${s?.nombre||''}`,monto:sol.monto,referencia:pyId,responsable:'',notas:''})
    await sb.from('solicitudes_prestaya').update({estado:'aprobado',fecha_aprobacion:hoy()}).eq('id',id)
    await refresh()
  }

  const rechazar=async id=>{
    await sb.from('solicitudes_prestaya').update({estado:'rechazado'}).eq('id',id)
    await refresh()
  }

  const pagar=async id=>{
    const py=db.prestaya.find(x=>x.id===id)
    const s=db.socios.find(x=>x.id===py.socioId)
    await sb.from('prestaya').update({estado:'pagado',fecha_pago:hoy()}).eq('id',id)
    await sb.from('caja').insert({id:uid(),tipo:'ingreso',fecha:hoy(),concepto:`Pago PrestaYA - ${s?.nombre||''}`,monto:py.total,referencia:id,responsable:'',notas:''})
    await refresh()
  }

  return <div>
    <div style={{fontSize:22,fontWeight:700,marginBottom:16}}>PrestaYA</div>
    {pendientes.length>0&&<>
      <div style={{fontSize:15,fontWeight:600,color:'var(--amber)',marginBottom:10}}>⏳ Pendientes ({pendientes.length})</div>
      {pendientes.map(sol=>{
        const s=db.socios.find(x=>x.id===sol.socioId)
        return <div key={sol.id} style={{background:'#fff',borderRadius:14,padding:'16px',marginBottom:10,border:'2px solid var(--amber)'}}>
          <strong style={{fontSize:16}}>{s?.nombre||'—'}</strong>
          <div style={{fontSize:13,color:'#6b6b66',margin:'4px 0 10px'}}>Solicitado: {sol.fechaSolicitud}</div>
          {[['Monto',fmt(sol.monto)],['Interés',fmt(sol.interes)],['Total a pagar',fmt(sol.total)]].map(([l,v])=>
            <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:14,padding:'4px 0',borderBottom:'1px solid rgba(0,0,0,0.06)'}}><span>{l}</span><strong>{v}</strong></div>
          )}
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <Btn primary full onClick={()=>aprobar(sol.id)}>✓ Aprobar</Btn>
            <Btn danger full onClick={()=>rechazar(sol.id)}>✕ Rechazar</Btn>
          </div>
        </div>
      })}
    </>}

    <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>Activos</div>
    {db.prestaya.filter(p=>p.estado==='activo').length===0?<EmptyState msg="Sin PrestaYA activos"/>:
    db.prestaya.filter(p=>p.estado==='activo').map(py=>{
      const s=db.socios.find(x=>x.id===py.socioId)
      const vencido=py.fechaVencimiento&&py.fechaVencimiento<hoy()
      return <div key={py.id} style={{background:'#fff',borderRadius:14,padding:'14px 16px',marginBottom:10,border:'1px solid rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <strong>{s?.nombre||'—'}</strong>
          <Badge c={vencido?'red':'blue'}>{vencido?'Vencido':'Activo'}</Badge>
        </div>
        <div style={{fontSize:13,color:'#6b6b66',marginBottom:8}}>Total: <strong style={{color:'#1a1a18'}}>{fmt(py.total)}</strong> · Vence: <span style={{color:vencido?'var(--red)':undefined}}>{py.fechaVencimiento||'—'}</span></div>
        <Btn primary full onClick={()=>pagar(py.id)} style={{minHeight:40,fontSize:14}}>Marcar pagado</Btn>
      </div>
    })}
  </div>
}
