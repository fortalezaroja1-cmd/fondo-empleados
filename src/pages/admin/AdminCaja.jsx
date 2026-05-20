import { useState } from 'react'
import { sb } from '../../supabase.js'
import { uid, hoy, fmt, dlCSV } from '../../helpers.js'
import { Btn, Field, Modal, Card, TW, PH, IS, TH, TD, Metric, emptyRow } from '../../components/UI.jsx'

export default function AdminCaja({ db, refresh }) {
  const [fTipo, setFT] = useState('')
  const [fMes, setFM] = useState('')
  const [tab, setTab] = useState('mov')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const saldo = db.caja.reduce((acc, m) => m.tipo === 'ingreso' ? acc + m.monto : acc - m.monto, 0)
  const ingresos = db.caja.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0)
  const egresos = db.caja.filter(m => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0)
  const desembolsos = db.caja.filter(m => m.tipo === 'desembolso').reduce((a, m) => a + m.monto, 0)

  const save = async () => {
    if (!form.concepto?.trim() || !(parseFloat(form.monto) > 0)) { alert('Concepto y monto requeridos.'); return }
    setSaving(true)
    await sb.from('caja').insert({ id: uid(), tipo: form.tipo||'ingreso', fecha: form.fecha||hoy(), concepto: form.concepto, monto: parseFloat(form.monto), referencia: form.referencia||'', responsable: form.responsable||'', notas: form.notas||'' })
    await refresh(); setSaving(false); setModal(false)
  }

  const del = async id => {
    if (!confirm('¿Eliminar movimiento?')) return
    await sb.from('caja').delete().eq('id', id)
    await refresh()
  }

  const asc = [...db.caja].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const saldos = {}; let acum = 0
  asc.forEach(m => { acum += m.tipo === 'ingreso' ? m.monto : -m.monto; saldos[m.id] = acum })

  let lista = [...db.caja].sort((a, b) => b.fecha.localeCompare(a.fecha))
  if (fTipo) lista = lista.filter(m => m.tipo === fTipo)
  if (fMes) lista = lista.filter(m => m.fecha.startsWith(fMes))

  const meses = {}
  db.caja.forEach(m => {
    const k = m.fecha.slice(0, 7)
    if (!meses[k]) meses[k] = { i:0, e:0, d:0 }
    if (m.tipo === 'ingreso') meses[k].i += m.monto
    else if (m.tipo === 'egreso') meses[k].e += m.monto
    else meses[k].d += m.monto
  })
  const mK = Object.keys(meses).sort((a, b) => b.localeCompare(a))
  const tabS = active => ({ padding:'9px 16px', fontSize:13, background:'transparent', border:'none', borderBottom:active?'2px solid var(--text)':'2px solid transparent', color:active?'var(--text)':'var(--text2)', cursor:'pointer', fontWeight:active?500:400 })

  return (
    <div>
      <PH title="Caja">
        <Btn primary onClick={() => { setForm({ tipo:'ingreso', fecha:hoy(), concepto:'', monto:'', referencia:'', responsable:'', notas:'' }); setModal(true) }}>+ Movimiento</Btn>
        <Btn onClick={() => dlCSV([['ID','Tipo','Fecha','Concepto','Monto','Referencia','Responsable'], ...db.caja.map(m => [m.id,m.tipo,m.fecha,m.concepto,m.monto,m.referencia||'',m.responsable||''])], 'caja')}>↓ CSV</Btn>
      </PH>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:24 }}>
        <Metric label="Saldo actual" value={fmt(saldo)} color={saldo < 0 ? 'var(--red)' : undefined} />
        <Metric label="Ingresos" value={fmt(ingresos)} color="var(--green)" />
        <Metric label="Egresos" value={fmt(egresos)} color="var(--red)" />
        <Metric label="Desembolsado" value={fmt(desembolsos)} color="var(--amber)" />
      </div>
      <div style={{ display:'flex', gap:2, borderBottom:'0.5px solid var(--border)', marginBottom:20 }}>
        <button style={tabS(tab === 'mov')} onClick={() => setTab('mov')}>Movimientos</button>
        <button style={tabS(tab === 'mes')} onClick={() => setTab('mes')}>Resumen mensual</button>
      </div>

      {tab === 'mov' && <Card toolbar={<div style={{ display:'flex', gap:8 }}>
        <select style={{ ...IS, width:'auto' }} value={fTipo} onChange={e => setFT(e.target.value)}><option value="">Todos</option><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option><option value="desembolso">Desembolso</option></select>
        <input style={{ ...IS, width:140 }} type="month" value={fMes} onChange={e => setFM(e.target.value)} />
      </div>}>
        <TW><table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
          <thead><tr>{['Fecha','Tipo','Concepto','Monto','Saldo acum.','Ref.',''].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {lista.length === 0 ? emptyRow(7, 'Sin movimientos.') :
            lista.map(m => {
              const tc = m.tipo === 'ingreso' ? 'var(--green)' : m.tipo === 'egreso' ? 'var(--red)' : 'var(--amber)'
              const tl = m.tipo === 'ingreso' ? '↑ Ingreso' : m.tipo === 'egreso' ? '↓ Egreso' : '→ Desembolso'
              const s = saldos[m.id]
              return <tr key={m.id}>
                <td style={TD}>{m.fecha}</td>
                <td style={TD}><span style={{ fontSize:12, fontWeight:500, color:tc }}>{tl}</span></td>
                <td style={TD}>{m.concepto}</td>
                <td style={TD}><strong style={{ color:m.tipo === 'egreso' ? 'var(--red)' : undefined }}>{fmt(m.monto)}</strong></td>
                <td style={{ ...TD, color:s >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(s)}</td>
                <td style={{ ...TD, fontSize:11, color:'var(--text2)' }}>{m.referencia || '—'}</td>
                <td style={TD}><Btn sm danger onClick={() => del(m.id)}>✕</Btn></td>
              </tr>
            })}
          </tbody>
        </table></TW>
      </Card>}

      {tab === 'mes' && (mK.length === 0 ? <p style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Sin movimientos.</p> :
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
          {mK.map(k => {
            const d = meses[k]; const neto = d.i - d.e - d.d
            const fecha = new Date(k + '-02').toLocaleDateString('es-CO', { month:'long', year:'numeric' })
            return <div key={k} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:14 }}>
              <h4 style={{ fontSize:13, fontWeight:500, margin:'0 0 10px', textTransform:'capitalize' }}>{fecha}</h4>
              {[['Ingresos',d.i,'var(--green)'],['Egresos',d.e,'var(--red)'],['Desembolsos',d.d,'var(--amber)'],['Neto',neto,neto>=0?'var(--green)':'var(--red)']].map(([l,v,c]) =>
                <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'3px 0', borderBottom:'0.5px solid var(--border)' }}>
                  <span>{l}</span><span style={{ color:c, fontWeight:l==='Neto'?600:400 }}>{fmt(v)}</span>
                </div>)}
            </div>
          })}
        </div>)}

      {modal && <Modal title="Nuevo movimiento" onClose={() => setModal(false)}
        footer={<><Btn onClick={() => setModal(false)}>Cancelar</Btn><Btn primary onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Btn></>}>
        <div className="form-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Tipo"><select style={IS} value={form.tipo||'ingreso'} onChange={e => setForm(f => ({ ...f, tipo:e.target.value }))}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option><option value="desembolso">Desembolso</option></select></Field>
          <Field label="Fecha"><input style={IS} type="date" value={form.fecha||''} onChange={e => setForm(f => ({ ...f, fecha:e.target.value }))} /></Field>
          <Field label="Concepto *" full><input style={IS} value={form.concepto||''} onChange={e => setForm(f => ({ ...f, concepto:e.target.value }))} /></Field>
          <Field label="Monto ($) *"><input style={IS} type="number" value={form.monto||''} onChange={e => setForm(f => ({ ...f, monto:e.target.value }))} /></Field>
          <Field label="Referencia"><input style={IS} value={form.referencia||''} onChange={e => setForm(f => ({ ...f, referencia:e.target.value }))} /></Field>
          <Field label="Responsable" full><input style={IS} value={form.responsable||''} onChange={e => setForm(f => ({ ...f, responsable:e.target.value }))} /></Field>
        </div>
      </Modal>}
    </div>
  )
}
