import { useState, useEffect } from 'react'
import { sb } from '../../supabase.js'
import { uid, hoy, fmt } from '../../helpers.js'
import { Badge, Btn, Field, Modal, IS, EmptyState } from '../../components/UI.jsx'

export default function AdminUsuarios({ db, refresh }) {
  const [usuarios, setUsuarios] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
    const { data } = await sb.from('perfiles').select('*').order('created_at')
    setUsuarios(data || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const openNew = () => {
    setForm({ cedula: '', nombre: '', rol: 'operativo', password: '', activo: true })
    setModal(true)
  }

  const guardar = async () => {
    if (!form.cedula?.trim() || !form.nombre?.trim() || !form.password?.trim()) {
      alert('Cédula, nombre y contraseña son obligatorios.')
      return
    }
    if (form.password.length < 6) {
      alert('La contraseña debe tener mínimo 6 caracteres.')
      return
    }
    setSaving(true)
    if (form.id) {
      await sb.from('perfiles').update({
        nombre: form.nombre, rol: form.rol,
        password: form.password, activo: form.activo
      }).eq('id', form.id)
    } else {
      await sb.from('perfiles').insert({
        cedula: form.cedula, nombre: form.nombre,
        rol: form.rol, password: form.password, activo: true
      })
    }
    await cargar(); setSaving(false); setModal(false)
  }

  const toggleActivo = async (id, activo) => {
    await sb.from('perfiles').update({ activo: !activo }).eq('id', id)
    await cargar()
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return
    await sb.from('perfiles').delete().eq('id', id)
    await cargar()
  }

  const rolLabel = { superadmin: 'Super Admin', operativo: 'Admin Operativo' }
  const rolColor = { superadmin: 'amber', operativo: 'blue' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Usuarios y Roles</div>
        <Btn primary onClick={openNew}>+ Nuevo usuario</Btn>
      </div>

      <div style={{ background: '#FAEEDA', borderRadius: 14, padding: 14, marginBottom: 16, border: '1px solid #854F0B', fontSize: 13, color: '#633806' }}>
        <strong>Super Admin</strong> — acceso total, configuración, eliminación de registros.<br/>
        <strong>Admin Operativo</strong> — puede registrar aportes, préstamos, pagos y caja. No puede eliminar históricos ni cambiar configuración.
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Cargando...</div> :
      usuarios.length === 0 ? <EmptyState msg="No hay usuarios registrados" /> :
      usuarios.map(u => (
        <div key={u.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{u.nombre}</div>
              <div style={{ fontSize: 13, color: '#6b6b66' }}>Cédula: {u.cedula}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Badge c={rolColor[u.rol] || 'gray'}>{rolLabel[u.rol] || u.rol}</Badge>
              <Badge c={u.activo ? 'green' : 'red'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => { setForm({ ...u }); setModal(true) }} style={{ flex: 1, justifyContent: 'center', minHeight: 40, fontSize: 13 }}>Editar</Btn>
            <Btn onClick={() => toggleActivo(u.id, u.activo)} style={{ flex: 1, justifyContent: 'center', minHeight: 40, fontSize: 13 }}>{u.activo ? 'Desactivar' : 'Activar'}</Btn>
            {u.cedula !== 'admin' && <Btn danger onClick={() => eliminar(u.id)} style={{ flex: 1, justifyContent: 'center', minHeight: 40, fontSize: 13 }}>Eliminar</Btn>}
          </div>
        </div>
      ))}

      {modal && (
        <Modal title={form.id ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => setModal(false)}
          footer={<><Btn full onClick={() => setModal(false)}>Cancelar</Btn><Btn primary full onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Btn></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!form.id && <Field label="Cédula / Usuario *"><input style={IS} value={form.cedula || ''} onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} placeholder="Ej: 12345678" /></Field>}
            <Field label="Nombre completo *"><input style={IS} value={form.nombre || ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></Field>
            <Field label="Rol *">
              <select style={IS} value={form.rol || 'operativo'} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                <option value="operativo">Admin Operativo</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </Field>
            <Field label="Contraseña *"><input style={IS} type="password" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" /></Field>
            <div style={{ background: '#f5f4f0', borderRadius: 10, padding: 12, fontSize: 12, color: '#6b6b66' }}>
              <strong>Admin Operativo:</strong> puede registrar aportes, préstamos, pagos y caja.<br />
              <strong>Super Admin:</strong> acceso completo incluyendo configuración y eliminación.
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
