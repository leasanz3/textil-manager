import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtFecha = (f) => { if (!f) return '—'; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}` }
const fmtNum = (n) => n ? Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
const fmtUYU = (n) => n ? '$' + fmtNum(n) : '—'

export function Telas({ onMenuClick }) {
  const [telas, setTelas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [modalStock, setModalStock] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editingStock, setEditingStock] = useState(null)
  const [saving, setSaving] = useState(false)
  const [warnings, setWarnings] = useState([])
  const [stockForm, setStockForm] = useState({ disponible: '', notas: '' })

  const [form, setForm] = useState({
    tipo: '', codigo: '', color: '', proveedor_id: '', compra_id: '',
    unidad: 'm', metros: '', disponible: '', precio: '', moneda: 'UYU',
    tc: '', fecha: '', notas: ''
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: t }, { data: p }, { data: c }] = await Promise.all([
      supabase.from('telas').select('*, compras(id, factura, fecha, proveedor)').order('created_at', { ascending: false }),
      supabase.from('proveedores').select('id, nombre').order('nombre'),
      supabase.from('compras').select('id, factura, fecha, proveedor').order('fecha', { ascending: false })
    ])
    setTelas(t || [])
    setProveedores(p || [])
    setCompras(c || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({
      tipo: '', codigo: '', color: '', proveedor_id: '', compra_id: '',
      unidad: 'm', metros: '', disponible: '', unidad_stock: 'm', precio: '', moneda: 'UYU',
      tc: '', fecha: new Date().toISOString().split('T')[0], notas: ''
    })
    setWarnings([])
    setModal(true)
  }

  function openEdit(t) {
    setEditing(t.id)
    setForm({
      tipo: t.tipo || '', codigo: t.codigo || '', color: t.color || '',
      proveedor_id: t.proveedor_id || '', compra_id: t.compra_id || '',
      unidad: t.unidad || 'm', metros: t.metros || '',
      disponible: t.usados !== undefined ? (t.metros - t.usados) : t.metros || '',
      unidad_stock: t.unidad_stock || t.unidad || 'm',
      precio: t.precio || '', moneda: t.moneda || 'UYU',
      tc: t.tc || '', fecha: t.fecha || '', notas: t.notas || ''
    })
    setWarnings([])
    setModal(true)
  }

  // Modal rápido solo para actualizar stock
  function openStock(t, e) {
    e.stopPropagation()
    setEditingStock(t)
    const disp = Math.max(0, (t.metros || 0) - (t.usados || 0))
    setStockForm({ disponible: disp, unidad_stock: t.unidad_stock || t.unidad || 'm', notas: '' })
    setModalStock(true)
  }

  async function handleSaveStock() {
    if (!editingStock) return
    setSaving(true)
    const disp = parseFloat(stockForm.disponible) || 0
    const usados = Math.max(0, (editingStock.metros || 0) - disp)
    await supabase.from('telas').update({ usados, unidad_stock: stockForm.unidad_stock }).eq('id', editingStock.id)
    setSaving(false)
    setModalStock(false)
    fetchAll()
  }

  function onCompraChange(compraId) {
    const compra = compras.find(c => c.id === parseInt(compraId))
    if (compra && !form.proveedor_id) {
      const prov = proveedores.find(p => p.nombre === compra.proveedor)
      setForm(f => ({
        ...f,
        compra_id: compraId,
        proveedor_id: prov ? prov.id : f.proveedor_id,
        fecha: compra.fecha || f.fecha
      }))
    } else {
      setF('compra_id', compraId)
    }
  }

  async function handleSave() {
    const w = []
    if (!form.tipo) w.push('Falta el tipo/nombre de la tela')
    if (!form.metros) w.push('Falta la cantidad comprada')
    setWarnings(w)
    if (w.length > 0 && !window.confirm('Datos incompletos:\n\n• ' + w.join('\n• ') + '\n\n¿Guardar igual?')) return

    setSaving(true)
    const prov = proveedores.find(p => p.id === parseInt(form.proveedor_id))
    const metros = parseFloat(form.metros) || 0
    // disponible: si lo ingresó usarlo, sino igual a lo comprado (nada usado aún)
    const disponible = form.disponible !== '' ? parseFloat(form.disponible) : metros
    const usados = Math.max(0, metros - disponible)

    const datos = {
      tipo: form.tipo || null,
      codigo: form.codigo || null,
      color: form.color || null,
      proveedor: prov?.nombre || null,
      proveedor_id: parseInt(form.proveedor_id) || null,
      compra_id: parseInt(form.compra_id) || null,
      unidad: form.unidad,
      metros,
      usados,
      precio: parseFloat(form.precio) || 0,
      moneda: form.moneda,
      tc: parseFloat(form.tc) || null,
      fecha: form.fecha || null,
      unidad_stock: form.unidad_stock || form.unidad,
      notas: form.notas || null
    }

    if (editing) {
      await supabase.from('telas').update(datos).eq('id', editing)
    } else {
      const { data: nueva } = await supabase.from('telas').insert(datos).select().single()
      if (nueva && datos.compra_id) {
        await supabase.from('compras').update({ tiene_items: true }).eq('id', datos.compra_id)
      }
    }

    setSaving(false)
    setModal(false)
    fetchAll()
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('¿Borrar esta tela del stock?')) return
    await supabase.from('telas').delete().eq('id', id)
    fetchAll()
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = telas.filter(t =>
    !search ||
    t.tipo?.toLowerCase().includes(search.toLowerCase()) ||
    t.proveedor?.toLowerCase().includes(search.toLowerCase()) ||
    t.codigo?.toLowerCase().includes(search.toLowerCase())
  )

  const stockBajo = telas.filter(t => {
    const d = Math.max(0, (t.metros || 0) - (t.usados || 0))
    return t.metros > 0 && (d / t.metros) < 0.2
  }).length

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>🧶 Telas</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nueva tela</button>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{telas.length}</div>
            <div className="stat-label">Registros de tela</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: stockBajo > 0 ? 'var(--danger)' : 'var(--text2)' }}>
              {stockBajo}
            </div>
            <div className="stat-label">⚠ Stock bajo</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent)' }}>
              {telas.filter(t => t.compra_id).length}
            </div>
            <div className="stat-label">Vinculadas a factura</div>
          </div>
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 280 }}>
              <input
                placeholder="Buscar tela, código o proveedor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /> Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🧶</div>
              <h3>No hay telas en stock</h3>
              <p>Agregá tu primera tela con el botón de arriba</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Código</th>
                    <th>Proveedor</th>
                    <th>Factura</th>
                    <th>Fecha</th>
                    <th>Comprado</th>
                    <th>Disponible</th>
                    <th>Precio unit.</th>
                    <th>Total compra</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const u = t.unidad || 'm'
                    const disp = Math.max(0, (t.metros || 0) - (t.usados || 0))
                    const pct = t.metros ? Math.min(100, Math.round(disp / t.metros * 100)) : 0
                    const low = pct < 20 && t.metros > 0
                    // Precio total en pesos
                    const precioARS = t.moneda === 'USD' && t.tc ? t.precio * t.tc : t.precio
                    const totalCompra = (t.metros || 0) * (precioARS || 0)
                    const facturaStr = t.compras
                      ? (t.compras.factura ? `#${t.compras.factura}` : fmtFecha(t.compras.fecha))
                      : '—'
                    return (
                      <tr key={t.id} onClick={() => openEdit(t)}>
                        <td>
                          <strong>{t.tipo || '—'}</strong>
                          {t.color && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{t.color}</div>}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--accent)' }}>{t.codigo || '—'}</td>
                        <td>{t.proveedor || <span style={{ color: 'var(--text2)' }}>—</span>}</td>
                        <td style={{ fontSize: 11 }}>
                          {t.compra_id
                            ? <span style={{ color: 'var(--success)' }}>🔗 {facturaStr}</span>
                            : <span style={{ color: 'var(--text2)' }}>—</span>}
                        </td>
                        <td>{fmtFecha(t.fecha)}</td>
                        <td>{t.metros} {u}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: low ? 'var(--danger)' : 'var(--success)' }}>
                              {disp.toFixed(2)} {t.unidad_stock || u}{low && ' ⚠'}
                            </span>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 6px', fontSize: 10 }}
                              onClick={(e) => openStock(t, e)}
                              title="Actualizar stock disponible"
                            >
                              ✏
                            </button>
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {t.precio
                            ? (t.moneda === 'USD'
                              ? `U$D ${fmtNum(t.precio)}${t.tc ? ` (TC ${t.tc})` : ''}`
                              : fmtUYU(t.precio))
                            : '—'}
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>
                          {totalCompra ? fmtUYU(totalCompra) : '—'}
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

      {/* MODAL PRINCIPAL */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏ Editar tela' : '🧶 Nueva tela'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {warnings.length > 0 && (
                <div style={{ background: 'rgba(253,203,110,0.1)', border: '1px solid var(--warning)', borderRadius: 'var(--radius)', padding: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600, marginBottom: 4 }}>⚠ Datos incompletos (podés guardar igual):</div>
                  {warnings.map((w, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text2)' }}>• {w}</div>)}
                </div>
              )}

              {/* Sección compra */}
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                📦 Datos de la compra
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo / nombre de tela</label>
                  <input value={form.tipo} onChange={e => setF('tipo', e.target.value)} placeholder="ej: Jersey 24/1 algodón" />
                </div>
                <div className="form-group">
                  <label>Proveedor</label>
                  <select value={form.proveedor_id} onChange={e => setF('proveedor_id', e.target.value)}>
                    <option value="">— Sin proveedor / No aplica —</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Vincular a factura</label>
                  <select value={form.compra_id} onChange={e => onCompraChange(e.target.value)}>
                    <option value="">— Sin factura / No aplica —</option>
                    {compras.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.proveedor}{c.factura ? ` · #${c.factura}` : ''} · {fmtFecha(c.fecha)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Código del proveedor</label>
                  <input value={form.codigo} onChange={e => setF('codigo', e.target.value)} placeholder="ej: JRS-241-BL" />
                </div>
                <div className="form-group">
                  <label>Color / descripción</label>
                  <input value={form.color} onChange={e => setF('color', e.target.value)} placeholder="ej: Blanco, 150cm" />
                </div>
                <div className="form-group">
                  <label>Fecha de compra</label>
                  <input type="date" value={form.fecha} onChange={e => setF('fecha', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Unidad</label>
                  <select value={form.unidad} onChange={e => setF('unidad', e.target.value)}>
                    <option value="m">Metros (m)</option>
                    <option value="kg">Kilogramos (kg)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Cantidad comprada ({form.unidad})</label>
                  <input type="number" value={form.metros} onChange={e => setF('metros', e.target.value)} placeholder="0.0" />
                </div>
                <div className="form-group">
                  <label>Moneda</label>
                  <select value={form.moneda} onChange={e => setF('moneda', e.target.value)}>
                    <option value="UYU">$ Pesos UY</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Precio por {form.unidad}</label>
                  <input type="number" value={form.precio} onChange={e => setF('precio', e.target.value)} placeholder="0" />
                </div>
                {form.moneda === 'USD' && (
                  <div className="form-group">
                    <label>Tipo de cambio (opcional)</label>
                    <input type="number" value={form.tc} onChange={e => setF('tc', e.target.value)} placeholder="ej: 39.90" />
                  </div>
                )}
              </div>

              {/* Total calculado */}
              {form.metros && form.precio && (
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 10, marginBottom: 12, fontSize: 12 }}>
                  <strong>Total compra: </strong>
                  {form.moneda === 'USD'
                    ? `U$D ${fmtNum(form.metros * form.precio)}${form.tc ? ` = ${fmtUYU(form.metros * form.precio * form.tc)} (TC ${form.tc})` : ''}`
                    : fmtUYU(form.metros * form.precio)
                  }
                </div>
              )}

              {/* Sección stock */}
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, margin: '12px 0 8px' }}>
                📊 Stock disponible actual
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>¿Cuánto tenés disponible ahora?</label>
                  <input
                    type="number"
                    value={form.disponible}
                    onChange={e => setF('disponible', e.target.value)}
                    placeholder={form.metros ? `Compraste ${form.metros} ${form.unidad}` : '0.0'}
                  />
                </div>
                <div className="form-group">
                  <label>Unidad del stock disponible</label>
                  <select value={form.unidad_stock} onChange={e => setF('unidad_stock', e.target.value)}>
                    <option value="m">Metros (m)</option>
                    <option value="kg">Kilogramos (kg)</option>
                  </select>
                  {form.unidad !== form.unidad_stock && (
                    <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4 }}>
                      ⚠ Compraste en {form.unidad}, controlás el stock en {form.unidad_stock}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>
                Dejalo vacío si todavía no cortaste nada — el stock queda igual a lo comprado
              </div>

              <div className="form-group">
                <label>Notas</label>
                <textarea value={form.notas} onChange={e => setF('notas', e.target.value)} placeholder="Lote, observaciones..." />
              </div>
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

      {/* MODAL RÁPIDO STOCK */}
      {modalStock && editingStock && (
        <div className="modal-overlay" onClick={() => setModalStock(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Actualizar stock</h3>
              <button className="close-btn" onClick={() => setModalStock(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 12, fontSize: 13 }}>
                <strong>{editingStock.tipo}</strong>
                <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>
                  Comprado: {editingStock.metros} {editingStock.unidad || 'm'}
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>¿Cuánto te queda disponible?</label>
                  <input
                    type="number"
                    value={stockForm.disponible}
                    onChange={e => setStockForm(f => ({ ...f, disponible: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Unidad</label>
                  <select value={stockForm.unidad_stock} onChange={e => setStockForm(f => ({ ...f, unidad_stock: e.target.value }))}>
                    <option value="m">Metros (m)</option>
                    <option value="kg">Kilogramos (kg)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalStock(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveStock} disabled={saving}>
                {saving ? 'Guardando...' : '✔ Actualizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function Productos({ onMenuClick }) {
  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>📦 Productos</h2>
        </div>
      </div>
      <div className="content">
        <div className="empty-state">
          <div className="icon">📦</div>
          <h3>Módulo en construcción</h3>
          <p>Fichas técnicas, piezas de corte, avíos y más — próximamente</p>
        </div>
      </div>
    </div>
  )
}

export function Contactos({ onMenuClick }) {
  const [contactos, setContactos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('contactos').select('*').order('nombre').then(({ data }) => {
      setContactos(data || [])
      setLoading(false)
    })
  }, [])

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>👥 Contactos</h2>
        </div>
      </div>
      <div className="content">
        <div className="table-wrap">
          {loading ? <div className="loading"><div className="spinner" /></div>
          : contactos.length === 0 ? (
            <div className="empty-state"><div className="icon">👥</div><h3>No hay contactos</h3></div>
          ) : (
            <table>
              <thead><tr><th>Nombre</th><th>Tipo</th><th>Teléfono</th><th>Notas</th></tr></thead>
              <tbody>
                {contactos.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.nombre}</strong></td>
                    <td><span className="badge badge-blue">{c.tipo}</span></td>
                    <td>{c.tel || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{c.notas || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
