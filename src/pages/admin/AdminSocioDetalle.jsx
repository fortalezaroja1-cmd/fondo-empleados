import { useState } from 'react'
import { sb } from '../../supabase.js'
import { uid, hoy, fmt, fmtPct, calcInteresQuincena, calcSeparacion, calcATiempo, calcUtilidadAporte } from '../../helpers.js'
import { Badge, Btn, Field, Modal, IS, Metric, EmptyState } from '../../components/UI.jsx'

export default function AdminSocioDetalle({ socioId, db, refresh, onVolver, esSuperAdmin }) {
  const [tab, setTab] = useState('resumen')
  const [modalPago, setModalPago] = useState(false)
  const [modalEditPago, setModalEditPago] = useState(null)
  const [modalAhorro, setModalAhorro] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [formPago, setFormPago] = useState({})
  const [formEditPago, setFormEditPago] = useState({})
  const [formAhorro, setFormAhorro] = useState({})
  const [formEditar, setFormEditar] = useState({})
  const [tipoPago, setTipoPago] = useState(null)
  const [saving, setSaving] = useState(false)
  const [infoTasa, setInfoTasa] = useState('')

  const socio = db.socios.find(x => x.id === socioId)
  if (!socio) return <div style={{ padding: 20 }}>Socio no encontrado.</div>

  const misPrestamos = db.prestamos.filter(p => p.socioId === socioId)
  const prestamosActivos = misPrestamos.filter(p => p.estado === 'activo')
  const misPagos = db.pagos.filter(p => p.socioId === socioId).sort((a, b) => b.fecha.localeCompare(a.fecha))
  const misPrestaya = db.prestaya.filter(p => p.socioId === socioId)
  const solPendientes = db.solicitudesPrestaya.filter(s => s.socioId === socioId && s.estado === 'pendiente')
  const misAportes = db.aportes.filter(a => a.socioId === socioId).sort((a, b) => (b.fechaPago || '').localeCompare(a.fechaPago || ''))

  const totalDeuda = prestamosActivos.reduce((a, p) => a + p.saldoCapital, 0)
  const totalIntereses = misPagos.reduce((a, p) => a + p.interesPagado, 0)
  const totalPagado = misPagos.filter(p => p.estado === 'pagado').reduce((a, p) => a + p.total, 0)
  const totalUtilidades = misAportes.reduce((a, ap) => a + ap.utilidadGenerada, 0)
  const utilPerdida = misAportes.filter(a => a.aTiempo === false).reduce((a, ap) => {
    const p = db.periodos.find(x => x.id === ap.periodoId)
    return a + ((ap.monto || 0) * (p?.utilidadPct || db.config.utilidadPct) / 100)
  }, 0)

  const getTasa = (monto) => {
    const m = parseFloat(monto) || 0
    if (!m) return { tasa: null, info: '' }
    const ah = socio.ahorroAcumulado || 0
    if (m <= ah) return { tasa: 2.5, info: `✅ ${fmt(m)} ≤ ahorro ${fmt(ah)} → tasa 2.5%` }
    return { tasa: 3.5, info: `⚠️ ${fmt(m)} supera ahorro en ${fmt(m - ah)} → tasa 3.5%` }
  }

  // Calcular separación en tiempo real
  const getSep = () => {
    if (tipoPago !== 'prestamo' && tipoPago !== 'mixto') return null
    const p = db.prestamos.find(x => x.id === formPago.prestamoId)
    if (!p || !formPago.montoDeuda) return null
    return calcSeparacion(p, formPago.montoDeuda)
  }
  const sep = getSep()

  // Guardar edición del socio
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

  // Registrar abono a ahorros
  const guardarAhorro = async () => {
    const monto = parseFloat(formAhorro.monto) || 0
    if (monto <= 0) { alert('Monto inválido'); return }
    setSaving(true)
    const periodo = db.periodos.find(x => x.id === formAhorro.periodoId)
    const aTiempo = periodo ? calcATiempo(periodo.fechaCorte, formAhorro.fecha || hoy()) : null
    const utilPct = periodo ? periodo.utilidadPct : (db.config.utilidadPct || 1.3)
    const utilGenerada = calcUtilidadAporte(monto, utilPct, aTiempo)
    const nuevoAcumulado = (socio.ahorroAcumulado || 0) + monto

    await sb.from('socios').update({ ahorro_acumulado: nuevoAcumulado }).eq('id', socioId)
    await sb.from('caja').insert({
      id: uid(), tipo: 'ingreso', fecha: formAhorro.fecha || hoy(),
      concepto: `Ahorro - ${socio.nombre}`, monto,
      referencia: socioId, responsable: '', notas: formAhorro.notas || ''
    })

    // Registrar aporte con período
    if (periodo) {
      await sb.from('aportes').insert({
        id: uid(), socio_id: socioId, periodo_id: formAhorro.periodoId,
        fecha_pago: formAhorro.fecha || hoy(), monto,
        a_tiempo: aTiempo, utilidad_pct: utilPct, utilidad_generada: utilGenerada,
        notas: formAhorro.notas || ''
      })
      // Registrar utilidad en caja de utilidades
      if (utilGenerada > 0) {
        await sb.from('utilidades_caja').insert({
          id: uid(), fecha: formAhorro.fecha || hoy(),
          concepto: `Utilidad ahorro - ${socio.nombre} (${periodo.descripcion || periodo.fechaCorte})`,
          monto: utilGenerada, socio_id: socioId, periodo_id: formAhorro.periodoId,
          tipo: 'utilidad_ahorro'
        })
      }
    }

    await refresh(); setSaving(false); setModalAhorro(false); setFormAhorro({})
  }

  // Registrar pago con tipo y separación
  const guardarPago = async () => {
    if (!tipoPago) { alert('Selecciona el tipo de pago'); return }
    const montoTotal = parseFloat(formPago.montoTotal) || 0
    if (montoTotal <= 0) { alert('Monto inválido'); return }
    setSaving(true)

    let montoCapital = 0, montoInteres = 0, montoAhorro = 0
    const pgId = uid()

    if (tipoPago === 'ahorro') {
      montoAhorro = montoTotal
      await sb.from('socios').update({ ahorro_acumulado: (socio.ahorroAcumulado || 0) + montoTotal }).eq('id', socioId)
    } else if (tipoPago === 'prestamo') {
      const p = db.prestamos.find(x => x.id === formPago.prestamoId)
      if (!p) { alert('Selecciona un préstamo'); setSaving(false); return }
      const sepCalc = calcSeparacion(p, formPago.montoDeuda || montoTotal)
      montoCapital = sepCalc.capitalAplicado
      montoInteres = sepCalc.interesAplicado
      await sb.from('prestamos').update({
        saldo_capital: sepCalc.nuevoSaldo,
        estado: sepCalc.nuevoSaldo === 0 ? 'cancelado' : 'activo'
      }).eq('id', formPago.prestamoId)
      // Registrar interés en caja de utilidades
      if (montoInteres > 0) {
        await sb.from('utilidades_caja').insert({
          id: uid(), fecha: formPago.fecha || hoy(),
          concepto: `Interés préstamo - ${socio.nombre}`,
          monto: montoInteres, socio_id: socioId, prestamo_id: formPago.prestamoId,
          tipo: 'interes_prestamo'
        })
      }
    } else if (tipoPago === 'mixto') {
      // Mixto: parte va a ahorro, parte a deuda
      montoAhorro = parseFloat(formPago.montoAhorro) || 0
      const montoDeudaTotal = parseFloat(formPago.montoDeuda) || 0
      if (formPago.prestamoId && montoDeudaTotal > 0) {
        const p = db.prestamos.find(x => x.id === formPago.prestamoId)
        if (p) {
          const sepCalc = calcSeparacion(p, montoDeudaTotal)
          montoCapital = sepCalc.capitalAplicado
          montoInteres = sepCalc.interesAplicado
          await sb.from('prestamos').update({
            saldo_capital: sepCalc.nuevoSaldo,
            estado: sepCalc.nuevoSaldo === 0 ? 'cancelado' : 'activo'
          }).eq('id', formPago.prestamoId)
          if (montoInteres > 0) {
            await sb.from('utilidades_caja').insert({
              id: uid(), fecha: formPago.fecha || hoy(),
              concepto: `Interés préstamo - ${socio.nombre}`,
              monto: montoInteres, socio_id: socioId, prestamo_id: formPago.prestamoId,
              tipo: 'interes_prestamo'
            })
          }
        }
      }
      if (montoAhorro > 0) {
        await sb.from('socios').update({ ahorro_acumulado: (socio.ahorroAcumulado || 0) + montoAhorro }).eq('id', socioId)
      }
    } else if (tipoPago === 'interes') {
      montoInteres = montoTotal
      if (formPago.prestamoId && montoInteres > 0) {
        await sb.from('utilidades_caja').insert({
          id: uid(), fecha: formPago.fecha || hoy(),
          concepto: `Interés préstamo - ${socio.nombre}`,
          monto: montoInteres, socio_id: socioId, prestamo_id: formPago.prestamoId,
          tipo: 'interes_prestamo'
        })
      }
    }

    await sb.from('pagos').insert({
      id: pgId, socio_id: socioId, prestamo_id: formPago.prestamoId || null,
      fecha: formPago.fecha || hoy(), fecha_corte: formPago.fechaCorte || null,
      capital_abonado: montoCapital, interes_pagado: montoInteres,
      total: montoTotal, estado: 'pagado', notas: formPago.notas || '',
      tipo_pago: tipoPago, monto_capital: montoCapital,
      monto_interes: montoInteres, monto_ahorro: montoAhorro
    })

    await sb.from('caja').insert({
      id: uid(), tipo: 'ingreso', fecha: formPago.fecha || hoy(),
      concepto: `Pago (${tipoPago}) - ${socio.nombre}`, monto: montoTotal,
      referencia: pgId, responsable: '', notas: ''
    })

    await refresh(); setSaving(false); setModalPago(false)
    setFormPago({}); setTipoPago(null)
  }

  // Editar pago existente (Solo Super Admin)
  const guardarEditPago = async () => {
    if (!esSuperAdmin) return
    setSaving(true)
    const pg = modalEditPago
    const montoCapital = parseFloat(formEditPago.montoCapital) || 0
    const montoInteres = parseFloat(formEditPago.montoInteres) || 0
    const montoAhorro = parseFloat(formEditPago.montoAhorro) || 0
    const nuevoTotal = montoCapital + montoInteres + montoAhorro

    await sb.from('pagos').update({
      tipo_pago: formEditPago.tipoPago,
      monto_capital: montoCapital, monto_interes: montoInteres,
      monto_ahorro: montoAhorro, capital_abonado: montoCapital,
      interes_pagado: montoInteres, total: nuevoTotal,
      notas: formEditPago.notas || '',
      editado_por: 'superadmin', editado_at: new Date().toISOString()
    }).eq('id', pg.id)

    await refresh(); setSaving(false); setModalEditPago(null)
  }

  // Aprobar/rechazar PrestaYA
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

  const TABS = [['resumen','Resumen'],['ahorros','Ahorros'],['prestamos','Préstamos'],['pagos','Pagos'],['utilidades','Utilidades'],['prestaya','PrestaYA'],['historial','Historial']]
  const tabS = active => ({ padding:'10px 14px', fontSize:12, background:'transparent', border:'none', borderBottom:active?'2px solid #1a1a18':'2px solid transparent', color:active?'#1a1a18':'#aaa', cursor:'pointer', fontWeight:active?600:400, whiteSpace:'nowrap' })

  const TIPOS_PAGO = [
    { id: 'ahorro', icon: '💰', label: 'Ahorro', color: '#3B6D11', bg: '#EAF3DE' },
    { id: 'prestamo', icon: '🏦', label: 'Abono deuda', color: '#185FA5', bg: '#E6F1FB' },
    { id: 'mixto', icon: '🔀', label: 'Mixto', color: '#854F0B', bg: '#FAEEDA' },
    { id: 'interes', icon: '💸', label: 'Solo interés', color: '#791F1F', bg: '#FCEBEB' },
  ]

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
        <Metric label="Utilidades generadas" value={fmt(totalUtilidades)} color="var(--green)"/>
        <Metric label="Intereses cobrados" value={fmt(totalIntereses)}/>
      </div>

      {/* Acciones rápidas */}
      <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
        <Btn primary onClick={() => { setModalAhorro(true); setFormAhorro({fecha:hoy(),monto:'',periodoId:'',notas:''}) }} style={{ whiteSpace:'nowrap', minHeight:40, fontSize:13 }}>+ Ahorro</Btn>
        <Btn primary onClick={() => { setModalPago(true); setTipoPago(null); setFormPago({fecha:hoy(),fechaCorte:'',notas:''}) }} style={{ whiteSpace:'nowrap', minHeight:40, fontSize:13 }}>+ Pago</Btn>
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
            <Btn primary onClick={() => { setModalAhorro(true); setFormAhorro({fecha:hoy(),monto:'',periodoId:'',notas:''}) }} style={{ minHeight:40, fontSize:13 }}>+ Registrar abono</Btn>
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
          {misPrestamos.length===0 ? <EmptyState msg="Sin préstamos registrados"/> :
          misPrestamos.map((p,i) => {
            const pct = p.monto>0 ? Math.min((1-p.saldoCapital/p.monto)*100,100) : 100
            const interesQ = calcInteresQuincena(p)
            return (
              <div key={p.id} style={{ background:'#fff', borderRadius:14, padding:16, marginBottom:10, border:'1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <strong style={{ fontSize:16 }}>Deuda {i+1} — {fmt(p.monto)}</strong>
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
                <div style={{ background:'#f1f0eb', borderRadius:4, height:6, overflow:'hidden', marginBottom:8 }}>
                  <div style={{ background:'var(--green)', height:6, width:`${pct.toFixed(0)}%` }}/>
                </div>
                {p.estado==='activo' && (
                  <Btn primary full onClick={() => { setModalPago(true); setTipoPago('prestamo'); setFormPago({prestamoId:p.id,fecha:hoy(),fechaCorte:'',montoDeuda:'',notas:''}) }} style={{ minHeight:40, fontSize:13 }}>
                    Registrar pago →
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
            <Btn primary onClick={() => { setModalPago(true); setTipoPago(null); setFormPago({fecha:hoy(),notas:''}) }} style={{ minHeight:40, fontSize:13 }}>+ Registrar pago</Btn>
          </div>
          {misPagos.length===0 ? <EmptyState msg="Sin pagos registrados"/> :
          misPagos.map(pg => {
            const tipoBadge = pg.tipoPago === 'ahorro' ? {c:'green',label:'💰 Ahorro'} : pg.tipoPago === 'mixto' ? {c:'amber',label:'🔀 Mixto'} : pg.tipoPago === 'interes' ? {c:'red',label:'💸 Interés'} : {c:'blue',label:'🏦 Deuda'}
            return (
              <div key={pg.id} style={{ background:'#fff', borderRadius:14, padding:16, marginBottom:10, border:'1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <div>
                    <span style={{ fontSize:13, color:'#6b6b66' }}>{pg.fecha}</span>
                    {pg.editadoPor && <span style={{ fontSize:10, color:'#854F0B', marginLeft:8 }}>✏ Editado</span>}
                  </div>
                  <Badge c={tipoBadge.c}>{tipoBadge.label}</Badge>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, fontSize:13, marginBottom:8 }}>
                  {pg.montoAhorro > 0 && (
                    <div style={{ background:'#EAF3DE', borderRadius:8, padding:'6px 10px' }}>
                      <div style={{ fontSize:10, color:'#3B6D11' }}>AHORRO</div>
                      <div style={{ fontWeight:600, color:'var(--green)' }}>{fmt(pg.montoAhorro)}</div>
                    </div>
                  )}
                  {pg.montoCapital > 0 && (
                    <div style={{ background:'#E6F1FB', borderRadius:8, padding:'6px 10px' }}>
                      <div style={{ fontSize:10, color:'#185FA5' }}>CAPITAL</div>
                      <div style={{ fontWeight:600, color:'var(--blue)' }}>{fmt(pg.montoCapital)}</div>
                    </div>
                  )}
                  {pg.montoInteres > 0 && (
                    <div style={{ background:'#FAEEDA', borderRadius:8, padding:'6px 10px' }}>
                      <div style={{ fontSize:10, color:'#633806' }}>INTERÉS</div>
                      <div style={{ fontWeight:600, color:'var(--amber)' }}>{fmt(pg.montoInteres)}</div>
                    </div>
                  )}
                  <div style={{ background:'#f5f4f0', borderRadius:8, padding:'6px 10px' }}>
                    <div style={{ fontSize:10, color:'#6b6b66' }}>TOTAL</div>
                    <div style={{ fontWeight:700 }}>{fmt(pg.total)}</div>
                  </div>
                </div>
                {esSuperAdmin && (
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <button onClick={() => { setModalEditPago(pg); setFormEditPago({tipoPago:pg.tipoPago||'prestamo', montoCapital:pg.montoCapital||0, montoInteres:pg.montoInteres||0, montoAhorro:pg.montoAhorro||0, notas:pg.notas||''}) }}
                      style={{ fontSize:12, color:'var(--amber)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                      ✏ Editar · 🔐 Super Admin
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* UTILIDADES */}
      {tab==='utilidades' && (
        <div>
          <div style={{ background:'#1a1a18', borderRadius:14, padding:16, marginBottom:16, color:'#fff' }}>
            <div style={{ fontSize:11, color:'#aaa', marginBottom:4 }}>UTILIDAD TOTAL GENERADA</div>
            <div style={{ fontSize:28, fontWeight:700, color:'#7dd67a', marginBottom:6 }}>{fmt(totalUtilidades)}</div>
            {utilPerdida > 0 && <div style={{ fontSize:12, color:'#f87171' }}>Perdiste {fmt(utilPerdida)} por pago tardío</div>}
          </div>
          {misAportes.length===0 ? <EmptyState msg="Sin aportes registrados en períodos"/> :
          misAportes.map(ap => {
            const periodo = db.periodos.find(x => x.id === ap.periodoId)
            return (
              <div key={ap.id} style={{ background:'#fff', borderRadius:12, padding:'12px 16px', marginBottom:8, border:`1.5px solid ${ap.aTiempo===false?'#A32D2D':ap.aTiempo===true?'#3B6D11':'rgba(0,0,0,0.08)'}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{periodo?.descripcion || ap.periodoId || 'Sin período'}</div>
                    <div style={{ fontSize:12, color:'#6b6b66', marginTop:2 }}>
                      Pagaste: {ap.fechaPago || '—'}
                      {periodo && ` · Límite: ${periodo.fechaLimite}`}
                    </div>
                    {ap.aTiempo===false && <div style={{ fontSize:11, color:'var(--red)', marginTop:4, fontWeight:600 }}>⚠ Pago tardío — sin utilidad este período</div>}
                    {ap.aTiempo===null && <div style={{ fontSize:11, color:'var(--amber)', marginTop:4, fontWeight:600 }}>⏳ Pendiente de verificar</div>}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:ap.utilidadGenerada>0?'var(--green)':'var(--red)' }}>
                      {ap.utilidadGenerada>0?'+':''}{fmt(ap.utilidadGenerada)}
                    </div>
                    <div style={{ fontSize:10, color:'#6b6b66' }}>{fmtPct(ap.utilidadPct)} · Aporte: {fmt(ap.monto)}</div>
                  </div>
                </div>
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
                <div style={{ fontSize:13, marginBottom:8 }}>Monto: <strong>{fmt(sol.monto)}</strong> · Total: <strong style={{ color:'var(--red)' }}>{fmt(sol.total)}</strong></div>
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
                <div style={{ fontSize:13, color:'#6b6b66', marginBottom:py.estado==='activo'?10:0 }}>Interés: {fmt(py.interes)} · Total: <strong>{fmt(py.total)}</strong></div>
                {py.estado==='activo' && <Btn primary full onClick={() => pagarPrestaya(py.id)} style={{ minHeight:40, fontSize:13 }}>Marcar pagado</Btn>}
              </div>
            )
          })}
        </div>
      )}

      {/* HISTORIAL */}
      {tab==='historial' && (() => {
        const movimientos = [
          ...misPagos.map(p => ({ key:p.id, fecha:p.fecha, titulo:`Pago (${p.tipoPago||'prestamo'})`, detalle:`Capital: ${fmt(p.montoCapital)} · Interés: ${fmt(p.montoInteres)} · Ahorro: ${fmt(p.montoAhorro)}`, monto:p.total, positivo:true })),
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

      {/* Modal Editar socio */}
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
            <Field label="Asociar a período (opcional)">
              <select style={IS} value={formAhorro.periodoId||''} onChange={e => setFormAhorro(f=>({...f,periodoId:e.target.value}))}>
                <option value="">Sin período específico</option>
                {db.periodos.filter(p=>p.estado==='abierto').map(p=><option key={p.id} value={p.id}>{p.descripcion||p.fechaCorte} · Límite: {p.fechaLimite}</option>)}
              </select>
            </Field>
            <Field label="Fecha del pago"><input style={IS} type="date" value={formAhorro.fecha||''} onChange={e => setFormAhorro(f=>({...f,fecha:e.target.value}))}/></Field>
            {formAhorro.periodoId && formAhorro.fecha && (() => {
              const p = db.periodos.find(x=>x.id===formAhorro.periodoId)
              if(!p) return null
              const aTiempo = calcATiempo(p.fechaCorte, formAhorro.fecha)
              const util = calcUtilidadAporte(formAhorro.monto||0, p.utilidadPct, aTiempo)
              return (
                <div style={{ background: aTiempo?'#EAF3DE':'#FCEBEB', borderRadius:10, padding:12, fontSize:13, color:aTiempo?'#27500A':'#791F1F' }}>
                  {aTiempo ? `✅ Pago a tiempo — Utilidad generada: ${fmt(util)}` : `❌ Pago tardío (después del día 5) — Sin utilidad este período`}
                </div>
              )
            })()}
            <Field label="Notas"><input style={IS} value={formAhorro.notas||''} onChange={e => setFormAhorro(f=>({...f,notas:e.target.value}))}/></Field>
          </div>
        </Modal>
      )}

      {/* Modal Pago con tipo */}
      {modalPago && (
        <Modal title="Registrar pago" onClose={() => { setModalPago(false); setTipoPago(null) }}
          footer={<><Btn full onClick={() => { setModalPago(false); setTipoPago(null) }}>Cancelar</Btn><Btn primary full onClick={guardarPago} disabled={saving||!tipoPago}>{saving?'Guardando...':'Registrar'}</Btn></>}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Selector tipo de pago - modo botón */}
            <div>
              <div style={{ fontSize:12, color:'#6b6b66', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>¿A qué va este pago?</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {TIPOS_PAGO.map(t => (
                  <button key={t.id} onClick={() => setTipoPago(t.id)} style={{
                    padding:'14px 8px', borderRadius:12, border:`2px solid`,
                    borderColor: tipoPago===t.id ? t.color : 'rgba(0,0,0,0.1)',
                    background: tipoPago===t.id ? t.bg : '#fff',
                    cursor:'pointer', textAlign:'center', transition:'all .15s'
                  }}>
                    <div style={{ fontSize:22, marginBottom:4 }}>{t.icon}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:tipoPago===t.id?t.color:'#6b6b66' }}>{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {tipoPago && <>
              <Field label="Monto total ($) *">
                <input style={IS} type="number" value={formPago.montoTotal||''} onChange={e => setFormPago(f=>({...f,montoTotal:e.target.value}))} placeholder="0"/>
              </Field>

              {(tipoPago==='prestamo'||tipoPago==='mixto'||tipoPago==='interes') && (
                <Field label="¿A cuál deuda?">
                  <select style={IS} value={formPago.prestamoId||''} onChange={e => setFormPago(f=>({...f,prestamoId:e.target.value}))}>
                    <option value="">Seleccionar deuda...</option>
                    {prestamosActivos.map((p,i)=><option key={p.id} value={p.id}>Deuda {i+1} — Saldo: {fmt(p.saldoCapital)} — {p.tasa}%</option>)}
                  </select>
                </Field>
              )}

              {tipoPago==='mixto' && <>
                <Field label="Monto que va a ahorro ($)">
                  <input style={IS} type="number" value={formPago.montoAhorro||''} onChange={e => setFormPago(f=>({...f,montoAhorro:e.target.value}))} placeholder="0"/>
                </Field>
                <Field label="Monto que va a deuda ($)">
                  <input style={IS} type="number" value={formPago.montoDeuda||''} onChange={e => setFormPago(f=>({...f,montoDeuda:e.target.value}))} placeholder="0"/>
                </Field>
              </>}

              {tipoPago==='prestamo' && (
                <Field label="Monto del abono a deuda ($)">
                  <input style={IS} type="number" value={formPago.montoDeuda||''} onChange={e => setFormPago(f=>({...f,montoDeuda:e.target.value}))} placeholder="0"/>
                </Field>
              )}

              {/* Separación automática en tiempo real */}
              {sep && (
                <div style={{ background:'#EAF3DE', borderRadius:12, padding:14, fontSize:13 }}>
                  <div style={{ fontWeight:700, color:'#27500A', marginBottom:8 }}>Separación automática:</div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span>→ Interés quincena</span><strong style={{ color:'var(--amber)' }}>{fmt(sep.interesAplicado)}</strong></div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span>→ Capital</span><strong style={{ color:'var(--green)' }}>{fmt(sep.capitalAplicado)}</strong></div>
                  <div style={{ borderTop:'1px solid rgba(0,0,0,0.1)', paddingTop:8, marginTop:8, display:'flex', justifyContent:'space-between' }}>
                    <span>Nuevo saldo capital</span><strong style={{ color:'var(--red)' }}>{fmt(sep.nuevoSaldo)}</strong>
                  </div>
                  <div style={{ fontSize:11, color:'#3B6D11', marginTop:6 }}>💡 El interés queda registrado como utilidad del fondo</div>
                </div>
              )}

              <Field label="Fecha del pago"><input style={IS} type="date" value={formPago.fecha||''} onChange={e => setFormPago(f=>({...f,fecha:e.target.value}))}/></Field>
              <Field label="Notas"><input style={IS} value={formPago.notas||''} onChange={e => setFormPago(f=>({...f,notas:e.target.value}))}/></Field>
            </>}
          </div>
        </Modal>
      )}

      {/* Modal Editar pago - Solo Super Admin */}
      {modalEditPago && (
        <Modal title="Editar pago · 🔐 Super Admin" onClose={() => setModalEditPago(null)}
          footer={<><Btn full onClick={() => setModalEditPago(null)}>Cancelar</Btn><Btn primary full onClick={guardarEditPago} disabled={saving}>{saving?'Guardando...':'Guardar cambios'}</Btn></>}>
          <div style={{ background:'#FAEEDA', borderRadius:10, padding:12, marginBottom:16, fontSize:12, color:'#633806', fontWeight:600 }}>
            ⚠ Cambiar un pago histórico queda registrado con tu usuario y la fecha de edición.
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Field label="Tipo de pago">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {TIPOS_PAGO.map(t => (
                  <button key={t.id} onClick={() => setFormEditPago(f=>({...f,tipoPago:t.id}))} style={{
                    padding:'10px 8px', borderRadius:10, border:'2px solid',
                    borderColor: formEditPago.tipoPago===t.id ? t.color : 'rgba(0,0,0,0.1)',
                    background: formEditPago.tipoPago===t.id ? t.bg : '#fff',
                    cursor:'pointer', textAlign:'center'
                  }}>
                    <div style={{ fontSize:18 }}>{t.icon}</div>
                    <div style={{ fontSize:11, fontWeight:600, color:formEditPago.tipoPago===t.id?t.color:'#6b6b66' }}>{t.label}</div>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Monto ahorro ($)"><input style={IS} type="number" value={formEditPago.montoAhorro||0} onChange={e => setFormEditPago(f=>({...f,montoAhorro:e.target.value}))}/></Field>
            <Field label="Monto capital ($)"><input style={IS} type="number" value={formEditPago.montoCapital||0} onChange={e => setFormEditPago(f=>({...f,montoCapital:e.target.value}))}/></Field>
            <Field label="Monto interés ($)"><input style={IS} type="number" value={formEditPago.montoInteres||0} onChange={e => setFormEditPago(f=>({...f,montoInteres:e.target.value}))}/></Field>
            <Field label="Razón del ajuste (obligatorio)"><input style={IS} value={formEditPago.notas||''} onChange={e => setFormEditPago(f=>({...f,notas:e.target.value}))} placeholder="Ej: Corrección de registro incorrecto"/></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}
