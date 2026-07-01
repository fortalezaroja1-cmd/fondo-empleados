import { createClient } from '@supabase/supabase-js'

export const sb = createClient(
  'https://ynvxfgxnzpghwncgsnzf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InludnhmZ3huenBnaHduY2dzbnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzk3MDIsImV4cCI6MjA5NDg1NTcwMn0.iBsutg-GWW6CO7ArNlFHEEpxyV2oYxq5Svv1kMBSvAw'
)

const num = v => typeof v === 'number' ? v : parseFloat(v) || 0

export const mapSocio = r => ({
  id: r.id, nombre: r.nombre, cedula: r.cedula, telefono: r.telefono || '',
  ahorroQuincenal: num(r.ahorro_quincenal), ahorroAcumulado: num(r.ahorro_acumulado),
  fechaIngreso: r.fecha_ingreso || '', estado: r.estado || 'activo',
  notas: r.notas || '', utilidadPct: r.utilidad_pct || null, password: r.password || null
})

export const mapPrestamo = r => ({
  id: r.id, socioId: r.socio_id, monto: num(r.monto),
  saldoCapital: num(r.saldo_capital), tasa: num(r.tasa),
  plazo: r.plazo || 0, fechaInicio: r.fecha_inicio || '',
  estado: r.estado || 'activo', notas: r.notas || ''
})

export const mapPago = r => ({
  id: r.id, socioId: r.socio_id, prestamoId: r.prestamo_id,
  fecha: r.fecha || '', fechaCorte: r.fecha_corte || '',
  capitalAbonado: num(r.capital_abonado), interesPagado: num(r.interes_pagado),
  total: num(r.total), estado: r.estado || 'pagado', notas: r.notas || '',
  tipoPago: r.tipo_pago || 'prestamo',
  montoCapital: num(r.monto_capital), montoInteres: num(r.monto_interes),
  montoAhorro: num(r.monto_ahorro),
  editadoPor: r.editado_por || null, editadoAt: r.editado_at || null
})

export const mapCaja = r => ({
  id: r.id, tipo: r.tipo, fecha: r.fecha || '', concepto: r.concepto || '',
  monto: num(r.monto), referencia: r.referencia || '',
  responsable: r.responsable || '', notas: r.notas || ''
})

export const mapPrestaya = r => ({
  id: r.id, socioId: r.socio_id, monto: num(r.monto),
  interes: num(r.interes), total: num(r.total),
  fechaAprobacion: r.fecha_aprobacion || '', fechaVencimiento: r.fecha_vencimiento || '',
  fechaPago: r.fecha_pago || '', estado: r.estado || 'activo', solicitudId: r.solicitud_id || ''
})

export const mapSolicitud = r => ({
  id: r.id, socioId: r.socio_id, monto: num(r.monto),
  interes: num(r.interes), total: num(r.total),
  fechaSolicitud: r.fecha_solicitud || '', fechaVencimiento: r.fecha_vencimiento || '',
  estado: r.estado || 'pendiente', fechaAprobacion: r.fecha_aprobacion || ''
})

export const mapConfig = r => ({
  id: r.id, nombre: r.nombre || 'Fondo de Empleados',
  adminPass: r.admin_pass || 'admin123',
  fechaPago1: r.fecha_pago1 || 15, fechaPago2: r.fecha_pago2 || 30,
  utilidadPct: num(r.utilidad_pct) || 1.3
})

export const mapPeriodo = r => ({
  id: r.id, fechaCorte: r.fecha_corte || '', fechaLimite: r.fecha_limite || '',
  utilidadPct: num(r.utilidad_pct) || 1.3, descripcion: r.descripcion || '',
  estado: r.estado || 'abierto', createdAt: r.created_at || ''
})

export const mapAporte = r => ({
  id: r.id, socioId: r.socio_id, periodoId: r.periodo_id || '',
  fechaPago: r.fecha_pago || '', monto: num(r.monto),
  aTiempo: r.a_tiempo, utilidadPct: num(r.utilidad_pct),
  utilidadGenerada: num(r.utilidad_generada), notas: r.notas || ''
})

export const mapUtilidadCaja = r => ({
  id: r.id, fecha: r.fecha || '', concepto: r.concepto || '',
  monto: num(r.monto), socioId: r.socio_id || '',
  prestamoId: r.prestamo_id || '', periodoId: r.periodo_id || '',
  tipo: r.tipo || ''
})

export async function loadAll() {
  const [cfg, soc, pre, pag, caj, py, sol, per, apo, util] = await Promise.all([
    sb.from('config').select('*').limit(1).single(),
    sb.from('socios').select('*').order('nombre'),
    sb.from('prestamos').select('*').order('created_at'),
    sb.from('pagos').select('*').order('fecha', { ascending: false }),
    sb.from('caja').select('*').order('fecha', { ascending: false }),
    sb.from('prestaya').select('*').order('created_at', { ascending: false }),
    sb.from('solicitudes_prestaya').select('*').order('fecha_solicitud', { ascending: false }),
    sb.from('periodos').select('*').order('fecha_corte', { ascending: false }),
    sb.from('aportes').select('*').order('fecha_pago', { ascending: false }),
    sb.from('utilidades_caja').select('*').order('fecha', { ascending: false }),
  ])
  return {
    config: cfg.data ? mapConfig(cfg.data) : { nombre: 'Fondo de Empleados', adminPass: 'admin123', fechaPago1: 15, fechaPago2: 30, utilidadPct: 1.3 },
    socios: (soc.data || []).map(mapSocio),
    prestamos: (pre.data || []).map(mapPrestamo),
    pagos: (pag.data || []).map(mapPago),
    caja: (caj.data || []).map(mapCaja),
    prestaya: (py.data || []).map(mapPrestaya),
    solicitudesPrestaya: (sol.data || []).map(mapSolicitud),
    periodos: (per.data || []).map(mapPeriodo),
    aportes: (apo.data || []).map(mapAporte),
    utilidadesCaja: (util.data || []).map(mapUtilidadCaja),
  }
}
