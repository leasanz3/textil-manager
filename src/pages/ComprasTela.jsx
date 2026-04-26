import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtNum = (n) => n != null ? Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
const fmtUYU = (n) => n ? '$' + fmtNum(n) : '—'
const fmtUSD = (n) => n ? 'U$D ' + fmtNum(n) : '—'
const fmtFecha = (f) => { if (!f) return '—'; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}` }

const emptyItem = () => ({
  _key: Math.random(),
  tela_id: '', cantidad: '', unidad: 'kg',
  precio_lista: '', moneda: 'USD',
  total_factura: '', // si se pisa manual
  notas: ''
})

export default function ComprasTela({ onMenuClick }) {
  const [compras, setCompras] = useState([])
  const [telas, setTelas] = useState([])
  const [facturas, setFacturas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [modalCatalogo, setModalCatalogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingItemKey, setEditingItemKey] = useState(null)

  const [form, setForm] = useState({
    compra_id: '', proveedor_id: '', fecha: new Date().toISOString().split('T')[0], tc: '', notas: ''
  })
  const [items, setItems] = useState([emptyItem()])
  const [telaForm, setTelaForm] = useState({ tipo: '', color: '', codigo: '', unidad: 'kg' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: c }, { data: t }, { data: f }, { data: p }] = await Promise.all([
      supabase.from('compras_tela').select('*, telas(tipo, color, unidad), compras(factura, fecha, proveedor)').order('created_at', { ascending: false }),
      supabase.from('telas').select('id, tipo, color, unidad, proveedor_id, precio, moneda').order('tipo'),
      supabase.from('compras').select('id, factura, fecha, proveedor, proveedor_id, dolar_costeo, moneda').order('fecha', { ascending: false }),
      supabase.from('proveedores').select('id, nombre').order('nombre')
    ])
    setCompras(c || [])
    setTelas(t || [])
    setFacturas(f || [])
    setProveedores(p || [])
    setLoading(false)
  }

  const telasFiltradas = form.proveedor_id
    ? telas.filter(t => String(t.proveedor_id) === String(form.proveedor_id))
    : telas

  function onFacturaChange(compraId) {
    const factura = facturas.find(f => f.id === parseInt(compraId))
    setForm(f => ({
      ...f,
      compra_id: compraId,
      proveedor_id: factura?.proveedor_id ? String(factura.proveedor_id) : f.proveedor_id,
      fecha: factura?.fecha || f.fecha,
      // TC se autocompleta desde la factura si tiene dolar de pago
      tc: factura?.dolar_costeo ? String(factura.dolar_costeo) : f.tc
    }))
    // Si la factura es en USD, poner moneda USD en los items
    if (factura?.moneda === 'USD') {
      setItems(prev => prev.map(i => ({ ...i, moneda: 'USD' })))
    } else if (factura?.moneda === 'UYU') {
      setItems(prev => prev.map(i => ({ ...i, moneda: 'UYU' })))
    }
  }

  // Calculos por item
  function calcItem(item) {
    const cantidad = parseFloat(item.cantidad) || 0
    const precioLista = parseFloat(item.precio_lista) || 0
    const subtotal = cantidad * precioLista

    // Si pisaron el total manual, calcular descuento
    const totalManual = item.total_factura !== '' ? parseFloat(item.total_factura) : null
    const totalFinal = totalManual !== null ? totalManual : subtotal
    const descMonto = subtotal > 0 ? subtotal - totalFinal : 0
    const descPct = subtotal > 0 ? (descMonto / subtotal) * 100 : 0

    return { subtotal, totalFinal, descMonto, descPct }
  }

  function updateItem(key, field, value) {
    setItems(prev => prev.map(item => {
      if (item._key !== key) return item
      const updated = { ...item, [field]: value }
      // Si cambia cantidad o precio, resetear total manual para recalcular
      if (field === 'cantidad' || field === 'precio_lista') {
        updated.total_factura = ''
      }
      return updated
    }))
  }

  function openNew() {
    setForm({ compra_id: '', proveedor_id: '', fecha: new Date().toISOString().split('T')[0], tc: '', notas: '' })
    setItems([emptyItem()])
    setModal(true)
  }

  function openNuevaTela(itemKey) {
    const factura = facturas.find(f => f.id === parseInt(form.compra_id))
    setTelaForm({ tipo: '', color: '', codigo: '', unidad: 'kg', proveedor_id: form.proveedor_id || '', proveedor_nombre: factura?.proveedor || '' })
    setEditingItemKey(itemKey)
    setModalCatalogo(true)
  }

  async function handleGuardarTela() {
    if (!telaForm.tipo) return alert('El nombre de la tela es obligatorio')
    const { data: nueva } = await supabase.from('telas').insert({
      tipo: telaForm.tipo,
      color: telaForm.color || null,
      codigo: telaForm.codigo || null,
      unidad: telaForm.unidad,
      proveedor_id: parseInt(telaForm.proveedor_id) || null,
      proveedor: telaForm.proveedor_nombre || null,
      metros: 0, usados: 0
    }).select().single()
    if (nueva) {
      setTelas(prev => [...prev, nueva])
      updateItem(editingItemKey, 'tela_id', String(nueva.id))
      updateItem(editingItemKey, 'unidad', nueva.unidad || 'kg')
    }
    setModalCatalogo(false)
  }

  async function handleSave() {
    if (!form.compra_id) return alert('Elegí una factura')
    const itemsValidos = items.filter(i => i.tela_id && i.cantidad && i.precio_lista)
    if (itemsValidos.length === 0) return alert('Completá al menos un renglón con tela, cantidad y precio')

    setSaving(true)
    for (const item of itemsValidos) {
      const calc = calcItem(item)
      await supabase.from('compras_tela').insert({
        tela_id: parseInt(item.tela_id),
        compra_id: parseInt(form.compra_id),
        cantidad: parseFloat(item.cantidad),
        unidad: item.unidad,
        precio_unitario: parseFloat(item.precio_lista),
        precio_lista: parseFloat(item.precio_lista),
        moneda: item.moneda,
        tc: parseFloat(form.tc) || null,
        total_factura: calc.totalFinal || null,
        descuento_monto: calc.descMonto || null,
        descuento_pct: calc.descPct || null,
        fecha: form.fecha,
        notas: item.notas || null
      })

      // Actualizar precio referencia en catálogo
      await supabase.from('telas').update({
        precio: parseFloat(item.precio_lista),
        moneda: item.moneda
      }).eq('id', parseInt(item.tela_id))
    }

    setSaving(false)
    setModal(false)
    fetchAll()
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('¿Borrar esta compra de tela?')) return
    await supabase.from('compras_tela').delete().eq('id', id)
    fetchAll()
  }

  const totalCantidad = compras.reduce((a, x) => a + parseFloat(x.cantidad || 0), 0)

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>🛒 Compras de Tela</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nueva compra</button>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">{compras.length}</div><div className="stat-label">Ítems comprados</div></div>
          <div className="stat-card"><div className="stat-value">{fmtNum(totalCantidad)}</div><div className="stat-label">Total kg/m comprados</div></div>
          <div className="stat-card"><div className="stat-value">{compras.filter(c => c.compra_id).length}</div><div className="stat-label">Vinculados a factura</div></div>
        </div>

        <div className="table-wrap">
          {loading ? <div className="loading"><div className="spinner" /> Cargando...</div>
          : compras.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🛒</div>
              <h3>No hay compras de tela registradas</h3>
              <p>Registrá tu primera compra con el botón de arriba</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Tela</th><th>Factura</th><th>Fecha</th>
                    <th>Cantidad</th><th>Precio lista</th><th>Descuento</th>
                    <th>Total</th><th>TC</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {compras.map(c => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.telas?.tipo || '—'}</strong>
                        {c.telas?.color && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{c.telas.color}</div>}
                      </td>
                      <td style={{ fontSize: 11 }}>
                        {c.compras
                          ? <span style={{ color: 'var(--success)' }}>🔗 {c.compras.proveedor}{c.compras.factura ? ` #${c.compras.factura}` : ''}</span>
                          : <span style={{ color: 'var(--text2)' }}>—</span>}
                      </td>
                      <td>{fmtFecha(c.fecha)}</td>
                      <td>{fmtNum(c.cantidad)} {c.unidad}</td>
                      <td style={{ fontSize: 12 }}>{c.moneda === 'USD' ? fmtUSD(c.precio_lista) : fmtUYU(c.precio_lista)}</td>
                      <td style={{ fontSize: 12, color: 'var(--success)' }}>
                        {c.descuento_pct ? `${fmtNum(c.descuento_pct)}%` : '—'}
                        {c.descuento_monto ? <div style={{ fontSize: 11 }}>{c.moneda === 'USD' ? fmtUSD(c.descuento_monto) : fmtUYU(c.descuento_monto)}</div> : null}
                      </td>
                      <td><strong>{c.moneda === 'USD' ? fmtUSD(c.total_factura) : fmtUYU(c.total_factura)}</strong></td>
                      <td style={{ fontSize: 11 }}>{c.tc ? '$' + c.tc : '—'}</td>
                      <td onClick={e => handleDelete(c.id, e)}>
                        <button className="btn btn-danger btn-sm">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL NUEVA COMPRA */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 960 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🛒 Nueva compra de tela</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Cabecera */}
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label>Factura de compra *</label>
                  <select value={form.compra_id} onChange={e => onFacturaChange(e.target.value)}>
                    <option value="">— Elegir factura —</option>
                    {facturas.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.proveedor}{f.factura ? ` · #${f.factura}` : ''} · {fmtFecha(f.fecha)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>
                    TC de pago
                    {form.tc && <span style={{ fontSize: 11, color: 'var(--success)', marginLeft: 6 }}>✓ de la factura</span>}
                  </label>
                  <input
                    type="number"
                    value={form.tc}
                    onChange={e => setForm(f => ({ ...f, tc: e.target.value }))}
                    placeholder="se completa solo si la factura tiene TC"
                  />
                </div>
              </div>

              {form.proveedor_id && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                  Telas de: <strong style={{ color: 'var(--accent)' }}>
                    {proveedores.find(p => String(p.id) === String(form.proveedor_id))?.nombre}
                  </strong>
                  <span style={{ marginLeft: 8 }}>({telasFiltradas.length} telas)</span>
                </div>
              )}

              {/* Tabla de renglones */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 220 }}>Tela</th>
                      <th style={{ minWidth: 80 }}>Cantidad</th>
                      <th style={{ minWidth: 65 }}>Unidad</th>
                      <th style={{ minWidth: 100 }}>Precio lista</th>
                      <th style={{ minWidth: 65 }}>Moneda</th>
                      <th style={{ minWidth: 110 }}>Total (editable)</th>
                      <th style={{ minWidth: 90 }}>Descuento $</th>
                      <th style={{ minWidth: 80 }}>Descuento %</th>
                      <th style={{ minWidth: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const calc = calcItem(item)
                      const tieneDescuento = calc.descMonto > 0.001
                      return (
                        <tr key={item._key}>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <select
                                value={item.tela_id}
                                onChange={e => {
                                  const t = telas.find(t => String(t.id) === e.target.value)
                                  updateItem(item._key, 'tela_id', e.target.value)
                                  if (t) {
                                    updateItem(item._key, 'unidad', t.unidad || 'kg')
                                    if (t.moneda) updateItem(item._key, 'moneda', t.moneda)
                                  }
                                }}
                                style={{ flex: 1, fontSize: 11 }}
                              >
                                <option value="">— Elegir —</option>
                                {telasFiltradas.map(t => (
                                  <option key={t.id} value={t.id}>{t.tipo}{t.color ? ` · ${t.color}` : ''}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 6px', fontSize: 10 }}
                                onClick={() => openNuevaTela(item._key)}
                              >+ nueva</button>
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.cantidad}
                              onChange={e => updateItem(item._key, 'cantidad', e.target.value)}
                              placeholder="0.000"
                              style={{ width: 75 }}
                            />
                          </td>
                          <td>
                            <select value={item.unidad} onChange={e => updateItem(item._key, 'unidad', e.target.value)} style={{ width: 60 }}>
                              <option value="kg">kg</option>
                              <option value="m">m</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.precio_lista}
                              onChange={e => updateItem(item._key, 'precio_lista', e.target.value)}
                              placeholder="0.00"
                              style={{ width: 90 }}
                            />
                          </td>
                          <td>
                            <select value={item.moneda} onChange={e => updateItem(item._key, 'moneda', e.target.value)} style={{ width: 60 }}>
                              <option value="USD">USD</option>
                              <option value="UYU">$UY</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.total_factura !== '' ? item.total_factura : (calc.subtotal > 0 ? calc.subtotal.toFixed(2) : '')}
                              onChange={e => updateItem(item._key, 'total_factura', e.target.value)}
                              placeholder={calc.subtotal > 0 ? calc.subtotal.toFixed(2) : '0.00'}
                              style={{ width: 100, color: tieneDescuento ? 'var(--warning)' : 'inherit' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={tieneDescuento ? calc.descMonto.toFixed(2) : ''}
                              readOnly
                              placeholder="0.00"
                              style={{ width: 80, color: 'var(--success)', background: 'transparent' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={tieneDescuento ? calc.descPct.toFixed(2) : ''}
                              readOnly
                              placeholder="0.00"
                              style={{ width: 70, color: 'var(--success)', background: 'transparent' }}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => setItems(prev => prev.filter(i => i._key !== item._key))}
                            >✕</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 10 }}
                onClick={() => setItems(prev => [...prev, emptyItem()])}>
                + Agregar renglón
              </button>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Notas</label>
                <input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observaciones..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : '✔ Guardar compra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVA TELA RÁPIDA */}
      {modalCatalogo && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setModalCatalogo(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🧶 Nueva tela al catálogo</h3>
              <button className="close-btn" onClick={() => setModalCatalogo(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                Proveedor: <strong>{telaForm.proveedor_nombre || '—'}</strong>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={telaForm.tipo} onChange={e => setTelaForm(f => ({ ...f, tipo: e.target.value }))} placeholder="ej: Deportivo Piquet New" autoFocus />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input value={telaForm.color} onChange={e => setTelaForm(f => ({ ...f, color: e.target.value }))} placeholder="ej: Amarillo" />
                </div>
                <div className="form-group">
                  <label>Unidad</label>
                  <select value={telaForm.unidad} onChange={e => setTelaForm(f => ({ ...f, unidad: e.target.value }))}>
                    <option value="kg">kg</option>
                    <option value="m">m</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Código (opcional)</label>
                  <input value={telaForm.codigo} onChange={e => setTelaForm(f => ({ ...f, codigo: e.target.value }))} placeholder="opcional" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalCatalogo(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardarTela}>✔ Guardar y seleccionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
