import { useState } from 'react'
import { sb } from '../../supabase.js'
import { uid, hoy, fmt, fmtPct, dlCSV } from '../../helpers.js'
import { Badge, Btn, Field, Modal, Card, TW, PH, IS, TH, TD, emptyRow } from '../../components/UI.jsx'

export default function AdminPrestamos({ db, refresh }) {
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [info, setInfo] = useState('')
  const [saving, setSaving] = useState(false)

  const getTasa = (sid, monto) => {
    const s = db.socios.find(x => x.id === sid)
    if (!s || !monto) return { tasa: null, info: '' }
    const ah = s.ahorroAcumulado, m = parseFloat(monto) || 0
    if (m <= ah) return { tasa: 2.5, info: `✅ ${fmt(m)} ≤ ahorro ${fmt(ah)} → tasa preferencial 2.5%` }
    return { tasa: 3.5, info: `⚠️ ${fmt(m)} supera ahorro ${fmt(ah)} en ${fmt(m - ah)} → tasa 3.5% con garantías` }
  }

  const save = async () => {
    const monto = parseFloat(form.monto) || 0
    if (!form.socioId || monto <= 0) { alert('Selecciona socio y monto.'); return }
    const { tasa } = getTasa(form.socioId, monto)
    const s = db.socios.find(x => x.id === form.socioId)
    setSaving(true)
    const pid = uid()
    await sb.from('prestamos').insert({ id: pid, socio_id: form.socioId, monto, saldo_capital: monto, tasa, plazo: parseInt(form.plazo) || 0, fecha_inicio: form.fechaInicio || hoy(), estado: 'activo', notas: form.notas || '' })
    await sb.from('caja').insert({ id: uid(), tipo: 'desembolso', fecha: form.fechaInicio || hoy(), concepto: `Desembolso - ${s.nombre}`, monto, referencia: pid, responsable: '', notas: '' })
    await refresh(); setSaving(false); setModal(false)
  }

  const cancelar = async id => {
    if (!confirm('¿Cancelar préstamo?')) return
    await sb.from('prestamos').update({ estado: 'cancelado', saldo_capital: 0 }).eq('id', id)
    await refresh()
  }

  const lista = db.prestamos.filter(p => {
    if (!q) return true
    const s = db.socios.find(x => x.id === p.socioId)
    return s && s.nombre.toLowerCase().includes(q.toLowerCase())
  })

  return (
    <div>
      <PH title="Préstamos">
        <Btn primary onClick={() => { setForm({ socioId:'', monto:'', plazo:'', fechaInicio:hoy(), notas:'' }); setInfo(''); setModal(true) }}>+ Nuevo préstamo</Btn>
        <Btn onClick={() => dlCSV([['ID','Socio','Monto','Saldo','Tasa','Plazo','Fecha','Estado'], ...db.prestamos.map(p => [p.id, (db.socios.find(s => s.id === p.socioId)||{}).nombre||'', p.monto, p.saldoCapital, p.tasa, p.plazo, p.fechaInicio, p.estado])], 'prestamos')}>↓ CSV</Btn>
      </PH>
      <Card toolbar={<input style={{ ...IS, width:210 }} placeholder="Buscar socio..." value={q} onChange={e => setQ(e.target.value)} />}>
        <TW><table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
          <thead><tr>{['Socio','Monto','Ahorro ref.','Tasa','Saldo capital','Fecha','Estado','Acciones'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {lista.length === 0 ? emptyRow(8, 'Sin préstamos registrados.') :
            lista.map(p => {
              const s = db.socios.find(x => x.id === p.socioId)
              const pct = p.monto > 0 ? Math.min((1 - p.saldoCapital / p.monto) * 100, 100) : 100
              return <tr key={p.id}>
                <td style={TD}><strong>{s ? s.nombre : '—'}</strong></td>
                <td style={TD}>{fmt(p.monto)}</td>
                <td style={TD}>{fmt(s ? s.ahorroAcumulado : 0)}</td>
                <td style={TD}><span style={{ fontSize:11, fontWeight:600, color:p.tasa <= 2.5 ? 'var(--green)' : 'var(--red)' }}>{fmtPct(p.tasa)}</span></td>
                <td style={TD}>
                  <strong>{fmt(p.saldoCapital)}</strong>
                  <div style={{ background:'var(--surface2)', borderRadius:4, height:4, marginTop:4, overflow:'hidden' }}><div style={{ background:'var(--green)', height:4, width:`${pct.toFixed(0)}%` }} /></div>
                  <span style={{ fontSize:10, color:'var(--text3)' }}>{pct.toFixed(0)}% pagado</span>
                </td>
                <td style={TD}>{p.fechaInicio || '—'}</td>
                <td style={TD}><Badge c={p.estado === 'activo' ? 'blue' : p.estado === 'cancelado' ? 'green' : 'red'}>{p.estado}</Badge></td>
                <td style={TD}><Btn sm disabled={p.estado === 'cancelado'} onClick={() => cancelar(p.id)}>Cancelar</Btn></td>
              </tr>
            })}
          </tbody>
        </table></TW>
      </Card>

      {modal && (
        <Modal title="Nuevo préstamo" onClose={() => setModal(false)}
          footer={<><Btn onClick={() => setModal(false)}>Cancelar</Btn><Btn primary onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Crear préstamo'}</Btn></>}>
          <div className="form-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Socio *" full>
              <select style={IS} value={form.socioId||''} onChange={e => { const { info: i } = getTasa(e.target.value, form.monto); setForm(f => ({ ...f, socioId:e.target.value })); setInfo(i) }}>
                <option value="">Seleccionar...</option>
                {db.socios.filter(s => s.estado === 'activo').map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </Field>
            <Field label="Monto ($) *"><input style={IS} type="number" value={form.monto||''} onChange={e => { const { info: i } = getTasa(form.socioId, e.target.value); setForm(f => ({ ...f, monto:e.target.value })); setInfo(i) }} /></Field>
            <Field label="Tasa (auto)"><input style={IS} readOnly value={form.socioId && form.monto ? (() => { const { tasa } = getTasa(form.socioId, form.monto); return tasa ? `${tasa}%` : '' })() : ''} /></Field>
            <Field label="Plazo (quincenas)"><input style={IS} type="number" min="1" value={form.plazo||''} onChange={e => setForm(f => ({ ...f, plazo:e.target.value }))} /></Field>
            <Field label="Fecha inicio"><input style={IS} type="date" value={form.fechaInicio||''} onChange={e => setForm(f => ({ ...f, fechaInicio:e.target.value }))} /></Field>
            <Field label="Notas" full><textarea style={{ ...IS, resize:'vertical', minHeight:55 }} value={form.notas||''} onChange={e => setForm(f => ({ ...f, notas:e.target.value }))} /></Field>
          </div>
          {info && <div style={{ fontSize:12, color:'var(--text2)', marginTop:8, padding:10, background:'var(--surface2)', borderRadius:'var(--radius)' }}>{info}</div>}
        </Modal>
      )}
    </div>
  )
}
