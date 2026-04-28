import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtNum = (n) => n != null ? Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
const fmtUYU = (n) => n ? '$' + fmtNum(n) : '—'
const fmtUSD = (n) => n ? 'U$D ' + fmtNum(n) : '—'
const fmtFecha = (f) => { if (!f) return '—'; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}` }

const emptyItem = () => ({
  _key: Math.random(),
  avio_id: '', cantidad: '', unidad: 'unidad',
  precio_lista: '', moneda: 'UYU',
  total_factura: '', notas: ''
})

export default function ComprasAvios({ onMenuClick }) {
  const [compras, setCompras] = useState([])
  const [avios, setAvios] = useState([])
  const [facturas, setFacturas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [modalCatalogo, setModalCatalogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingItemKey, setEditingItemKey] = useState(null)

  const [form, setForm] = useState({
    compra_id: '', proveedor_id: '', fecha: new Date().toISOString().split('T')[0], tc: '', notas: ''
  })
  const [items, setItems] = useState([emptyItem()])
  const [avioForm, setAvioForm] = useState({ nombre: '', tipo: '', codigo: '', unidad: 'unidad', descripcion: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: c }, { data: a }, { data: f }, { data: p }] = await Promise.all([
      supabase.from('compras_avios').select('*, avios(nombre, tipo, unidad), compras(factura, fecha, proveedor)').order('created_at', { ascending: false }),
      supabase.from('avios').select('id, nombre, tipo, unidad, proveedor_id, precio, moneda').order('nombre'),
      supabase.from('compras').select('id, factura, fecha, proveedor, proveedor_id, dolar_costeo, moneda').order('fecha', { ascending: false }),
      supabase.from('proveedores').select('id, nombre').order('nombre')
    ])
    setCompras(c || [])
    setAvios(a || [])
    setFacturas(f || [])
    setProveedores(p || [])
    setLoading(false)
  }

  const aviosFiltrados = form.proveedor_id
    ? avios.filter(a => String(a.proveedor_id) === String(form.proveedor_id))
    : avios

  function onFacturaChange(compraId) {
    const factura = facturas.find(f => f.id === parseInt(compraId))
    setForm(f => ({
      ...f,
      compra_id: compraId,
      proveedor_id: factura?.proveedor_id ? String(factura.proveedor_id) : f.proveedor_id,
      fecha: factura?.fecha || f.fecha,
      tc: factura?.dolar_costeo ? String(factura.dolar_costeo) : f.tc
    }))
    if (factura?.moneda === 'USD') {
      setItems(prev => prev.map(i => ({ ...i, moneda: 'USD' })))
    } else if (factura?.moneda === 'UYU') {
      setItems(prev => prev.map(i => ({ ...i, moneda: 'UYU' })))
    }
  }

  function calcItem(item) {
    const cantidad = parseFloat(item.cantidad) || 0
    const precioLista = parseFloat(item.precio_lista) || 0
    const subtotal = cantidad * precioLista
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
      if (field === 'cantidad' || field === 'precio_lista') {
        updated.total_factura = ''
      }
      return updated
    }))
  }

  function openNew() {
    setEditingId(null)
    setForm({ compra_id: '', proveedor_id: '', fecha: new Date().toISOString().split('T')[0], tc: '', notas: '' })
    setItems([emptyItem()])
    setModal(true)
  }

  function openEdit(c) {
    setEditingId(c.id)
    const factura = facturas.find(f => f.id === c.compra_id)
    setForm({
      compra_id: c.compra_id ? String(c.compra_id) : '',
      proveedor_id: factura?.proveedor_id ? String(factura.proveedor_id) : '',
      fecha: c.fecha || new Date().toISOString().split('T')[0],
      tc: c.tc ? String(c.tc) : '',
      notas: c.notas || ''
    })
    setItems([{
      _key: Math.random(),
      avio_id: c.avio_id ? String(c.avio_id) : '',
      cantidad: c.cantidad || '',
      unidad: c.unidad || 'unidad',
      precio_lista: c.precio_lista || '',
      moneda: c.moneda || 'UYU',
      total_factura: c.total_factura || '',
      notas: c.notas || ''
    }])
    setModal(true)
  }

  function openNuevoAvio(itemKey) {
    const factura = facturas.find(f => f.id === parseInt(form.compra_id))
    setAvioForm({ nombre: '', tipo: '', codigo: '', unidad: 'unidad', descripcion: '', proveedor_id: form.proveedor_id || '', proveedor_nombre: factura?.proveedor || '' })
    setEditingItemKey(itemKey)
    setModalCatalogo(true)
  }

  async function handleGuardarAvio() {
    if (!avioForm.nombre) return alert('El nombre del avío es obligatorio')
    const { data: nuevo } = await supabase.from('avios').insert({
      nombre: avioForm.nombre,
      tipo: avioForm.tipo || null,
      codigo: avioForm.codigo || null,
      descripcion: avioForm.descripcion || null,
      unidad: avioForm.unidad,
      proveedor_id: parseInt(avioForm.proveedor_id) || null,
      proveedor: avioForm.proveedor_nombre || null,
    }).select().single()
    if (nuevo) {
      setAvios(prev => [...prev, nuevo])
      updateItem(editingItemKey, 'avio_id', String(nuevo.id))
      updateItem(editingItemKey, 'unidad', nuevo.unidad || 'unidad')
    }
    setModalCatalogo(false)
  }

  async function handleSave() {
    if (!form.compra_id) return alert('Elegí una factura')
    const itemsValidos = items.filter(i => i.avio_id && i.cantidad && i.precio_lista)
    if (itemsValidos.length === 0) return alert('Completá al menos un renglón con avío, cantidad y precio')

    setSaving(true)

    if (editingId) {
      const item = itemsValidos[0]
      const calc = calcItem(item)
      await supabase.from('compras_avios').update({
        avio_id: parseInt(item.avio_id),
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
      }).eq('id', editingId)

      await supabase.from('avios').update({
        precio: parseFloat(item.precio_lista),
        moneda: item.moneda
      }).eq('id', parseInt(item.avio_id))

    } else {
      for (const item of itemsValidos) {
        const calc = calcItem(item)
        await supabase.from('compras_avios').insert({
          avio_id: parseInt(item.avio_id),
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

        await supabase.from('avios').update({
          precio: parseFloat(item.precio_lista),
          moneda: item.moneda
        }).eq('id', parseInt(item.avio_id))
      }
    }

    setSaving(false)
    setModal(false)
    fetchAll()
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('¿Borrar esta compra de avío?')) return
    await supabase.from('compras_avios').delete().eq('id', id)
    fetchAll()
  }

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>🛒 Compras de Avíos</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nueva compra</button>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">{compras.length}</div><div className="stat-label">Ítems comprados</div></div>
          <div className="stat-card"><div className="stat-value">{compras.filter(c => c.compra_id).length}</div><div className="stat-label">Vinculados a factura</div></div>
        </div>

        <div className="table-wrap">
          {loading ? <div className="loading"><div className="spinner" /> Cargando...</div>
          : compras.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🧵</div>
              <h3>No hay compras de avíos registradas</h3>
              <p>Registrá tu primera compra con el botón de arriba</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Avío</th><th>Factura</th><th>Fecha</th>
                    <th>Cantidad</th><th>Precio lista</th><th>Descuento</th>
                    <th>Total</th><th>TC</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {compras.map(c => (
                    <tr key={c.id} onClick={() => openEdit(c)} style={{ cursor: 'pointer' }}>
                      <td>
                        <strong>{c.avios?.nombre || '—'}</strong>
                        {c.avios?.tipo && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{c.avios.tipo}</div>}
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

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 960 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? '✏ Editar compra de avío' : '🛒 Nueva compra de avíos'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
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
                  <label>TC de pago{form.tc && <span style={{ fontSize: 11, color: 'var(--success)', marginLeft: 6 }}>✓ de la factura</span>}</label>
                  <input type="number" value={form.tc} onChange={e => setForm(f => ({ ...f, tc: e.target.value }))} placeholder="se completa solo si la factura tiene TC" />
                </div>
              </div>

              {form.proveedor_id && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                  Avíos de: <strong style={{ color: 'var(--accent)' }}>
                    {proveedores.find(p => String(p.id) === String(form.proveedor_id))?.nombre}
                  </strong>
                  <span style={{ marginLeft: 8 }}>({aviosFiltrados.length} avíos)</span>
                </div>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 220 }}>Avío</th>
                      <th style={{ minWidth: 80 }}>Cantidad</th>
                      <th style={{ minWidth: 80 }}>Unidad</th>
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
                                value={item.avio_id}
                                onChange={e => {
                                  const a = avios.find(a => String(a.id) === e.target.value)
                                  updateItem(item._key, 'avio_id', e.target.value)
                                  if (a) {
                                    updateItem(item._key, 'unidad', a.unidad || 'unidad')
                                    if (a.moneda) updateItem(item._key, 'moneda', a.moneda)
                                  }
                                }}
                                style={{ flex: 1, fontSize: 11 }}
                              >
                                <option value="">— Elegir —</option>
                                {aviosFiltrados.map(a => (
                                  <option key={a.id} value={a.id}>{a.nombre}{a.tipo ? ` · ${a.tipo}` : ''}</option>
                                ))}
                              </select>
                              {!editingId && (
                                <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => openNuevoAvio(item._key)}>+ nuevo</button>
                              )}
                            </div>
                          </td>
                          <td><input type="number" value={item.cantidad} onChange={e => updateItem(item._key, 'cantidad', e.target.value)} placeholder="0" style={{ width: 75 }} /></td>
                          <td><input value={item.unidad} onChange={e => updateItem(item._key, 'unidad', e.target.value)} style={{ width: 70 }} /></td>
                          <td><input type="number" value={item.precio_lista} onChange={e => updateItem(item._key, 'precio_lista', e.target.value)} placeholder="0.00" style={{ width: 90 }} /></td>
                          <td>
                            <select value={item.moneda} onChange={e => updateItem(item._key, 'moneda', e.target.value)} style={{ width: 60 }}>
                              <option value="UYU">$UY</option>
                              <option value="USD">USD</option>
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
                          <td><input type="number" value={tieneDescuento ? calc.descMonto.toFixed(2) : ''} readOnly placeholder="0.00" style={{ width: 80, color: 'var(--success)', background: 'transparent' }} /></td>
                          <td><input type="number" value={tieneDescuento ? calc.descPct.toFixed(2) : ''} readOnly placeholder="0.00" style={{ width: 70, color: 'var(--success)', background: 'transparent' }} /></td>
                          <td>
                            {!editingId && (
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => setItems(prev => prev.filter(i => i._key !== item._key))}>✕</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {!editingId && (
                <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={() => setItems(prev => [...prev, emptyItem()])}>
                  + Agregar renglón
                </button>
              )}

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Notas</label>
                <input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observaciones..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editingId ? '✔ Guardar cambios' : '✔ Guardar compra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCatalogo && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setModalCatalogo(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🧵 Nuevo avío al catálogo</h3>
              <button className="close-btn" onClick={() => setModalCatalogo(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                Proveedor: <strong>{avioForm.proveedor_nombre || '—'}</strong>
              </div>
              <div className="form-grid">
                <div className="form-group"><label>Nombre *</label><input value={avioForm.nombre} onChange={e => setAvioForm(f => ({ ...f, nombre: e.target.value }))} placeholder="ej: Elástico 2cm" autoFocus /></div>
                <div className="form-group"><label>Tipo</label><input value={avioForm.tipo} onChange={e => setAvioForm(f => ({ ...f, tipo: e.target.value }))} placeholder="ej: Elástico, Botón" /></div>
                <div className="form-group"><label>Descripción</label><input value={avioForm.descripcion} onChange={e => setAvioForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="ej: Blanco, 2cm" /></div>
                <div className="form-group">
                  <label>Unidad</label>
                  <select value={avioForm.unidad} onChange={e => setAvioForm(f => ({ ...f, unidad: e.target.value }))}>
                    {['unidad', 'm', 'cm', 'kg', 'g', 'rollo', 'docena', 'caja'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Código (opcional)</label><input value={avioForm.codigo} onChange={e => setAvioForm(f => ({ ...f, codigo: e.target.value }))} placeholder="opcional" /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalCatalogo(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardarAvio}>✔ Guardar y seleccionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
