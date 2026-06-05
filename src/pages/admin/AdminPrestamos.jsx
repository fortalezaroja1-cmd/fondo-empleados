import {useState} from 'react'
import {sb} from '../../supabase.js'
import {uid,hoy,fmt,fmtPct} from '../../helpers.js'
import {Badge,Btn,Field,Modal,Card,IS,EmptyState} from '../../components/UI.jsx'

export default function AdminPrestamos({db,refresh}){
  const [modal,setModal]=useState(false)
  const [form,setForm]=useState({})
  const [info,setInfo]=useState('')
  const [saving,setSaving]=useState(false)

  const getTasa=(sid,monto)=>{
    const s=db.socios.find(x=>x.id===sid)
    if(!s||!monto)return{tasa:null,info:''}
    const m=parseFloat(monto)||0
    if(m<=s.ahorroAcumulado)return{tasa:2.5,info:`✅ ${fmt(m)} ≤ ahorro ${fmt(s.ahorroAcumulado)} → 2.5%`}
    return{tasa:3.5,info:`⚠️ Supera ahorro en ${fmt(m-s.ahorroAcumulado)} → 3.5% con garantías`}
  }

  const save=async()=>{
    const monto=parseFloat(form.monto)||0
    if(!form.socioId||monto<=0){alert('Selecciona socio y monto.');return}
    const {tasa}=getTasa(form.socioId,monto)
    const s=db.socios.find(x=>x.id===form.socioId)
    setSaving(true)
    const pid=uid()
    await sb.from('prestamos').insert({id:pid,socio_id:form.socioId,monto,saldo_capital:monto,tasa,plazo:parseInt(form.plazo)||0,fecha_inicio:form.fechaInicio||hoy(),estado:'activo',notas:form.notas||''})
    await sb.from('caja').insert({id:uid(),tipo:'desembolso',fecha:form.fechaInicio||hoy(),concepto:`Desembolso - ${s.nombre}`,monto,referencia:pid,responsable:'',notas:''})
    await refresh();setSaving(false);setModal(false)
  }

  const cancelar=async id=>{
    if(!confirm('¿Cancelar préstamo?'))return
    await sb.from('prestamos').update({estado:'cancelado',saldo_capital:0}).eq('id',id)
    await refresh()
  }

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
      <div style={{fontSize:22,fontWeight:700}}>Préstamos</div>
      <Btn primary onClick={()=>{setForm({socioId:'',monto:'',plazo:'',fechaInicio:hoy(),notas:''});setInfo('');setModal(true)}}>+ Nuevo</Btn>
    </div>
    {db.prestamos.length===0?<EmptyState msg="No hay préstamos registrados"/>:
    db.prestamos.map(p=>{
      const s=db.socios.find(x=>x.id===p.socioId)
      const pct=p.monto>0?Math.min((1-p.saldoCapital/p.monto)*100,100):100
      return <div key={p.id} style={{background:'#fff',borderRadius:14,padding:'14px 16px',marginBottom:10,border:'1px solid rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <strong style={{fontSize:16}}>{s?s.nombre:'—'}</strong>
          <Badge c={p.estado==='activo'?'blue':p.estado==='cancelado'?'green':'red'}>{p.estado}</Badge>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10,fontSize:13}}>
          <div style={{background:'#f5f4f0',borderRadius:8,padding:'8px 10px'}}>
            <div style={{color:'#6b6b66',fontSize:11}}>MONTO ORIGINAL</div>
            <div style={{fontWeight:600}}>{fmt(p.monto)}</div>
          </div>
          <div style={{background:'#f5f4f0',borderRadius:8,padding:'8px 10px'}}>
            <div style={{color:'#6b6b66',fontSize:11}}>SALDO</div>
            <div style={{fontWeight:600}}>{fmt(p.saldoCapital)}</div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8}}>
          <span style={{color:p.tasa<=2.5?'var(--green)':'var(--red)',fontWeight:600}}>Tasa: {fmtPct(p.tasa)}</span>
          <span style={{color:'#6b6b66'}}>Desde: {p.fechaInicio||'—'}</span>
        </div>
        <div style={{background:'#f1f0eb',borderRadius:4,height:5,overflow:'hidden',marginBottom:4}}>
          <div style={{background:'var(--green)',height:5,width:`${pct.toFixed(0)}%`}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:11,color:'#aaa'}}>{pct.toFixed(0)}% pagado</span>
          {p.estado==='activo'&&<Btn danger onClick={()=>cancelar(p.id)} style={{minHeight:36,fontSize:13,padding:'6px 12px'}}>Cancelar</Btn>}
        </div>
      </div>
    })}

    {modal&&<Modal title="Nuevo préstamo" onClose={()=>setModal(false)}
      footer={<><Btn full onClick={()=>setModal(false)}>Cancelar</Btn><Btn primary full onClick={save} disabled={saving}>{saving?'Guardando...':'Crear préstamo'}</Btn></>}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Field label="Socio *">
          <select style={IS} value={form.socioId||''} onChange={e=>{const{info:i}=getTasa(e.target.value,form.monto);setForm(f=>({...f,socioId:e.target.value}));setInfo(i)}}>
            <option value="">Seleccionar...</option>
            {db.socios.filter(s=>s.estado==='activo').map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </Field>
        <Field label="Monto ($) *">
          <input style={IS} type="number" value={form.monto||''} onChange={e=>{const{info:i}=getTasa(form.socioId,e.target.value);setForm(f=>({...f,monto:e.target.value}));setInfo(i)}}/>
        </Field>
        {info&&<div style={{padding:'10px 12px',background:'#f5f4f0',borderRadius:8,fontSize:13,color:'#6b6b66'}}>{info}</div>}
        <Field label="Tasa (automática)">
          <input style={{...IS,background:'#f5f4f0'}} readOnly value={form.socioId&&form.monto?(()=>{const{tasa}=getTasa(form.socioId,form.monto);return tasa?`${tasa}%`:''})():''}/>
        </Field>
        <Field label="Plazo (quincenas)"><input style={IS} type="number" min="1" value={form.plazo||''} onChange={e=>setForm(f=>({...f,plazo:e.target.value}))}/></Field>
        <Field label="Fecha inicio"><input style={IS} type="date" value={form.fechaInicio||''} onChange={e=>setForm(f=>({...f,fechaInicio:e.target.value}))}/></Field>
        <Field label="Notas"><textarea style={{...IS,minHeight:80,resize:'vertical'}} value={form.notas||''} onChange={e=>setForm(f=>({...f,notas:e.target.value}))}/></Field>
      </div>
    </Modal>}
  </div>
}
