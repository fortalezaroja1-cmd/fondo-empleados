import {Badge,Card,Metric,EmptyState} from '../../components/UI.jsx'
import {fmt,fmtPct} from '../../helpers.js'

export default function AdminInicio({db}){
  const activos=db.socios.filter(s=>s.estado==='activo').length
  const prestActivos=db.prestamos.filter(p=>p.estado==='activo')
  const cartera=prestActivos.reduce((a,p)=>a+p.saldoCapital,0)
  const ahorros=db.socios.reduce((a,s)=>a+s.ahorroAcumulado,0)
  const saldoCaja=db.caja.reduce((acc,m)=>m.tipo==='ingreso'?acc+m.monto:acc-m.monto,0)
  const atrasados=db.pagos.filter(p=>p.estado==='atrasado').length
  const pendPY=db.solicitudesPrestaya.filter(s=>s.estado==='pendiente').length

  return <div>
    <div style={{fontSize:22,fontWeight:700,marginBottom:16}}>Panel de control</div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
      <Metric label="Socios activos" value={activos}/>
      <Metric label="Total ahorros" value={fmt(ahorros)}/>
      <Metric label="Cartera activa" value={fmt(cartera)}/>
      <Metric label="Saldo caja" value={fmt(saldoCaja)} color={saldoCaja<0?'var(--red)':undefined}/>
      <Metric label="Pagos atrasados" value={atrasados} color={atrasados>0?'var(--red)':'var(--green)'}/>
      <Metric label="PrestaYA pend." value={pendPY} color={pendPY>0?'var(--amber)':undefined}/>
    </div>
    <Card title="Préstamos activos">
      {prestActivos.length===0?<EmptyState msg="Sin préstamos activos"/>:
      prestActivos.map(p=>{
        const s=db.socios.find(x=>x.id===p.socioId)
        const pct=p.monto>0?Math.min((1-p.saldoCapital/p.monto)*100,100):100
        const pgs=db.pagos.filter(pg=>pg.prestamoId===p.id).sort((a,b)=>b.fecha.localeCompare(a.fecha))
        const ult=pgs[0]
        return <div key={p.id} style={{padding:'14px 16px',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <strong style={{fontSize:15}}>{s?s.nombre:'—'}</strong>
            {!ult?<Badge c="gray">Sin pagos</Badge>:ult.estado==='pagado'?<Badge c="green">Al día</Badge>:ult.estado==='atrasado'?<Badge c="red">Atrasado</Badge>:<Badge c="amber">Pendiente</Badge>}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#6b6b66',marginBottom:8}}>
            <span>Saldo: <strong style={{color:'#1a1a18'}}>{fmt(p.saldoCapital)}</strong></span>
            <span style={{color:p.tasa<=2.5?'var(--green)':'var(--red)',fontWeight:600}}>{fmtPct(p.tasa)}</span>
          </div>
          <div style={{background:'#f1f0eb',borderRadius:4,height:5,overflow:'hidden'}}>
            <div style={{background:'var(--green)',height:5,width:`${pct.toFixed(0)}%`}}/>
          </div>
          <div style={{fontSize:11,color:'#aaa',marginTop:3}}>{pct.toFixed(0)}% pagado</div>
        </div>
      })}
    </Card>
  </div>
}
