import {useState} from 'react'
import {Field,Btn,IS} from '../components/UI.jsx'

export default function Login({db,onAdmin,onSocio}){
  const [cedula,setCedula]=useState('')
  const [pass,setPass]=useState('')
  const [err,setErr]=useState('')

  const login=()=>{
    setErr('')
    if(cedula.toLowerCase()==='admin'||cedula===''){
      if(pass===db.config.adminPass){onAdmin();return}
      setErr('Contraseña incorrecta.');return
    }
    const s=db.socios.find(x=>x.cedula===cedula&&x.estado==='activo')
    if(!s){setErr('Cédula no encontrada.');return}
    if(pass!==(s.password||s.cedula)){setErr('Contraseña incorrecta.');return}
    onSocio(s)
  }

  return <div style={{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f5f4f0',padding:24}}>
    <div style={{width:'100%',maxWidth:400}}>
      <h1 style={{fontSize:26,fontWeight:700,marginBottom:4}}>{db.config.nombre||'Fondo de Empleados'}</h1>
      <p style={{fontSize:14,color:'#6b6b66',marginBottom:32}}>Ingresa tus datos para continuar</p>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Field label="Cédula (o 'admin')">
          <input style={IS} value={cedula} onChange={e=>setCedula(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Tu cédula"/>
        </Field>
        <Field label="Contraseña">
          <input style={IS} type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Contraseña"/>
        </Field>
        {err&&<div style={{padding:'12px 14px',background:'#FCEBEB',borderRadius:10,color:'#791F1F',fontSize:14}}>{err}</div>}
        <Btn primary full onClick={login}>Ingresar</Btn>
        <p style={{fontSize:12,color:'#aaa',textAlign:'center'}}>Socios: cédula como contraseña inicial</p>
      </div>
    </div>
  </div>
}
