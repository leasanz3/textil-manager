import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtNum = (n) => n != null ? Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
const fmtUYU = (n) => n ? '$' + fmtNum(n) : '—'
const fmtFecha = (f) => { if (!f) return '—'; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}` }

export default function ComprasTela({ onMenuClick }) {
  const [compras, setCompras] = useState([])
  const [telas, setTelas] = useState([])
  const [facturas, setFacturas] = useState([])
  const [tcHistorial, setTcHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showTcHistorial, setShowTcHistorial] = useState(false)

  const emptyForm = { tela_id: '', compra_id: '', cantidad_metros: '', precio_por_metro: '', moneda: 'UYU', tc: '', fecha: new Date().toISOString().split('T')[0], notas: '' }
  const [form, setForm] = useState(emptyForm)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: c }, { data: t }, { data: f }, { data: tc }] = await Promise.all([
      supabase.from('compras_tela').select('*, telas(tipo, color), compras(factura, fecha, proveedor)').order('fecha', { ascending: false }),
      supabase.from('telas').select('id, tipo, color').order('tipo'),
      supabase.from('compras').select('id, factura, fecha, proveedor').order('fecha', { ascending: false }),
      supabase.from('tipos_cambio').select('*').order('fecha', { ascending: false }).limit(10)
    ])
    setCompras(c || [])
    setTelas(t || [])
    setFacturas(f || [])
    setTcHistorial(tc || [])
    setLoading(false)
  }

  async function guardarTC() {
    if (!form.tc) return
    await supabase.from('tipos_cambio').insert({ valor: parseFloat(form.tc), fecha: form.fecha })
    const { data } = await supabase.from('tipos_cambio').select('*').order('fecha', { ascending: false }).limit(10)
    setTcHistorial(data || [])
  }

  function openNew() { setEditing(null); setForm(emptyForm); setModal(true) }
  function openEdit(c) {
    setEditing(c.id)
    setForm({ tela_id: c.tela_id || '', compra_id: c.compra_id || '', cantidad_metros: c.cantidad_metros || '', precio_por_metro: c.precio_por_metro || '', moneda: c.moneda || 'UYU', tc: c.tc || '', fecha: c.fecha || new Date().toISOString().split('T')[0], notas: c.notas || '' })
    setModal(true)
  }

  async function handleSave() {
    if (!form.tela_id || !form.cantidad_metros || !form.precio_por_metro) return alert('Completá tela, cantidad y precio')
    setSaving(true)
    const datos = { tela_id: parseInt(form.tela_id), compra_id: parseInt(form.compra_id) || null, cantidad_metros: parseFloat(form.cantidad_metros), precio_por_metro: parseFloat(form.precio_por_metro), moneda: form.moneda, tc: parseFloat(form.tc) || null, fecha: form.fecha, notas: form.notas || null }
    if (editing) { await supabase.from('compras_tela').update(datos).eq('id', editing) }
    else { await supabase.from('compras_tela').insert(datos) }
    // Actualizar metros en telas
    const { data: existentes } = await supabase.from('compras_tela').select('cantidad_metros').eq('tela_id', datos.tela_id)
    const totalMetros = (existentes || []).reduce((a, x) => a + parseFloat(x.cantidad_metros || 0), 0)
    await supabase.from('telas').update({ metros: totalMetros }).eq('id', datos.tela_id)
    setSaving(false); setModal(false); fetchAll()
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('¿Borrar esta compra de tela?')) return
    await supabase.from('compras_tela').delete().eq('id', id)
    fetchAll()
  }

  const totalMetros = compras.reduce((a, x) => a + parseFloat(x.cantidad_metros || 0), 0)

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
          <div className="stat-card"><div className="stat-value">{compras.length}</div><div className="stat-label">Compras registradas</div></div>
          <div className="stat-card"><div className="stat-value">{fmtNum(totalMetros)} m</div><div className="stat-label">Total metros comprados</div></div>
          <div className="stat-card"><div className="stat-value">{compras.filter(c => c.compra_id).length}</div><div className="stat-label">Vinculadas a factura</div></div>
        </div>

        <div className="table-wrap">
          {loading ? <div className="loading"><div className="spinner" /> Cargando...</div>
          : compras.length === 0 ? <div className="empty-state"><div className="icon">🛒</div><h3>No hay compras de tela</h3><p>Registrá tu primera compra</p></div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Tela</th><th>Factura vinculada</th><th>Fecha</th><th>Cantidad</th><th>Precio/u</th><th>TC</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  {compras.map(c => {
                    const precioBase = c.moneda === 'USD' && c.tc ? c.precio_por_metro * c.tc : c.precio_por_metro
                    const total = c.cantidad_metros * precioBase
                    return (
                      <tr key={c.id} onClick={() => openEdit(c)}>
                        <td><strong>{c.telas?.tipo || '—'}</strong>{c.telas?.color && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{c.telas.color}</div>}</td>
                        <td style={{ fontSize: 11 }}>{c.compras ? <span style={{ color: 'var(--success)' }}>🔗 {c.compras.proveedor}{c.compras.factura ? ` #${c.compras.factura}` : ''}</span> : <span style={{ color: 'var(--text2)' }}>—</span>}</td>
                        <td>{fmtFecha(c.fecha)}</td>
                        <td>{fmtNum(c.cantidad_metros)} m</td>
                        <td>{c.moneda === 'USD' ? `U$D ${fmtNum(c.precio_por_metro)}` : fmtUYU(c.precio_por_metro)}</td>
                        <td style={{ fontSize: 11 }}>{c.tc ? c.tc : '—'}</td>
                        <td><strong>{fmtUYU(total)}</strong></td>
                        <td onClick={e => handleDelete(c.id, e)}><button className="btn btn-danger btn-sm">🗑</button></td>
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
              <h3>{editing ? '✏ Editar compra' : '🛒 Nueva compra de tela'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Tela *</label>
                  <select value={form.tela_id} onChange={e => setF('tela_id', e.target.value)}>
                    <option value="">— Elegir tela —</option>
                    {telas.map(t => <option key={t.id} value={t.id}>{t.tipo}{t.color ? ` · ${t.color}` : ''}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Vincular a factura</label>
                  <select value={form.compra_id} onChange={e => setF('compra_id', e.target.value)}>
                    <option value="">— Sin factura —</option>
                    {facturas.map(f => <option key={f.id} value={f.id}>{f.proveedor}{f.factura ? ` · #${f.factura}` : ''} · {fmtFecha(f.fecha)}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Fecha</label><input type="date" value={form.fecha} onChange={e => setF('fecha', e.target.value)} /></div>
                <div className="form-group"><label>Cantidad (metros)</label><input type="number" value={form.cantidad_metros} onChange={e => setF('cantidad_metros', e.target.value)} placeholder="0.0" /></div>
                <div className="form-group"><label>Moneda</label>
                  <select value={form.moneda} onChange={e => setF('moneda', e.target.value)}>
                    <option value="UYU">$ Pesos UY</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="form-group"><label>Precio por metro</label><input type="number" value={form.precio_por_metro} onChange={e => setF('precio_por_metro', e.target.value)} placeholder="0.00" /></div>

                {form.moneda === 'USD' && (
                  <div className="form-group">
                    <label>Tipo de cambio</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="number" value={form.tc} onChange={e => setF('tc', e.target.value)} placeholder="ej: 42.50" style={{ flex: 1 }} />
                      <button type="button" className="btn btn-secondary btn-sm" onClick={guardarTC} title="Guardar TC en historial">💾</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowTcHistorial(!showTcHistorial)} title="Ver historial">📋</button>
                    </div>
                    {showTcHistorial && tcHistorial.length > 0 && (
                      <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                        {tcHistorial.map(tc => (
                          <div key={tc.id} onClick={() => { setF('tc', tc.valor); setShowTcHistorial(false) }}
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
                )}

                <div className="form-group"><label>Notas</label><input value={form.notas} onChange={e => setF('notas', e.target.value)} placeholder="Observaciones..." /></div>
              </div>

              {form.cantidad_metros && form.precio_por_metro && (
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 10, fontSize: 12 }}>
                  <strong>Total: </strong>
                  {form.moneda === 'USD'
                    ? `U$D ${fmtNum(form.cantidad_metros * form.precio_por_metro)}${form.tc ? ` = ${fmtUYU(form.cantidad_metros * form.precio_por_metro * form.tc)} (TC ${form.tc})` : ''}`
                    : fmtUYU(form.cantidad_metros * form.precio_por_metro)}
                </div>
              )}
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
