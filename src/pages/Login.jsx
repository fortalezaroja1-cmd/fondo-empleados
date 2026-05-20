import { useState } from 'react'
import { Field, Btn } from '../components/UI.jsx'
import { IS } from '../components/UI.jsx'

export default function Login({ db, onAdmin, onSocio }) {
  const [cedula, setCedula] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')

  const login = () => {
    setErr('')
    if (cedula.toLowerCase() === 'admin' || cedula === '') {
      if (pass === db.config.adminPass) { onAdmin(); return }
      setErr('Contraseña de administrador incorrecta.'); return
    }
    const s = db.socios.find(x => x.cedula === cedula && x.estado === 'activo')
    if (!s) { setErr('Cédula no encontrada o socio inactivo.'); return }
    const passCorrecta = s.password || s.cedula
    if (pass !== passCorrecta) { setErr('Contraseña incorrecta.'); return }
    onSocio(s)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:20 }}>
      <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:32, width:'min(380px,100%)' }}>
        <h1 style={{ fontSize:20, fontWeight:600, margin:'0 0 4px' }}>{db.config.nombre || 'Fondo de Empleados'}</h1>
        <p style={{ fontSize:13, color:'var(--text2)', margin:'0 0 24px' }}>Bienvenido, ingresa tus datos</p>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Cédula (o 'admin')">
            <input style={IS} value={cedula} onChange={e => setCedula(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Ingresa tu cédula" />
          </Field>
          <Field label="Contraseña">
            <input style={IS} type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Contraseña" />
          </Field>
          {err && <div style={{ fontSize:12, color:'var(--red-text)', background:'var(--red-bg)', border:'0.5px solid var(--red)', borderRadius:'var(--radius)', padding:'8px 12px' }}>{err}</div>}
          <Btn primary onClick={login} style={{ justifyContent:'center', padding:'10px' }}>Ingresar</Btn>
          <p style={{ fontSize:11, color:'var(--text3)', textAlign:'center', margin:0 }}>Socios: cédula como contraseña inicial · Admin: usuario "admin"</p>
        </div>
      </div>
    </div>
  )
}
