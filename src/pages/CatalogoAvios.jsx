import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtNum = (n) => n != null ? Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

const UNIDADES = ['unidad', 'm', 'cm', 'kg', 'g', 'rollo', 'docena', 'caja']

export default function CatalogoAvios({ onMenuClick }) {
  const [avios, setAvios] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterProv, setFilterProv] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = {
    nombre: '', tipo: '', codigo: '', descripcion: '',
    proveedor_id: '', unidad: 'unidad', precio: '', moneda: 'UYU', notas: ''
  }
  const [form, setForm] = useState(emptyForm)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('avios').select('*').order('nombre'),
      supabase.from('proveedores').select('id, nombre').order('nombre')
    ])
    setAvios(a || [])
    setProveedores(p || [])
    setLoading(false)
  }

  function openNew(provId = '') {
    setEditing(null)
    setForm({ ...emptyForm, proveedor_id: provId })
    setModal(true)
  }

  function openEdit(a) {
    setEditing(a.id)
    setForm({
      nombre: a.nombre || '',
      tipo: a.tipo || '',
      codigo: a.codigo || '',
      descripcion: a.descripcion || '',
      proveedor_id: a.proveedor_id || '',
      unidad: a.unidad || 'unidad',
      precio: a.precio || '',
      moneda: a.moneda || 'UYU',
      notas: a.notas || ''
    })
    setModal(true)
  }

  async function handleSave() {
    if (!form.nombre) return alert('El nombre del avío es obligatorio')
    setSaving(true)
    const prov = proveedores.find(p => p.id === parseInt(form.proveedor_id))
    const datos = {
      nombre: form.nombre,
      tipo: form.tipo || null,
      codigo: form.codigo || null,
      descripcion: form.descripcion || null,
      proveedor: prov?.nombre || null,
      proveedor_id: parseInt(form.proveedor_id) || null,
      unidad: form.unidad,
      precio: parseFloat(form.precio) || null,
      moneda: form.moneda,
      notas: form.notas || null
    }
    if (editing) {
      await supabase.from('avios').update(datos).eq('id', editing)
    } else {
      await supabase.from('avios').insert(datos)
    }
    setSaving(false)
    setModal(false)
    fetchAll()
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('¿Borrar este avío del catálogo?')) return
    await supabase.from('avios').delete().eq('id', id)
    fetchAll()
  }

  const filtered = avios.filter(a => {
    const q = search.toLowerCase()
    const ms = !q || a.nombre?.toLowerCase().includes(q) || a.tipo?.toLowerCase().includes(q) || a.proveedor?.toLowerCase().includes(q) || a.codigo?.toLowerCase().includes(q)
    const mp = !filterProv || String(a.proveedor_id) === filterProv
    return ms && mp
  })

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>🧵 Catálogo de Avíos</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => openNew()}>+ Nuevo avío</button>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">{avios.length}</div><div className="stat-label">Avíos registrados</div></div>
          <div className="stat-card"><div className="stat-value">{avios.filter(a => a.proveedor_id).length}</div><div className="stat-label">Con proveedor</div></div>
          <div className="stat-card"><div className="stat-value">{[...new Set(avios.map(a => a.tipo).filter(Boolean))].length}</div><div className="stat-label">Tipos distintos</div></div>
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 240 }}>
              <input placeholder="Buscar avío, tipo o proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={filterProv} onChange={e => setFilterProv(e.target.value)} style={{ width: 180 }}>
              <option value="">Todos los proveedores</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          {loading ? <div className="loading"><div className="spinner" /> Cargando...</div>
          : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🧵</div>
              <h3>No hay avíos en el catálogo</h3>
              <p>Agregá tu primer avío con el botón de arriba</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th><th>Tipo</th><th>Código</th>
                    <th>Proveedor</th><th>Unidad</th><th>Precio ref.</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id} onClick={() => openEdit(a)} style={{ cursor: 'pointer' }}>
                      <td><strong>{a.nombre}</strong>{a.descripcion && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{a.descripcion}</div>}</td>
                      <td>{a.tipo || '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--accent)' }}>{a.codigo || '—'}</td>
                      <td>{a.proveedor || '—'}</td>
                      <td>{a.unidad}</td>
                      <td>{a.precio ? `${a.moneda === 'USD' ? 'U$D' : '$'} ${fmtNum(a.precio)} / ${a.unidad}` : '—'}</td>
                      <td onClick={e => handleDelete(a.id, e)}><button className="btn btn-danger btn-sm">🗑</button></td>
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
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏ Editar avío' : '🧵 Nuevo avío'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Nombre *</label><input value={form.nombre} onChange={e => setF('nombre', e.target.value)} placeholder="ej: Elástico 2cm, Botón 4 huecos" autoFocus /></div>
                <div className="form-group">
                  <label>Tipo</label>
                  <input value={form.tipo} onChange={e => setF('tipo', e.target.value)} placeholder="ej: Elástico, Botón, Cierre, Entretela" list="tipos-avios" />
                  <datalist id="tipos-avios">
                    <option value="Elástico" />
                    <option value="Cordón" />
                    <option value="Botón" />
                    <option value="Cierre" />
                    <option value="Entretela" />
                    <option value="Hilo" />
                    <option value="Etiqueta" />
                    <option value="Vivo" />
                    <option value="Trabilla" />
                    <option value="Broche" />
                  </datalist>
                </div>
                <div className="form-group"><label>Código</label><input value={form.codigo} onChange={e => setF('codigo', e.target.value)} placeholder="opcional" /></div>
                <div className="form-group"><label>Descripción</label><input value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} placeholder="ej: Blanco, 2cm ancho" /></div>
                <div className="form-group">
                  <label>Proveedor</label>
                  <select value={form.proveedor_id} onChange={e => setF('proveedor_id', e.target.value)}>
                    <option value="">— Sin proveedor —</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Unidad</label>
                  <select value={form.unidad} onChange={e => setF('unidad', e.target.value)}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Moneda</label>
                  <select value={form.moneda} onChange={e => setF('moneda', e.target.value)}>
                    <option value="UYU">$ Pesos UY</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Precio referencia (por {form.unidad})</label>
                  <input type="number" value={form.precio} onChange={e => setF('precio', e.target.value)} placeholder="último precio pagado" />
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Se actualiza automáticamente con cada compra</div>
                </div>
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
