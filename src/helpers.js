export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
export const hoy = () => new Date().toISOString().slice(0, 10)
export const fmt = n => '$' + (parseFloat(n) || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
export const fmtPct = n => (parseFloat(n) || 0).toFixed(2) + '%'
export const PRESTAYA_MONTOS = [{ monto: 50000, interes: 6000 }, { monto: 100000, interes: 10000 }, { monto: 200000, interes: 12000 }]

// Calcular interés quincena de un préstamo
export const calcInteresQuincena = (prestamo) => {
  return (prestamo.saldoCapital * (prestamo.tasa / 100)) / 2
}

// Separación automática capital + interés
export const calcSeparacion = (prestamo, montoPago) => {
  const pago = parseFloat(montoPago) || 0
  const interesQ = calcInteresQuincena(prestamo)
  const interesAplicado = Math.min(interesQ, pago)
  const capitalAplicado = Math.max(0, pago - interesAplicado)
  const nuevoSaldo = Math.max(0, prestamo.saldoCapital - capitalAplicado)
  return { interesAplicado, capitalAplicado, nuevoSaldo, interesQuincena: interesQ }
}

// Calcular si un pago de ahorro está a tiempo (dentro de 5 días del corte)
export const calcATiempo = (fechaCorte, fechaPago) => {
  if (!fechaCorte || !fechaPago) return null
  const corte = new Date(fechaCorte + 'T12:00:00')
  const limite = new Date(corte)
  limite.setDate(limite.getDate() + 5)
  const pago = new Date(fechaPago + 'T12:00:00')
  return pago <= limite
}

// Calcular fecha límite (fecha corte + 5 días)
export const calcFechaLimite = (fechaCorte) => {
  if (!fechaCorte) return ''
  const d = new Date(fechaCorte + 'T12:00:00')
  d.setDate(d.getDate() + 5)
  return d.toISOString().slice(0, 10)
}

// Calcular utilidad de un aporte
export const calcUtilidadAporte = (monto, utilidadPct, aTiempo) => {
  if (!aTiempo) return 0
  return (parseFloat(monto) || 0) * (parseFloat(utilidadPct) || 0) / 100
}

// Calcular utilidad total de un socio
export const calcUtilidad = (socio, pagos, config) => {
  const ah = parseFloat(socio.ahorroAcumulado) || 0
  const pct = parseFloat(socio.utilidadPct) || parseFloat(config?.utilidadPct) || 1.3
  const utilMensual = ah * pct / 100
  let pierde = false
  pagos.filter(p => p.socioId === socio.id && p.estado === 'pagado').forEach(pg => {
    if (!pg.fechaCorte) return
    const limite = new Date(pg.fechaCorte + 'T12:00:00')
    limite.setDate(limite.getDate() + 5)
    if (pg.fecha > limite.toISOString().slice(0, 10)) pierde = true
  })
  return { utilMensual, utilAnual: utilMensual * 12, pierde, pct }
}
