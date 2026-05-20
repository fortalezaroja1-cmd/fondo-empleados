import { useState, useMemo } from 'react'
import { sb } from '../supabase.js'
import { uid, hoy, fmt, fmtPct, calcUtilidad, PRESTAYA_MONTOS } from '../helpers.js'
import { Badge, Btn, Field, Modal, Card, TW, IS, TH, TD, Metric, emptyRow } from '../components/UI.jsx'

export default function SocioPortal({ socio, db, refresh, onLogout }) {
  const [tab, setTab] = useState('cuenta')
  const { utilMensual, utilAnual, pierde, pct } = useMemo(() => calcUtilidad(socio, db.pagos, db.config), [socio, db.pagos, db.config])
  const misPrestamos = db.prestamos.filter(p => p.socioId === socio.id)
  const misPagos = db.pagos.filter(p => p.socioId === socio.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
  const misPrestaya = db.prestaya.filter(p => p.socioId === socio.id)
  const solPendiente = db.solicitudesPrestaya.filter(s => s.socioId === socio.id && s.estado === 'pendiente')

  const tabS = active => ({ padding:'10px 18px', fontSize:13, background:'transparent', border:'none', borderBottom:active?'2px solid var(--text)':'2px solid transparent', color:active?'var(--text)':'var(--text2)', cursor:'pointer', fontWeight:active?500:400 })

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <div style={{ background:'var(--surface)', borderBottom:'0.5px solid var(--border)', padding:'14px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 style={{ fontSize:15, fontWeight:600, margin:0 }}>{db.config.nombre || 'Fondo de Empleados'}</h1>
          <p style={{ fontSize:12, color:'var(--text2)', margin:0 }}>Bienvenido, {socio.nombre}</p>
        </div>
        <Btn onClick={onLogout}>Cerrar sesión</Btn>
      </div>

      <div style={{ padding:'24px 28px', maxWidth:900, margin:'0 auto' }}>
        <div style={{ display:'flex', gap:2, borderBottom:'0.5px solid var(--border)', marginBottom:24, overflowX:'auto' }}>
          {[['cuenta','Mi cuenta'],['pagos','Mis pagos'],['simulador','Simulador'],['prestaya','PrestaYA']].map(([id, label]) =>
            <button key={id} style={tabS(tab === id)} onClick={() => setTab(id)}>{label}</button>)}
        </div>

        {tab === 'cuenta' && <TabCuenta socio={socio} db={db} misPrestamos={misPrestamos} utilMensual={utilMensual} utilAnual={utilAnual} pierde={pierde} pct={pct} />}
        {tab === 'pagos' && <TabPagos misPagos={misPagos} />}
        {tab === 'simulador' && <TabSimulador socio={socio} config={db.config} />}
        {tab === 'prestaya' && <TabPrestaya socio={socio} db={db} refresh={refresh} misPrestaya={misPrestaya} solPendiente={solPendiente} />}
      </div>
    </div>
  )
}

function TabCuenta({ socio, db, misPrestamos, utilMensual, utilAnual, pierde, pct }) {
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
        <Metric label="Ahorro acumulado" value={fmt(socio.ahorroAcumulado)} />
        <Metric label="Ahorro quincenal" value={fmt(socio.ahorroQuincenal)} />
        <Metric label="Utilidad mensual" value={fmt(utilMensual)} color="var(--green)" />
        <Metric label="Utilidad anual est." value={fmt(utilAnual)} color="var(--green)" />
      </div>
      <div style={{ background:pierde?'var(--red-bg)':'var(--green-bg)', border:`0.5px solid ${pierde?'var(--red)':'var(--green)'}`, borderRadius:'var(--radius-lg)', padding:16, marginBottom:20 }}>
        <div style={{ fontWeight:600, color:pierde?'var(--red-text)':'var(--green-text)', marginBottom:6, fontSize:14 }}>{pierde ? '⚠️ Utilidad en riesgo' : '✅ Utilidad vigente'}</div>
        <p style={{ fontSize:13, color:pierde?'var(--red-text)':'var(--green-text)', margin:0 }}>
          {pierde ? 'Tienes un pago registrado fuera de los 3 días hábiles de la fecha de corte. La utilidad de este año se pierde si no se regulariza.'
            : `Tu utilidad estimada para el año es de ${fmt(utilAnual)} (${pct.toFixed(2)}% mensual sobre tu ahorro). Mantenla pagando puntualmente.`}
        </p>
      </div>
      <Card title="Mis préstamos">
        <TW><table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
          <thead><tr>{['Monto','Saldo','Tasa','% Pagado','Estado'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {misPrestamos.length === 0 ? emptyRow(5, 'Sin préstamos registrados.') :
            misPrestamos.map(p => {
              const pct2 = p.monto > 0 ? Math.min((1 - p.saldoCapital / p.monto) * 100, 100) : 100
              return <tr key={p.id}>
                <td style={TD}>{fmt(p.monto)}</td>
                <td style={TD}><strong>{fmt(p.saldoCapital)}</strong></td>
                <td style={TD}><span style={{ fontSize:11, fontWeight:600, color:p.tasa<=2.5?'var(--green)':'var(--red)' }}>{fmtPct(p.tasa)}</span></td>
                <td style={TD}>
                  <div style={{ background:'var(--surface2)', borderRadius:4, height:6, width:120, overflow:'hidden' }}><div style={{ background:'var(--green)', height:6, width:`${pct2.toFixed(0)}%` }} /></div>
                  <span style={{ fontSize:11, color:'var(--text3)' }}>{pct2.toFixed(0)}%</span>
                </td>
                <td style={TD}><Badge c={p.estado==='activo'?'blue':'green'}>{p.estado}</Badge></td>
              </tr>
            })}
          </tbody>
        </table></TW>
      </Card>
    </div>
  )
}

function TabPagos({ misPagos }) {
  return (
    <Card title="Historial de pagos">
      <TW><table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
        <thead><tr>{['Fecha pago','F. corte','Capital','Interés','Total','Estado','Puntualidad'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
        <tbody>
          {misPagos.length === 0 ? emptyRow(7, 'Sin pagos registrados.') :
          misPagos.map(pg => {
            let puntBadge = <span style={{ fontSize:11, color:'var(--text3)' }}>—</span>
            if (pg.fechaCorte && pg.fecha && pg.estado === 'pagado') {
              const limite = new Date(pg.fechaCorte + 'T12:00:00')
              let hab = 0, cur = new Date(limite)
              while (hab < 3) { cur.setDate(cur.getDate() + 1); if (cur.getDay() !== 0 && cur.getDay() !== 6) hab++ }
              puntBadge = pg.fecha <= cur.toISOString().slice(0, 10) ? <Badge c="green">✓ Puntual</Badge> : <Badge c="red">✗ Tardío</Badge>
            }
            return <tr key={pg.id}>
              <td style={TD}>{pg.fecha}</td>
              <td style={{ ...TD, fontSize:11, color:'var(--text2)' }}>{pg.fechaCorte || '—'}</td>
              <td style={TD}>{fmt(pg.capitalAbonado)}</td>
              <td style={TD}>{fmt(pg.interesPagado)}</td>
              <td style={TD}><strong>{fmt(pg.total)}</strong></td>
              <td style={TD}><Badge c={pg.estado==='pagado'?'green':pg.estado==='atrasado'?'red':'amber'}>{pg.estado}</Badge></td>
              <td style={TD}>{puntBadge}</td>
            </tr>
          })}
        </tbody>
      </table></TW>
    </Card>
  )
}

function TabSimulador({ socio, config }) {
  const [monto, setMonto] = useState('')
  const [plazo, setPlazo] = useState(12)
  const ahorro = parseFloat(socio?.ahorroAcumulado) || 0
  const m = parseFloat(monto) || 0

  let resultado = null
  if (m > 0) {
    const tasa = m <= ahorro ? 2.5 : 3.5
    const estado = m <= ahorro ? 'aprobado' : m <= ahorro * 2 ? 'en_estudio' : 'negado'
    const interesMensual = m * tasa / 100 / 2
    const totalIntereses = interesMensual * plazo
    resultado = { tasa, estado, interesMensual, totalIntereses, totalPagar: m + totalIntereses }
  }

  const estados = {
    aprobado: { bg:'var(--green-bg)', border:'var(--green)', color:'var(--green-text)', icon:'✅', label:'Crédito viable' },
    en_estudio: { bg:'var(--amber-bg)', border:'var(--amber)', color:'var(--amber-text)', icon:'📋', label:'Entra a estudio' },
    negado: { bg:'var(--red-bg)', border:'var(--red)', color:'var(--red-text)', icon:'❌', label:'Simulacro negado' },
  }

  return (
    <div>
      <h3 style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Simulador de crédito</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16, marginBottom:20 }}>
        <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:16 }}>
          <p style={{ fontSize:12, color:'var(--text2)', marginBottom:4 }}>Tu ahorro acumulado</p>
          <p style={{ fontSize:22, fontWeight:600, color:'var(--green)' }}>{fmt(ahorro)}</p>
          <p style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>≤ ahorro → 2.5% | Mayor → 3.5% + estudio</p>
        </div>
        <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:16 }}>
          <Field label="Monto a solicitar ($)"><input style={IS} type="number" min="0" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" /></Field>
          <div style={{ marginTop:12 }}>
            <Field label={`Plazo: ${plazo} quincenas (${(plazo / 2).toFixed(0)} meses)`}>
              <input type="range" min="2" max="48" value={plazo} onChange={e => setPlazo(parseInt(e.target.value))} style={{ width:'100%' }} />
            </Field>
          </div>
        </div>
      </div>
      {resultado && <>
        <div style={{ background:estados[resultado.estado].bg, border:`0.5px solid ${estados[resultado.estado].border}`, borderRadius:'var(--radius-lg)', padding:16, marginBottom:16 }}>
          <div style={{ fontWeight:600, color:estados[resultado.estado].color, fontSize:15, marginBottom:8 }}>{estados[resultado.estado].icon} {estados[resultado.estado].label}</div>
          <p style={{ fontSize:13, color:estados[resultado.estado].color, margin:0 }}>
            {resultado.estado === 'aprobado' && `Monto dentro de tu ahorro. Tasa: 2.5% quincena.`}
            {resultado.estado === 'en_estudio' && `Supera tu ahorro pero es menor al doble. Requiere aprobación del administrador. Tasa: 3.5%.`}
            {resultado.estado === 'negado' && `El monto supera el doble de tu ahorro (${fmt(ahorro * 2)}). No es viable actualmente.`}
          </p>
        </div>
        {resultado.estado !== 'negado' && <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
          <Metric label="Tasa" value={`${resultado.tasa}%`} sub="por quincena" />
          <Metric label="Interés / quincena" value={fmt(resultado.interesMensual)} />
          <Metric label="Total intereses" value={fmt(resultado.totalIntereses)} color="var(--red)" />
          <Metric label="Total a pagar" value={fmt(resultado.totalPagar)} color="var(--blue)" />
        </div>}
      </>}
    </div>
  )
}

