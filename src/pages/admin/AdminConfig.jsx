import { useState } from 'react'
import { sb } from '../../supabase.js'
import { Btn, Field, Card, PH, IS } from '../../components/UI.jsx'

export default function AdminConfig({ db, refresh }) {
  const [form, setForm] = useState({ ...db.config })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await sb.from('config').update({ nombre:form.nombre, admin_pass:form.adminPass, fecha_pago1:parseInt(form.fechaPago1)||15, fecha_pago2:parseInt(form.fechaPago2)||30, utilidad_pct:parseFloat(form.utilidadPct)||1.3, updated_at:new Date().toISOString() }).eq('id', db.config.id)
    await refresh(); setSaving(false); alert('Configuración guardada.')
  }

  return (
    <div>
      <PH title="Configuración" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
        <Card title="Configuración general">
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
            <Field label="Nombre del fondo"><input style={IS} value={form.nombre||''} onChange={e => setForm(f => ({ ...f, nombre:e.target.value }))} /></Field>
            <Field label="Contraseña administrador"><input style={IS} type="password" value={form.adminPass||''} onChange={e => setForm(f => ({ ...f, adminPass:e.target.value }))} /></Field>
            <Field label="Día de pago 1 (ej: 15)"><input style={IS} type="number" min="1" max="28" value={form.fechaPago1||15} onChange={e => setForm(f => ({ ...f, fechaPago1:e.target.value }))} /></Field>
            <Field label="Día de pago 2 (ej: 30)"><input style={IS} type="number" min="1" max="31" value={form.fechaPago2||30} onChange={e => setForm(f => ({ ...f, fechaPago2:e.target.value }))} /></Field>
            <Field label="Porcentaje de utilidad mensual (%)"><input style={IS} type="number" min="0" max="100" step="0.01" value={form.utilidadPct||1.3} onChange={e => setForm(f => ({ ...f, utilidadPct:e.target.value }))} /></Field>
            <Btn primary onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar configuración'}</Btn>
          </div>
        </Card>
      </div>
    </div>
  )
}
