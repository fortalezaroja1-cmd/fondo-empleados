import { useState } from 'react'
import { sb } from '../../supabase.js'
import { uid, hoy, fmt, fmtPct } from '../../helpers.js'
import { Badge, Btn, Field, Modal, IS, Metric, EmptyState } from '../../components/UI.jsx'

export default function AdminSocioDetalle({ socioId, db, refresh, onVolver }) {
  const [tab, setTab] = useState('resumen')
  const [modalPago, setModalPago] = useState(false)
  const [modalPrestamo, setModalPrestamo] = useState(false)
  const [modalAhorro, setModalAhorro] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [formPago, setFormPago] = useState({})
  const [formPrestamo, setFormPrestamo] = useState({})
  const [formAhorro, setFormAhorro] = useState({})
  const [formEditar, setFormEditar] = useState({})
  const [saving, setSaving] = useState(false)
  const [infoTasa, setInfoTasa] = useState('')
  const [infoPago, setInfoPago] = useState('')

  const socio = db.socios.find(x => x.id === socioId)
  if (!socio) return <div style={{ padding: 20 }}>Socio no encontrado.</div>

  const misPrestamos = db.prestamos.filter(p => p.socioId === socioId)
  const prestamosActivos = misPrestamos.filter(p => p.estado === 'activo')
  const misPagos = db.pagos.filter(p => p.socioId === socioId).sort((a, b) => b.fecha.localeCompare(a.fecha))
  const misPrestaya = db.prestaya.filter(p => p.socioId === socioId)
  const solPendientes = db.solicitudesPrestaya.filter(s => s.socioId === socioId && s.estado === 'pendiente')

  const totalDeuda = prestamosActivos.reduce((a, p) => a + p.saldoCapital, 0)
  const totalIntereses = misPagos.reduce((a, p) => a + p.interesPagado, 0)
  const totalPagado = misPagos.filter(p => p.estado === 'pagado').reduce((a, p) => a + p.total, 0)

  const calcInteresQuincena = (prestamo) => (prestamo.saldoCapital * (prestamo.tasa / 100)) / 2

  const calcSeparacion = (prestamoId, montoPago) => {
    const p = db.prestamos.find(x => x.id === prestamoId)
    if (!p || !montoPago) return null
    const interesQuincena = calcInteresQuincena(p)
    const pago = parseFloat(montoPago) || 0
    const interesAplicado = Math.min(interesQuincena, pago)
    const capitalAplicado = Math.max(0, pago - interesAplicado)
    const nuevoSaldo = Math.max(0, p.saldoCapital - capitalAplicado)
    return { interesAplicado, capitalAplicado, nuevoSaldo, interesQuincena, p }
  }

  const getTasa = (monto) => {
    const m = parseFloat(monto) || 0
    if (!m) return { tasa: null, info: '' }
    const ah = socio.ahorroAcumulado || 0
    if (m <= ah) return { tasa: 2.5, info: `✅ ${fmt(m)} ≤ ahorro ${fmt(ah)} → tasa 2.5%` }
    return { tasa: 3.5, info: `⚠️ ${fmt(m)} supera ahorro en ${fmt(m - ah)} → tasa 3.5%` }
  }

  const guardarEdicion = async () => {
    if (!formEditar.nombre?.trim()) { alert('Nombre requerido'); return }
    setSaving(true)
    await sb.from('socios').update({
      nombre: formEditar.nombre, cedula: formEditar.cedula,
      telefono: formEditar.telefono || '', fecha_ingreso: formEditar.fechaIngreso || null,
      estado: formEditar.estado || 'activo', notas: formEditar.notas || '',
      ahorro_quincenal: parseFloat(formEditar.ahorroQuincenal) || 0,
      ahorro_acumulado: parseFloat(formEditar.ahorroAcumulado) || 0,
      utilidad_pct: formEditar.utilidadPct ? parseFloat(formEditar.utilidadPct) : null
    }).eq('id', socioId)
    await refresh(); setSaving(false); setModalEditar(false)
  }

  const guardarAhorro = async () => {
    const monto = parseFloat(formAhorro.monto) || 0
    if (monto <= 0) { alert('Monto inválido'); return }
    setSaving(true)
    const nuevoAcumulado = (socio.ahorroAcumulado || 0) + monto
    await sb.from('socios').update({ ahorro_acumulado: nuevoAcumulado }).eq('id', socioId)
    await sb.from('caja').insert({
      id: uid(), tipo: 'ingreso', fecha: formAhorro.fecha || hoy(),
      concepto: `Ahorro - ${socio.nombre}`, monto,
      referencia: socioId, responsable: '', notas: formAhorro.notas || ''
    })
    await refresh(); setSaving(false); setModalAhorro(false); setFormAhorro({})
  }

  const guardarPrestamo = async () => {
    const monto = parseFloat(formPrestamo.monto) || 0
    if (monto <= 0) { alert('Monto inválido'); return }
    const tasaManual = parseFloat(formPrestamo.tasaManual)
    const { tasa: tasaAuto } = getTasa(monto)
    const tasa = tasaManual > 0 ? tasaManual : tasaAuto
    if (!tasa) { alert('Define la tasa'); return }
    setSaving(true)
    const pid = uid()
    await sb.from('prestamos').insert({
      id: pid, socio_id: socioId, monto, saldo_capital: monto,
      tasa, plazo: parseInt(formPrestamo.plazo) || 0,
      fecha_inicio: formPrestamo.fechaInicio || hoy(),
      estado: 'activo', notas: formPrestamo.notas || ''
    })
    await sb.from('caja').insert({
      id: uid(), tipo: 'desembolso', fecha: formPrestamo.fechaInicio || hoy(),
      concepto: `Desembolso - ${socio.nombre}`, monto,
      referencia: pid, responsable: '', notas: ''
    })
    await refresh(); setSaving(false); setModalPrestamo(false); setFormPrestamo({}); setInfoTasa('')
  }

  const guardarPago = async () => {
    const { prestamoId, fecha, fechaCorte, monto, estado } = formPago
    if (!prestamoId || !(parseFloat(monto) > 0)) { alert('Selecciona préstamo y monto'); return }
    const sep = calcSeparacion(prestamoId, monto)
    if (!sep) return
    setSaving(true)
    const pgId = uid()
    await sb.from('pagos').insert({
      id: pgId, socio_id: socioId, prestamo_id: prestamoId,
      fecha: fecha || hoy(), fecha_corte: fechaCorte || null,
      capital_abonado: sep.capitalAplicado,
      interes_pagado: sep.interesAplicado,
      total: parseFloat(monto),
      estado: estado || 'pagado', notas: formPago.notas || ''
    })
    await sb.from('prestamos').update({
      saldo_capital: sep.nuevoSaldo,
      estado: sep.nuevoSaldo === 0 ? 'cancelado' : 'activo'
    }).eq('id', prestamoId)
    if ((estado || 'pagado') === 'pagado') {
      await sb.from('caja').insert({
        id: uid(), tipo: 'ingreso', fecha: fecha || hoy(),
        concepto: `Pago préstamo - ${socio.nombre}`, monto: parseFloat(monto),
        referencia: pgId, responsable: '', notas: ''
      })
    }
    await refresh(); setSaving(false); setModalPago(false); setFormPago({}); setInfoPago('')
  }

  const aprobarPrestaya = async (id) => {
    const sol = db.solicitudesPrestaya.find(x => x.id === id)
    const pyId = uid()
    await sb.from('prestaya').insert({
      id: pyId, socio_id: socioId, monto: sol.monto, interes: sol.interes,
      total: sol.total, fecha_aprobacion: hoy(),
      fecha_vencimiento: sol.fechaVencimiento, estado: 'activo', solicitud_id: id
    })
    await sb.from('caja').insert({
      id: uid(), tipo: 'desembolso', fecha: hoy(),
      concepto: `PrestaYA - ${socio.nombre}`, monto: sol.monto,
      referencia: pyId, responsable: '', notas: ''
    })
    await sb.from('solicitudes_prestaya').update({ estado: 'aprobado', fecha_aprobacion: hoy() }).eq('id', id)
    await refresh()
  }

  const rechazarPrestaya = async (id) => {
    await sb.from('solicitudes_prestaya').update({ estado: 'rechazado' }).eq('id', id)
    await refresh()
  }

  const pagarPrestaya = async (id) => {
    const py = db.prestaya.find(x => x.id === id)
    await sb.from('prestaya').update({ estado: 'pagado', fecha_pago: hoy() }).eq('id', id)
    await sb.from('caja').insert({
      id: uid(), tipo: 'ingreso', fecha: hoy(),
      concepto: `Pago PrestaYA - ${socio.nombre}`, monto: py.total,
      referencia: id, responsable: '', notas: ''
    })
    await refresh()
  }

  const TABS = [['resumen','Resumen'],['ahorros','Ahorros'],['prestamos','Préstamos'],['pagos','Pagos'],['prestaya','PrestaYA'],['historial','Historial']]
  const tabS = active => ({ padding:'10px 14px', fontSize:13, background:'transparent', border:'none', borderBottom:active?'2px solid #1a1a18':'2px solid transparent', color:active?'#1a1a18':'#aaa', cursor:'pointer', fontWeight:active?600:400, whiteSpace:'nowrap' })

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <button onClick={onVolver} style={{ background:'rgba(0,0,0,0.06)', border:'none', borderRadius:8, padding:'8px 14px', fontSize:13, cursor:'pointer' }}>← Volver</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:20, fontWeight:700 }}>{socio.nombre}</div>
          <div style={{ fontSize:13, color:'#6b6b66' }}>{socio.cedula} · {socio.telefono||'—'}</div>
        </div>
        <button onClick={() => { setFormEditar({...socio, utilidadPct: socio.utilidadPct||''}); setModalEditar(true) }}
          style={{ background:'#1a1a18', color:'#fff', border:'none', borderRadius:8, padding:'8px 14px', fontSize:13, cursor:'pointer' }}>
          ✏ Editar
        </button>
      </div>

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
        <Metric label="Ahorro acumulado" value={fmt(socio.ahorroAcumulado)} color="var(--green)"/>
        <Metric label="Total deuda" value={fmt(totalDeuda)} color={totalDeuda>0?'var(--red)':undefined}/>
        <Metric label="Intereses cobrados" value={fmt(totalIntereses)}/>
        <Metric label="Total pagado" value={fmt(totalPagado)}/>
      </div>

      {/* Acciones rápidas */}
      <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
        <Btn primary onClick={() => { setFormAhorro({fecha:hoy(),monto:'',notas:''}); setModalAhorro(true) }} style={{ whiteSpace:'nowrap', minHeight:40, fontSize:13 }}>+ Ahorro</Btn>
        <Btn primary onClick={() => { setFormPrestamo({monto:'',tasaManual:'',plazo:'',fechaInicio:hoy(),notas:''}); setInfoTasa(''); setModalPrestamo(true) }} style={{ whiteSpace:'nowrap', minHeight:40, fontSize:13 }}>+ Préstamo</Btn>
        <Btn primary onClick={() => { setFormPago({prestamoId:'',fecha:hoy(),fechaCorte:'',monto:'',estado:'pagado',notas:''}); setInfoPago(''); setModalPago(true) }} style={{ whiteSpace:'nowrap', minHeight:40, fontSize:13 }} disabled={prestamosActivos.length===0}>+ Pago</Btn>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(0,0,0,0.08)', marginBottom:16, overflowX:'auto' }}>
        {TABS.map(([id,label]) => <button key={id} style={tabS(tab===id)} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {/* RESUMEN */}
      {tab==='resumen' && (
        <div>
          <div style={{ background:'#fff', borderRadius:14, padding:16, marginBottom:12, border:'1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Datos personales</div>
            {[['Nombre',socio.nombre],['Cédula',socio.cedula],['Teléfono',socio.telefono||'—'],['Fecha ingreso',socio.fechaIngreso||'—'],['Estado',socio.estado],['Utilidad %',socio.utilidadPct?`${socio.utilidadPct}%`:`Global (${db.config.utilidadPct}%)`],['Notas',socio.notas||'—']].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(0,0,0,0.05)', fontSize:14 }}>
                <span style={{ color:'#6b6b66' }}>{l}</span><span style={{ fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>
          {solPendientes.length>0 && (
            <div style={{ background:'#FAEEDA', borderRadius:14, padding:14, marginBottom:12, border:'1px solid #854F0B' }}>
              <div style={{ fontWeight:600, color:'#633806', marginBottom:8 }}>⏳ PrestaYA pendientes ({solPendientes.length})</div>
              {solPendientes.map(sol => (
                <div key={sol.id} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:13, marginBottom:6 }}>Monto: <strong>{fmt(sol.monto)}</strong> · Total: <strong>{fmt(sol.total)}</strong></div>
                  <div style={{ display:'flex', gap:8 }}>
                    <Btn primary onClick={() => aprobarPrestaya(sol.id)} style={{ flex:1, justifyContent:'center', minHeight:36, fontSize:13 }}>✓ Aprobar</Btn>
                    <Btn danger onClick={() => rechazarPrestaya(sol.id)} style={{ flex:1, justifyContent:'center', minHeight:36, fontSize:13 }}>✕ Rechazar</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AHORROS */}
      {tab==='ahorros' && (
        <div>
          <div style={{ background:'#EAF3DE', borderRadius:14, padding:16, marginBottom:12, border:'1px solid #3B6D11' }}>
            <div style={{ fontSize:12, color:'#3B6D11', marginBottom:4 }}>AHORRO ACUMULADO</div>
            <div style={{ fontSize:28, fontWeight:700, color:'#3B6D11' }}>{fmt(socio.ahorroAcumulado)}</div>
            <div style={{ fontSize:12, color:'#3B6D11', marginTop:4 }}>Quincenal: {fmt(socio.ahorroQuincenal)}</div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <Btn primary onClick={() => { setFormAhorro({fecha:hoy(),monto:'',notas:''}); setModalAhorro(true) }} style={{ minHeight:40, fontSize:13 }}>+ Registrar abono</Btn>
          </div>
          {db.caja.filter(m => m.referencia===socioId && m.tipo==='ingreso' && m.concepto?.includes('Ahorro')).length===0
            ? <EmptyState msg="Sin aportes registrados"/>
            : db.caja.filter(m => m.referencia===socioId && m.tipo==='ingreso' && m.concepto?.includes('Ahorro'))
                .sort((a,b) => b.fecha.localeCompare(a.fecha))
                .map(m => (
                  <div key={m.id} style={{ background:'#fff', borderRadius:12, padding:'12px 16px', marginBottom:8, border:'1px solid rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:500 }}>{m.concepto}</div>
                      <div style={{ fontSize:12, color:'#6b6b66' }}>{m.fecha}</div>
                    </div>
                    <div style={{ fontSize:16, fontWeight:700, color:'#3B6D11' }}>+{fmt(m.monto)}</div>
                  </div>
                ))}
        </div>
      )}

      {/* PRÉSTAMOS */}
      {tab==='prestamos' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <Btn primary onClick={() => { setFormPrestamo({monto:'',tasaManual:'',plazo:'',fechaInicio:hoy(),notas:''}); setInfoTasa(''); setModalPrestamo(true) }} style={{ minHeight:40, fontSize:13 }}>+ Nuevo préstamo</Btn>
          </div>
          {misPrestamos.length===0 ? <EmptyState msg="Sin préstamos registrados"/> :
          misPrestamos.map(p => {
            const pct = p.monto>0 ? Math.min((1-p.saldoCapital/p.monto)*100,100) : 100
            const interesQ = calcInteresQuincena(p)
            return (
              <div key={p.id} style={{ background:'#fff', borderRadius:14, padding:16, marginBottom:10, border:'1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <strong style={{ fontSize:16 }}>{fmt(p.monto)}</strong>
                  <Badge c={p.estado==='activo'?'blue':'green'}>{p.estado}</Badge>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10, fontSize:13 }}>
                  <div style={{ background:'#f5f4f0', borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ color:'#6b6b66', fontSize:11 }}>SALDO CAPITAL</div>
                    <div style={{ fontWeight:600 }}>{fmt(p.saldoCapital)}</div>
                  </div>
                  <div style={{ background:'#f5f4f0', borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ color:'#6b6b66', fontSize:11 }}>TASA</div>
                    <div style={{ fontWeight:600, color:p.tasa<=2.5?'var(--green)':'var(--red)' }}>{fmtPct(p.tasa)} quinc.</div>
                  </div>
                  <div style={{ background:'#FAEEDA', borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ color:'#633806', fontSize:11 }}>INTERÉS PRÓX. QUINC.</div>
                    <div style={{ fontWeight:600, color:'var(--amber)' }}>{fmt(interesQ)}</div>
                  </div>
                  <div style={{ background:'#f5f4f0', borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ color:'#6b6b66', fontSize:11 }}>DESDE</div>
                    <div style={{ fontWeight:600 }}>{p.fechaInicio||'—'}</div>
                  </div>
                </div>
                <div style={{ background:'#f1f0eb', borderRadius:4, height:6, overflow:'hidden', marginBottom:4 }}>
                  <div style={{ background:'var(--green)', height:6, width:`${pct.toFixed(0)}%` }}/>
                </div>
                <div style={{ fontSize:11, color:'#aaa', marginBottom:p.estado==='activo'?10:0 }}>{pct.toFixed(0)}% pagado</div>
                {p.estado==='activo' && (
                  <Btn primary full onClick={() => { setFormPago({prestamoId:p.id,fecha:hoy(),fechaCorte:'',monto:'',estado:'pagado',notas:''}); setInfoPago(`Saldo: ${fmt(p.saldoCapital)} · Interés quinc.: ${fmt(interesQ)}`); setModalPago(true) }} style={{ minHeight:40, fontSize:13 }}>
                    Registrar pago
                  </Btn>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* PAGOS */}
      {tab==='pagos' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <Btn primary onClick={() => { setFormPago({prestamoId:'',fecha:hoy(),fechaCorte:'',monto:'',estado:'pagado',notas:''}); setInfoPago(''); setModalPago(true) }} disabled={prestamosActivos.length===0} style={{ minHeight:40, fontSize:13 }}>+ Registrar pago</Btn>
          </div>
          {misPagos.length===0 ? <EmptyState msg="Sin pagos registrados"/> :
          misPagos.map(pg => {
            let puntBadge = null
            if(pg.fechaCorte && pg.fecha && pg.estado==='pagado'){
              const limite=new Date(pg.fechaCorte+'T12:00:00')
              let hab=0,cur=new Date(limite)
              while(hab<3){cur.setDate(cur.getDate()+1);if(cur.getDay()!==0&&cur.getDay()!==6)hab++}
              puntBadge=pg.fecha<=cur.toISOString().slice(0,10)?<Badge c="green">Puntual</Badge>:<Badge c="red">Tardío</Badge>
            }
            return (
              <div key={pg.id} style={{ background:'#fff', borderRadius:14, padding:16, marginBottom:10, border:'1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:13, color:'#6b6b66' }}>{pg.fecha}</span>
                  <Badge c={pg.estado==='pagado'?'green':pg.estado==='atrasado'?'red':'amber'}>{pg.estado}</Badge>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, fontSize:13, marginBottom:8 }}>
                  <div style={{ background:'#f5f4f0', borderRadius:8, padding:'6px 10px' }}>
                    <div style={{ fontSize:10, color:'#6b6b66' }}>CAPITAL</div>
                    <div style={{ fontWeight:600 }}>{fmt(pg.capitalAbonado)}</div>
                  </div>
                  <div style={{ background:'#FAEEDA', borderRadius:8, padding:'6px 10px' }}>
                    <div style={{ fontSize:10, color:'#633806' }}>INTERÉS</div>
                    <div style={{ fontWeight:600, color:'var(--amber)' }}>{fmt(pg.interesPagado)}</div>
                  </div>
                  <div style={{ background:'#EAF3DE', borderRadius:8, padding:'6px 10px' }}>
                    <div style={{ fontSize:10, color:'#3B6D11' }}>TOTAL</div>
                    <div style={{ fontWeight:700, color:'#3B6D11' }}>{fmt(pg.total)}</div>
                  </div>
                </div>
                {puntBadge && <div>{puntBadge}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* PRESTAYA */}
      {tab==='prestaya' && (
        <div>
          {solPendientes.length>0 && <>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--amber)', marginBottom:10 }}>⏳ Solicitudes pendientes</div>
            {solPendientes.map(sol => (
              <div key={sol.id} style={{ background:'#fff', borderRadius:14, padding:16, marginBottom:10, border:'2px solid var(--amber)' }}>
                <div style={{ fontSize:13, marginBottom:8 }}>Monto: <strong>{fmt(sol.monto)}</strong> · Interés: {fmt(sol.interes)} · Total: <strong style={{ color:'var(--red)' }}>{fmt(sol.total)}</strong></div>
                <div style={{ fontSize:12, color:'#6b6b66', marginBottom:10 }}>Vence: {sol.fechaVencimiento||'—'}</div>
                <div style={{ display:'flex', gap:8 }}>
                  <Btn primary full onClick={() => aprobarPrestaya(sol.id)} style={{ minHeight:40, fontSize:13 }}>✓ Aprobar</Btn>
                  <Btn danger full onClick={() => rechazarPrestaya(sol.id)} style={{ minHeight:40, fontSize:13 }}>✕ Rechazar</Btn>
                </div>
              </div>
            ))}
          </>}
          {misPrestaya.length===0 && solPendientes.length===0 ? <EmptyState msg="Sin PrestaYA"/> :
          misPrestaya.map(py => {
            const vencido=py.fechaVencimiento&&py.fechaVencimiento<hoy()&&py.estado==='activo'
            return (
              <div key={py.id} style={{ background:'#fff', borderRadius:14, padding:16, marginBottom:10, border:'1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <strong>{fmt(py.monto)}</strong>
                  <Badge c={py.estado==='pagado'?'green':vencido?'red':'blue'}>{py.estado==='pagado'?'Pagado':vencido?'Vencido':'Activo'}</Badge>
                </div>
                <div style={{ fontSize:13, color:'#6b6b66', marginBottom:py.estado==='activo'?10:0 }}>Interés: {fmt(py.interes)} · Total: <strong>{fmt(py.total)}</strong> · Vence: {py.fechaVencimiento||'—'}</div>
                {py.estado==='activo' && <Btn primary full onClick={() => pagarPrestaya(py.id)} style={{ minHeight:40, fontSize:13 }}>Marcar pagado</Btn>}
              </div>
            )
          })}
        </div>
      )}

      {/* HISTORIAL */}
      {tab==='historial' && (() => {
        const movimientos = [
          ...misPagos.map(p => ({ key:p.id, fecha:p.fecha, titulo:`Pago préstamo`, detalle:`Capital: ${fmt(p.capitalAbonado)} · Interés: ${fmt(p.interesPagado)}`, monto:p.total, positivo:true })),
          ...db.caja.filter(m => m.referencia===socioId || misPrestamos.some(p => p.id===m.referencia))
            .map(m => ({ key:m.id, fecha:m.fecha, titulo:m.concepto, detalle:m.tipo, monto:m.monto, positivo:m.tipo!=='desembolso' }))
        ].sort((a,b) => b.fecha.localeCompare(a.fecha))
        return movimientos.length===0 ? <EmptyState msg="Sin movimientos"/> :
          movimientos.map((item,i) => (
            <div key={i} style={{ background:'#fff', borderRadius:12, padding:'12px 16px', marginBottom:8, border:'1px solid rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:500 }}>{item.titulo}</div>
                <div style={{ fontSize:12, color:'#6b6b66' }}>{item.fecha} · {item.detalle}</div>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:item.positivo?'var(--green)':'var(--red)' }}>
                {item.positivo?'+':'-'}{fmt(item.monto)}
              </div>
            </div>
          ))
      })()}

      {/* Modal Editar */}
      {modalEditar && (
        <Modal title="Editar socio" onClose={() => setModalEditar(false)}
          footer={<><Btn full onClick={() => setModalEditar(false)}>Cancelar</Btn><Btn primary full onClick={guardarEdicion} disabled={saving}>{saving?'Guardando...':'Guardar'}</Btn></>}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Field label="Nombre *"><input style={IS} value={formEditar.nombre||''} onChange={e => setFormEditar(f=>({...f,nombre:e.target.value}))}/></Field>
            <Field label="Cédula"><input style={IS} value={formEditar.cedula||''} onChange={e => setFormEditar(f=>({...f,cedula:e.target.value}))}/></Field>
            <Field label="Teléfono"><input style={IS} value={formEditar.telefono||''} onChange={e => setFormEditar(f=>({...f,telefono:e.target.value}))}/></Field>
            <Field label="Ahorro quincenal ($)"><input style={IS} type="number" value={formEditar.ahorroQuincenal||''} onChange={e => setFormEditar(f=>({...f,ahorroQuincenal:e.target.value}))}/></Field>
            <Field label="Ahorro acumulado ($)"><input style={IS} type="number" value={formEditar.ahorroAcumulado||''} onChange={e => setFormEditar(f=>({...f,ahorroAcumulado:e.target.value}))}/></Field>
            <Field label={`Utilidad % (vacío = global ${db.config.utilidadPct}%)`}><input style={IS} type="number" step="0.01" value={formEditar.utilidadPct||''} onChange={e => setFormEditar(f=>({...f,utilidadPct:e.target.value}))}/></Field>
            <Field label="Estado"><select style={IS} value={formEditar.estado||'activo'} onChange={e => setFormEditar(f=>({...f,estado:e.target.value}))}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></Field>
            <Field label="Notas"><textarea style={{...IS,minHeight:70,resize:'vertical'}} value={formEditar.notas||''} onChange={e => setFormEditar(f=>({...f,notas:e.target.value}))}/></Field>
          </div>
        </Modal>
      )}

      {/* Modal Ahorro */}
      {modalAhorro && (
        <Modal title="Registrar abono a ahorros" onClose={() => setModalAhorro(false)}
          footer={<><Btn full onClick={() => setModalAhorro(false)}>Cancelar</Btn><Btn primary full onClick={guardarAhorro} disabled={saving}>{saving?'Guardando...':'Registrar'}</Btn></>}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'#EAF3DE', borderRadius:10, padding:12, fontSize:13, color:'#27500A' }}>Ahorro actual: <strong>{fmt(socio.ahorroAcumulado)}</strong></div>
            <Field label="Monto ($) *"><input style={IS} type="number" value={formAhorro.monto||''} onChange={e => setFormAhorro(f=>({...f,monto:e.target.value}))} placeholder="0"/></Field>
            <Field label="Fecha"><input style={IS} type="date" value={formAhorro.fecha||''} onChange={e => setFormAhorro(f=>({...f,fecha:e.target.value}))}/></Field>
            <Field label="Notas"><input style={IS} value={formAhorro.notas||''} onChange={e => setFormAhorro(f=>({...f,notas:e.target.value}))}/></Field>
            {parseFloat(formAhorro.monto)>0 && <div style={{ background:'#f5f4f0', borderRadius:10, padding:12, fontSize:13 }}>Nuevo total: <strong style={{ color:'var(--green)' }}>{fmt((socio.ahorroAcumulado||0)+(parseFloat(formAhorro.monto)||0))}</strong></div>}
          </div>
        </Modal>
      )}

      {/* Modal Préstamo */}
      {modalPrestamo && (
        <Modal title="Nuevo préstamo" onClose={() => setModalPrestamo(false)}
          footer={<><Btn full onClick={() => setModalPrestamo(false)}>Cancelar</Btn><Btn primary full onClick={guardarPrestamo} disabled={saving}>{saving?'Guardando...':'Crear'}</Btn></>}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Field label="Monto ($) *"><input style={IS} type="number" value={formPrestamo.monto||''} onChange={e => { const {info}=getTasa(e.target.value); setFormPrestamo(f=>({...f,monto:e.target.value})); setInfoTasa(info) }}/></Field>
            {infoTasa && <div style={{ background:'#f5f4f0', borderRadius:10, padding:12, fontSize:13, color:'#6b6b66' }}>{infoTasa}</div>}
            <Field label="Tasa % por quincena (vacío = automática)"><input style={IS} type="number" step="0.01" placeholder={formPrestamo.monto?`Auto: ${getTasa(formPrestamo.monto).tasa||'—'}%`:'Ej: 2.5'} value={formPrestamo.tasaManual||''} onChange={e => setFormPrestamo(f=>({...f,tasaManual:e.target.value}))}/></Field>
            <Field label="Plazo (quincenas)"><input style={IS} type="number" min="1" value={formPrestamo.plazo||''} onChange={e => setFormPrestamo(f=>({...f,plazo:e.target.value}))}/></Field>
            <Field label="Fecha inicio"><input style={IS} type="date" value={formPrestamo.fechaInicio||''} onChange={e => setFormPrestamo(f=>({...f,fechaInicio:e.target.value}))}/></Field>
            <Field label="Notas"><textarea style={{...IS,minHeight:60,resize:'vertical'}} value={formPrestamo.notas||''} onChange={e => setFormPrestamo(f=>({...f,notas:e.target.value}))}/></Field>
          </div>
        </Modal>
      )}

      {/* Modal Pago */}
      {modalPago && (
        <Modal title="Registrar pago" onClose={() => setModalPago(false)}
          footer={<><Btn full onClick={() => setModalPago(false)}>Cancelar</Btn><Btn primary full onClick={guardarPago} disabled={saving}>{saving?'Guardando...':'Registrar'}</Btn></>}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Field label="Préstamo *">
              <select style={IS} value={formPago.prestamoId||''} onChange={e => {
                const p=db.prestamos.find(x=>x.id===e.target.value)
                const iq=p?calcInteresQuincena(p):0
                setFormPago(f=>({...f,prestamoId:e.target.value}))
                setInfoPago(p?`Saldo: ${fmt(p.saldoCapital)} · Interés quinc.: ${fmt(iq)}`:'')
              }}>
                <option value="">Seleccionar...</option>
                {prestamosActivos.map(p=><option key={p.id} value={p.id}>{fmt(p.monto)} — Saldo: {fmt(p.saldoCapital)} — {p.tasa}%</option>)}
              </select>
            </Field>
            {infoPago && <div style={{ background:'#f5f4f0', borderRadius:10, padding:12, fontSize:13, color:'#6b6b66' }}>{infoPago}</div>}
            <Field label="Monto del pago ($) *"><input style={IS} type="number" value={formPago.monto||''} onChange={e => setFormPago(f=>({...f,monto:e.target.value}))} placeholder="0"/></Field>
            {formPago.prestamoId && parseFloat(formPago.monto)>0 && (() => {
              const sep=calcSeparacion(formPago.prestamoId,formPago.monto)
              if(!sep) return null
              return (
                <div style={{ background:'#EAF3DE', borderRadius:10, padding:14, fontSize:13 }}>
                  <div style={{ fontWeight:600, color:'#27500A', marginBottom:8 }}>Separación automática:</div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span>→ Interés</span><strong style={{ color:'var(--amber)' }}>{fmt(sep.interesAplicado)}</strong></div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span>→ Capital</span><strong style={{ color:'var(--green)' }}>{fmt(sep.capitalAplicado)}</strong></div>
                  <div style={{ borderTop:'1px solid rgba(0,0,0,0.1)', paddingTop:8, marginTop:8, display:'flex', justifyContent:'space-between' }}>
                    <span>Nuevo saldo</span><strong style={{ color:'var(--red)' }}>{fmt(sep.nuevoSaldo)}</strong>
                  </div>
                </div>
              )
            })()}
            <Field label="Fecha de corte"><input style={IS} type="date" value={formPago.fechaCorte||''} onChange={e => setFormPago(f=>({...f,fechaCorte:e.target.value}))}/></Field>
            <Field label="Fecha de pago"><input style={IS} type="date" value={formPago.fecha||''} onChange={e => setFormPago(f=>({...f,fecha:e.target.value}))}/></Field>
            <Field label="Estado"><select style={IS} value={formPago.estado||'pagado'} onChange={e => setFormPago(f=>({...f,estado:e.target.value}))}><option value="pagado">Pagado</option><option value="pendiente">Pendiente</option><option value="atrasado">Atrasado</option></select></Field>
            <Field label="Notas"><input style={IS} value={formPago.notas||''} onChange={e => setFormPago(f=>({...f,notas:e.target.value}))}/></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}
