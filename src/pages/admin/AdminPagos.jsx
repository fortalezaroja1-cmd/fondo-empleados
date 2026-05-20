import { useState } from 'react'
import { sb } from '../../supabase.js'
import { uid, hoy, fmt, dlCSV } from '../../helpers.js'
import { Badge, Btn, Field, Modal, Card, TW, PH, IS, TH, TD, emptyRow } from '../../components/UI.jsx'

export default function AdminPagos({ db, refresh }) {
  const [fSocio, setFS] = useState('')
  const [fEstado, setFE] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [prests, setPrests] = useState([])
  const [ii, setII] = useState('')
  const [saving, setSaving] = useState(false)

  const calcInt = (pid) => {
    const p = db.prestamos.find(x => x.id === pid)
    if (!p) return 0
    const int = p.saldoCapital * (p.tasa / 100) / 2
    setII(`Saldo: ${fmt(p.saldoCapital)} | Tasa: ${p.tasa}% | Interés quinc.: ${fmt(int)}`)
    return int
  }

  const openNew = () => { setForm({ socioId:'', prestamoId:'', fecha:hoy(), fechaCorte:'', capitalAbonado:'', interesPagado:'', estado:'pagado', notas:'' }); setPrests([]); setII(''); setModal(true) }

  const save = async () => {
    if (!form.socioId || !form.prestamoId) { alert('Selecciona socio y préstamo.'); return }
    const cap = parseFloat(form.capitalAbonado) || 0, int = parseFloat(form.interesPagado) || 0
    const s = db.socios.find(x => x.id === form.socioId)
    const p = db.prestamos.find(x => x.id === form.prestamoId)
    setSaving(true)
    const pgId = uid()
    await sb.from('pagos').insert({ id: pgId, socio_id: form.socioId, prestamo_id: form.prestamoId, fecha: form.fecha, fecha_corte: form.fechaCorte || null, capital_abonado: cap, interes_pagado: int, total: cap + int, estado: form.estado, notas: form.notas || '' })
    const nuevoSaldo = Math.max(0, p.saldoCapital - cap)
    await sb.from('prestamos').update({ saldo_capital: nuevoSaldo, estado: nuevoSaldo === 0 ? 'cancelado' : p.estado }).eq('id', form.prestamoId)
    if (form.estado === 'pagado') await sb.from('caja').insert({ id: uid(), tipo: 'ingreso', fecha: form.fecha, concepto: `Pago - ${s?.nombre||''}`, monto: cap + int, referencia: pgId, responsable: '', notas: '' })
    await refresh(); setSaving(false); setModal(false)
  }

  const del = async id => {
    if (!confirm('¿Eliminar pago?')) return
    const pg = db.pagos.find(x => x.id === id)
    const p = pg ? db.prestamos.find(x => x.id === pg.prestamoId) : null
    if (p) await sb.from('prestamos').update({ saldo_capital: p.saldoCapital + (pg.capitalAbonado || 0), estado: p.estado === 'cancelado' ? 'activo' : p.estado }).eq('id', p.id)
    await sb.from('pagos').delete().eq('id', id)
    await refresh()
  }

  let lista = [...db.pagos].sort((a, b) => b.fecha.localeCompare(a.fecha))
  if (fSocio) lista = lista.filter(p => p.socioId === fSocio)
  if (fEstado) lista = lista.filter(p => p.estado === fEstado)

  return (
    <div>
      <PH title="Pagos">
        <Btn primary onClick={openNew}>+ Registrar pago</Btn>
        <Btn onClick={() => dlCSV([['ID','Fecha','FechaCorte','Socio','Capital','Interes','Total','Estado'], ...db.pagos.map(pg => [pg.id, pg.fecha, pg.fechaCorte||'', (db.socios.find(s => s.id === pg.socioId)||{}).nombre||'', pg.capitalAbonado, pg.interesPagado, pg.total, pg.estado])], 'pagos')}>↓ CSV</Btn>
      </PH>
      <Card toolbar={<div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <select style={{ ...IS, width:'auto' }} value={fSocio} onChange={e => setFS(e.target.value)}><option value="">Todos los socios</option>{db.socios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
        <select style={{ ...IS, width:'auto' }} value={fEstado} onChange={e => setFE(e.target.value)}><option value="">Todos</option><option value="pagado">Pagado</option><option value="pendiente">Pendiente</option><option value="atrasado">Atrasado</option></select>
      </div>}>
        <TW><table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
          <thead><tr>{['Fecha pago','F. corte','Socio','Capital','Interés','Total','Estado',''].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {lista.length === 0 ? emptyRow(8, 'Sin pagos registrados.') :
            lista.map(pg => {
              const s = db.socios.find(x => x.id === pg.socioId)
              let puntBadge = null
              if (pg.fechaCorte && pg.fecha && pg.estado === 'pagado') {
                const limite = new Date(pg.fechaCorte + 'T12:00:00')
                let hab = 0, cur = new Date(limite)
                while (hab < 3) { cur.setDate(cur.getDate() + 1); if (cur.getDay() !== 0 && cur.getDay() !== 6) hab++ }
                puntBadge = pg.fecha <= cur.toISOString().slice(0, 10) ? <Badge c="green">Puntual</Badge> : <Badge c="red">Tardío ⚠</Badge>
              }
              return <tr key={pg.id}>
                <td style={TD}>{pg.fecha}</td>
                <td style={{ ...TD, fontSize:11, color:'var(--text2)' }}>{pg.fechaCorte || '—'}</td>
                <td style={TD}>{s ? s.nombre : '—'}</td>
                <td style={TD}>{fmt(pg.capitalAbonado)}</td>
                <td style={TD}>{fmt(pg.interesPagado)}</td>
                <td style={TD}><strong>{fmt(pg.total)}</strong></td>
                <td style={TD}><div style={{ display:'flex', gap:4, flexWrap:'wrap' }}><Badge c={pg.estado === 'pagado' ? 'green' : pg.estado === 'atrasado' ? 'red' : 'amber'}>{pg.estado}</Badge>{puntBadge}</div></td>
                <td style={TD}><Btn sm danger onClick={() => del(pg.id)}>✕</Btn></td>
              </tr>
            })}
          </tbody>
        </table></TW>
      </Card>

      {modal && (
        <Modal title="Registrar pago" onClose={() => setModal(false)}
          footer={<><Btn onClick={() => setModal(false)}>Cancelar</Btn><Btn primary onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</Btn></>}>
          <div className="form-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Socio *" full>
              <select style={IS} value={form.socioId||''} onChange={e => { setPrests(db.prestamos.filter(p => p.socioId === e.target.value && p.estado === 'activo')); setForm(f => ({ ...f, socioId:e.target.value, prestamoId:'', capitalAbonado:'', interesPagado:'' })); setII('') }}>
                <option value="">Seleccionar...</option>
                {db.socios.filter(s => s.estado === 'activo').map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </Field>
            <Field label="Préstamo *" full>
              <select style={IS} value={form.prestamoId||''} onChange={e => { const int = calcInt(e.target.value); setForm(f => ({ ...f, prestamoId:e.target.value, interesPagado:int.toFixed(0) })) }}>
                <option value="">{prests.length ? 'Seleccionar...' : 'Primero selecciona socio'}</option>
                {prests.map(p => <option key={p.id} value={p.id}>{fmt(p.monto)} — Saldo: {fmt(p.saldoCapital)} — {p.tasa}%</option>)}
              </select>
            </Field>
            <Field label="Fecha de corte"><input style={IS} type="date" value={form.fechaCorte||''} onChange={e => setForm(f => ({ ...f, fechaCorte:e.target.value }))} /></Field>
            <Field label="Fecha de pago"><input style={IS} type="date" value={form.fecha||''} onChange={e => setForm(f => ({ ...f, fecha:e.target.value }))} /></Field>
            <Field label="Capital abonado ($)"><input style={IS} type="number" value={form.capitalAbonado||''} onChange={e => { const int = calcInt(form.prestamoId); setForm(f => ({ ...f, capitalAbonado:e.target.value, interesPagado:int.toFixed(0) })) }} /></Field>
            <Field label="Interés ($)"><input style={IS} type="number" value={form.interesPagado||''} onChange={e => setForm(f => ({ ...f, interesPagado:e.target.value }))} /></Field>
            <Field label="Estado"><select style={IS} value={form.estado||'pagado'} onChange={e => setForm(f => ({ ...f, estado:e.target.value }))}><option value="pagado">Pagado</option><option value="pendiente">Pendiente</option><option value="atrasado">Atrasado</option></select></Field>
            <Field label="Notas" full><textarea style={{ ...IS, resize:'vertical', minHeight:55 }} value={form.notas||''} onChange={e => setForm(f => ({ ...f, notas:e.target.value }))} /></Field>
          </div>
          {ii && <div style={{ fontSize:12, color:'var(--text2)', marginTop:8, padding:10, background:'var(--surface2)', borderRadius:'var(--radius)' }}>{ii}</div>}
        </Modal>
      )}
    </div>
  )
}
