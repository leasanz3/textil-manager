import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtNum = (n) => n != null ? Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

export default function StockAvios({ onMenuClick }) {
  const [avios, setAvios] = useState([])
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editingAvio, setEditingAvio] = useState(null)
  const [stockVal, setStockVal] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: a }, { data: c }] = await Promise.all([
      supabase.from('avios').select('*').order('nombre'),
      supabase.from('compras_avios').select('avio_id, cantidad')
    ])
    setAvios(a || [])
    setCompras(c || [])
    setLoading(false)
  }

  // Total comprado por avío
  function totalComprado(avioId) {
    return compras
      .filter(c => c.avio_id === avioId)
      .reduce((a, c) => a + parseFloat(c.cantidad || 0), 0)
  }

  function openEdit(a) {
    setEditingAvio(a)
    // Stock disponible: si tiene en stock_avios usamos ese, sino total comprado
    setStockVal(a.stock_disponible != null ? a.stock_disponible : totalComprado(a.id))
    setModal(true)
  }

  async function handleSave() {
    if (!editingAvio) return
    setSaving(true)

    // Upsert en stock_avios
    const { data: existing } = await supabase
      .from('stock_avios')
      .select('id')
      .eq('avio_id', editingAvio.id)
      .single()

    if (existing) {
      await supabase.from('stock_avios').update({
        stock_disponible: parseFloat(stockVal),
        unidad: editingAvio.unidad,
        updated_at: new Date().toISOString()
      }).eq('avio_id', editingAvio.id)
    } else {
      await supabase.from('stock_avios').insert({
        avio_id: editingAvio.id,
        stock_disponible: parseFloat(stockVal),
        unidad: editingAvio.unidad
      })
    }

    setSaving(false)
    setModal(false)
    fetchAll()
  }

  // Enriquecer avíos con stock
  const [stockMap, setStockMap] = useState({})

  useEffect(() => {
    supabase.from('stock_avios').select('*').then(({ data }) => {
      const map = {}
      ;(data || []).forEach(s => { map[s.avio_id] = s.stock_disponible })
      setStockMap(map)
    })
  }, [avios])

  const filtered = avios.filter(a =>
    !search ||
    a.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    a.tipo?.toLowerCase().includes(search.toLowerCase()) ||
    a.proveedor?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>📊 Stock de Avíos</h2>
        </div>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">{avios.length}</div><div className="stat-label">Tipos de avíos</div></div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {Object.keys(stockMap).length}
            </div>
            <div className="stat-label">Con stock registrado</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--warning)' }}>
              {avios.length - Object.keys(stockMap).length}
            </div>
            <div className="stat-label">Sin stock registrado</div>
          </div>
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 280 }}>
              <input placeholder="Buscar avío..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? <div className="loading"><div className="spinner" /> Cargando...</div>
          : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📊</div>
              <h3>No hay avíos registrados</h3>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Avío</th><th>Tipo</th><th>Proveedor</th>
                    <th>Total comprado</th><th>Stock disponible</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => {
                    const comprado = totalComprado(a.id)
                    const disp = stockMap[a.id] != null ? stockMap[a.id] : null
                    const pct = comprado > 0 && disp != null ? Math.round((disp / comprado) * 100) : null
                    const low = pct != null && pct < 20
                    return (
                      <tr key={a.id}>
                        <td><strong>{a.nombre}</strong>{a.descripcion && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{a.descripcion}</div>}</td>
                        <td>{a.tipo || '—'}</td>
                        <td>{a.proveedor || '—'}</td>
                        <td>{fmtNum(comprado)} {a.unidad}</td>
                        <td style={{ fontWeight: 700, color: disp == null ? 'var(--text2)' : low ? 'var(--danger)' : 'var(--success)' }}>
                          {disp != null ? `${fmtNum(disp)} ${a.unidad}` : '—'}
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
                        <td><button className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>✏ Ajustar</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && editingAvio && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Ajustar stock</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg3)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                <strong>{editingAvio.nombre}</strong>
                {editingAvio.tipo && <div style={{ color: 'var(--text2)', fontSize: 12 }}>{editingAvio.tipo}</div>}
                <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>
                  Total comprado: {fmtNum(totalComprado(editingAvio.id))} {editingAvio.unidad}
                </div>
              </div>
              <div className="form-group">
                <label>¿Cuánto queda disponible?</label>
                <input
                  type="number"
                  value={stockVal}
                  onChange={e => setStockVal(e.target.value)}
                  autoFocus
                  placeholder="0"
                />
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                  Unidad: {editingAvio.unidad}
                </div>
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
    </div>
  )
}
