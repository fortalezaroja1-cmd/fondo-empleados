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
        <Field
