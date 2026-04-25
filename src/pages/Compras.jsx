import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtUYU = (n) => n ? '$' + Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
const fmtUSD = (n) => n ? 'U$D ' + Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
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

  const [form, setForm] = useState({
    proveedor_id: '', factura: '', fecha: new Date().toISOString().split('T')[0],
    moneda: 'UYU', total_uyu: '', total_usd: '', dolar_fiscal: '',
    dolar_costeo: '', acredita_iva: true, notas: ''
  })

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

  async function guardarTC() {
    if (!form.dolar_fiscal) return
    await supabase.from('tipos_cambio').insert({ valor: parseFloat(form.dolar_fiscal), fecha: form.fecha })
    const { data } = await supabase.from('tipos_cambio').select('*').order('fecha', { ascending: false }).limit(10)
    setTcHistorial(data || [])
  }

  const calcular = (f) => {
    let totalUYU = 0, totalFinal = 0
    if (f.moneda === 'UYU') {
      totalUYU = parseFloat(f.total_uyu) || 0
      totalFinal = totalUYU
    } else {
      const usd = parseFloat(f.total_usd) || 0
      const fiscal = parseFloat(f.dolar_fiscal) || 0
      const costeo = parseFloat(f.dolar_costeo) || 0
      totalUYU = fiscal ? usd * fiscal : 0
      totalFinal = costeo ? usd * costeo : totalUYU
    }
    const subtotal = totalFinal / 1.22
    const iva = totalFinal - subtotal
    return { totalUYU, totalFinal, subtotal, iva }
  }

  const calc = calcular(form)

  function openNew() {
    setEditing(null)
    setForm({
      proveedor_id: '', factura: '', fecha: new Date().toISOString().split('T')[0],
      moneda: 'UYU', total_uyu: '', total_usd: '', dolar_fiscal: '',
      dolar_costeo: '', acredita_iva: true, notas: ''
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
      dolar_costeo: c.dolar_costeo || '',
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

    const datos = {
      proveedor: prov?.nombre || '',
      proveedor_id: parseInt(form.proveedor_id),
      factura: form.factura,
      fecha: form.fecha,
      moneda: form.moneda,
      total_usd: form.moneda === 'USD' ? parseFloat(form.total_usd) || null : null,
      dolar_fiscal: parseFloat(form.dolar_fiscal) || null,
      dolar_costeo: parseFloat(form.dolar_costeo) || null,
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

  const filtered = compras.filter(c => {
    const q = search.toLowerCase()
    const ms = !q || c.proveedor?.toLowerCase().includes(q) || (c.factura || '').includes(q)
    const mp = !filterProv || String(c.proveedor_id) === filterProv
    return ms && mp
  })

  const totalIVA = filtered.filter(x => x.acredita_iva !== false).reduce((a, x) => a + (x.iva || 0), 0)
  const totalCompras = filtered.reduce((a, x) => a + (x.total_final || x.total_uyu || 0), 0)

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

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
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--accent)', fontSize: 18 }}>{fmtUYU(totalCompras)}</div><div className="stat-label">Total compras</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--success)', fontSize: 18 }}>{fmtUYU(totalIVA)}</div><div className="stat-label">IVA a favor (CF)</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--warning)' }}>{filtered.filter(x => !x.tiene_items).length}</div><div className="stat-label">⚠ Sin items</div></div>
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
                    <th>#</th><th>Proveedor</th><th>Fecha</th><th>Factura</th>
                    <th>Total USD</th><th>$ Fiscal</th><th>Total $UY</th>
                    <th>Total Final</th><th>IVA 22%</th><th>IVA</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(x => (
                    <tr key={x.id} onClick={() => openEdit(x)}>
                      <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{x.id}</td>
                      <td><strong>{x.proveedor}</strong></td>
                      <td>{fmtFecha(x.fecha)}</td>
                      <td>{x.factura || '—'}</td>
                      <td style={{ fontSize: 12 }}>{x.moneda === 'USD' ? fmtUSD(x.total_usd) : '—'}</td>
                      <td style={{ fontSize: 12 }}>{x.dolar_fiscal ? '$' + x.dolar_fiscal : '—'}</td>
                      <td style={{ fontSize: 12 }}>{x.total_uyu ? fmtUYU(x.total_uyu) : '—'}</td>
                      <td><strong>{fmtUYU(x.total_final || x.total_uyu)}</strong></td>
                      <td style={{ color: 'var(--danger)' }}>{fmtUYU(x.iva)}</td>
                      <td>{x.acredita_iva !== false ? <span className="badge badge-green">✓ CF</span> : <span className="badge badge-red">sin IVA</span>}</td>
                      <td onClick={e => { e.stopPropagation(); handleDelete(x.id) }}>
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
                  <input value={form.factura} onChange={e => setF('factura', e.target.value)} placeholder="ej: 29958" />
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
                <div className="form-grid">
                  <div className="form-group">
                    <label>Total USD *</label>
                    <input type="number" value={form.total_usd} onChange={e => setF('total_usd', e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Dólar fiscal (cotización del día)</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="number"
                        value={form.dolar_fiscal}
                        onChange={e => setF('dolar_fiscal', e.target.value)}
                        placeholder="ej: 42.50"
                        style={{ flex: 1 }}
                      />
                      <button type="button" className="btn btn-secondary btn-sm" onClick={guardarTC} title="Guardar TC en historial">💾</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowTcHistorial(!showTcHistorial)} title="Ver historial TC">📋</button>
                    </div>
                    {showTcHistorial && tcHistorial.length > 0 && (
                      <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                        {tcHistorial.map(tc => (
                          <div key={tc.id}
                            onClick={() => { setF('dolar_fiscal', tc.valor); setShowTcHistorial(false) }}
                            style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <strong>${tc.valor}</strong>
                            <span style={{ color: 'var(--text2)' }}>{fmtFecha(tc.fecha)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Dólar costeo (opcional)</label>
                    <input type="number" value={form.dolar_costeo} onChange={e => setF('dolar_costeo', e.target.value)} placeholder="ej: 44.00" />
                  </div>
                </div>
              )}

              {(calc.totalFinal > 0 || calc.totalUYU > 0) && (
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, textAlign: 'center' }}>
                    {[
                      { label: 'Subtotal', value: fmtUYU(calc.subtotal) },
                      { label: 'IVA 22%', value: fmtUYU(calc.iva), color: 'var(--danger)' },
                      { label: 'Total $UY', value: fmtUYU(calc.totalUYU) },
                      { label: 'Total Final', value: fmtUYU(calc.totalFinal), color: 'var(--accent)' },
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
