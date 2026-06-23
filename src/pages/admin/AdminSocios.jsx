import { useState } from 'react'
import { sb } from '../../supabase.js'
import { uid, hoy, fmt } from '../../helpers.js'
import { Badge, Btn, Field, Modal, Card, IS, EmptyState } from '../../components/UI.jsx'
import AdminSocioDetalle from './AdminSocioDetalle.jsx'

export default function AdminSocios({ db, refresh }) {
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [socioSelId, setSocioSelId] = useState(null)
  const sf = f => setForm(p => ({ ...p, ...f }))

  // Si hay un socio seleccionado, mostrar su ficha
  if (socioSelId) {
    return <AdminSocioDetalle socioId={socioSelId} db={db} refresh={refresh} onVolver={() => setSocioSelId(null)} />
  }

  const openNew = () => { setForm({ nombre:'', cedula:'', telefono:'', ahorroQuincenal:'', ahorroAcumulado:'', fechaIngreso:hoy(), estado:'activo', notas:'', utilidadPct:'' }); setModal({}) }
  const openEdit = (e, id) => { e.stopPropagation(); const s=db.socios.find(x=>x.id===id); setForm({...s, ahorroQuincenal:s.ahorroQuincenal, ahorroAcumulado:s.ahorroAcumulado, utilidadPct:s.utilidadPct||''}); setModal({id}) }

  const save = async () => {
    if (!form.nombre?.trim() || !form.cedula?.trim()) { alert('Nombre y cédula son obligatorios.'); return }
    setSaving(true)
    const row = { nombre:form.nombre, cedula:form.cedula, telefono:form.telefono||'', ahorro_quincenal:parseFloat(form.ahorroQuincenal)||0, ahorro_acumulado:parseFloat(form.ahorroAcumulado)||0, fecha_ingreso:form.fechaIngreso||hoy(), estado:form.estado||'activo', notas:form.notas||'', utilidad_pct:form.utilidadPct?parseFloat(form.utilidadPct):null }
    if (modal.id) await sb.from('socios').update(row).eq('id', modal.id)
    else await sb.from('socios').insert({ id:uid(), ...row })
    await refresh(); setSaving(false); setModal(null)
  }

  const del = async (e, id) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar socio?')) return
    await sb.from('socios').delete().eq('id', id)
    await refresh()
  }

  const lista = db.socios.filter(s => !q || s.nombre.toLowerCase().includes(q.toLowerCase()) || s.cedula.includes(q))

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:22, fontWeight:700 }}>Socios</div>
        <Btn primary onClick={openNew}>+ Nuevo</Btn>
      </div>
      <input style={{ ...IS, marginBottom:12 }} placeholder="Buscar socio..." value={q} onChange={e => setQ(e.target.value)} />
      {lista.length === 0 ? <EmptyState msg="No hay socios registrados" /> :
      lista.map(s => (
        <div key={s.id} onClick={() => setSocioSelId(s.id)}
          style={{ background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:10, border:'1px solid rgba(0,0,0,0.08)', cursor:'pointer', transition:'border-color .15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor='#1a1a18'}
          onMouseLeave={e => e.currentTarget.style.borderColor='rgba(0,0,0,0.08)'}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:600 }}>{s.nombre}</div>
              <div style={{ fontSize:13, color:'#6b6b66' }}>{s.cedula} · {s.telefono||'—'}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Badge c={s.estado==='activo'?'green':'red'}>{s.estado}</Badge>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10, fontSize:13 }}>
            <div style={{ background:'#EAF3DE', borderRadius:8, padding:'8px 10px' }}>
              <div style={{ color:'#3B6D11', fontSize:11 }}>AHORRO ACUMULADO</div>
              <div style={{ fontWeight:600, color:'#3B6D11' }}>{fmt(s.ahorroAcumulado)}</div>
            </div>
            <div style={{ background:'#f5f4f0', borderRadius:8, padding:'8px 10px' }}>
              <div style={{ color:'#6b6b66', fontSize:11 }}>QUINCENAL</div>
              <div style={{ fontWeight:600 }}>{fmt(s.ahorroQuincenal)}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn onClick={e => openEdit(e, s.id)} style={{ flex:1, justifyContent:'center', minHeight:40, fontSize:14 }}>Editar</Btn>
            <Btn danger onClick={e => del(e, s.id)} style={{ flex:1, justifyContent:'center', minHeight:40, fontSize:14 }}>Eliminar</Btn>
          </div>
          <div style={{ fontSize:12, color:'#aaa', marginTop:8, textAlign:'center' }}>Toca para ver ficha completa →</div>
        </div>
      ))}

      {modal && (
        <Modal title={modal.id?'Editar socio':'Nuevo socio'} onClose={() => setModal(null)}
          footer={<><Btn full onClick={() => setModal(null)}>Cancelar</Btn><Btn primary full onClick={save} disabled={saving}>{saving?'Guardando...':'Guardar'}</Btn></>}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Field label="Nombre *"><input style={IS} value={form.nombre||''} onChange={e => sf({nombre:e.target.value})}/></Field>
            <Field label="Cédula *"><input style={IS} value={form.cedula||''} onChange={e => sf({cedula:e.target.value})}/></Field>
            <Field label="Teléfono"><input style={IS} value={form.telefono||''} onChange={e => sf({telefono:e.target.value})}/></Field>
            <Field label="Ahorro quincenal ($)"><input style={IS} type="number" value={form.ahorroQuincenal||''} onChange={e => sf({ahorroQuincenal:e.target.value})}/></Field>
            <Field label="Ahorro acumulado ($)"><input style={IS} type="number" value={form.ahorroAcumulado||''} onChange={e => sf({ahorroAcumulado:e.target.value})}/></Field>
            <Field label={`Utilidad % (vacío = global ${db.config.utilidadPct}%)`}><input style={IS} type="number" step="0.01" placeholder={`${db.config.utilidadPct}`} value={form.utilidadPct||''} onChange={e => sf({utilidadPct:e.target.value})}/></Field>
            <Field label="Estado"><select style={IS} value={form.estado||'activo'} onChange={e => sf({estado:e.target.value})}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></Field>
            <Field label="Notas"><textarea style={{...IS,minHeight:80,resize:'vertical'}} value={form.notas||''} onChange={e => sf({notas:e.target.value})}/></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}
