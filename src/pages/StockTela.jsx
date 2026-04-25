import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtNum = (n) => n != null ? Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

export default function StockTela({ onMenuClick }) {
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editingTela, setEditingTela] = useState(null)
  const [stockVal, setStockVal] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('telas').select('id, tipo, color, metros, usados, stock_disponible, unidad, unidad_stock').order('tipo')
    setStock(data || [])
    setLoading(false)
  }

  function openEdit(t) { setEditingTela(t); setStockVal(t.stock_disponible != null ? t.stock_disponible : t.metros || ''); setModal(true) }

  async function handleSave() {
    if (!editingTela) return
    setSaving(true)
    await supabase.from('telas').update({ stock_disponible: parseFloat(stockVal) ?? null }).eq('id', editingTela.id)
    setSaving(false); setModal(false); fetchAll()
  }

  const filtered = stock.filter(t => !search || t.tipo?.toLowerCase().includes(search.toLowerCase()))
  const stockBajo = stock.filter(t => { const d = t.stock_disponible != null ? t.stock_disponible : t.metros; return d != null && t.metros > 0 && (d / t.metros) < 0.2 }).length

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
          <div className="stat-card"><div className="stat-value">{stock.length}</div><div className="stat-label">Tipos de tela</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: stockBajo > 0 ? 'var(--danger)' : 'var(--text2)' }}>{stockBajo}</div><div className="stat-label">⚠ Stock bajo</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--success)' }}>{stock.filter(t => (t.stock_disponible ?? t.metros) > 0).length}</div><div className="stat-label">Con stock</div></div>
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 280 }}>
              <input placeholder="Buscar tela..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? <div className="loading"><div className="spinner" /> Cargando...</div>
          : filtered.length === 0 ? <div className="empty-state"><div className="icon">📊</div><h3>No hay datos de stock</h3></div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Tela</th><th>Comprado</th><th>Disponible</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(t => {
                    const disp = t.stock_disponible != null ? t.stock_disponible : t.metros
                    const low = t.metros > 0 && disp != null && (disp / t.metros) < 0.2
                    const pct = t.metros > 0 && disp != null ? Math.round((disp / t.metros) * 100) : null
                    return (
                      <tr key={t.id}>
                        <td><strong>{t.tipo || '—'}</strong>{t.color && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{t.color}</div>}</td>
                        <td>{fmtNum(t.metros)} {t.unidad || 'm'}</td>
                        <td style={{ fontWeight: 700, color: disp == null ? 'var(--text2)' : low ? 'var(--danger)' : 'var(--success)' }}>
                          {disp != null ? `${fmtNum(disp)} ${t.unidad_stock || t.unidad || 'm'}` : '—'}
                          {low && ' ⚠'}
                        </td>
                        <td>
                          {pct != null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: low ? 'var(--danger)' : 'var(--success)', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 11, color: 'var(--text2)', minWidth: 32 }}>{pct}%</span>
                            </div>
                          )}
                        </td>
                        <td><button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>✏ Ajustar</button></td>
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
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>📊 Ajustar stock</h3><button className="close-btn" onClick={() => setModal(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg3)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                <strong>{editingTela.tipo}</strong>
                <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>Comprado: {fmtNum(editingTela.metros)} {editingTela.unidad || 'm'}</div>
              </div>
              <div className="form-group">
                <label>¿Cuánto queda disponible?</label>
                <input type="number" value={stockVal} onChange={e => setStockVal(e.target.value)} autoFocus placeholder="0.0" />
              </div>
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
