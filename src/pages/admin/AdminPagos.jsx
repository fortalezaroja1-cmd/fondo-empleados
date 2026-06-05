import {useState} from 'react'
import {sb} from '../../supabase.js'
import {uid,hoy,fmt} from '../../helpers.js'
import {Badge,Btn,Field,Modal,IS,EmptyState} from '../../components/UI.jsx'

export default function AdminPagos({db,refresh}){
  const [modal,setModal]=useState(false)
  const [form,setForm]=useState({})
  const [prests,setPrests]=useState([])
  const [ii,setII]=useState('')
  const [saving,setSaving]=useState(false)

  const calcInt=pid=>{
    const p=db.prestamos.find(x=>x.id===pid)
    if(!p)return 0
    const int=p.saldoCapital*(p.tasa/100)/2
    setII(`Saldo: ${fmt(p.saldoCapital)} | Tasa: ${p.tasa}% | Interés: ${fmt(int)}`)
    return int
  }

  const save=async()=>{
    if(!form.socioId||!form.prestamoId){alert('Selecciona socio y préstamo.');return}
    const cap=parseFloat(form.capitalAbonado)||0,int=parseFloat(form.interesPagado)||0
    const s=db.socios.find(x=>x.id===form.socioId)
    const p=db.prestamos.find(x=>x.id===form.prestamoId)
    setSaving(true)
    const pgId=uid()
    await sb.from('pagos').insert({id:pgId,socio_id:form.socioId,prestamo_id:form.prestamoId,fecha:form.fecha,fecha_corte:form.fechaCorte||null,capital_abonado:cap,interes_pagado:int,total:cap+int,estado:form.estado,notas:form.notas||''})
    const nuevoSaldo=Math.max(0,p.saldoCapital-cap)
    await sb.from('prestamos').update({saldo_capital:nuevoSaldo,estado:nuevoSaldo===0?'cancelado':p.estado}).eq('id',form.prestamoId)
    if(form.estado==='pagado')await sb.from('caja').insert({id:uid(),tipo:'ingreso',fecha:form.fecha,concepto:`Pago - ${s?.nombre||''}`,monto:cap+int,referencia:pgId,responsable:'',notas:''})
    await refresh();setSaving(false);setModal(false)
  }

  const del=async id=>{
    if(!confirm('¿Eliminar pago?'))return
    const pg=db.pagos.find(x=>x.id===id)
    const p=pg?db.prestamos.find(x=>x.id===pg.prestamoId):null
    if(p)await sb.from('prestamos').update({saldo_capital:p.saldoCapital+(pg.capitalAbonado||0),estado:p.estado==='cancelado'?'activo':p.estado}).eq('id',p.id)
    await sb.from('pagos').delete().eq('id',id)
    await refresh()
  }

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
      <div style={{fontSize:22,fontWeight:700}}>Pagos</div>
      <Btn primary onClick={()=>{setForm({socioId:'',prestamoId:'',fecha:hoy(),fechaCorte:'',capitalAbonado:'',interesPagado:'',estado:'pagado',notas:''});setPrests([]);setII('');setModal(true)}}>+ Registrar</Btn>
    </div>
    {db.pagos.length===0?<EmptyState msg="No hay pagos registrados"/>:
    [...db.pagos].sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(pg=>{
      const s=db.socios.find(x=>x.id===pg.socioId)
      let puntBadge=null
      if(pg.fechaCorte&&pg.fecha&&pg.estado==='pagado'){
        const limite=new Date(pg.fechaCorte+'T12:00:00')
        let hab=0,cur=new Date(limite)
        while(hab<3){cur.setDate(cur.getDate()+1);if(cur.getDay()!==0&&cur.getDay()!==6)hab++}
        puntBadge=pg.fecha<=cur.toISOString().slice(0,10)?<Badge c="green">Puntual</Badge>:<Badge c="red">Tardío</Badge>
      }
      return <div key={pg.id} style={{background:'#fff',borderRadius:14,padding:'14px 16px',marginBottom:10,border:'1px solid rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
          <strong style={{fontSize:15}}>{s?s.nombre:'—'}</strong>
          <Badge c={pg.estado==='pagado'?'green':pg.estado==='atrasado'?'red':'amber'}>{pg.estado}</Badge>
        </div>
        <div style={{fontSize:13,color:'#6b6b66',marginBottom:6}}>{pg.fecha}{pg.fechaCorte&&` · Corte: ${pg.fechaCorte}`}</div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:8}}>
          <span>Capital: <strong>{fmt(pg.capitalAbonado)}</strong></span>
          <span>Interés: {fmt(pg.interesPagado)}</span>
          <span style={{fontWeight:600}}>Total: {fmt(pg.total)}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          {puntBadge||<span/>}
          <Btn danger onClick={()=>del(pg.id)} style={{minHeight:32,fontSize:12,padding:'4px 10px'}}>Eliminar</Btn>
        </div>
      </div>
    })}

    {modal&&<Modal title="Registrar pago" onClose={()=>setModal(false)}
      footer={<><Btn full onClick={()=>setModal(false)}>Cancelar</Btn><Btn primary full onClick={save} disabled={saving}>{saving?'Guardando...':'Registrar'}</Btn></>}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Field label="Socio *">
          <select style={IS} value={form.socioId||''} onChange={e=>{setPrests(db.prestamos.filter(p=>p.socioId===e.target.value&&p.estado==='activo'));setForm(f=>({...f,socioId:e.target.value,prestamoId:'',capitalAbonado:'',interesPagado:''}));setII('')}}>
            <option value="">Seleccionar...</option>
            {db.socios.filter(s=>s.estado==='activo').map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </Field>
        <Field label="Préstamo *">
          <select style={IS} value={form.prestamoId||''} onChange={e=>{const int=calcInt(e.target.value);setForm(f=>({...f,prestamoId:e.target.value,interesPagado:int.toFixed(0)}))}}>
            <option value="">{prests.length?'Seleccionar...':'Primero selecciona socio'}</option>
            {prests.map(p=><option key={p.id} value={p.id}>{fmt(p.monto)} — Saldo: {fmt(p.saldoCapital)}</option>)}
          </select>
        </Field>
        {ii&&<div style={{padding:'10px 12px',background:'#f5f4f0',borderRadius:8,fontSize:13,color:'#6b6b66'}}>{ii}</div>}
        <Field label="Fecha de corte"><input style={IS} type="date" value={form.fechaCorte||''} onChange={e=>setForm(f=>({...f,fechaCorte:e.target.value}))}/></Field>
        <Field label="Fecha de pago"><input style={IS} type="date" value={form.fecha||''} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))}/></Field>
        <Field label="Capital abonado ($)"><input style={IS} type="number" value={form.capitalAbonado||''} onChange={e=>{const int=calcInt(form.prestamoId);setForm(f=>({...f,capitalAbonado:e.target.value,interesPagado:int.toFixed(0)}))}}/></Field>
        <Field label="Interés ($)"><input style={IS} type="number" value={form.interesPagado||''} onChange={e=>setForm(f=>({...f,interesPagado:e.target.value}))}/></Field>
        <Field label="Estado">
          <select style={IS} value={form.estado||'pagado'} onChange={e=>setForm(f=>({...f,estado:e.target.value}))}>
            <option value="pagado">Pagado</option><option value="pendiente">Pendiente</option><option value="atrasado">Atrasado</option>
          </select>
        </Field>
        <Field label="Notas"><textarea style={{...IS,minHeight:60,resize:'vertical'}} value={form.notas||''} onChange={e=>setForm(f=>({...f,notas:e.target.value}))}/></Field>
      </div>
    </Modal>}
  </div>
}
