import { createClient } from '@supabase/supabase-js'

const url = 'https://ynvxfgxnzpghwncgsnzf.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InludnhmZ3huenBnaHduY2dzbnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzk3MDIsImV4cCI6MjA5NDg1NTcwMn0.iBsutg-GWW6CO7ArNlFHEEpxyV2oYxq5Svv1kMBSvAw'

export const sb = createClient(url, key)

export const mapSocio = r => ({
  id: r.id, nombre: r.nombre, cedula: r.cedula, telefono: r.telefono||'',
  ahorroQuincenal: parseFloat(r.ahorro_quincenal)||0,
  ahorroAcumulado: parseFloat(r.ahorro_acumulado)||0,
  fechaIngreso: r.fecha_ingreso||'', estado: r.estado||'activo',
  notas: r.notas||'', utilidadPct: r.utilidad_pct||null, password: r.password||null
})

export const mapPrestamo = r => ({
  id: r.id, socioId: r.socio_id, monto: parseFloat(r.monto)||0,
  saldoCapital: parseFloat(r.saldo_capital)||0, tasa: parseFloat(r.tasa)||0,
  plazo: r.plazo||0, fechaInicio: r.fecha_inicio||'', estado: r.estado||'activo', notas: r.notas||''
})

export const mapPago = r => ({
  id: r.id, socioId: r.socio_id, prestamoId: r.prestamo_id,
  fecha: r.fecha||'', fechaCorte: r.fecha_corte||'',
  capitalAbonado: parseFloat(r.capital_abonado)||0,
  interesPagado: parseFloat(r.interes_pagado)||0,
  total: parseFloat(r.total)||0, estado: r.estado||'pagado', notas: r.notas||''
})

export const mapCaja = r => ({
  id: r.id, tipo: r.tipo, fecha: r.fecha||'', concepto: r.concepto||'',
  monto: parseFloat(r.monto)||0, referencia: r.referencia||'',
  responsable: r.responsable||'', notas: r.notas||''
})

export const mapPrestaya = r => ({
  id: r.id, socioId: r.socio_id, monto: parseFloat(r.monto)||0,
  interes: parseFloat(r.interes)||0, total: parseFloat(r.total)||0,
  fechaAprobacion: r.fecha_aprobacion||'', fechaVencimiento: r.fecha_vencimiento||'',
  fechaPago: r.fecha_pago||'', estado: r.estado||'activo', solicitudId: r.solicitud_id||''
})

export const mapSolicitud = r => ({
  id: r.id, socioId: r.socio_id, monto: parseFloat(r.monto)||0,
  interes: parseFloat(r.interes)||0, total: parseFloat(r.total)||0,
  fechaSolicitud: r.fecha_solicitud||'', fechaVencimiento: r.fecha_vencimiento||'',
  estado: r.estado||'pendiente', fechaAprobacion: r.fecha_aprobacion||''
})

export const mapConfig = r => ({
  id: r.id, nombre: r.nombre||'Fondo de Empleados',
  adminPass: r.admin_pass||'admin123',
  fechaPago1: r.fecha_pago1||15, fechaPago2: r.fecha_pago2||30,
  utilidadPct: parseFloat(r.utilidad_pct)||1.3
})

export async function loadAll() {
  const [cfg, soc, pre, pag, caj, py, sol] = await Promise.all([
    sb.from('config').select('*').limit(1).single(),
    sb.from('socios').select('*').order('nombre'),
    sb.from('prestamos').select('*').order('created_at'),
    sb.from('pagos').select('*').order('fecha', { ascending: false }),
    sb.from('caja').select('*').order('fecha', { ascending: false }),
    sb.from('prestaya').select('*').order('created_at', { ascending: false }),
    sb.from('solicitudes_prestaya').select('*').order('fecha_solicitud', { ascending: false }),
  ])
  return {
    config: cfg.data ? mapConfig(cfg.data) : { nombre:'Fondo de Empleados', adminPass:'admin123', fechaPago1:15, fechaPago2:30, utilidadPct:1.3 },
    socios: (soc.data||[]).map(mapSocio),
    prestamos: (pre.data||[]).map(mapPrestamo),
    pagos: (pag.data||[]).map(mapPago),
    caja: (caj.data||[]).map(mapCaja),
    prestaya: (py.data||[]).map(mapPrestaya),
    solicitudesPrestaya: (sol.data||[]).map(mapSolicitud),
  }
}
