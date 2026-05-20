export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
export const hoy = () => new Date().toISOString().slice(0, 10)
export const fmt = n => '$' + (parseFloat(n) || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
export const fmtPct = n => (parseFloat(n) || 0).toFixed(2) + '%'

export function calcUtilidad(socio, pagos, config) {
  const ah = parseFloat(socio.ahorroAcumulado) || 0
  const pct = parseFloat(socio.utilidadPct) || parseFloat(config?.utilidadPct) || 1.3
  const utilMensual = ah * pct / 100
  const misPagos = pagos.filter(p => p.socioId === socio.id && p.estado === 'pagado')
  let pierde = false
  misPagos.forEach(pg => {
    if (!pg.fechaCorte) return
    const limite = new Date(pg.fechaCorte + 'T12:00:00')
    let hab = 0, cur = new Date(limite)
    while (hab < 3) { cur.setDate(cur.getDate() + 1); const dw = cur.getDay(); if (dw !== 0 && dw !== 6) hab++ }
    if (pg.fecha > cur.toISOString().slice(0, 10)) pierde = true
  })
  return { utilMensual, utilAnual: utilMensual * 12, pierde, pct }
}

export function dlCSV(rows, name) {
  const csv = rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = `fondo_${name}_${hoy()}.csv`
  a.click()
}

export const PRESTAYA_MONTOS = [
  { monto: 50000, interes: 6000 },
  { monto: 100000, interes: 10000 },
  { monto: 200000, interes: 12000 },
]
