import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Proveedores({ onMenuClick }) {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nombre: '', rut: '', tipo: 'tela', notas: '' })
  const [vendedores, setVendedores] = useState([{ nombre: '', tel: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchProveedores() }, [])

  async function fetchProveedores() {
    setLoading(true)
    const { data } = await supabase.from('proveedores').select('*').order('nombre')
    setProveedores(data || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ nombre: '', rut: '', tipo: 'tela', notas: '' })
    setVendedores([{ nombre: '', tel: '' }])
    setError('')
    setModal(true)
  }

  function openEdit(p) {
    setEditing(p.id)
    setForm({ nombre: p.nombre, rut: p.rut || '', tipo: p.tipo || 'tela', notas: p.notas || '' })
    setVendedores(p.vendedores?.length ? p.vendedores : [{ nombre: '', tel: '' }])
    setError('')
    setModal(true)
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    const datos = {
      ...form,
      vendedores: vendedores.filter(v => v.nombre || v.tel)
    }
    if (editing) {
      await supabase.from('proveedores').update(datos).eq('id', editing)
    } else {
      await supabase.from('proveedores').insert(datos)
    }
    setSaving(false)
    setModal(false)
    fetchProveedores()
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Borrar este proveedor?')) return
    await supabase.from('proveedores').delete().eq('id', id)
    fetchProveedores()
  }

  const filtered = proveedores.filter(p =>
    !search || p.nombre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>🏢 Proveedores</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo proveedor</button>
      </div>

      <div className="content">
        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 280 }}>
              <input placeholder="Buscar proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /> Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🏢</div>
              <h3>No hay proveedores</h3>
              <p>Agregá tu primer proveedor</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RUT</th>
                  <th>Tipo</th>
                  <th>Vendedor principal</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} onClick={() => openEdit(p)}>
                    <td><strong>{p.nombre}</strong></td>
                    <td>{p.rut || '—'}</td>
                    <td><span className="badge badge-blue">{p.tipo}</span></td>
                    <td>{p.vendedores?.[0]?.nombre || '—'}{p.vendedores?.[0]?.tel ? ` · ${p.vendedores[0].tel}` : ''}</td>
                    <td style={{ color: 'var(--text2)', fontSize: 12 }}>{p.notas?.substring(0, 50) || '—'}</td>
                    <td onClick={e => { e.stopPropagation(); handleDelete(p.id) }}>
                      <button className="btn btn-danger btn-sm">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏ Editar proveedor' : '🏢 Nuevo proveedor'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="ej: Encatex" />
                </div>
                <div className="form-group">
                  <label>RUT</label>
                  <input value={form.rut} onChange={e => setForm({ ...form, rut: e.target.value })} placeholder="ej: 21234567-0" />
                </div>
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    <option value="tela">🧶 Tela</option>
                    <option value="avios">🧷 Avíos</option>
                    <option value="maquinaria">⚙ Maquinaria</option>
                    <option value="varios">📦 Varios</option>
                  </select>
                </div>
              </div>

              <div className="groupbox">
                <div className="groupbox-title">👤 Vendedores / contactos</div>
                {vendedores.map((v, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input
                      placeholder="Nombre"
                      value={v.nombre}
                      onChange={e => { const nv = [...vendedores]; nv[i].nombre = e.target.value; setVendedores(nv) }}
                      style={{ flex: 2 }}
                    />
                    <input
                      placeholder="Teléfono"
                      value={v.tel}
                      onChange={e => { const nv = [...vendedores]; nv[i].tel = e.target.value; setVendedores(nv) }}
                      style={{ flex: 2 }}
                    />
                    {vendedores.length > 1 && (
                      <button className="btn btn-danger btn-sm" onClick={() => setVendedores(vendedores.filter((_, j) => j !== i))}>✕</button>
                    )}
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={() => setVendedores([...vendedores, { nombre: '', tel: '' }])}>
                  + Agregar vendedor
                </button>
              </div>

              <div className="form-group">
                <label>Notas</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Condiciones, dirección..." />
              </div>

              {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>⚠ {error}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : '✔ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
