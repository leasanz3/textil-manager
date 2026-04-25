import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtNum = (n) => n != null ? Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

export default function CatalogoTelas({ onMenuClick }) {
  const [telas, setTelas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = { tipo: '', codigo: '', color: '', proveedor_id: '', unidad: 'm', precio_ref: '', moneda: 'UYU', notas: '' }
  const [form, setForm] = useState(emptyForm)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('telas').select('*').order('tipo'),
      supabase.from('proveedores').select('id, nombre').order('nombre')
    ])
    setTelas(t || [])
    setProveedores(p || [])
    setLoading(false)
  }

  function openNew() { setEditing(null); setForm(emptyForm); setModal(true) }
  function openEdit(t) {
    setEditing(t.id)
    setForm({ tipo: t.tipo || '', codigo: t.codigo || '', color: t.color || '', proveedor_id: t.proveedor_id || '', unidad: t.unidad || 'm', precio_ref: t.precio || '', moneda: t.moneda || 'UYU', notas: t.notas || '' })
    setModal(true)
  }

  async function handleSave() {
    if (!form.tipo) return alert('El nombre de la tela es obligatorio')
    setSaving(true)
    const prov = proveedores.find(p => p.id === parseInt(form.proveedor_id))
    const datos = { tipo: form.tipo, codigo: form.codigo || null, color: form.color || null, proveedor: prov?.nombre || null, proveedor_id: parseInt(form.proveedor_id) || null, unidad: form.unidad, precio: parseFloat(form.precio_ref) || null, moneda: form.moneda, notas: form.notas || null }
    if (editing) { await supabase.from('telas').update(datos).eq('id', editing) }
    else { await supabase.from('telas').insert({ ...datos, metros: 0, usados: 0 }) }
    setSaving(false); setModal(false); fetchAll()
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('¿Borrar esta tela del catálogo?')) return
    await supabase.from('telas').delete().eq('id', id)
    fetchAll()
  }

  const filtered = telas.filter(t => !search || t.tipo?.toLowerCase().includes(search.toLowerCase()) || t.codigo?.toLowerCase().includes(search.toLowerCase()) || t.proveedor?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>🧶 Catálogo de Telas</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nueva tela</button>
      </div>
      <div className="content">
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">{telas.length}</div><div className="stat-label">Tipos de tela</div></div>
          <div className="stat-card"><div className="stat-value">{telas.filter(t => t.proveedor_id).length}</div><div className="stat-label">Con proveedor</div></div>
        </div>
        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 280 }}>
              <input placeholder="Buscar tela, código o proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? <div className="loading"><div className="spinner" /> Cargando...</div>
          : filtered.length === 0 ? <div className="empty-state"><div className="icon">🧶</div><h3>No hay telas en el catálogo</h3></div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Tipo / nombre</th><th>Código</th><th>Color</th><th>Proveedor</th><th>Unidad</th><th>Precio ref.</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} onClick={() => openEdit(t)}>
                      <td><strong>{t.tipo || '—'}</strong></td>
                      <td style={{ fontSize: 11, color: 'var(--accent)' }}>{t.codigo || '—'}</td>
                      <td>{t.color || '—'}</td>
                      <td>{t.proveedor || '—'}</td>
                      <td>{t.unidad || 'm'}</td>
                      <td>{t.precio ? `${t.moneda === 'USD' ? 'U$D' : '$'} ${fmtNum(t.precio)}` : '—'}</td>
                      <td onClick={e => handleDelete(t.id, e)}><button className="btn btn-danger btn-sm">🗑</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏ Editar tela' : '🧶 Nueva tela'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Tipo / nombre *</label><input value={form.tipo} onChange={e => setF('tipo', e.target.value)} placeholder="ej: Jersey 24/1 algodón" /></div>
                <div className="form-group"><label>Código</label><input value={form.codigo} onChange={e => setF('codigo', e.target.value)} placeholder="ej: JRS-241-BL" /></div>
                <div className="form-group"><label>Color / descripción</label><input value={form.color} onChange={e => setF('color', e.target.value)} placeholder="ej: Blanco, 150cm" /></div>
                <div className="form-group"><label>Proveedor</label>
                  <select value={form.proveedor_id} onChange={e => setF('proveedor_id', e.target.value)}>
                    <option value="">— Sin proveedor —</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Unidad</label>
                  <select value={form.unidad} onChange={e => setF('unidad', e.target.value)}>
                    <option value="m">Metros (m)</option>
                    <option value="kg">Kilogramos (kg)</option>
                  </select>
                </div>
                <div className="form-group"><label>Moneda</label>
                  <select value={form.moneda} onChange={e => setF('moneda', e.target.value)}>
                    <option value="UYU">$ Pesos UY</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="form-group"><label>Precio de referencia</label><input type="number" value={form.precio_ref} onChange={e => setF('precio_ref', e.target.value)} placeholder="0.00" /></div>
                <div className="form-group"><label>Notas</label><input value={form.notas} onChange={e => setF('notas', e.target.value)} placeholder="Observaciones..." /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : '✔ Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
