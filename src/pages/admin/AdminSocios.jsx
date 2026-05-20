import { useState } from 'react'
import { sb, mapSocio } from '../../supabase.js'
import { uid, hoy, fmt, dlCSV } from '../../helpers.js'
import { Badge, Btn, Field, Modal, Card, TW, PH, IS, TH, TD, emptyRow } from '../../components/UI.jsx'

export default function AdminSocios({ db, refresh }) {
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const sf = f => setForm(p => ({ ...p, ...f }))

  const openNew = () => { setForm({ nombre:'', cedula:'', telefono:'', ahorroQuincenal:'', ahorroAcumulado:'', fechaIngreso:hoy(), estado:'activo', notas:'', utilidadPct:'' }); setModal({}) }
  const openEdit = id => { const s = db.socios.find(x => x.id === id); setForm({ ...s, ahorroQuincenal: s.ahorroQuincenal||'', ahorroAcumulado: s.ahorroAcumulado||'', utilidadPct: s.utilidadPct||'' }); setModal({ id }) }

  const save = async () => {
    if (!form.nombre?.trim() || !form.cedula?.trim()) { alert('Nombre y cédula son obligatorios.'); return }
    setSaving(true)
    const row = { nombre:form.nombre, cedula:form.cedula, telefono:form.telefono||'', ahorro_quincenal:parseFloat(form.ahorroQuincenal)||0, ahorro_acumulado:parseFloat(form.ahorroAcumulado)||0, fecha_ingreso:form.fechaIngreso||hoy(), estado:form.estado||'activo', notas:form.notas||'', utilidad_pct:form.utilidadPct?parseFloat(form.utilidadPct):null }
    if (modal.id) {
      await sb.from('socios').update(row).eq('id', modal.id)
    } else {
      await sb.from('socios').insert({ id: uid(), ...row })
    }
    await refresh(); setSaving(false); setModal(null)
  }

  const del = async id => {
    if (!confirm('¿Eliminar socio y todos sus registros?')) return
    await sb.from('socios').delete().eq('id', id)
    await refresh()
  }

  const lista = db.socios.filter(s => !q || s.nombre.toLowerCase().includes(q.toLowerCase()) || s.cedula.includes(q))

  return (
    <div>
      <PH title="Socios">
        <Btn primary onClick={openNew}>+ Nuevo socio</Btn>
        <Btn onClick={() => dlCSV([['ID','Nombre','Cedula','Telefono','AhQuincenal','AhAcumulado','FechaIngreso','Estado','Utilidad%'], ...db.socios.map(s => [s.id,s.nombre,s.cedula,s.telefono,s.ahorroQuincenal,s.ahorroAcumulado,s.fechaIngreso,s.estado,s.utilidadPct||''])], 'socios')}>↓ CSV</Btn>
      </PH>
      <Card toolbar={<input style={{ ...IS, width:210 }} placeholder="Buscar..." value={q} onChange={e => setQ(e.target.value)} />}>
        <TW><table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
          <thead><tr>{['#','Nombre','Cédula','Teléfono','Ah. quincenal','Ah. acumulado','Utilidad','Estado','Acciones'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {lista.length === 0 ? emptyRow(9, 'No hay socios registrados.') :
            lista.map((s, i) => (
              <tr key={s.id}>
                <td style={TD}>{i + 1}</td>
                <td style={TD}><strong>{s.nombre}</strong>{s.notas && <><br /><span style={{ fontSize:11, color:'var(--text3)' }}>{s.notas}</span></>}</td>
                <td style={TD}>{s.cedula}</td>
                <td style={TD}>{s.telefono || '—'}</td>
                <td style={TD}>{fmt(s.ahorroQuincenal)}</td>
                <td style={TD}><strong>{fmt(s.ahorroAcumulado)}</strong></td>
                <td style={TD}><span style={{ fontSize:12, fontWeight:600, color:'var(--blue)' }}>{s.utilidadPct ? `${s.utilidadPct}%` : <span style={{ color:'var(--text3)' }}>global ({db.config.utilidadPct}%)</span>}</span></td>
                <td style={TD}><Badge c={s.estado === 'activo' ? 'green' : 'red'}>{s.estado}</Badge></td>
                <td style={TD}><div style={{ display:'flex', gap:4 }}><Btn sm onClick={() => openEdit(s.id)}>Editar</Btn><Btn sm danger onClick={() => del(s.id)}>Eliminar</Btn></div></td>
              </tr>
            ))}
          </tbody>
        </table></TW>
      </Card>

      {modal && (
        <Modal title={modal.id ? 'Editar socio' : 'Nuevo socio'} onClose={() => setModal(null)}
          footer={<><Btn onClick={() => setModal(null)}>Cancelar</Btn><Btn primary onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Btn></>}>
          <div className="form-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Nombre *"><input style={IS} value={form.nombre||''} onChange={e => sf({ nombre:e.target.value })} /></Field>
            <Field label="Cédula *"><input style={IS} value={form.cedula||''} onChange={e => sf({ cedula:e.target.value })} /></Field>
            <Field label="Teléfono"><input style={IS} value={form.telefono||''} onChange={e => sf({ telefono:e.target.value })} /></Field>
            <Field label="Fecha ingreso"><input style={IS} type="date" value={form.fechaIngreso||''} onChange={e => sf({ fechaIngreso:e.target.value })} /></Field>
            <Field label="Ahorro quincenal ($)"><input style={IS} type="number" value={form.ahorroQuincenal||''} onChange={e => sf({ ahorroQuincenal:e.target.value })} /></Field>
            <Field label="Ahorro acumulado ($)"><input style={IS} type="number" value={form.ahorroAcumulado||''} onChange={e => sf({ ahorroAcumulado:e.target.value })} /></Field>
            <Field label="Estado"><select style={IS} value={form.estado||'activo'} onChange={e => sf({ estado:e.target.value })}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></Field>
            <Field label={`Utilidad mensual (%) — vacío = global (${db.config.utilidadPct}%)`}><input style={IS} type="number" min="0" max="100" step="0.01" placeholder={`Global: ${db.config.utilidadPct}%`} value={form.utilidadPct||''} onChange={e => sf({ utilidadPct:e.target.value })} /></Field>
            <Field label="Notas" full><textarea style={{ ...IS, resize:'vertical', minHeight:60 }} value={form.notas||''} onChange={e => sf({ notas:e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}
