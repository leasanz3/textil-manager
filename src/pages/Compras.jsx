import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtUYU = (n) => n ? '$' + Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
const fmtUSD = (n) => n ? 'U$D ' + Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
const fmtNum = (n) => n ? Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
const fmtFecha = (f) => { if (!f) return '—'; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}` }

export default function Compras({ onMenuClick }) {
  const [compras, setCompras] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [tcHistorial, setTcHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterProv, setFilterProv] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showTcHistorial, setShowTcHistorial] = useState(false)
  const [sortAsc, setSortAsc] = useState(false)

  // Modal detalle (solo lectura)
  const [detalle, setDetalle] = useState(null)       // factura seleccionada
  const [detalleItems, setDetalleItems] = useState({ telas: [], avios: [] })
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  async function openDetalle(factura) {
    setDetalle(factura)
    setLoadingDetalle(true)
    const [{ data: telas }, { data: avios }] = await Promise.all([
      supabase.from('compras_tela').select('*, telas(tipo, color, unidad)').eq('compra_id', factura.id),
      supabase.from('compras_avios').select('*, avios(nombre, tipo, unidad)').eq('compra_id', factura.id),
    ])
    setDetalleItems({ telas: telas || [], avios: avios || [] })
    setLoadingDetalle(false)
  }

  const [form, setForm] = useState({
    proveedor_id: '', factura: '', fecha: new Date().toISOString().split('T')[0],
    moneda: 'UYU', total_uyu: '', total_usd: '', dolar_fiscal: '',
    total_pagado_uyu: '', acredita_iva: true, notas: ''
  })

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: c }, { data: p }, { data: tc }] = await Promise.all([
      supabase.from('compras').select('*').order('fecha', { ascending: false }),
      supabase.from('proveedores').select('id, nombre').order('nombre'),
      supabase.from('tipos_cambio').select('*').order('fecha', { ascending: false }).limit(10)
    ])
    setCompras(c || [])
    setProveedores(p || [])
    setTcHistorial(tc || [])
    setLoading(false)
  }

  // Calculos
  const calcular = (f) => {
    if (f.moneda === 'UYU') {
      const total = parseFloat(f.total_uyu) || 0
      const subtotal = total / 1.22
      const iva = total - subtotal
      return { totalUYU: total, totalFinal: total, subtotal, iva, dolarPago: null }
    } else {
      const usd = parseFloat(f.total_usd) || 0
      const fiscal = parseFloat(f.dolar_fiscal) || 0
      const totalPagado = parseFloat(f.total_pagado_uyu) || 0
      const dolarPago = usd > 0 && totalPagado > 0 ? totalPagado / usd : null
      const totalParaIVA = fiscal ? usd * fiscal : 0
      const subtotal = totalParaIVA / 1.22
      const iva = totalParaIVA - subtotal
      return {
        totalUYU: totalParaIVA,
        totalFinal: totalPagado || null,
        subtotal,
        iva,
        dolarPago
      }
    }
  }

  const calc = calcular(form)

  // Advertencia fiscal
  const advertenciaFiscal = form.moneda === 'USD' && form.acredita_iva && !form.dolar_fiscal

  function openNew() {
    setEditing(null)
    setForm({
      proveedor_id: '', factura: '', fecha: new Date().toISOString().split('T')[0],
      moneda: 'UYU', total_uyu: '', total_usd: '', dolar_fiscal: '',
      total_pagado_uyu: '', acredita_iva: true, notas: ''
    })
    setError('')
    setShowTcHistorial(false)
    setModal(true)
  }

  function openEdit(c) {
    setEditing(c.id)
    setForm({
      proveedor_id: c.proveedor_id || '',
      factura: c.factura || '',
      fecha: c.fecha || new Date().toISOString().split('T')[0],
      moneda: c.moneda || 'UYU',
      total_uyu: c.moneda === 'UYU' ? (c.total_uyu || '') : '',
      total_usd: c.moneda === 'USD' ? (c.total_usd || '') : '',
      dolar_fiscal: c.dolar_fiscal || '',
      total_pagado_uyu: c.total_final || '',
      acredita_iva: c.acredita_iva !== false,
      notas: c.notas || ''
    })
    setError('')
    setShowTcHistorial(false)
    setModal(true)
  }

  async function handleSave() {
    if (!form.proveedor_id || !form.fecha) { setError('Completá proveedor y fecha'); return }
    const montoOk = form.moneda === 'UYU' ? parseFloat(form.total_uyu) > 0 : parseFloat(form.total_usd) > 0
    if (!montoOk) { setError('Ingresá el monto de la factura'); return }

    setSaving(true)
    const prov = proveedores.find(p => p.id === parseInt(form.proveedor_id))
    const c = calcular(form)

    // Guardar TC de pago automático si hay dolar calculado
    if (c.dolarPago && form.moneda === 'USD') {
      await supabase.from('tipos_cambio').insert({
        valor: c.dolarPago,
        fecha: form.fecha,
        notas: `Factura ${form.factura || ''} - ${prov?.nombre || ''}`
      })
    }

    const datos = {
      proveedor: prov?.nombre || '',
      proveedor_id: parseInt(form.proveedor_id),
      factura: form.factura,
      fecha: form.fecha,
      moneda: form.moneda,
      total_usd: form.moneda === 'USD' ? parseFloat(form.total_usd) || null : null,
      dolar_fiscal: parseFloat(form.dolar_fiscal) || null,
      dolar_costeo: c.dolarPago || null,
      total_uyu: c.totalUYU || null,
      total_final: c.totalFinal || null,
      subtotal: c.subtotal || null,
      iva: c.iva || null,
      acredita_iva: form.acredita_iva,
      notas: form.notas,
      tiene_items: editing ? (compras.find(x => x.id === editing)?.tiene_items || false) : false
    }

    if (editing) {
      await supabase.from('compras').update(datos).eq('id', editing)
    } else {
      // Verificar duplicado: mismo proveedor + mismo número de factura
      if (form.factura?.trim()) {
        const { data: dup } = await supabase
          .from('compras')
          .select('id, fecha')
          .eq('proveedor_id', parseInt(form.proveedor_id))
          .eq('factura', form.factura.trim())
          .limit(1)
        if (dup?.length) {
          const prov = proveedores.find(p => p.id === parseInt(form.proveedor_id))
          setError(`Ya existe una factura ${form.factura.trim()} de ${prov?.nombre || 'ese proveedor'} (${fmtFecha(dup[0].fecha)})`)
          setSaving(false)
          return
        }
      }
      await supabase.from('compras').insert(datos)
    }
    setSaving(false)
    setModal(false)
    fetchAll()
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Borrar esta factura?')) return
    await supabase.from('compras').delete().eq('id', id)
    fetchAll()
  }

  const filtered = compras
    .filter(c => {
      const q = search.toLowerCase()
      const ms = !q || c.proveedor?.toLowerCase().includes(q) || (c.factura || '').includes(q)
      const mp = !filterProv || String(c.proveedor_id) === filterProv
      return ms && mp
    })
    .sort((a, b) => sortAsc
      ? (a.fecha || '').localeCompare(b.fecha || '')
      : (b.fecha || '').localeCompare(a.fecha || '')
    )

  const totalIVA = filtered.filter(x => x.acredita_iva !== false).reduce((a, x) => a + (x.iva || 0), 0)
  const totalCompras = filtered.reduce((a, x) => a + (x.total_final || x.total_uyu || 0), 0)
  const pendientes = filtered.filter(x => x.moneda === 'USD' && !x.total_final).length

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>🧾 Facturas de compra</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nueva factura</button>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">{filtered.length}</div><div className="stat-label">Facturas</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--accent)', fontSize: 18 }}>{fmtUYU(totalCompras)}</div><div className="stat-label">Total pagado $UY</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--success)', fontSize: 18 }}>{fmtUYU(totalIVA)}</div><div className="stat-label">IVA a favor (CF)</div></div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: pendientes > 0 ? 'var(--warning)' : 'var(--text2)' }}>{pendientes}</div>
            <div className="stat-label">⚠ Pendientes de pago</div>
          </div>
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 240 }}>
              <input placeholder="Buscar factura..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={filterProv} onChange={e => setFilterProv(e.target.value)} style={{ width: 160 }}>
              <option value="">Todos los proveedores</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /> Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🧾</div>
              <h3>No hay facturas</h3>
              <p>Registrá tu primera factura de compra</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Proveedor</th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setSortAsc(v => !v)}
                      onMouseEnter={e => { e.currentTarget.style.background = '#ffffcc' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '' }}
                    >Fecha {sortAsc ? '▲' : '▼'}</th>
                    <th>Factura</th>
                    <th>Total USD</th><th>$ Fiscal</th><th>IVA $UY</th>
                    <th>Pagado $UY</th><th>TC pago</th><th>Estado</th><th>IVA</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(x => {
                    const pendiente = x.moneda === 'USD' && !x.total_final
                    const sinFiscal = x.moneda === 'USD' && x.acredita_iva && !x.dolar_fiscal
                    return (
                      <tr key={x.id} onClick={() => openDetalle(x)} style={{ cursor: 'pointer' }}>
                        <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{x.id}</td>
                        <td><strong>{x.proveedor}</strong></td>
                        <td>{fmtFecha(x.fecha)}</td>
                        <td>{x.factura || '—'}</td>
                        <td style={{ fontSize: 12 }}>{x.moneda === 'USD' ? fmtUSD(x.total_usd) : '—'}</td>
                        <td style={{ fontSize: 12 }}>{x.dolar_fiscal ? '$' + fmtNum(x.dolar_fiscal) : sinFiscal ? <span style={{ color: 'var(--warning)' }}>⚠ falta</span> : '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--danger)' }}>{fmtUYU(x.iva)}</td>
                        <td><strong>{x.total_final ? fmtUYU(x.total_final) : <span style={{ color: 'var(--warning)' }}>—</span>}</strong></td>
                        <td style={{ fontSize: 11 }}>{x.dolar_costeo ? '$' + fmtNum(x.dolar_costeo) : '—'}</td>
                        <td>
                          {pendiente
                            ? <span className="badge badge-yellow">⚠ Pendiente</span>
                            : <span className="badge badge-green">✓ Cerrada</span>}
                        </td>
                        <td>
                          {x.acredita_iva !== false
                            ? <span className="badge badge-green">✓ CF</span>
                            : <span className="badge badge-red">sin IVA</span>}
                        </td>
                        <td onClick={e => { e.stopPropagation(); handleDelete(x.id) }}>
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
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>🧾 Factura {detalle.factura || '#' + detalle.id}</h3>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{detalle.proveedor} · {fmtFecha(detalle.fecha)}</div>
              </div>
              <button className="close-btn" onClick={() => setDetalle(null)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Datos de la factura */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Proveedor',    value: detalle.proveedor },
                  { label: 'N° Factura',   value: detalle.factura || '—' },
                  { label: 'Fecha',        value: fmtFecha(detalle.fecha) },
                  { label: 'Moneda',       value: detalle.moneda || '—' },
                  { label: 'Total USD',    value: detalle.moneda === 'USD' ? fmtUSD(detalle.total_usd) : '—' },
                  { label: '$ Fiscal',     value: detalle.dolar_fiscal ? '$' + fmtNum(detalle.dolar_fiscal) : '—' },
                  { label: 'IVA a favor',  value: fmtUYU(detalle.iva), color: 'var(--danger)' },
                  { label: 'Total pagado', value: detalle.total_final ? fmtUYU(detalle.total_final) : '—', color: 'var(--accent)' },
                  { label: 'TC pago',      value: detalle.dolar_costeo ? '$' + fmtNum(detalle.dolar_costeo) : '—' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', padding: '8px 12px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: color || 'var(--text)' }}>{value}</div>
                  </div>
                ))}
              </div>

              {detalle.notas && (
                <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic', marginBottom: 16, padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                  📝 {detalle.notas}
                </div>
              )}

              {/* Items vinculados */}
              {loadingDetalle ? (
                <div className="loading"><div className="spinner" /> Cargando items…</div>
              ) : (
                <>
                  {/* Telas */}
                  {detalleItems.telas.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text2)', padding: '4px 0 6px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                        🧶 Telas ({detalleItems.telas.length})
                      </div>
                      <table style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Tela</th><th>Color</th><th style={{ textAlign: 'right' }}>Cantidad</th><th>Unidad</th><th style={{ textAlign: 'right' }}>Precio lista</th><th style={{ textAlign: 'right' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalleItems.telas.map(t => (
                            <tr key={t.id}>
                              <td><strong>{t.telas?.tipo || '—'}</strong></td>
                              <td>{t.telas?.color || '—'}</td>
                              <td style={{ textAlign: 'right' }}>{fmtNum(t.cantidad)}</td>
                              <td>{t.telas?.unidad || t.unidad || '—'}</td>
                              <td style={{ textAlign: 'right' }}>{t.precio_lista ? (t.moneda === 'USD' ? fmtUSD(t.precio_lista) : fmtUYU(t.precio_lista)) : '—'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                {t.precio_lista && t.cantidad ? (t.moneda === 'USD' ? fmtUSD(t.precio_lista * t.cantidad) : fmtUYU(t.precio_lista * t.cantidad)) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Avios */}
                  {detalleItems.avios.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text2)', padding: '4px 0 6px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                        🪡 Avíos ({detalleItems.avios.length})
                      </div>
                      <table style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Artículo</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Cantidad</th><th>Unidad</th><th style={{ textAlign: 'right' }}>Precio lista</th><th style={{ textAlign: 'right' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalleItems.avios.map(a => (
                            <tr key={a.id}>
                              <td><strong>{a.avios?.nombre || '—'}</strong></td>
                              <td>{a.avios?.tipo || '—'}</td>
                              <td style={{ textAlign: 'right' }}>{fmtNum(a.cantidad)}</td>
                              <td>{a.avios?.unidad || a.unidad || '—'}</td>
                              <td style={{ textAlign: 'right' }}>{a.precio_lista ? (a.moneda === 'USD' ? fmtUSD(a.precio_lista) : fmtUYU(a.precio_lista)) : '—'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                {a.precio_lista && a.cantidad ? (a.moneda === 'USD' ? fmtUSD(a.precio_lista * a.cantidad) : fmtUYU(a.precio_lista * a.cantidad)) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {detalleItems.telas.length === 0 && detalleItems.avios.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                      Sin telas ni avíos vinculados a esta factura.
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetalle(null)}>Cerrar</button>
              <button className="btn btn-primary" onClick={() => { setDetalle(null); openEdit(detalle) }}>✏ Editar factura</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏ Editar factura' : '🧾 Nueva factura de compra'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Proveedor *</label>
                  <select value={form.proveedor_id} onChange={e => setF('proveedor_id', e.target.value)}>
                    <option value="">— Elegir —</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>N° Factura</label>
                  <input value={form.factura} onChange={e => setF('factura', e.target.value)} placeholder="ej: 651576" />
                </div>
                <div className="form-group">
                  <label>Fecha *</label>
                  <input type="date" value={form.fecha} onChange={e => setF('fecha', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Moneda</label>
                  <select value={form.moneda} onChange={e => setF('moneda', e.target.value)}>
                    <option value="UYU">$ Pesos uruguayos</option>
                    <option value="USD">USD Dólares</option>
                  </select>
                </div>
              </div>

              {form.moneda === 'UYU' ? (
                <div className="form-group">
                  <label>Total $UY (con IVA incluido) *</label>
                  <input type="number" value={form.total_uyu} onChange={e => setF('total_uyu', e.target.value)} placeholder="0.00" />
                </div>
              ) : (
                <>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Total USD * (de la factura)</label>
                      <input type="number" value={form.total_usd} onChange={e => setF('total_usd', e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="form-group">
                      <label>
                        Dólar fiscal
                        {advertenciaFiscal && <span style={{ color: 'var(--warning)', marginLeft: 6, fontSize: 11 }}>⚠ necesario para IVA</span>}
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={form.dolar_fiscal} onChange={e => setF('dolar_fiscal', e.target.value)} placeholder="cotización del día" style={{ flex: 1 }} />
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowTcHistorial(!showTcHistorial)} title="Ver historial TC">📋</button>
                      </div>
                      {showTcHistorial && tcHistorial.length > 0 && (
                        <div style={{ marginTop: 4, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                          {tcHistorial.map(tc => (
                            <div key={tc.id}
                              onClick={() => { setF('dolar_fiscal', tc.valor); setShowTcHistorial(false) }}
                              style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                              onMouseLeave={e => e.currentTarget.style.background = ''}>
                              <strong>${tc.valor}</strong>
                              <span style={{ color: 'var(--text2)' }}>{fmtFecha(tc.fecha)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {form.dolar_fiscal && form.total_usd && (
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                          IVA base: {fmtUYU(parseFloat(form.total_usd) * parseFloat(form.dolar_fiscal))}
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Total pagado en pesos <span style={{ fontSize: 11, color: 'var(--text2)' }}>(completar al pagar)</span></label>
                      <input type="number" value={form.total_pagado_uyu} onChange={e => setF('total_pagado_uyu', e.target.value)} placeholder="dejá vacío si aún no pagaste" />
                      {calc.dolarPago && (
                        <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>
                          ✓ TC de pago: ${fmtNum(calc.dolarPago)} — se guardará en historial
                        </div>
                      )}
                    </div>
                  </div>

                  {(calc.totalUYU > 0 || calc.totalFinal > 0) && (
                    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, textAlign: 'center' }}>
                        {[
                          { label: 'Base IVA ($UY fiscal)', value: fmtUYU(calc.totalUYU) },
                          { label: 'IVA 22% a favor', value: fmtUYU(calc.iva), color: 'var(--danger)' },
                          { label: 'TC pago', value: calc.dolarPago ? '$' + fmtNum(calc.dolarPago) : '—' },
                          { label: 'Total pagado $UY', value: calc.totalFinal ? fmtUYU(calc.totalFinal) : <span style={{ color: 'var(--warning)' }}>Pendiente</span>, color: 'var(--accent)' },
                        ].map(({ label, value, color }) => (
                          <div key={label}>
                            <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 2 }}>{label}</div>
                            <div style={{ fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {form.moneda === 'UYU' && calc.totalFinal > 0 && (
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, textAlign: 'center' }}>
                    {[
                      { label: 'Subtotal', value: fmtUYU(calc.subtotal) },
                      { label: 'IVA 22%', value: fmtUYU(calc.iva), color: 'var(--danger)' },
                      { label: 'Total', value: fmtUYU(calc.totalFinal), color: 'var(--accent)' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--border)', marginBottom: 12 }}>
                <input type="checkbox" id="acredita" checked={form.acredita_iva} onChange={e => setF('acredita_iva', e.target.checked)} style={{ width: 16, height: 16 }} />
                <label htmlFor="acredita" style={{ fontSize: 13, fontWeight: 600, textTransform: 'none', letterSpacing: 0, cursor: 'pointer', color: 'var(--text)' }}>
                  Esta factura acredita IVA a favor (CF)
                </label>
                <span style={{ fontSize: 11, color: 'var(--text2)' }}>Destildá para Mercado Libre, tickets, importaciones</span>
              </div>

              <div className="form-group">
                <label>Notas</label>
                <input value={form.notas} onChange={e => setF('notas', e.target.value)} placeholder="Observaciones..." />
              </div>

              {error && <p style={{ color: 'var(--danger)', fontSize: 12 }}>⚠ {error}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : '✔ Guardar factura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
