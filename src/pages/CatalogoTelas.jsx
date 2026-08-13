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
    tipo: '', codigo: '', color: '', ancho: '', proveedor_id: '',
    unidad: 'kg', rendimiento: '', precio_ref: '', moneda_ref: 'USD', notas: ''
  }
  const [form, setForm] = useState(emptyForm)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Modal detalle
  const [detalle, setDetalle] = useState(null)
  const [detalleCompras, setDetalleCompras] = useState([])
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  async function openDetalle(t) {
    setDetalle(t)
    setLoadingDetalle(true)
    const [{ data: compras }, productos] = await Promise.all([
      supabase.from('compras_tela').select('*, compras(factura, fecha, proveedor)').eq('tela_id', t.id).order('fecha', { ascending: false }),
      fetchProductosUsandoTela(t.id),
    ])
    setDetalleCompras(compras || [])
    setLoadingDetalle(false)
  }

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
      ancho: t.ancho != null ? String(t.ancho) : '',
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
    const { data } = await supabase
      .from('productos')
      .select('id, nombre, cliente_id, tela1_id, tela2_id, rib_id, telas_extra')
    const todos = (data || []).filter(p => {
      if (p.tela1_id === telaId || p.tela2_id === telaId || p.rib_id === telaId) return true
      return (p.telas_extra || []).some(te => Number(te.tela_id) === telaId)
    })
    setProductosUsandoTela(todos)
    return todos
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
      notas: form.notas || null,
      ancho: parseFloat(form.ancho) || null,
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
                    <th>Ancho (m)</th>
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
                      <tr key={t.id} onClick={() => openDetalle(t)} style={{ cursor: 'pointer' }}>
                        <td><strong>{t.tipo || '—'}</strong></td>
                        <td style={{ fontSize: 11, color: 'var(--accent)' }}>{t.codigo || '—'}</td>
                        <td>{t.color || '—'}</td>
                        <td>{t.ancho != null ? `${t.ancho} m` : '—'}</td>
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

      {detalle && (
        <div className="modal-overlay" onClick={() => setDetalle(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>🧶 {detalle.tipo}</h3>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                  {detalle.color && <span>{detalle.color} · </span>}
                  {detalle.proveedor && <span>{detalle.proveedor}</span>}
                </div>
              </div>
              <button className="close-btn" onClick={() => setDetalle(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Datos del catálogo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Nombre',       value: detalle.tipo || '—' },
                  { label: 'Color',        value: detalle.color || '—' },
                  { label: 'Código',       value: detalle.codigo || '—' },
                  { label: 'Proveedor',    value: detalle.proveedor || '—' },
                  { label: 'Unidad',       value: detalle.unidad || '—' },
                  { label: 'Rendimiento',  value: detalle.rendimiento ? `${detalle.rendimiento} m/kg` : '—' },
                  { label: 'Precio ref.',  value: detalle.precio ? `${detalle.moneda === 'USD' ? 'U$D' : '$'} ${fmtNum(detalle.precio)} / ${detalle.unidad}` : '—' },
                  { label: 'Precio / m',   value: detalle.precio && detalle.rendimiento && detalle.unidad === 'kg' ? `${detalle.moneda === 'USD' ? 'U$D' : '$'} ${fmtNum(detalle.precio / detalle.rendimiento)} / m` : '—', color: 'var(--accent)' },
                  { label: 'Stock',        value: detalle.metros != null ? `${fmtNum(detalle.metros)} m` : '—' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', padding: '7px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: color || 'var(--text)' }}>{value}</div>
                  </div>
                ))}
              </div>
              {detalle.notas && (
                <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic', padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', marginBottom: 14 }}>
                  📝 {detalle.notas}
                </div>
              )}

              {loadingDetalle ? (
                <div className="loading"><div className="spinner" /> Cargando...</div>
              ) : (
                <>
                  {/* Compras vinculadas */}
                  <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text2)', padding: '4px 0 6px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                    🛒 Historial de compras ({detalleCompras.length})
                  </div>
                  {detalleCompras.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic', marginBottom: 14 }}>Sin compras registradas para esta tela.</div>
                  ) : (
                    <table style={{ width: '100%', marginBottom: 14 }}>
                      <thead>
                        <tr>
                          <th>Fecha</th><th>Factura</th><th style={{ textAlign: 'right' }}>Cantidad</th><th style={{ textAlign: 'right' }}>Precio</th><th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalleCompras.map(c => (
                          <tr key={c.id}>
                            <td>{c.fecha ? c.fecha.split('-').reverse().join('/') : '—'}</td>
                            <td style={{ fontSize: 11 }}>
                              {c.compras ? `${c.compras.proveedor}${c.compras.factura ? ` #${c.compras.factura}` : ''}` : '—'}
                            </td>
                            <td style={{ textAlign: 'right' }}>{fmtNum(c.cantidad)} {c.unidad}</td>
                            <td style={{ textAlign: 'right', fontSize: 11 }}>{c.moneda === 'USD' ? `U$D ${fmtNum(c.precio_lista)}` : `$${fmtNum(c.precio_lista)}`}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.moneda === 'USD' ? `U$D ${fmtNum(c.total_factura)}` : `$${fmtNum(c.total_factura)}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Productos que la usan */}
                  {productosUsandoTela.length > 0 && (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text2)', padding: '4px 0 6px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                        📦 Productos que usan esta tela ({productosUsandoTela.length})
                      </div>
                      {productosUsandoTela.map(p => (
                        <div key={p.id} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                          {p.nombre}
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetalle(null)}>Cerrar</button>
              <button className="btn btn-primary" onClick={() => { setDetalle(null); openEdit(detalle) }}>✏ Editar</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay">
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
                  <label>Ancho (m)</label>
                  <input type="number" value={form.ancho} onChange={e => setF('ancho', e.target.value)} placeholder="ej: 1.50" step="0.01" />
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
