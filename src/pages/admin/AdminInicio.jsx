import { Badge, Metric, Card, TW, TH, TD, emptyRow } from '../../components/UI.jsx'
import { fmt, fmtPct } from '../../helpers.js'

export default function AdminInicio({ db }) {
  const activos = db.socios.filter(s => s.estado === 'activo').length
  const prestActivos = db.prestamos.filter(p => p.estado === 'activo')
  const cartera = prestActivos.reduce((a, p) => a + p.saldoCapital, 0)
  const ahorros = db.socios.reduce((a, s) => a + s.ahorroAcumulado, 0)
  const saldoCaja = db.caja.reduce((acc, m) => m.tipo === 'ingreso' ? acc + m.monto : acc - m.monto, 0)
  const atrasados = db.pagos.filter(p => p.estado === 'atrasado').length
  const pendPY = db.solicitudesPrestaya.filter(s => s.estado === 'pendiente').length

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h2 style={{ fontSize:20, fontWeight:600, margin:0 }}>Panel de control</h2>
        <span style={{ fontSize:12, color:'var(--text2)' }}>{new Date().toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:24 }}>
        <Metric label="Socios activos" value={activos} />
        <Metric label="Total ahorros" value={fmt(ahorros)} />
        <Metric label="Cartera activa" value={fmt(cartera)} />
        <Metric label="Saldo caja" value={fmt(saldoCaja)} color={saldoCaja < 0 ? 'var(--red)' : undefined} />
        <Metric label="Pagos atrasados" value={atrasados} color={atrasados > 0 ? 'var(--red)' : 'var(--green)'} />
        <Metric label="PrestaYA pendientes" value={pendPY} color={pendPY > 0 ? 'var(--amber)' : undefined} />
      </div>
      <Card title="Préstamos activos">
        <TW><table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
          <thead><tr>{['Socio','Monto','Saldo','Tasa','Estado pago'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {prestActivos.length === 0 ? emptyRow(5, 'Sin préstamos activos') :
            prestActivos.map(p => {
              const s = db.socios.find(x => x.id === p.socioId)
              const pgs = db.pagos.filter(pg => pg.prestamoId === p.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
              const ult = pgs[0]
              return <tr key={p.id}>
                <td style={TD}><strong>{s ? s.nombre : '—'}</strong></td>
                <td style={TD}>{fmt(p.monto)}</td>
                <td style={TD}>{fmt(p.saldoCapital)}</td>
                <td style={TD}><span style={{ fontSize:11, fontWeight:600, color:p.tasa <= 2.5 ? 'var(--green)' : 'var(--red)' }}>{fmtPct(p.tasa)}</span></td>
                <td style={TD}>{!ult ? <Badge c="gray">Sin pagos</Badge> : ult.estado === 'pagado' ? <Badge c="green">Al día</Badge> : ult.estado === 'atrasado' ? <Badge c="red">Atrasado</Badge> : <Badge c="amber">Pendiente</Badge>}</td>
              </tr>
            })}
          </tbody>
        </table></TW>
      </Card>
    </div>
  )
}
