import {useState} from 'react'
import {sb} from '../supabase.js'
import {Field,Btn,IS} from '../components/UI.jsx'

export default function Login({db,onAdmin,onSocio}){
  const [cedula,setCedula]=useState('')
  const [pass,setPass]=useState('')
  const [err,setErr]=useState('')
  const [loading,setLoading]=useState(false)

  const login=async()=>{
    setErr('')
    setLoading(true)
    const {data:perfil}=await sb.from('perfiles').select('*').eq('cedula',cedula.trim()).eq('activo',true).single()
    if(perfil){
      if(pass===perfil.password){onAdmin(perfil)}
      else{setErr('Contraseña incorrecta.')}
      setLoading(false);return
    }
    const s=db.socios.find(x=>x.cedula===cedula.trim()&&x.estado==='activo')
    if(!s){setErr('Usuario no encontrado.');setLoading(false);return}
    if(pass!==(s.password||s.cedula)){setErr('Contraseña incorrecta.');setLoading(false);return}
    onSocio(s);setLoading(false)
  }

  return <div style={{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f5f4f0',padding:24}}>
    <div style={{width:'100%',maxWidth:400}}>
      <h1 style={{fontSize:26,fontWeight:700,marginBottom:4}}>{db.config.nombre||'Fondo de Empleados'}</h1>
      <p style={{fontSize:14,color:'#6b6b66',marginBottom:32}}>Ingresa tus datos para continuar</p>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Field label="Cédula / Usuario">
          <input style={IS} value={cedula} onChange={e=>setCedula(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Tu cédula o usuario"/>
        </Field>
        <Field label="Contraseña">
          <input style={IS} type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Contraseña"/>
        </Field>
        {err&&<div style={{padding:'12px 14px',background:'#FCEBEB',borderRadius:10,color:'#791F1F',fontSize:14}}>{err}</div>}
        <Btn primary full onClick={login} disabled={loading}>{loading?'Entrando...':'Ingresar'}</Btn>
        <p style={{fontSize:12,color:'#aaa',textAlign:'center'}}>Socios: usa tu cédula como contraseña inicial</p>
      </div>
    </div>
  </div>
}
