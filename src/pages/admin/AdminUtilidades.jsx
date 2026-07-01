import { useState } from 'react'
import { sb } from '../../supabase.js'
import { uid, hoy, fmt, fmtPct, calcFechaLimite } from '../../helpers.js'
import { Btn, Field, Modal, IS, Metric, EmptyState, Badge } from '../../components/UI.jsx'

export default function AdminPeriodos({ db, refresh, esSuperAdmin }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  if (!esSuperAdmin) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Solo Super Admin</div>
      <div style={{ fontSize: 14, color: '#6b6b66' }}>No tienes permisos para gestionar períodos.</div>
    </div>
  )

  const openNew = () => {
    const fechaCorte = hoy()
    setForm({
      fechaCorte,
      fechaLimite: calcFechaLimite(fechaCorte),
      utilidadPct: db.config.utilidadPct || 1.3,
      descripcion: '',
      estado: 'abierto'
    })
    setModal(true)
  }

  const openEdit = (p) => {
    setForm({ ...p })
    setModal(true)
  }

  const guardar = async () => {
    if (!form.fechaCorte) { alert('Fecha de corte requerida'); return }
    setSaving(true)
    const row = {
      fecha_corte: form.fechaCorte,
      fecha_limite: form.fechaLimite || calcFechaLimite(form.fechaCorte),
      utilidad_pct: parseFloat(form.utilidadPct) || 1.3,
      descripcion: form.descripcion || '',
      estado: form.estado || 'abierto'
    }
    if (form.id) {
      await sb.from('periodos').update(row).eq('id', form.id)
    } else {
      await sb.from('periodos').insert({ id: uid(), ...row })
    }
    await refresh(); setSaving(false); setModal(false)
  }

  const cerrar = async (id) => {
    if (!confirm('¿Cerrar este período? No se podrán registrar más aportes en él.')) return
    await sb.from('periodos').update({ estado: 'cerrado' }).eq('id', id)
    await refresh()
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar período? Se borrarán los aportes asociados.')) return
    await sb.from('aportes').delete().eq('periodo_id', id)
    await sb.from('periodos').delete().eq('id', id)
    await refresh()
  }

  // Estadísticas globales
  const totalUtilidades = db.aportes.reduce((a, ap) => a + (ap.utilidadGenerada || 0), 0)
  const totalAportes = db.aportes.reduce((a, ap) => a + (ap.monto || 0), 0)
  const aTiempoCount = db.aportes.filter(a => a.aTiempo === true).length
  const moraCount = db.aportes.filter(a => a.aTiempo === false).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Períodos de ahorro</div>
        <Btn primary onClick={openNew}>+ Nuevo</Btn>
      </div>

      {/* Resumen global */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <Metric label="Total utilidades generadas" value={fmt(totalUtilidades)} color="var(--green)" />
        <Metric label="Total aportes recibidos" value={fmt(totalAportes)} />
        <Metric label="Aportes a tiempo" value={aTiempoCount} color="var(--green)" />
        <Metric label="Aportes en mora" value={moraCount} color={moraCount > 0 ? 'var(--red)' : undefined} />
      </div>

      {db.periodos.length === 0 ? <EmptyState msg="No hay períodos creados" /> :
        db.periodos.map(p => {
          const aportesPeriodo = db.aportes.filter(a => a.periodoId === p.id)
          const totalPeriodo = aportesPeriodo.reduce((a, ap) => a + ap.monto, 0)
          const utilPeriodo = aportesPeriodo.reduce((a, ap) => a + ap.utilidadGenerada, 0)
          return (
            <div key={p.id} style={{ background: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, border: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.descripcion || p.fechaCorte}</div>
                  <div style={{ fontSize: 12, color: '#6b6b66' }}>Corte: {p.fechaCorte} · Límite: {p.fechaLimite}</div>
                </div>
                <Badge c={p.estado === 'abierto' ? 'green' : p.estado === 'cerrado' ? 'gray' : 'amber'}>
                  {p.estado}
                </Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12, fontSize: 12 }}>
                <div style={{ background: '#f5f4f0', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ color: '#6b6b66', fontSize: 10 }}>% UTILIDAD</div>
                  <div style={{ fontWeight: 700, color: 'var(--green)' }}>{fmtPct(p.utilidadPct)}</div>
                </div>
                <div style={{ background: '#f5f4f0', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ color: '#6b6b66', fontSize: 10 }}>TOTAL APORTES</div>
                  <div style={{ fontWeight: 700 }}>{fmt(totalPeriodo)}</div>
                </div>
                <div style={{ background: '#EAF3DE', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ color: '#3B6D11', fontSize: 10 }}>UTILIDADES</div>
                  <div style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(utilPeriodo)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={() => openEdit(p)} style={{ flex: 1, justifyContent: 'center', minHeight: 38, fontSize: 13 }}>✏ Editar</Btn>
                {p.estado === 'abierto' && (
                  <Btn onClick={() => cerrar(p.id)} style={{ flex: 1, justifyContent: 'center', minHeight: 38, fontSize: 13 }}>🔒 Cerrar</Btn>
                )}
                <Btn danger onClick={() => eliminar(p.id)} style={{ flex: 1, justifyContent: 'center', minHeight: 38, fontSize: 13 }}>Eliminar</Btn>
              </div>
            </div>
          )
        })}

      {modal && (
        <Modal title={form.id ? 'Editar período' : 'Nuevo período'} onClose={() => setModal(false)}
          footer={<><Btn full onClick={() => setModal(false)}>Cancelar</Btn><Btn primary full onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Btn></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Descripción (ej: Quincena 15 Enero 2026)">
              <input style={IS} value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Quincena 15 Enero 2026" />
            </Field>
            <Field label="Fecha de corte *">
              <input style={IS} type="date" value={form.fechaCorte || ''} onChange={e => setForm(f => ({ ...f, fechaCorte: e.target.value, fechaLimite: calcFechaLimite(e.target.value) }))} />
            </Field>
            <Field label="Fecha límite (automática: corte + 5 días)">
              <input style={{ ...IS, background: '#f5f4f0' }} type="date" value={form.fechaLimite || ''} readOnly />
            </Field>
            <Field label="% Utilidad para este período">
              <input style={IS} type="number" step="0.01" value={form.utilidadPct || ''} onChange={e => setForm(f => ({ ...f, utilidadPct: e.target.value }))} placeholder={db.config.utilidadPct} />
            </Field>
            <div style={{ background: '#EAF3DE', borderRadius: 10, padding: 12, fontSize: 13, color: '#27500A' }}>
              Los socios tienen <strong>5 días</strong> desde la fecha de corte para hacer su aporte. Después del día 5 no generan utilidad ese período.
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
