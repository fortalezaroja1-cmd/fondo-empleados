import {useState,useMemo} from 'react'
import {sb} from '../supabase.js'
import {uid,hoy,fmt,fmtPct,calcUtilidad,PRESTAYA_MONTOS} from '../helpers.js'
import {Badge,Btn,Field,Modal,Card,IS,Metric,EmptyState} from '../components/UI.jsx'

export default function SocioPortal({socio,db,refresh,onLogout}){
  const [tab,setTab]=useState('cuenta')
  const {utilMensual,utilAnual,pierde,pct}=useMemo(()=>calcUtilidad(socio,db.pagos,db.config),[socio,db.pagos,db.config])
  const misPrestamos=db.prestamos.filter(p=>p.socioId===socio.id)
  const misPagos=db.pagos.filter(p=>p.socioId===socio.id).sort((a,b)=>b.fecha.localeCompare(a.fecha))
  const misPrestaya=db.prestaya.filter(p=>p.socioId===socio.id)
  const solPendiente=db.solicitudesPrestaya.filter(s=>s.socioId===socio.id&&s.estado==='pendiente')

  const TABS=[['cuenta','Mi cuenta'],['pagos','Pagos'],['simulador','Simulador'],['prestaya','PrestaYA']]

  return <div style={{display:'flex',flexDirection:'column',height:'100dvh',background:'#f5f4f0'}}>
    {/* Header */}
    <div style={{background:'#fff',borderBottom:'1px solid rgba(0,0,0,0.08)',padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
      <div>
        <div style={{fontSize:16,fontWeight:700}}>{db.config.nombre||'Fondo de Empleados'}</div>
        <div style={{fontSize:12,color:'#6b6b66'}}>Hola, {socio.nombre}</div>
      </div>
      <button onClick={onLogout} style={{background:'rgba(0,0,0,0.06)',border:'none',borderRadius:8,padding:'8px 12px',fontSize:13,cursor:'pointer'}}>Salir</button>
    </div>

    {/* Content */}
    <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
      {tab==='cuenta'&&<TabCuenta socio={socio} misPrestamos={misPrestamos} utilMensual={utilMensual} utilAnual={utilAnual} pierde={pierde} pct={pct}/>}
      {tab==='pagos'&&<TabPagos misPagos={misPagos}/>}
      {tab==='simulador'&&<TabSimulador socio={socio} config={db.config}/>}
      {tab==='prestaya'&&<TabPrestaya socio={socio} db={db} refresh={refresh} misPrestaya={misPrestaya} solPendiente={solPendiente}/>}
    </div>

    {/* Bottom Nav */}
    <div style={{background:'#fff',borderTop:'1px solid rgba(0,0,0,0.08)',display:'flex',flexShrink:0,paddingBottom:'env(safe-area-inset-bottom)'}}>
      {TABS.map(([id,label])=>{
        const active=tab===id
        return <button key={id} onClick={()=>setTab(id)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'10px 4px',border:'none',background:'transparent',cursor:'pointer',position:'relative'}}>
          <span style={{fontSize:9,color:active?'#1a1a18':'#aaa',fontWeight:active?600:400}}>{label}</span>
          {active&&<div style={{position:'absolute',bottom:0,left:'20%',right:'20%',height:2,background:'#1a1a18',borderRadius:2}}/>}
        </button>
      })}
    </div>
  </div>
}

function TabCuenta({socio,misPrestamos,utilMensual,utilAnual,pierde,pct}){
  return <div>
    <div style={{fontSize:22,fontWeight:700,marginBottom:16}}>Mi cuenta</div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
      <Metric label="Ahorro acumulado" value={fmt(socio.ahorroAcumulado)}/>
      <Metric label="Ahorro quincenal" value={fmt(socio.ahorroQuincenal)}/>
      <Metric label="Utilidad mensual" value={fmt(utilMensual)} color="var(--green)"/>
      <Metric label="Utilidad anual est." value={fmt(utilAnual)} color="var(--green)"/>
    </div>
    <div style={{padding:'16px',borderRadius:14,border:`1px solid ${pierde?'#A32D2D':'#3B6D11'}`,background:pierde?'#FCEBEB':'#EAF3DE',marginBottom:16}}>
      <div style={{fontWeight:600,color:pierde?'#791F1F':'#27500A',marginBottom:6}}>{pierde?'⚠️ Utilidad en riesgo':'✅ Utilidad vigente'}</div>
      <p style={{fontSize:13,color:pierde?'#791F1F':'#27500A',margin:0}}>
        {pierde?'Tienes un pago fuera de los 3 días hábiles del corte. La utilidad anual está en riesgo.':`Tu utilidad estimada es ${fmt(utilAnual)} (${pct.toFixed(2)}% mensual). Sigue pagando puntualmente.`}
      </p>
    </div>
    <div style={{fontSize:16,fontWeight:600,marginBottom:10}}>Mis préstamos</div>
    {misPrestamos.length===0?<EmptyState msg="Sin préstamos registrados"/>:
    misPrestamos.map(p=>{
      const pct2=p.monto>0?Math.min((1-p.saldoCapital/p.monto)*100,100):100
      return <div key={p.id} style={{background:'#fff',borderRadius:14,padding:'14px 16px',marginBottom:10,border:'1px solid rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <strong>{fmt(p.monto)}</strong>
          <Badge c={p.estado==='activo'?'blue':'green'}>{p.estado}</Badge>
        </div>
        <div style={{fontSize:13,color:'#6b6b66',marginBottom:8}}>
          Saldo: <strong style={{color:'#1a1a18'}}>{fmt(p.saldoCapital)}</strong> · Tasa: <span style={{color:p.tasa<=2.5?'var(--green)':'var(--red)',fontWeight:600}}>{fmtPct(p.tasa)}</span>
        </div>
        <div style={{background:'#f1f0eb',borderRadius:4,height:6,overflow:'hidden',marginBottom:4}}>
          <div style={{background:'var(--green)',height:6,width:`${pct2.toFixed(0)}%`}}/>
        </div>
        <div style={{fontSize:12,color:'#aaa'}}>{pct2.toFixed(0)}% pagado</div>
      </div>
    })}
  </div>
}

function TabPagos({misPagos}){
  return <div>
    <div style={{fontSize:22,fontWeight:700,marginBottom:16}}>Mis pagos</div>
    {misPagos.length===0?<EmptyState msg="Sin pagos registrados"/>:
    misPagos.map(pg=>{
      let puntBadge=null
      if(pg.fechaCorte&&pg.fecha&&pg.estado==='pagado'){
        const limite=new Date(pg.fechaCorte+'T12:00:00')
        let hab=0,cur=new Date(limite)
        while(hab<3){cur.setDate(cur.getDate()+1);if(cur.getDay()!==0&&cur.getDay()!==6)hab++}
        puntBadge=pg.fecha<=cur.toISOString().slice(0,10)?<Badge c="green">✓ Puntual</Badge>:<Badge c="red">✗ Tardío</Badge>
      }
      return <div key={pg.id} style={{background:'#fff',borderRadius:14,padding:'14px 16px',marginBottom:10,border:'1px solid rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <span style={{fontSize:13,color:'#6b6b66'}}>{pg.fecha}</span>
          <Badge c={pg.estado==='pagado'?'green':pg.estado==='atrasado'?'red':'amber'}>{pg.estado}</Badge>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:6}}>
          <span>Capital: <strong>{fmt(pg.capitalAbonado)}</strong></span>
          <span>Interés: {fmt(pg.interesPagado)}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <strong style={{fontSize:16}}>{fmt(pg.total)}</strong>
          {puntBadge}
        </div>
      </div>
    })}
  </div>
}

function TabSimulador({socio,config}){
  const [monto,setMonto]=useState('')
  const [plazo,setPlazo]=useState(12)
  const ahorro=parseFloat(socio?.ahorroAcumulado)||0
  const m=parseFloat(monto)||0

  let res=null
  if(m>0){
    const tasa=m<=ahorro?2.5:3.5
    const estado=m<=ahorro?'aprobado':m<=ahorro*2?'en_estudio':'negado'
    const intQ=m*tasa/100/2
    res={tasa,estado,intQ,totalInt:intQ*plazo,totalPagar:m+intQ*plazo}
  }

  const estados={
    aprobado:{bg:'#EAF3DE',border:'#3B6D11',color:'#27500A',icon:'✅',label:'Viable — aprobado'},
    en_estudio:{bg:'#FAEEDA',border:'#854F0B',color:'#633806',icon:'📋',label:'Entra a estudio'},
    negado:{bg:'#FCEBEB',border:'#A32D2D',color:'#791F1F',icon:'❌',label:'No viable'},
  }

  return <div>
    <div style={{fontSize:22,fontWeight:700,marginBottom:16}}>Simulador</div>
    <div style={{background:'#EAF3DE',borderRadius:14,padding:'16px',marginBottom:16}}>
      <div style={{fontSize:12,color:'#27500A',marginBottom:4}}>TU AHORRO ACUMULADO</div>
      <div style={{fontSize:28,fontWeight:700,color:'#3B6D11'}}>{fmt(ahorro)}</div>
      <div style={{fontSize:12,color:'#3B6D11',marginTop:4}}>≤ ahorro → 2.5% · Mayor → 3.5% + estudio</div>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:16}}>
      <Field label="Monto a solicitar ($)">
        <input style={IS} type="number" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0"/>
      </Field>
      <Field label={`Plazo: ${plazo} quincenas (${(plazo/2).toFixed(0)} meses)`}>
        <input type="range" min="2" max="48" value={plazo} onChange={e=>setPlazo(parseInt(e.target.value))} style={{width:'100%',height:28}}/>
      </Field>
    </div>
    {res&&<>
      <div style={{padding:'16px',borderRadius:14,border:`1px solid ${estados[res.estado].border}`,background:estados[res.estado].bg,color:estados[res.estado].color,marginBottom:14}}>
        <div style={{fontWeight:600,fontSize:16,marginBottom:6}}>{estados[res.estado].icon} {estados[res.estado].label}</div>
        <div style={{fontSize:13}}>
          {res.estado==='aprobado'&&'El monto está dentro de tu ahorro. Tasa preferencial 2.5%.'}
          {res.estado==='en_estudio'&&'Supera tu ahorro pero es menor al doble. Requiere aprobación del administrador. Tasa 3.5%.'}
          {res.estado==='negado'&&`El monto supera el doble de tu ahorro (${fmt(ahorro*2)}). No es viable actualmente.`}
        </div>
      </div>
      {res.estado!=='negado'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <Metric label="Tasa" value={`${res.tasa}%`}/>
        <Metric label="Interés / quincena" value={fmt(res.intQ)}/>
        <Metric label="Total intereses" value={fmt(res.totalInt)} color="var(--red)"/>
        <Metric label="Total a pagar" value={fmt(res.totalPagar)} color="var(--blue)"/>
      </div>}
    </>}
  </div>
}

function TabPrestaya({socio,db,refresh,misPrestaya,solPendiente}){
  const [modal,setModal]=useState(false)
  const [sel,setSel]=useState(null)
  const [saving,setSaving]=useState(false)

  const solicitar=async()=>{
    if(!sel){alert('Selecciona un monto.');return}
    const op=PRESTAYA_MONTOS.find(x=>x.monto===sel)
    const hoyD=new Date(),d1=db.config.fechaPago1||15,d2=db.config.fechaPago2||30
    let venc=new Date(hoyD)
    if(hoyD.getDate()<d1)venc.setDate(d1)
    else if(hoyD.getDate()<d2)venc.setDate(d2)
    else{venc.setMonth(venc.getMonth()+1);venc.setDate(d1)}
    setSaving(true)
    await sb.from('solicitudes_prestaya').insert({id:uid(),socio_id:socio.id,monto:op.monto,interes:op.interes,total:op.monto+op.interes,fecha_solicitud:hoy(),fecha_vencimiento:venc.toISOString().slice(0,10),estado:'pendiente'})
    await refresh();setSaving(false);setModal(false);setSel(null)
    alert('Solicitud enviada. El administrador la revisará pronto.')
  }

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
      <div style={{fontSize:22,fontWeight:700}}>PrestaYA</div>
      <Btn primary onClick={()=>setModal(true)}>+ Solicitar</Btn>
    </div>
    <div style={{padding:'14px 16px',background:'#E6F1FB',borderRadius:14,marginBottom:16,fontSize:13,color:'#0C447C'}}>
      ℹ️ Préstamos de urgencia que debes pagar en la <strong>siguiente quincena</strong>.
    </div>
    {solPendiente.length>0&&<div style={{padding:'12px 14px',background:'#FAEEDA',borderRadius:12,marginBottom:12,fontSize:13,color:'#633806'}}>
      ⏳ Tienes {solPendiente.length} solicitud(es) pendiente(s).
    </div>}
    {misPrestaya.length===0?<EmptyState msg="Sin PrestaYA registrados"/>:
    misPrestaya.map(py=>{
      const vencido=py.fechaVencimiento&&py.fechaVencimiento<hoy()&&py.estado==='activo'
      return <div key={py.id} style={{background:'#fff',borderRadius:14,padding:'14px 16px',marginBottom:10,border:'1px solid rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <strong>{fmt(py.monto)}</strong>
          <Badge c={py.estado==='pagado'?'green':vencido?'red':'blue'}>{py.estado==='pagado'?'Pagado':vencido?'Vencido':'Activo'}</Badge>
        </div>
        <div style={{fontSize:13,color:'#6b6b66'}}>Interés: {fmt(py.interes)} · Total: <strong style={{color:'#1a1a18'}}>{fmt(py.total)}</strong></div>
        <div style={{fontSize:12,color:vencido?'var(--red)':'#6b6b66',marginTop:4}}>Vence: {py.fechaVencimiento||'—'}</div>
      </div>
    })}

    {modal&&<Modal title="Solicitar PrestaYA" onClose={()=>setModal(false)}
      footer={<><Btn full onClick={()=>setModal(false)}>Cancelar</Btn><Btn primary full onClick={solicitar} disabled={saving}>{saving?'Enviando...':'Enviar solicitud'}</Btn></>}>
      <p style={{fontSize:14,color:'#6b6b66',marginBottom:16}}>Selecciona el monto. Debes pagar en la <strong>siguiente quincena</strong>.</p>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {PRESTAYA_MONTOS.map(op=>(
          <div key={op.monto} onClick={()=>setSel(op.monto)} style={{border:`2px solid ${sel===op.monto?'#1a1a18':'rgba(0,0,0,0.12)'}`,borderRadius:14,padding:'16px',cursor:'pointer',background:sel===op.monto?'#f5f4f0':'#fff'}}>
            <div style={{fontSize:20,fontWeight:700}}>{fmt(op.monto)}</div>
            <div style={{fontSize:13,color:'#6b6b66',marginTop:4}}>Interés: {fmt(op.interes)} · Total: <strong style={{color:'var(--red)'}}>{fmt(op.monto+op.interes)}</strong></div>
          </div>
        ))}
      </div>
    </Modal>}
  </div>
}
