import {useState} from 'react'
import {sb} from '../../supabase.js'
import {Btn,Field,IS} from '../../components/UI.jsx'

export default function AdminConfig({db,refresh,esSuperAdmin}){
  const [form,setForm]=useState({...db.config})
  const [saving,setSaving]=useState(false)
  const [descargando,setDescargando]=useState(false)

  const save=async()=>{
    setSaving(true)
    await sb.from('config').update({
      nombre:form.nombre,
      admin_pass:form.adminPass,
      fecha_pago1:parseInt(form.fechaPago1)||15,
      fecha_pago2:parseInt(form.fechaPago2)||30,
      utilidad_pct:parseFloat(form.utilidadPct)||1.3,
      updated_at:new Date().toISOString()
    }).eq('id',db.config.id)
    await refresh();setSaving(false);alert('Configuración guardada.')
  }

  const descargarRespaldo=async()=>{
    setDescargando(true)
    try {
      const fecha=new Date().toISOString().slice(0,10)
      const [cfg,soc,pre,pag,caj,py,sol]=await Promise.all([
        sb.from('config').select('*'),
        sb.from('socios').select('*'),
        sb.from('prestamos').select('*'),
        sb.from('pagos').select('*'),
        sb.from('caja').select('*'),
        sb.from('prestaya').select('*'),
        sb.from('solicitudes_prestaya').select('*'),
      ])
      const datos={
        fecha_respaldo:new Date().toISOString(),
        config:cfg.data,
        socios:soc.data,
        prestamos:pre.data,
        pagos:pag.data,
        caja:caj.data,
        prestaya:py.data,
        solicitudes_prestaya:sol.data,
      }
      const blob=new Blob([JSON.stringify(datos,null,2)],{type:'application/json'})
      const url=URL.createObjectURL(blob)
      const a=document.createElement('a')
      a.href=url
      a.download=`respaldo_fondo_${fecha}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch(e){
      alert('Error al generar respaldo: '+e.message)
    }
    setDescargando(false)
  }

  return <div>
    <div style={{fontSize:22,fontWeight:700,marginBottom:16}}>Configuración</div>

    {/* Respaldo - disponible para todos */}
    <div style={{background:'#fff',borderRadius:14,padding:16,marginBottom:16,border:'1px solid rgba(0,0,0,0.08)'}}>
      <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>💾 Respaldo de datos</div>
      <div style={{fontSize:13,color:'#6b6b66',marginBottom:12}}>Descarga una copia completa de todos los datos del fondo en formato JSON.</div>
      <Btn primary full onClick={descargarRespaldo} disabled={descargando} style={{minHeight:48}}>
        {descargando?'Generando respaldo...':'⬇ Descargar respaldo completo'}
      </Btn>
    </div>

    {/* Config - solo Super Admin */}
    {esSuperAdmin&&(
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{fontSize:15,fontWeight:600}}>Parámetros del fondo</div>
        <Field label="Nombre del fondo"><input style={IS} value={form.nombre||''} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}/></Field>
        <Field label="Contraseña administrador"><input style={IS} type="password" value={form.adminPass||''} onChange={e=>setForm(f=>({...f,adminPass:e.target.value}))}/></Field>
        <Field label="Día de pago 1"><input style={IS} type="number" min="1" max="28" value={form.fechaPago1||15} onChange={e=>setForm(f=>({...f,fechaPago1:e.target.value}))}/></Field>
        <Field label="Día de pago 2"><input style={IS} type="number" min="1" max="31" value={form.fechaPago2||30} onChange={e=>setForm(f=>({...f,fechaPago2:e.target.value}))}/></Field>
        <Field label="Utilidad mensual (%)"><input style={IS} type="number" step="0.01" value={form.utilidadPct||1.3} onChange={e=>setForm(f=>({...f,utilidadPct:e.target.value}))}/></Field>
        <Btn primary full onClick={save} disabled={saving}>{saving?'Guardando...':'Guardar configuración'}</Btn>
      </div>
    )}
  </div>
}
