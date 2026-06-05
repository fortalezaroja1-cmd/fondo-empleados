import {useState} from 'react'
import {sb} from '../../supabase.js'
import {Btn,Field,Card,IS} from '../../components/UI.jsx'

export default function AdminConfig({db,refresh}){
  const [form,setForm]=useState({...db.config})
  const [saving,setSaving]=useState(false)

  const save=async()=>{
    setSaving(true)
    await sb.from('config').update({nombre:form.nombre,admin_pass:form.adminPass,fecha_pago1:parseInt(form.fechaPago1)||15,fecha_pago2:parseInt(form.fechaPago2)||30,utilidad_pct:parseFloat(form.utilidadPct)||1.3,updated_at:new Date().toISOString()}).eq('id',db.config.id)
    await refresh();setSaving(false);alert('Configuración guardada.')
  }

  return <div>
    <div style={{fontSize:22,fontWeight:700,marginBottom:16}}>Configuración</div>
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <Field label="Nombre del fondo"><input style={IS} value={form.nombre||''} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}/></Field>
      <Field label="Contraseña administrador"><input style={IS} type="password" value={form.adminPass||''} onChange={e=>setForm(f=>({...f,adminPass:e.target.value}))}/></Field>
      <Field label="Día de pago 1"><input style={IS} type="number" min="1" max="28" value={form.fechaPago1||15} onChange={e=>setForm(f=>({...f,fechaPago1:e.target.value}))}/></Field>
      <Field label="Día de pago 2"><input style={IS} type="number" min="1" max="31" value={form.fechaPago2||30} onChange={e=>setForm(f=>({...f,fechaPago2:e.target.value}))}/></Field>
      <Field label="Utilidad mensual (%)"><input style={IS} type="number" step="0.01" value={form.utilidadPct||1.3} onChange={e=>setForm(f=>({...f,utilidadPct:e.target.value}))}/></Field>
      <Btn primary full onClick={save} disabled={saving}>{saving?'Guardando...':'Guardar configuración'}</Btn>
    </div>
  </div>
}
