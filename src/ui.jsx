export const IS = {padding:'12px 14px',fontSize:16,border:'1px solid rgba(0,0,0,0.15)',borderRadius:10,background:'#fff',color:'#1a1a18',width:'100%',boxSizing:'border-box',WebkitAppearance:'none',appearance:'none'}

export function Badge({c,children}){
  const m={green:{bg:'#EAF3DE',color:'#27500A'},red:{bg:'#FCEBEB',color:'#791F1F'},amber:{bg:'#FAEEDA',color:'#633806'},blue:{bg:'#E6F1FB',color:'#0C447C'},gray:{bg:'#f1f0eb',color:'#6b6b66'}}
  const s=m[c]||m.gray
  return <span style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:999,fontSize:12,fontWeight:500,...s,whiteSpace:'nowrap'}}>{children}</span>
}

export function Btn({onClick,primary,danger,disabled,children,full,style={}}){
  return <button disabled={disabled} onClick={onClick} style={{
    display:'flex',alignItems:'center',justifyContent:'center',gap:6,
    padding:'13px 18px',border:'1px solid',
    borderColor:primary?'#1a1a18':danger?'#A32D2D':'rgba(0,0,0,0.2)',
    borderRadius:10,
    background:primary?'#1a1a18':danger?'#FCEBEB':'transparent',
    color:primary?'#fff':danger?'#A32D2D':'#1a1a18',
    fontSize:15,fontWeight:500,
    opacity:disabled?0.4:1,
    cursor:disabled?'not-allowed':'pointer',
    width:full?'100%':'auto',
    minHeight:48,
    WebkitTapHighlightColor:'transparent',
    ...style
  }}>{children}</button>
}

export function Field({label,children}){
  return <div style={{display:'flex',flexDirection:'column',gap:6}}>
    <label style={{fontSize:13,color:'#6b6b66',fontWeight:500}}>{label}</label>
    {children}
  </div>
}

export function Card({title,children,action}){
  return <div style={{background:'#fff',borderRadius:14,overflow:'hidden',border:'1px solid rgba(0,0,0,0.08)',marginBottom:12}}>
    {title&&<div style={{padding:'14px 16px',borderBottom:'1px solid rgba(0,0,0,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontSize:15,fontWeight:600}}>{title}</span>{action}
    </div>}
    {children}
  </div>
}

export function Metric({label,value,color}){
  return <div style={{background:'#fff',borderRadius:14,padding:'16px',border:'1px solid rgba(0,0,0,0.08)'}}>
    <div style={{fontSize:11,color:'#6b6b66',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{label}</div>
    <div style={{fontSize:26,fontWeight:700,color:color||'#1a1a18'}}>{value}</div>
  </div>
}

export function Modal({title,onClose,children,footer}){
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:'#fff',borderRadius:'20px 20px 0 0',padding:'0 0 env(safe-area-inset-bottom)',width:'100%',maxHeight:'92vh',display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 20px',borderBottom:'1px solid rgba(0,0,0,0.08)',flexShrink:0}}>
        <h3 style={{fontSize:18,fontWeight:600,margin:0}}>{title}</h3>
        <button onClick={onClose} style={{background:'rgba(0,0,0,0.08)',border:'none',borderRadius:999,width:32,height:32,fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
      </div>
      <div style={{overflowY:'auto',padding:'20px',flex:1}}>
        {children}
      </div>
      {footer&&<div style={{padding:'12px 20px 20px',borderTop:'1px solid rgba(0,0,0,0.08)',display:'flex',gap:10,flexShrink:0}}>{footer}</div>}
    </div>
  </div>
}

export function Spinner(){
  return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:15,color:'#6b6b66'}}>Cargando...</div>
}

export function EmptyState({msg}){
  return <div style={{textAlign:'center',padding:'40px 20px',color:'#aaa',fontSize:14}}>{msg}</div>
}
