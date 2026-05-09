import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtNum = (n) => n != null ? Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
const fmtFecha = (f) => { if (!f) return '—'; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}` }

export default function StockTela({ onMenuClick }) {
  const [telas, setTelas] = useState([])
  const [comprasTela, setComprasTela] = useState([])
  const [rendimientos, setRendimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('fecha')
  const [sortDir, setSortDir] = useState('desc')
  const [modal, setModal] = useState(false)
  const [editingTela, setEditingTela] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('stock') // 'stock' | 'rendimiento'

  const [stockForm, setStockForm] = useState({
    metros_iniciales: '', stock_metros: ''
  })

  const [rendForm, setRendForm] = useState({
    kg: '', metros: '', fecha: new Date().toISOString().split('T')[0], notas: ''
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: t }, { data: c }, { data: r }] = await Promise.all([
      supabase.from('telas').select('*').order('tipo'),
      supabase.from('compras_tela').select('tela_id, cantidad, unidad, compra_id, fecha').order('fecha', { ascending: false }),
      supabase.from('rendimientos_tela').select('*').order('fecha', { ascending: false })
    ])
    setTelas(t || [])
    setComprasTela(c || [])
    setRendimientos(r || [])
    setLoading(false)
  }

  // Ultima compra de cada tela
  function ultimaCompra(telaId) {
    return comprasTela.find(c => c.tela_id === telaId)
  }

  // Telas que tienen al menos una compra O tienen stock manual
  const telasConMovimiento = telas.filter(t => {
    const tieneCompra = comprasTela.some(c => c.tela_id === t.id)
    const tieneStock = t.stock_metros != null || t.metros_iniciales != null
    return tieneCompra || tieneStock
  })

  // Rendimiento promedio real
  function rendPromedio(telaId) {
    const rends = rendimientos.filter(r => r.tela_id === telaId && r.rendimiento)
    if (rends.length === 0) return null
    return rends.reduce((a, r) => a + parseFloat(r.rendimiento), 0) / rends.length
  }

  function openEdit(t) {
    setEditingTela(t)
    const uc = ultimaCompra(t.id)
    setStockForm({
      metros_iniciales: t.metros_iniciales != null ? t.metros_iniciales : (uc?.unidad === 'm' ? uc.cantidad : ''),
      stock_metros: t.stock_metros != null ? t.stock_metros : ''
    })
    setRendForm({
      kg: uc?.unidad === 'kg' ? uc.cantidad : '',
      metros: t.metros_iniciales || '',
      fecha: new Date().toISOString().split('T')[0],
      notas: ''
    })
    setTab('stock')
    setModal(true)
  }

  async function handleSaveStock() {
    if (!editingTela) return
    setSaving(true)
    await supabase.from('telas').update({
      metros_iniciales: stockForm.metros_iniciales !== '' ? parseFloat(stockForm.metros_iniciales) : null,
      stock_metros: stockForm.stock_metros !== '' ? parseFloat(stockForm.stock_metros) : null
    }).eq('id', editingTela.id)
    setSaving(false)
    setModal(false)
    fetchAll()
  }

  async function handleSaveRendimiento() {
    if (!editingTela) return
    if (!rendForm.metros) return alert('Ingresá los metros')
    setSaving(true)

    const kg = parseFloat(rendForm.kg) || null
    const metros = parseFloat(rendForm.metros)
    const rendimiento = kg && metros ? metros / kg : null

    await supabase.from('rendimientos_tela').insert({
      tela_id: editingTela.id,
      kg,
      metros,
      rendimiento,
      fecha: rendForm.fecha,
      notas: rendForm.notas || null
    })

    // Actualizar metros iniciales si no tenía
    if (!editingTela.metros_iniciales && metros) {
      await supabase.from('telas').update({ metros_iniciales: metros }).eq('id', editingTela.id)
    }

    setSaving(false)
    setModal(false)
    fetchAll()
  }

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir(col === 'tela' ? 'asc' : 'desc') }
    // tela → asc (A→Z); fecha/stock/rendimiento → desc (mayor primero)
  }

  const filtered = telasConMovimiento
    .filter(t =>
      !search ||
      t.tipo?.toLowerCase().includes(search.toLowerCase()) ||
      t.color?.toLowerCase().includes(search.toLowerCase()) ||
      t.proveedor?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0
      if (sortCol === 'tela') {
        cmp = (a.tipo || '').localeCompare(b.tipo || '')
      } else if (sortCol === 'fecha') {
        const fa = ultimaCompra(a.id)?.fecha || ''
        const fb = ultimaCompra(b.id)?.fecha || ''
        cmp = fa.localeCompare(fb)
      } else if (sortCol === 'stock') {
        const sa = a.stock_metros ?? -Infinity
        const sb = b.stock_metros ?? -Infinity
        cmp = sa - sb
      } else if (sortCol === 'rendimiento') {
        const ra = a.rendimiento ?? -Infinity
        const rb = b.rendimiento ?? -Infinity
        cmp = ra - rb
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>📊 Stock de Telas</h2>
        </div>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">{telasConMovimiento.length}</div><div className="stat-label">Telas en stock</div></div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {telasConMovimiento.filter(t => t.stock_metros > 0).length}
            </div>
            <div className="stat-label">Con stock disponible</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--warning)' }}>
              {telasConMovimiento.filter(t => !t.stock_metros && t.stock_metros !== 0).length}
            </div>
            <div className="stat-label">Sin stock registrado</div>
          </div>
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 280 }}>
              <input placeholder="Buscar tela..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? <div className="loading"><div className="spinner" /> Cargando...</div>
          : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📊</div>
              <h3>No hay telas con movimiento</h3>
              <p>Registrá compras de tela para que aparezcan acá</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    {[
                      { col: 'tela', label: 'Tela' },
                      { col: null, label: 'Proveedor' },
                      { col: 'fecha', label: 'Última compra' },
                      { col: null, label: 'Metros iniciales' },
                      { col: 'stock', label: 'Stock disponible' },
                      { col: 'rendimiento', label: 'Rend. catálogo' },
                      { col: null, label: 'Rend. prom. real' },
                      { col: null, label: '' },
                    ].map(({ col, label }, i) => col ? (
                      <th key={i} style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => toggleSort(col)}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ffffcc' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '' }}
                      >
                        {label} {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                    ) : (
                      <th key={i}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const uc = ultimaCompra(t.id)
                    const rp = rendPromedio(t.id)
                    const sinStock = t.stock_metros == null
                    const agotada = t.stock_metros === 0

                    return (
                      <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(t)}>
                        <td>
                          <strong>{t.tipo}</strong>
                          {t.color && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{t.color}</div>}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {t.proveedor || '—'}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {uc
                            ? <><strong>{fmtNum(uc.cantidad)} {uc.unidad}</strong>{uc.fecha && <div style={{ color: 'var(--text2)' }}>{fmtFecha(uc.fecha)}</div>}</>
                            : '—'}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {t.metros_iniciales != null ? `${fmtNum(t.metros_iniciales)} m` : '—'}
                        </td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            color: sinStock ? 'var(--text2)' : agotada ? 'var(--danger)' : 'var(--success)'
                          }}>
                            {sinStock ? '— sin dato' : agotada ? '✗ Agotada' : `${fmtNum(t.stock_metros)} m`}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {t.rendimiento ? `${fmtNum(t.rendimiento)} m/kg` : '—'}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {rp != null
                            ? <span style={{ color: 'var(--accent)' }}>{fmtNum(rp)} m/kg</span>
                            : '—'}
                        </td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); openEdit(t) }}>
                            ✏ Ajustar
                          </button>
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

      {modal && editingTela && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 {editingTela.tipo} {editingTela.color ? `· ${editingTela.color}` : ''}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <button
                  className={`btn btn-sm ${tab === 'stock' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTab('stock')}>
                  📦 Stock
                </button>
                <button
                  className={`btn btn-sm ${tab === 'rendimiento' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTab('rendimiento')}>
                  📐 Registrar rendimiento
                </button>
                <button
                  className={`btn btn-sm ${tab === 'historial' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTab('historial')}>
                  📋 Historial
                </button>
              </div>

              {/* Tab Stock */}
              {tab === 'stock' && (
                <div>
                  {ultimaCompra(editingTela.id) && (
                    <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: 10, marginBottom: 12, fontSize: 12 }}>
                      <strong>Última compra:</strong> {fmtNum(ultimaCompra(editingTela.id).cantidad)} {ultimaCompra(editingTela.id).unidad}
                    </div>
                  )}
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Metros iniciales (al momento de recibir)</label>
                      <input
                        type="number"
                        value={stockForm.metros_iniciales}
                        onChange={e => setStockForm(f => ({ ...f, metros_iniciales: e.target.value }))}
                        placeholder="cuántos metros tenías al empezar"
                      />
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                        Si compraste en kg, ponés cuántos metros te dió el rollo
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Stock disponible ahora (metros)</label>
                      <input
                        type="number"
                        value={stockForm.stock_metros}
                        onChange={e => setStockForm(f => ({ ...f, stock_metros: e.target.value }))}
                        placeholder="cuántos metros te quedan"
                        autoFocus
                      />
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                        Ponés 0 si se agotó
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer" style={{ padding: 0, marginTop: 12 }}>
                    <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSaveStock} disabled={saving}>
                      {saving ? 'Guardando...' : '✔ Guardar stock'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab Rendimiento */}
              {tab === 'rendimiento' && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                    Registrá cuántos metros obtuviste de esta tela para calcular el rendimiento real.
                    {editingTela.rendimiento != null && <span> Rend. catálogo: <strong>{fmtNum(editingTela.rendimiento)} m/kg</strong></span>}
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Kilogramos (si aplica)</label>
                      <input
                        type="number"
                        value={rendForm.kg}
                        onChange={e => setRendForm(f => ({ ...f, kg: e.target.value }))}
                        placeholder="kg del lote"
                      />
                    </div>
                    <div className="form-group">
                      <label>Metros obtenidos *</label>
                      <input
                        type="number"
                        value={rendForm.metros}
                        onChange={e => setRendForm(f => ({ ...f, metros: e.target.value }))}
                        placeholder="metros reales que salieron"
                        autoFocus
                      />
                    </div>
                    <div className="form-group">
                      <label>Fecha</label>
                      <input type="date" value={rendForm.fecha} onChange={e => setRendForm(f => ({ ...f, fecha: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Notas</label>
                      <input value={rendForm.notas} onChange={e => setRendForm(f => ({ ...f, notas: e.target.value }))} placeholder="observaciones del lote..." />
                    </div>
                  </div>
                  {rendForm.kg && rendForm.metros && (
                    <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: 10, fontSize: 12, marginBottom: 12 }}>
                      <strong>Rendimiento de este lote: </strong>
                      <span style={{ color: 'var(--accent)' }}>
                        {fmtNum(parseFloat(rendForm.metros) / parseFloat(rendForm.kg))} m/kg
                      </span>
                    </div>
                  )}
                  <div className="modal-footer" style={{ padding: 0, marginTop: 12 }}>
                    <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSaveRendimiento} disabled={saving}>
                      {saving ? 'Guardando...' : '✔ Guardar rendimiento'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab Historial */}
              {tab === 'historial' && (
                <div>
                  {rendimientos.filter(r => r.tela_id === editingTela.id).length === 0 ? (
                    <div className="empty-state" style={{ padding: 24 }}>
                      <p>No hay rendimientos registrados para esta tela</p>
                    </div>
                  ) : (
                    <table style={{ fontSize: 12 }}>
                      <thead>
                        <tr><th>Fecha</th><th>Kg</th><th>Metros</th><th>Rendimiento</th><th>Notas</th></tr>
                      </thead>
                      <tbody>
                        {rendimientos.filter(r => r.tela_id === editingTela.id).map(r => (
                          <tr key={r.id}>
                            <td>{fmtFecha(r.fecha)}</td>
                            <td>{r.kg ? `${fmtNum(r.kg)} kg` : '—'}</td>
                            <td>{r.metros ? `${fmtNum(r.metros)} m` : '—'}</td>
                            <td style={{ color: 'var(--accent)', fontWeight: 700 }}>
                              {r.rendimiento ? `${fmtNum(r.rendimiento)} m/kg` : '—'}
                            </td>
                            <td style={{ color: 'var(--text2)' }}>{r.notas || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
