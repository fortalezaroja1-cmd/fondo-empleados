import {useState} from 'react'
import {sb} from '../../supabase.js'
import {uid,hoy,fmt} from '../../helpers.js'
import {Btn,Field,Modal,Metric,IS,EmptyState} from '../../components/UI.jsx'

export default function AdminCaja({db,refresh}){
  const [modal,setModal]=useState(false)
  const [form,setForm]=useState({})
  const [saving,setSaving]=useState(false)

  const saldo=db.caja.reduce((acc,m)=>m.tipo==='ingreso'?acc+m.monto:acc-m.monto,0)
  const ingresos=db.caja.filter(m=>m.tipo==='ingreso').reduce((a,m)=>a+m.monto,0)
  const egresos=db.caja.filter(m=>m.tipo==='egreso').reduce((a,m)=>a+m.monto,0)
  const desembolsos=db.caja.filter(m=>m.tipo==='desembolso').reduce((a,m)=>a+m.monto,0)

  const save=async()=>{
    if(!form.concepto?.trim()||!(parseFloat(form.monto)>0)){alert('Concepto y monto requeridos.');return}
    setSaving(true)
    await sb.from('caja').insert({id:uid(),tipo:form.tipo||'ingreso',fecha:form.fecha||hoy(),concepto:form.concepto,monto:parseFloat(form.monto),referencia:form.referencia||'',responsable:form.responsable||'',notas:form.notas||''})
    await refresh();setSaving(false);setModal(false)
  }

  const del=async id=>{
    if(!confirm('¿Eliminar movimiento?'))return
    await sb.from('caja').delete().eq('id',id)
    await refresh()
  }

  const asc=[...db.caja].sort((a,b)=>a.fecha.localeCompare(b.fecha))
  const saldos={};let acum=0
  asc.forEach(m=>{acum+=m.tipo==='ingreso'?m.monto:-m.monto;saldos[m.id]=acum})

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
      <div style={{fontSize:22,fontWeight:700}}>Caja</div>
      <Btn primary onClick={()=>{setForm({tipo:'ingreso',fecha:hoy(),concepto:'',monto:'',referencia:'',responsable:'',notas:''});setModal(true)}}>+ Movimiento</Btn>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
      <Metric label="Saldo actual" value={fmt(saldo)} color={saldo<0?'var(--red)':undefined}/>
      <Metric label="Ingresos" value={fmt(ingresos)} color="var(--green)"/>
      <Metric label="Egresos" value={fmt(egresos)} color="var(--red)"/>
      <Metric label="Desembolsado" value={fmt(desembolsos)} color="var(--amber)"/>
    </div>
    {db.caja.length===0?<EmptyState msg="Sin movimientos"/>:
    [...db.caja].sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(m=>{
      const tc=m.tipo==='ingreso'?'var(--green)':m.tipo==='egreso'?'var(--red)':'var(--amber)'
      const tl=m.tipo==='ingreso'?'↑ Ingreso':m.tipo==='egreso'?'↓ Egreso':'→ Desembolso'
      const s=saldos[m.id]
      return <div key={m.id} style={{background:'#fff',borderRadius:14,padding:'14px 16px',marginBottom:10,border:'1px solid rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
          <span style={{fontSize:13,fontWeight:600,color:tc}}>{tl}</span>
          <strong style={{fontSize:16,color:m.tipo==='egreso'?'var(--red)':undefined}}>{fmt(m.monto)}</strong>
        </div>
        <div style={{fontSize:14,marginBottom:4}}>{m.concepto}</div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#6b6b66'}}>
          <span>{m.fecha}</span>
          <span style={{color:s>=0?'var(--green)':'var(--red)',fontWeight:500}}>Saldo: {fmt(s)}</span>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
          <Btn danger onClick={()=>del(m.id)} style={{minHeight:32,fontSize:12,padding:'4px 10px'}}>Eliminar</Btn>
        </div>
      </div>
    })}

    {modal&&<Modal title="Nuevo movimiento" onClose={()=>setModal(false)}
      footer={<><Btn full onClick={()=>setModal(false)}>Cancelar</Btn><Btn primary full onClick={save} disabled={saving}>{saving?'Guardando...':'Guardar'}</Btn></>}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Field label="Tipo">
          <select style={IS} value={form.tipo||'ingreso'} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
            <option value="ingreso">Ingreso</option><option value="egreso">Egreso</option><option value="desembolso">Desembolso</option>
          </select>
        </Field>
        <Field label="Fecha"><input style={IS} type="date" value={form.fecha||''} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))}/></Field>
        <Field label="Concepto *"><input style={IS} value={form.concepto||''} onChange={e=>setForm(f=>({...f,concepto:e.target.value}))}/></Field>
        <Field label="Monto ($) *"><input style={IS} type="number" value={form.monto||''} onChange={e=>setForm(f=>({...f,monto:e.target.value}))}/></Field>
        <Field label="Referencia"><input style={IS} value={form.referencia||''} onChange={e=>setForm(f=>({...f,referencia:e.target.value}))}/></Field>
        <Field label="Responsable"><input style={IS} value={form.responsable||''} onChange={e=>setForm(f=>({...f,responsable:e.target.value}))}/></Field>
      </div>
    </Modal>}
  </div>
}
