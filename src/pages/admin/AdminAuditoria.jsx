import { PH } from '../../components/UI.jsx'
import { fmt, hoy } from '../../helpers.js'

export default function AdminAuditoria({ db }) {
  const alertas = []
  const n = id => (db.socios.find(x => x.id === id) || {}).nombre || 'desconocido'
  const saldo = db.caja.reduce((acc, m) => m.tipo === 'ingreso' ? acc + m.monto : acc - m.monto, 0)

  if (saldo < 0) alertas.push({ t:'error', msg:`Saldo de caja negativo: ${fmt(saldo)}.` })
  db.prestamos.forEach(p => { if (!db.caja.some(m => m.referencia === p.id && m.tipo === 'desembolso')) alertas.push({ t:'warn', msg:`Préstamo de ${n(p.socioId)} sin desembolso en caja.` }) })
  db.prestamos.forEach(p => { const s = db.socios.find(x => x.id === p.socioId); if (!s) return; const esp = p.monto <= s.ahorroAcumulado ? 2.5 : 3.5; if (Math.abs(p.tasa - esp) > 0.01) alertas.push({ t:'error', msg:`${n(p.socioId)}: tasa ${p.tasa}%, debería ser ${esp}%.` }) })
  db.socios.filter(s => s.estado === 'inactivo').forEach(s => { const a = db.prestamos.filter(p => p.socioId === s.id && p.estado === 'activo'); if (a.length > 0) alertas.push({ t:'warn', msg:`Socio inactivo "${s.nombre}" tiene ${a.length} préstamo(s) activo(s).` }) })
  const at = db.pagos.filter(p => p.estado === 'atrasado'); if (at.length > 0) alertas.push({ t:'warn', msg:`${at.length} pago(s) marcados como atrasados.` })
  db.prestamos.forEach(p => { const tab = db.pagos.filter(pg => pg.prestamoId === p.id && pg.estado === 'pagado').reduce((a, pg) => a + pg.capitalAbonado, 0); const esp = Math.max(0, p.monto - tab); if (Math.abs(esp - p.saldoCapital) > 1) alertas.push({ t:'error', msg:`Inconsistencia saldo ${n(p.socioId)}: registrado ${fmt(p.saldoCapital)} vs calculado ${fmt(esp)}.` }) })
  const pyVenc = db.prestaya.filter(p => p.estado === 'activo' && p.fechaVencimiento && p.fechaVencimiento < hoy()); if (pyVenc.length > 0) alertas.push({ t:'error', msg:`${pyVenc.length} PrestaYA vencido(s) sin pagar.` })

  const cm = { error:{bg:'var(--red-bg)',border:'var(--red)',color:'var(--red-text)'}, warn:{bg:'var(--amber-bg)',border:'var(--amber)',color:'var(--amber-text)'}, ok:{bg:'var(--green-bg)',border:'var(--green)',color:'var(--green-text)'} }

  return (
    <div>
      <PH title="Auditoría" />
      <p style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>Verificación automática de consistencia de registros.</p>
      {alertas.length === 0
        ? <div style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:'var(--radius)', border:`0.5px solid ${cm.ok.border}`, background:cm.ok.bg, color:cm.ok.color, fontSize:12.5 }}>✅ <strong>Todo en orden.</strong></div>
        : <>{<p style={{ fontSize:13, color:'var(--text2)', marginBottom:12 }}><strong>{alertas.length}</strong> punto(s) a revisar:</p>}{alertas.map((a, i) => { const c = cm[a.t]; return <div key={i} style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:'var(--radius)', border:`0.5px solid ${c.border}`, background:c.bg, color:c.color, fontSize:12.5, marginBottom:8 }}>{a.t==='error'?'❌':'⚠️'} {a.msg}</div> })}</>}
    </div>
  )
}
