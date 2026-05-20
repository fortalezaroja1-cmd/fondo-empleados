import { sb } from '../../supabase.js'
import { uid, hoy, fmt, PRESTAYA_MONTOS } from '../../helpers.js'
import { Badge, Btn, Card, TW, PH, TH, TD, emptyRow } from '../../components/UI.jsx'

export default function AdminPrestaya({ db, refresh }) {
  const pendientes = db.solicitudesPrestaya.filter(s => s.estado === 'pendiente')

  const aprobar = async id => {
    const sol = db.solicitudesPrestaya.find(x => x.id === id)
    const s = db.socios.find(x => x.id === sol.socioId)
    const pyId = uid()
    await sb.from('prestaya').insert({ id: pyId, socio_id: sol.socioId, monto: sol.monto, interes: sol.interes, total: sol.total, fecha_aprobacion: hoy(), fecha_vencimiento: sol.fechaVencimiento, estado: 'activo', solicitud_id: id })
    await sb.from('caja').insert({ id: uid(), tipo: 'desembolso', fecha: hoy(), concepto: `PrestaYA - ${s?.nombre||''}`, monto: sol.monto, referencia: pyId, responsable: '', notas: '' })
    await sb.from('solicitudes_prestaya').update({ estado: 'aprobado', fecha_aprobacion: hoy() }).eq('id', id)
    await refresh()
  }

  const rechazar = async id => {
    await sb.from('solicitudes_prestaya').update({ estado: 'rechazado' }).eq('id', id)
    await refresh()
  }

  const pagar = async id => {
    const py = db.prestaya.find(x => x.id === id)
    const s = db.socios.find(x => x.id === py.socioId)
    await sb.from('prestaya').update({ estado: 'pagado', fecha_pago: hoy() }).eq('id', id)
    await sb.from('caja').insert({ id: uid(), tipo: 'ingreso', fecha: hoy(), concepto: `Pago PrestaYA - ${s?.nombre||''}`, monto: py.total, referencia: id, responsable: '', notas: '' })
    await refresh()
  }

  const historial = db.solicitudesPrestaya.filter(s => s.estado !== 'pendiente').sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud))

  return (
    <div>
      <PH title="PrestaYA" />
      {pendientes.length > 0 && <>
        <h3 style={{ fontSize:14, fontWeight:500, marginBottom:12, color:'var(--amber)' }}>⏳ Solicitudes pendientes ({pendientes.length})</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:12, marginBottom:24 }}>
          {pendientes.map(sol => {
            const s = db.socios.find(x => x.id === sol.socioId)
            return <div key={sol.id} style={{ background:'var(--surface)', border:'0.5px solid var(--amber)', borderRadius:'var(--radius-lg)', padding:16 }}>
              <div style={{ fontWeight:600, marginBottom:4 }}>{s?.nombre || '—'}</div>
              <div style={{ fontSize:12, color:'var(--text2)', marginBottom:8 }}>Solicitado: {sol.fechaSolicitud}</div>
              {[['Monto', fmt(sol.monto)], ['Interés', fmt(sol.interes)], ['Total a pagar', fmt(sol.total)]].map(([l, v]) =>
                <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}><span>{l}</span><strong>{v}</strong></div>
              )}
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <Btn primary onClick={() => aprobar(sol.id)} style={{ flex:1, justifyContent:'center' }}>✓ Aprobar</Btn>
                <Btn danger onClick={() => rechazar(sol.id)} style={{ flex:1, justifyContent:'center' }}>✕ Rechazar</Btn>
              </div>
            </div>
          })}
        </div>
      </>}

      <Card title="PrestaYA activos">
        <TW><table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
          <thead><tr>{['Socio','Monto','Interés','Total','F. aprobación','Vence','Estado','Acciones'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {db.prestaya.filter(p => p.estado === 'activo').length === 0 ? emptyRow(8, 'Sin PrestaYA activos.') :
            db.prestaya.filter(p => p.estado === 'activo').map(py => {
              const s = db.socios.find(x => x.id === py.socioId)
              const vencido = py.fechaVencimiento && py.fechaVencimiento < hoy()
              return <tr key={py.id}>
                <td style={TD}><strong>{s?.nombre || '—'}</strong></td>
                <td style={TD}>{fmt(py.monto)}</td>
                <td style={TD}>{fmt(py.interes)}</td>
                <td style={TD}><strong>{fmt(py.total)}</strong></td>
                <td style={TD}>{py.fechaAprobacion || '—'}</td>
                <td style={TD}><span style={{ color: vencido ? 'var(--red)' : undefined }}>{py.fechaVencimiento || '—'}</span></td>
                <td style={TD}><Badge c={vencido ? 'red' : 'blue'}>{vencido ? 'Vencido' : 'Activo'}</Badge></td>
                <td style={TD}><Btn sm primary onClick={() => pagar(py.id)}>Marcar pagado</Btn></td>
              </tr>
            })}
          </tbody>
        </table></TW>
      </Card>

      {historial.length > 0 && <div style={{ marginTop:20 }}>
        <Card title="Historial de solicitudes">
          <TW><table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
            <thead><tr>{['Socio','Monto','Solicitado','Estado'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>{historial.map(sol => {
              const s = db.socios.find(x => x.id === sol.socioId)
              return <tr key={sol.id}><td style={TD}>{s?.nombre||'—'}</td><td style={TD}>{fmt(sol.monto)}</td><td style={TD}>{sol.fechaSolicitud}</td><td style={TD}><Badge c={sol.estado === 'aprobado' ? 'green' : 'red'}>{sol.estado}</Badge></td></tr>
            })}</tbody>
          </table></TW>
        </Card>
      </div>}
    </div>
  )
}
