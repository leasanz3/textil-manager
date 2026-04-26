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
  total_factura: '', descuento_monto: '', descuento_pct: '',
  notas: ''
})

export default function ComprasTela({ onMenuClick }) {
  const [compras, setCompras] = useState([])
  const [telas, setTelas] = useState([])
  const [facturas, setFacturas] = useState([])
  const [tcHistorial, setTcHistorial] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [modalCatalogo, setModalCatalogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showTcHistorial, setShowTcHistorial] = useState(false)
  const [editingItemKey, setEditingItemKey] = useState(null)

  const [form, setForm] = useState({
    compra_id: '', proveedor_id: '', fecha: new Date().toISOString().split('T')[0], tc: '', notas: ''
  })
  const [items, setItems] = useState([emptyItem()])

  // Form nueva tela rápida
  const [telaForm, setTelaForm] = useState({ tipo: '', color: '', codigo: '', unidad: 'kg', notas: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: c }, { data: t }, { data: f }, { data: tc }, { data: p }] = await Promise.all([
      supabase.from('compras_tela').select('*, telas(tipo, color, unidad), compras(factura, fecha, proveedor)').order('created_at', { ascending: false }),
      supabase.from('telas').select('id, tipo, color, unidad, proveedor_id, precio, moneda').order('tipo'),
      supabase.from('compras').select('id, factura, fecha, proveedor, proveedor_id').order('fecha', { ascending: false }),
      supabase.from('tipos_cambio').select('*').order('fecha', { ascending: false }).limit(10),
      supabase.from('proveedores').select('id, nombre').order('nombre')
    ])
    setCompras(c || [])
    setTelas(t || [])
    setFacturas(f || [])
    setTcHistorial(tc || [])
    setProveedores(p || [])
    setLoading(false)
  }

  // Telas filtradas por proveedor
  const telasFiltradas = form.proveedor_id
    ? telas.filter(t => String(t.proveedor_id) === String(form.proveedor_id))
    : telas

  function onFacturaChange(compraId) {
    const factura = facturas.find(f => f.id === parseInt(compraId))
    setForm(f => ({
      ...f,
      compra_id: compraId,
      proveedor_id: factura?.proveedor_id ? String(factura.proveedor_id) : f.proveedor_id,
      fecha: factura?.fecha || f.fecha
    }))
  }

  // Calculos por item
  function calcItem(item) {
    const cantidad = parseFloat(item.cantidad) || 0
    const precioLista = parseFloat(item.precio_lista) || 0
    const subtotal = cantidad * precioLista

    let totalFactura = parseFloat(item.total_factura) || 0
    let descMonto = parseFloat(item.descuento_monto) || 0
    let descPct = parseFloat(item.descuento_pct) || 0

    // Si pusieron total_factura, calculamos descuento
    if (item.total_factura !== '' && subtotal > 0) {
      descMonto = subtotal - totalFactura
      descPct = subtotal > 0 ? (descMonto / subtotal) * 100 : 0
    }
    // Si pusieron descuento_pct, calculamos total
    else if (item.descuento_pct !== '' && subtotal > 0) {
      descMonto = subtotal * (descPct / 100)
      totalFactura = subtotal - descMonto
    }
    // Si pusieron descuento_monto, calculamos total
    else if (item.descuento_monto !== '' && subtotal > 0) {
      totalFactura = subtotal - descMonto
      descPct = subtotal > 0 ? (descMonto / subtotal) * 100 : 0
    }

    return { subtotal, totalFactura, descMonto, descPct }
  }

  function updateItem(key, field, value) {
    setItems(prev => prev.map(item => {
      if (item._key !== key) return item
      const updated = { ...item, [field]: value }
      // Si cambia precio_lista o cantidad, limpiamos los calculos para recalcular
      if (field === 'precio_lista' || field === 'cantidad') {
        updated.total_factura = ''
        updated.descuento_monto = ''
        updated.descuento_pct = ''
      }
      // Si escribe en total_factura, limpiamos descuentos
      if (field === 'total_factura') {
        updated.descuento_monto = ''
        updated.descuento_pct = ''
      }
      // Si escribe en descuento_pct, limpiamos los otros
      if (field === 'descuento_pct') {
        updated.total_factura = ''
        updated.descuento_monto = ''
      }
      // Si escribe en descuento_monto, limpiamos los otros
      if (field === 'descuento_monto') {
        updated.total_factura = ''
        updated.descuento_pct = ''
      }
      return updated
    }))
  }

  async function guardarTC() {
    if (!form.tc) return
    await supabase.from('tipos_cambio').insert({ valor: parseFloat(form.tc), fecha: form.fecha })
    const { data } = await supabase.from('tipos_cambio').select('*').order('fecha', { ascending: false }).limit(10)
    setTcHistorial(data || [])
  }

  function openNew() {
    setForm({ compra_id: '', proveedor_id: '', fecha: new Date().toISOString().split('T')[0], tc: '', notas: '' })
    setItems([emptyItem()])
    setShowTcHistorial(false)
    setModal(true)
  }

  // Abrir modal nueva tela rápida desde un renglón
  function openNuevaTela(itemKey) {
    const factura = facturas.find(f => f.id === parseInt(form.compra_id))
    setTelaForm({
      tipo: '', color: '', codigo: '', unidad: 'kg', notas: '',
      proveedor_id: form.proveedor_id || '',
      proveedor_nombre: factura?.proveedor || ''
    })
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
      // Asignar la tela nueva al renglón que la pidió
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
        total_factura: calc.totalFactura || null,
        descuento_monto: calc.descMonto || null,
        descuento_pct: calc.descPct || null,
        fecha: form.fecha,
        notas: item.notas || null
      })

      // Actualizar precio referencia en catálogo si la fecha es más nueva
      const tela = telas.find(t => t.id === parseInt(item.tela_id))
      if (tela) {
        await supabase.from('telas').update({
          precio: parseFloat(item.precio_lista),
          moneda: item.moneda
        }).eq('id', tela.id)
      }
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

  const totalKg = compras.reduce((a, x) => a + parseFloat(x.cantidad || 0), 0)

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
          <div className="stat-card"><div className="stat-value">{fmtNum(totalKg)}</div><div className="stat-label">Total kg/m comprados</div></div>
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
                    <th>Total factura</th><th>TC</th><th></th>
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
                      <td style={{ fontSize: 12 }}>
                        {c.moneda === 'USD' ? fmtUSD(c.precio_lista) : fmtUYU(c.precio_lista)}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--success)' }}>
                        {c.descuento_pct ? `${fmtNum(c.descuento_pct)}%` : '—'}
                      </td>
                      <td><strong>{c.moneda === 'USD' ? fmtUSD(c.total_factura) : fmtUYU(c.total_factura)}</strong></td>
                      <td style={{ fontSize: 11 }}>{c.tc || '—'}</td>
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
          <div className="modal" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🛒 Nueva compra de tela</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Cabecera: factura y TC */}
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
                  <label>Tipo de cambio (si aplica)</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="number" value={form.tc} onChange={e => setForm(f => ({ ...f, tc: e.target.value }))} placeholder="ej: 42.50" style={{ flex: 1 }} />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={guardarTC} title="Guardar en historial">💾</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowTcHistorial(!showTcHistorial)} title="Ver historial">📋</button>
                  </div>
                  {showTcHistorial && tcHistorial.length > 0 && (
                    <div style={{ marginTop: 4, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                      {tcHistorial.map(tc => (
                        <div key={tc.id}
                          onClick={() => { setForm(f => ({ ...f, tc: tc.valor })); setShowTcHistorial(false) }}
                          style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <strong>${tc.valor}</strong>
                          <span style={{ color: 'var(--text2)' }}>{fmtFecha(tc.fecha)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {form.proveedor_id && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                  Mostrando telas de: <strong style={{ color: 'var(--accent)' }}>
                    {proveedores.find(p => String(p.id) === String(form.proveedor_id))?.nombre}
                  </strong>
                  <span style={{ marginLeft: 8 }}>({telasFiltradas.length} telas)</span>
                </div>
              )}

              {/* Renglones de ítems */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 200 }}>Tela</th>
                      <th style={{ minWidth: 80 }}>Cantidad</th>
                      <th style={{ minWidth: 70 }}>Unidad</th>
                      <th style={{ minWidth: 100 }}>Precio lista</th>
                      <th style={{ minWidth: 70 }}>Moneda</th>
                      <th style={{ minWidth: 100 }}>Total factura</th>
                      <th style={{ minWidth: 90 }}>Dto $</th>
                      <th style={{ minWidth: 80 }}>Dto %</th>
                      <th style={{ minWidth: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const calc = calcItem(item)
                      const subtotal = calc.subtotal
                      return (
                        <tr key={item._key}>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <select
                                value={item.tela_id}
                                onChange={e => {
                                  updateItem(item._key, 'tela_id', e.target.value)
                                  const t = telas.find(t => String(t.id) === e.target.value)
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
                                style={{ padding: '2px 6px', fontSize: 10, whiteSpace: 'nowrap' }}
                                onClick={() => openNuevaTela(item._key)}
                                title="Agregar tela nueva al catálogo"
                              >+ nueva</button>
                            </div>
                          </td>
                          <td>
                            <input type="number" value={item.cantidad}
                              onChange={e => updateItem(item._key, 'cantidad', e.target.value)}
                              placeholder="0.000" style={{ width: 75 }} />
                          </td>
                          <td>
                            <select value={item.unidad} onChange={e => updateItem(item._key, 'unidad', e.target.value)} style={{ width: 65 }}>
                              <option value="kg">kg</option>
                              <option value="m">m</option>
                            </select>
                          </td>
                          <td>
                            <input type="number" value={item.precio_lista}
                              onChange={e => updateItem(item._key, 'precio_lista', e.target.value)}
                              placeholder="0.00" style={{ width: 90 }} />
                          </td>
                          <td>
                            <select value={item.moneda} onChange={e => updateItem(item._key, 'moneda', e.target.value)} style={{ width: 65 }}>
                              <option value="USD">USD</option>
                              <option value="UYU">$UY</option>
                            </select>
                          </td>
                          <td>
                            <input type="number" value={item.total_factura}
                              onChange={e => updateItem(item._key, 'total_factura', e.target.value)}
                              placeholder={subtotal ? fmtNum(subtotal) : '0.00'}
                              style={{ width: 90 }} />
                          </td>
                          <td>
                            <input type="number" value={item.descuento_monto !== '' ? item.descuento_monto : (subtotal && calc.descMonto ? fmtNum(calc.descMonto) : '')}
                              onChange={e => updateItem(item._key, 'descuento_monto', e.target.value)}
                              placeholder="0.00" style={{ width: 80, color: 'var(--success)' }} readOnly={item.total_factura !== ''} />
                          </td>
                          <td>
                            <input type="number" value={item.descuento_pct !== '' ? item.descuento_pct : (subtotal && calc.descPct ? fmtNum(calc.descPct) : '')}
                              onChange={e => updateItem(item._key, 'descuento_pct', e.target.value)}
                              placeholder="0.00" style={{ width: 70, color: 'var(--success)' }} readOnly={item.total_factura !== ''} />
                          </td>
                          <td>
                            <button type="button" className="btn btn-danger btn-sm"
                              onClick={() => setItems(prev => prev.filter(i => i._key !== item._key))}>✕</button>
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
                <label>Notas generales</label>
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
                  <label>Nombre de la tela *</label>
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
