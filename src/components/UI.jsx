export const IS = { padding:'8px 11px', fontSize:13, border:'0.5px solid var(--border2)', borderRadius:'var(--radius)', background:'var(--surface)', color:'var(--text)', width:'100%', boxSizing:'border-box' }
export const TH = { fontSize:11, fontWeight:500, color:'var(--text2)', textAlign:'left', padding:'9px 14px', borderBottom:'0.5px solid var(--border)', whiteSpace:'nowrap', background:'var(--surface2)' }
export const TD = { padding:'10px 14px', borderBottom:'0.5px solid var(--border)', verticalAlign:'middle' }

export function Badge({ c, children }) {
  const m = { green:{bg:'var(--green-bg)',color:'var(--green-text)'}, red:{bg:'var(--red-bg)',color:'var(--red-text)'}, amber:{bg:'var(--amber-bg)',color:'var(--amber-text)'}, blue:{bg:'var(--blue-bg)',color:'var(--blue-text)'}, teal:{bg:'var(--teal-bg)',color:'var(--teal-text)'}, gray:{bg:'var(--surface2)',color:'var(--text2)'} }
  const s = m[c] || m.gray
  return <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:999, fontSize:11, fontWeight:500, ...s, whiteSpace:'nowrap' }}>{children}</span>
}

export function Btn({ onClick, primary, sm, danger, disabled, children, style = {} }) {
  return <button disabled={disabled} onClick={onClick} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:sm?'4px 10px':'7px 14px', border:'0.5px solid', borderColor:primary?'var(--text)':'var(--border2)', borderRadius:'var(--radius)', background:primary?'var(--text)':'transparent', color:danger?'var(--red)':primary?'var(--surface)':'var(--text)', fontSize:sm?11:12, opacity:disabled?0.5:1, cursor:disabled?'not-allowed':'pointer', ...style }}>{children}</button>
}

export function Field({ label, full, children }) {
  return <div style={{ display:'flex', flexDirection:'column', gap:5, gridColumn:full?'1/-1':undefined }}>
    <label style={{ fontSize:11, color:'var(--text2)', fontWeight:500 }}>{label}</label>
    {children}
  </div>
}

export function Modal({ title, onClose, children, footer }) {
  return <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
    <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'0.5px solid var(--border2)', padding:24, width:'min(580px,100%)', maxHeight:'90vh', overflowY:'auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h3 style={{ fontSize:16, fontWeight:600, margin:0 }}>{title}</h3>
        <Btn sm onClick={onClose}>✕</Btn>
      </div>
      {children}
      {footer && <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:'0.5px solid var(--border)' }}>{footer}</div>}
    </div>
  </div>
}

export function Card({ title, children, toolbar }) {
  return <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
    {(title || toolbar) && <div style={{ padding:'14px 18px', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
      {title && <h3 style={{ fontSize:14, fontWeight:500, margin:0 }}>{title}</h3>}{toolbar}
    </div>}
    {children}
  </div>
}

export const TW = ({ children }) => <div style={{ overflowX:'auto' }}>{children}</div>

export function PH({ title, children }) {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
    <h2 style={{ fontSize:20, fontWeight:600, margin:0 }}>{title}</h2>
    <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>{children}</div>
  </div>
}

export function Metric({ label, value, color, sub }) {
  return <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'16px 18px' }}>
    <div style={{ fontSize:11, color:'var(--text2)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6 }}>{label}</div>
    <div style={{ fontSize:24, fontWeight:600, color: color || 'var(--text)' }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{sub}</div>}
  </div>
}

export const emptyRow = (cols, msg) => <tr><td colSpan={cols} style={{ textAlign:'center', padding:'36px', color:'var(--text3)', fontSize:13 }}>{msg}</td></tr>

export function Spinner() {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', color:'var(--text2)', fontSize:14 }}>Cargando datos...</div>
}
