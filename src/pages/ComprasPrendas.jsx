import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtNum  = n => n != null ? Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
const fmtUYU  = n => n ? '$' + fmtNum(n) : '—'
const fmtFecha = f => { if (!f) return '—'; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}` }
const today    = () => new Date().toISOString().slice(0, 10)

export default function ComprasPrendas({ onMenuClick }) {
  const [compras,   setCompras]   = useState([])
  const [catalogo,  setCatalogo]  = useState([])
  const [facturas,  setFacturas]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [saving,    setSaving]    = useState(false)

  const [facturaId, setFacturaId] = useState('')
  const [fecha,     setFecha]     = useState(today())
  const [notas,     setNotas]     = useState('')
  const emptyItem = () => ({ _key: Math.random(), prenda_id: '', cantidades: {}, precio_unit: '' })
  const [items, setItems] = useState([emptyItem()])

  const [search, setSearch] = useState('')
  const [facturaDetalle,  setFacturaDetalle]  = useState(null)
  const [facturaItems,    setFacturaItems]    = useState([])
  const [loadingFactura,  setLoadingFactura]  = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: cat }, { data: comp }, { data: fact }] = await Promise.all([
      supabase.from('prendas_catalogo').select('*').order('nombre'),
      supabase.from('prendas_compras').select('*, prendas_catalogo(nombre)').order('fecha', { ascending: false }),
      supabase.from('compras').select('id, factura, proveedor, fecha').order('fecha', { ascending: false }).limit(100),
    ])
    setCatalogo(cat || [])
    setCompras(comp || [])
    setFacturas(fact || [])
    setLoading(false)
  }

  function openNew() {
    setFacturaId(''); setFecha(today()); setNotas(''); setItems([emptyItem()])
    setModal(true)
  }

  function updItem(key, field, val) {
    setItems(prev => prev.map(i => i._key !== key ? i : { ...i, [field]: val }))
  }

  function updCant(key, talle, val) {
    setItems(prev => prev.map(i => i._key !== key ? i : { ...i, cantidades: { ...i.cantidades, [talle]: val } }))
  }

  async function handleSave() {
    if (!facturaId) { alert('Elegí una factura'); return }
    const validos = items.filter(i => {
      if (!i.prenda_id) return false
      return Object.values(i.cantidades).some(v => parseInt(v) > 0)
    })
    if (validos.length === 0) { alert('Completá al menos un renglón con prenda y cantidades'); return }
    setSaving(true)
    for (const item of validos) {
      const cant = {}
      Object.entries(item.cantidades).forEach(([t, v]) => { if (parseInt(v) > 0) cant[t] = parseInt(v) })
      await supabase.from('prendas_compras').insert({
        prenda_id:  parseInt(item.prenda_id),
        factura_id: parseInt(facturaId),
        fecha, precio_unit: parseFloat(item.precio_unit) || null,
        cantidades: cant, notas: notas || null,
      })
    }
    setSaving(false)
    setModal(false)
    fetchAll()
  }

  async function openFactura(e, facturaId) {
    e.stopPropagation()
    if (!facturaId) return
    const fac = facturas.find(f => f.id === facturaId)
    if (!fac) return
    setFacturaDetalle(fac)
    setLoadingFactura(true)
    const { data } = await supabase
      .from('prendas_compras')
      .select('*, prendas_catalogo(nombre)')
      .eq('factura_id', facturaId)
    setFacturaItems(data || [])
    setLoadingFactura(false)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('¿Eliminar esta compra?')) return
    await supabase.from('prendas_compras').delete().eq('id', id)
    fetchAll()
  }

  const comprasFiltradas = compras.filter(c => {
    const q = search.toLowerCase()
    return !q || (c.prendas_catalogo?.nombre || '').toLowerCase().includes(q)
  })

  const totalUds = compras.reduce((a, c) =>
    a + Object.values(c.cantidades || {}).reduce((s, v) => s + (parseInt(v) || 0), 0), 0)

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>👕 Compras de Prendas</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nueva compra</button>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">{compras.length}</div><div className="stat-label">Compras registradas</div></div>
          <div className="stat-card"><div className="stat-value">{totalUds}</div><div className="stat-label">Total unidades</div></div>
          <div className="stat-card"><div className="stat-value">{compras.filter(c => c.factura_id).length}</div><div className="stat-label">Vinculadas a factura</div></div>
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 240 }}>
              <input placeholder="Buscar prenda..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /> Cargando...</div>
          ) : compras.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👕</div>
              <h3>No hay compras de prendas registradas</h3>
              <p>Registrá tu primera compra con el botón de arriba</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Prenda</th>
                    <th>Factura</th>
                    <th>Cantidades por talle</th>
                    <th style={{ textAlign: 'right' }}>Unidades</th>
                    <th style={{ textAlign: 'right' }}>Precio unit.</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th>Notas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {comprasFiltradas.map(c => {
                    const uds   = Object.values(c.cantidades || {}).reduce((a, v) => a + (parseInt(v) || 0), 0)
                    const total = uds * (parseFloat(c.precio_unit) || 0)
                    return (
                      <tr key={c.id}>
                        <td>{fmtFecha(c.fecha)}</td>
                        <td><strong>{c.prendas_catalogo?.nombre || '—'}</strong></td>
                        <td style={{ fontSize: 11 }} onClick={e => openFactura(e, c.factura_id)}>
                          {(() => {
                            const fac = facturas.find(f => f.id === c.factura_id)
                            return fac
                              ? <span style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>
                                  {fac.proveedor}{fac.factura ? ` · #${fac.factura}` : ''}
                                </span>
                              : <span style={{ color: 'var(--text2)' }}>—</span>
                          })()}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text2)' }}>
                          {(() => {
                            const pr = catalogo.find(p => p.id === c.prenda_id)
                            const equiv = pr?.talles_equiv || []
                            return Object.entries(c.cantidades || {}).map(([t, v]) => {
                              const eq = equiv.find(e => e.prov === t)
                              return eq ? `${t}→${eq.mio}: ${v}` : `${t}: ${v}`
                            }).join(' · ')
                          })()}
                        </td>
                        <td style={{ textAlign: 'right' }}>{uds}</td>
                        <td style={{ textAlign: 'right' }}>{c.precio_unit ? fmtUYU(c.precio_unit) : '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{total > 0 ? fmtUYU(total) : '—'}</td>
                        <td style={{ fontSize: 11, color: 'var(--text2)' }}>{c.notas || '—'}</td>
                        <td onClick={e => handleDelete(c.id, e)}>
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

      {facturaDetalle && (
        <div className="modal-overlay" onClick={() => setFacturaDetalle(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>🧾 Factura {facturaDetalle.factura ? `#${facturaDetalle.factura}` : ''}</h3>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                  {facturaDetalle.proveedor} · {fmtFecha(facturaDetalle.fecha)}
                </div>
              </div>
              <button className="close-btn" onClick={() => setFacturaDetalle(null)}>✕</button>
            </div>
            <div className="modal-body">
              {loadingFactura ? (
                <div className="loading"><div className="spinner" /> Cargando...</div>
              ) : facturaItems.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic', textAlign: 'center', padding: 16 }}>Sin ítems vinculados.</div>
              ) : (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text2)', borderBottom: '1px solid var(--border)', padding: '4px 0 6px', marginBottom: 6 }}>
                    👕 Prendas ({facturaItems.length})
                  </div>
                  <table style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Prenda</th>
                        <th>Cantidades por talle</th>
                        <th style={{ textAlign: 'right' }}>Unidades</th>
                        <th style={{ textAlign: 'right' }}>Precio unit.</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturaItems.map(item => {
                        const uds   = Object.values(item.cantidades || {}).reduce((a, v) => a + (parseInt(v) || 0), 0)
                        const total = uds * (parseFloat(item.precio_unit) || 0)
                        return (
                          <tr key={item.id}>
                            <td><strong>{item.prendas_catalogo?.nombre || '—'}</strong></td>
                            <td style={{ fontSize: 11, color: 'var(--text2)' }}>
                              {(() => {
                                const pr = catalogo.find(p => p.id === item.prenda_id)
                                const equiv = pr?.talles_equiv || []
                                return Object.entries(item.cantidades || {}).map(([t, v]) => {
                                  const eq = equiv.find(e => e.prov === t)
                                  return eq ? `${t}→${eq.mio}: ${v}` : `${t}: ${v}`
                                }).join(' · ')
                              })()}
                            </td>
                            <td style={{ textAlign: 'right' }}>{uds}</td>
                            <td style={{ textAlign: 'right', fontSize: 11 }}>{item.precio_unit ? fmtUYU(item.precio_unit) : '—'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{total > 0 ? fmtUYU(total) : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setFacturaDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 960 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👕 Nueva compra de prendas</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label>Factura de compra *</label>
                  <select value={facturaId} onChange={e => {
                    const f = facturas.find(f => f.id === parseInt(e.target.value))
                    setFacturaId(e.target.value)
                    if (f?.fecha) setFecha(f.fecha)
                  }}>
                    <option value="">— Elegir factura —</option>
                    {facturas.map(f => <option key={f.id} value={f.id}>{f.proveedor}{f.factura ? ` · #${f.factura}` : ''} · {fmtFecha(f.fecha)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 200 }}>Prenda</th>
                      <th style={{ minWidth: 260 }}>Cantidades por talle (proveedor → mío)</th>
                      <th style={{ minWidth: 90 }}>Precio unit.</th>
                      <th style={{ minWidth: 80, textAlign: 'right' }}>Total u.</th>
                      <th style={{ minWidth: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const prenda  = catalogo.find(p => p.id === parseInt(item.prenda_id))
                      const talles  = prenda ? (prenda.talles_equiv || []) : []
                      const totalUds = Object.values(item.cantidades).reduce((a, v) => a + (parseInt(v) || 0), 0)
                      const totalImp = totalUds * (parseFloat(item.precio_unit) || 0)
                      return (
                        <tr key={item._key}>
                          <td>
                            <select value={item.prenda_id} onChange={e => updItem(item._key, 'prenda_id', e.target.value)} style={{ fontSize: 11, width: '100%' }}>
                              <option value="">— Elegir —</option>
                              {catalogo.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                          </td>
                          <td>
                            {!prenda ? (
                              <span style={{ color: 'var(--text2)', fontSize: 11 }}>elegir prenda primero</span>
                            ) : talles.length === 0 ? (
                              <span style={{ color: 'var(--danger)', fontSize: 11 }}>⚠ Sin talles en catálogo</span>
                            ) : (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {talles.map(eq => (
                                  <div key={eq.prov} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{eq.prov}→{eq.mio}</span>
                                    <input
                                      type="number" min="0"
                                      style={{ width: 48, textAlign: 'center' }}
                                      value={item.cantidades[eq.prov] || ''}
                                      onChange={e => updCant(item._key, eq.prov, e.target.value)}
                                      placeholder="0"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            <input type="number" value={item.precio_unit} onChange={e => updItem(item._key, 'precio_unit', e.target.value)} placeholder="0.00" style={{ width: 80 }} />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {totalUds > 0 && <div style={{ fontWeight: 700 }}>{totalUds} u.</div>}
                            {totalImp > 0 && <div style={{ color: 'var(--success)', fontSize: 11 }}>{fmtUYU(totalImp)}</div>}
                          </td>
                          <td>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => setItems(prev => prev.filter(i => i._key !== item._key))}>✕</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 10, marginBottom: 14 }} onClick={() => setItems(prev => [...prev, emptyItem()])}>
                + Agregar renglón
              </button>

              <div className="form-group">
                <label>Notas</label>
                <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones..." />
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
    </div>
  )
}