function TabPrestaya({ socio, db, refresh, misPrestaya, solPendiente }) {
  const [modalSol, setModalSol] = useState(false)
  const [montoSel, setMontoSel] = useState(null)
  const [saving, setSaving] = useState(false)

  const solicitar = async () => {
    if (!montoSel) { alert('Selecciona un monto.'); return }
    const op = PRESTAYA_MONTOS.find(x => x.monto === montoSel)
    const hoyD = new Date()
    const d1 = db.config.fechaPago1 || 15, d2 = db.config.fechaPago2 || 30
    let venc = new Date(hoyD)
    if (hoyD.getDate() < d1) venc.setDate(d1)
    else if (hoyD.getDate() < d2) venc.setDate(d2)
    else { venc.setMonth(venc.getMonth() + 1); venc.setDate(d1) }
    setSaving(true)
    await sb.from('solicitudes_prestaya').insert({ id: uid(), socio_id: socio.id, monto: op.monto, interes: op.interes, total: op.monto + op.interes, fecha_solicitud: hoy(), fecha_vencimiento: venc.toISOString().slice(0, 10), estado: 'pendiente' })
    await refresh(); setSaving(false); setModalSol(false); setMontoSel(null)
    alert(`Solicitud enviada. El administrador la revisará pronto.`)
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h3 style={{ fontSize:15, fontWeight:500, margin:0 }}>PrestaYA — Préstamos de urgencia</h3>
        <Btn primary onClick={() => setModalSol(true)}>+ Solicitar PrestaYA</Btn>
      </div>
      <div style={{ background:'var(--blue-bg)', border:'0.5px solid var(--blue)', borderRadius:'var(--radius-lg)', padding:14, marginBottom:20, fontSize:13, color:'var(--blue-text)' }}>
        ℹ️ Los PrestaYA son préstamos de urgencia que debes pagar en la <strong>siguiente quincena</strong> sin excepción.
      </div>
      {solPendiente.length > 0 && <div style={{ background:'var(--amber-bg)', border:'0.5px solid var(--amber)', borderRadius:'var(--radius-lg)', padding:14, marginBottom:20, fontSize:13, color:'var(--amber-text)' }}>
        ⏳ Tienes {solPendiente.length} solicitud(es) pendiente(s) de aprobación.
      </div>}
      <Card title="Mis PrestaYA">
        <TW><table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
          <thead><tr>{['Monto','Interés','Total','Aprobado','Vence','Estado'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {misPrestaya.length === 0 ? emptyRow(6, 'Sin PrestaYA registrados.') :
            misPrestaya.map(py => {
              const vencido = py.fechaVencimiento && py.fechaVencimiento < hoy() && py.estado === 'activo'
              return <tr key={py.id}>
                <td style={TD}>{fmt(py.monto)}</td>
                <td style={TD}>{fmt(py.interes)}</td>
                <td style={TD}><strong>{fmt(py.total)}</strong></td>
                <td style={TD}>{py.fechaAprobacion || '—'}</td>
                <td style={TD}><span style={{ color:vencido?'var(--red)':undefined, fontWeight:vencido?600:400 }}>{py.fechaVencimiento || '—'}</span></td>
                <td style={TD}><Badge c={py.estado==='pagado'?'green':vencido?'red':'blue'}>{py.estado==='pagado'?'Pagado':vencido?'Vencido':'Activo'}</Badge></td>
              </tr>
            })}
          </tbody>
        </table></TW>
      </Card>

      {modalSol && <Modal title="Solicitar PrestaYA" onClose={() => setModalSol(false)}
        footer={<><Btn onClick={() => setModalSol(false)}>Cancelar</Btn><Btn primary onClick={solicitar} disabled={saving}>{saving ? 'Enviando...' : 'Enviar solicitud'}</Btn></>}>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>Selecciona el monto. Debes pagar el total en la <strong>siguiente quincena</strong>.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
          {PRESTAYA_MONTOS.map(op => (
            <div key={op.monto} onClick={() => setMontoSel(op.monto)} style={{ border:`2px solid ${montoSel===op.monto?'var(--text)':'var(--border)'}`, borderRadius:'var(--radius-lg)', padding:14, cursor:'pointer', background:montoSel===op.monto?'var(--surface2)':'var(--surface)', textAlign:'center' }}>
              <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>{fmt(op.monto)}</div>
              <div style={{ fontSize:12, color:'var(--text2)' }}>Interés: {fmt(op.interes)}</div>
              <div style={{ fontSize:13, fontWeight:500, color:'var(--red)', marginTop:4 }}>Total: {fmt(op.monto + op.interes)}</div>
            </div>
          ))}
        </div>
      </Modal>}
    </div>
  )
}
