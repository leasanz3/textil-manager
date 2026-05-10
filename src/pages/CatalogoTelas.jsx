import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtNum = (n) => n != null ? Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

export default function CatalogoTelas({ onMenuClick, onNavigate }) {
  const [telas, setTelas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterProv, setFilterProv] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [productosUsandoTela, setProductosUsandoTela] = useState([])

  const emptyForm = {
    tipo: '', codigo: '', color: '', proveedor_id: '',
    unidad: 'kg', rendimiento: '', precio_ref: '', moneda_ref: 'USD', notas: ''
  }
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

  function openNew(provId = '') {
    setEditing(null)
    setForm({ ...emptyForm, proveedor_id: provId })
    setProductosUsandoTela([])
    setModal(true)
  }

  function openEdit(t) {
    setEditing(t.id)
    setForm({
      tipo: t.tipo || '',
      codigo: t.codigo || '',
      color: t.color || '',
      proveedor_id: t.proveedor_id || '',
      unidad: t.unidad || 'kg',
      rendimiento: t.rendimiento || '',
      precio_ref: t.precio || '',
      moneda_ref: t.moneda || 'USD',
      notas: t.notas || ''
    })
    setProductosUsandoTela([])
    fetchProductosUsandoTela(t.id)
    setModal(true)
  }

  async function fetchProductosUsandoTela(telaId) {
    // Search across all fields where this tela_id might appear
    const { data } = await supabase
      .from('productos')
      .select('id, nombre, cliente_id, tela1_id, tela2_id, rib_id, telas_extra')
    const todos = (data || []).filter(p => {
      if (p.tela1_id === telaId || p.tela2_id === telaId || p.rib_id === telaId) return true
      return (p.telas_extra || []).some(te => Number(te.tela_id) === telaId)
    })
    setProductosUsandoTela(todos)
  }

  async function handleSave() {
    if (!form.tipo) return alert('El nombre de la tela es obligatorio')
    setSaving(true)
    const prov = proveedores.find(p => p.id === parseInt(form.proveedor_id))
    const datos = {
      tipo: form.tipo,
      codigo: form.codigo || null,
      color: form.color || null,
      proveedor: prov?.nombre || null,
      proveedor_id: parseInt(form.proveedor_id) || null,
      unidad: form.unidad,
      rendimiento: parseFloat(form.rendimiento) || null,
      precio: parseFloat(form.precio_ref) || null,
      moneda: form.moneda_ref,
      notas: form.notas || null
    }
    if (editing) {
      await supabase.from('telas').update(datos).eq('id', editing)
    } else {
      await supabase.from('telas').insert({ ...datos, metros: 0, usados: 0 })
    }
    setSaving(false)
    setModal(false)
    fetchAll()
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('¿Borrar esta tela del catálogo?')) return
    await supabase.from('telas').delete().eq('id', id)
    fetchAll()
  }

  const filtered = telas.filter(t => {
    const q = search.toLowerCase()
    const ms = !q || t.tipo?.toLowerCase().includes(q) || t.codigo?.toLowerCase().includes(q) || t.proveedor?.toLowerCase().includes(q)
    const mp = !filterProv || String(t.proveedor_id) === filterProv
    return ms && mp
  })

  // Precio en metros calculado
  const precioEnMetros = (t) => {
    if (!t.precio || !t.rendimiento || t.unidad !== 'kg') return null
    return t.precio / t.rendimiento
  }

  const precioRefEnMetrosForm = () => {
    if (!form.precio_ref || !form.rendimiento || form.unidad !== 'kg') return null
    return parseFloat(form.precio_ref) / parseFloat(form.rendimiento)
  }

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>🧶 Catálogo de Telas</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => openNew()}>+ Nueva tela</button>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">{telas.length}</div><div className="stat-label">Tipos de tela</div></div>
          <div className="stat-card"><div className="stat-value">{telas.filter(t => t.proveedor_id).length}</div><div className="stat-label">Con proveedor</div></div>
          <div className="stat-card"><div className="stat-value">{telas.filter(t => !t.rendimiento && t.unidad === 'kg').length}</div><div className="stat-label">⚠ Sin rendimiento</div></div>
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 240 }}>
              <input placeholder="Buscar tela o código..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={filterProv} onChange={e => setFilterProv(e.target.value)} style={{ width: 180 }}>
              <option value="">Todos los proveedores</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          {loading ? <div className="loading"><div className="spinner" /> Cargando...</div>
          : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🧶</div>
              <h3>No hay telas en el catálogo</h3>
              <p>Agregá tu primera tela con el botón de arriba</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Tipo / nombre</th>
                    <th>Código</th>
                    <th>Color</th>
                    <th>Proveedor</th>
                    <th>Unidad</th>
                    <th>Rendimiento</th>
                    <th>Precio ref. (unitario)</th>
                    <th>Precio ref. (metro)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const pm = precioEnMetros(t)
                    return (
                      <tr key={t.id} onClick={() => openEdit(t)}>
                        <td><strong>{t.tipo || '—'}</strong></td>
                        <td style={{ fontSize: 11, color: 'var(--accent)' }}>{t.codigo || '—'}</td>
                        <td>{t.color || '—'}</td>
                        <td>{t.proveedor || '—'}</td>
                        <td>{t.unidad || 'kg'}</td>
                        <td>
                          {t.rendimiento
                            ? `${t.rendimiento} m/kg`
                            : t.unidad === 'kg'
                              ? <span style={{ color: 'var(--warning)', fontSize: 11 }}>⚠ Pendiente</span>
                              : '—'}
                        </td>
                        <td>
                          {t.precio
                            ? `${t.moneda === 'USD' ? 'U$D' : '$'} ${fmtNum(t.precio)} / ${t.unidad}`
                            : '—'}
                        </td>
                        <td>
                          {pm != null
                            ? <span style={{ color: 'var(--accent)' }}>{t.moneda === 'USD' ? 'U$D' : '$'} {fmtNum(pm)} / m</span>
                            : t.unidad === 'kg' && t.precio
                              ? <span style={{ color: 'var(--warning)', fontSize: 11 }}>⚠ Falta rendimiento</span>
                              : '—'}
                        </td>
                        <td onClick={e => handleDelete(t.id, e)}>
                          <button className="btn btn-danger btn-sm">🗑</button>
                        </td>
                      </tr>
                    )
                  })}
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
              <h3>{editing ? '✏ Editar tela' : '🧶 Nueva tela'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo / nombre</label>
                  <input value={form.tipo} onChange={e => setF('tipo', e.target.value)} placeholder="ej: Deportivo Piquet New" />
                </div>
                <div className="form-group">
                  <label>Proveedor</label>
                  <select value={form.proveedor_id} onChange={e => setF('proveedor_id', e.target.value)}>
                    <option value="">— Sin proveedor —</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Color / descripción</label>
                  <input value={form.color} onChange={e => setF('color', e.target.value)} placeholder="ej: Amarillo, Blanco..." />
                </div>
                <div className="form-group">
                  <label>Código del proveedor</label>
                  <input value={form.codigo} onChange={e => setF('codigo', e.target.value)} placeholder="opcional" />
                </div>
                <div className="form-group">
                  <label>Unidad de compra</label>
                  <select value={form.unidad} onChange={e => setF('unidad', e.target.value)}>
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="m">Metros (m)</option>
                  </select>
                </div>
                {form.unidad === 'kg' && (
                  <div className="form-group">
                    <label>Rendimiento (metros por kg)</label>
                    <input type="number" value={form.rendimiento} onChange={e => setF('rendimiento', e.target.value)} placeholder="ej: 3.5" />
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Podés completarlo después</div>
                  </div>
                )}
                <div className="form-group">
                  <label>Moneda del precio</label>
                  <select value={form.moneda_ref} onChange={e => setF('moneda_ref', e.target.value)}>
                    <option value="USD">USD Dólares</option>
                    <option value="UYU">$ Pesos UY</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Precio referencia (por {form.unidad})</label>
                  <input type="number" value={form.precio_ref} onChange={e => setF('precio_ref', e.target.value)} placeholder="último precio unitario pagado" />
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Sin descuento. Se actualiza con cada compra nueva.</div>
                </div>
              </div>

              {precioRefEnMetrosForm() && (
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 10, fontSize: 12, marginBottom: 12 }}>
                  <strong>Precio referencia en metros: </strong>
                  <span style={{ color: 'var(--accent)' }}>
                    {form.moneda_ref === 'USD' ? 'U$D' : '$'} {fmtNum(precioRefEnMetrosForm())} / m
                  </span>
                  <span style={{ color: 'var(--text2)', marginLeft: 8 }}>
                    ({form.precio_ref} ÷ {form.rendimiento} m/kg)
                  </span>
                </div>
              )}

              <div className="form-group">
                <label>Notas</label>
                <input value={form.notas} onChange={e => setF('notas', e.target.value)} placeholder="Composición, ancho, observaciones..." />
              </div>

              {editing && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>📦 Productos que usan esta tela</div>
                  {productosUsandoTela.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic' }}>Ningún producto usa esta tela aún.</div>
                  ) : (
                    productosUsandoTela.map(p => (
                      <div
                        key={p.id}
                        style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12, alignItems: 'center', cursor: onNavigate ? 'pointer' : 'default' }}
                        onClick={() => onNavigate && onNavigate('productos', p.id)}
                      >
                        <span style={{ fontWeight: 600, flex: 1 }}>{p.nombre}</span>
                        {onNavigate && <span style={{ color: 'var(--accent)', fontSize: 11 }}>Ver →</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
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
