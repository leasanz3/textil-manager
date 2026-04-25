import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ETAPA_COLORS = {
  corte: 'badge-yellow',
  taller: 'badge-blue',
  estampado: 'badge-red',
  bordado: 'badge-blue',
  sublimado: 'badge-green',
  entrega: 'badge-green',
  cancelado: 'badge-gray',
}

export default function Pedidos({ onMenuClick }) {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetchPedidos() }, [])

  async function fetchPedidos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setPedidos(data || [])
    setLoading(false)
  }

  const filtered = pedidos.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.producto?.toLowerCase().includes(q) || p.cliente?.toLowerCase().includes(q)
    const matchEtapa = !filtroEtapa || p.etapa_actual === filtroEtapa
    return matchSearch && matchEtapa
  })

  const totalTalles = (talles) => {
    if (!talles) return 0
    return Object.values(talles).reduce((a, b) => a + b, 0)
  }

  const fmtFecha = (f) => {
    if (!f) return '—'
    const [y, m, d] = f.split('-')
    return `${d}/${m}/${y}`
  }

  const enProduccion = pedidos.filter(p => p.etapa_actual !== 'entrega' && p.etapa_actual !== 'cancelado').length

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>📋 Pedidos</h2>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary btn-sm">+ Nuevo pedido</button>
        </div>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{pedidos.length}</div>
            <div className="stat-label">Total pedidos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{enProduccion}</div>
            <div className="stat-label">En producción</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {pedidos.filter(p => p.etapa_actual === 'entrega').length}
            </div>
            <div className="stat-label">Entregados</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent)' }}>
              {pedidos.reduce((a, p) => a + totalTalles(p.talles), 0)}
            </div>
            <div className="stat-label">Unidades totales</div>
          </div>
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 280 }}>
              <input
                placeholder="Buscar producto o cliente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)} style={{ width: 140 }}>
              <option value="">Todas las etapas</option>
              <option value="corte">Corte</option>
              <option value="taller">Taller</option>
              <option value="estampado">Estampado</option>
              <option value="bordado">Bordado</option>
              <option value="sublimado">Sublimado</option>
              <option value="entrega">Entrega</option>
            </select>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /> Cargando pedidos...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <h3>No hay pedidos</h3>
              <p>Creá tu primer pedido con el botón de arriba</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cliente</th>
                  <th>Etapa</th>
                  <th>Total</th>
                  <th>Entrega</th>
                  <th>Talles</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    className={selected === p.id ? 'selected' : ''}
                    onClick={() => setSelected(selected === p.id ? null : p.id)}
                  >
                    <td><strong>{p.producto}</strong></td>
                    <td>{p.cliente}</td>
                    <td>
                      <span className={`badge ${ETAPA_COLORS[p.etapa_actual] || 'badge-gray'}`}>
                        {p.etapa_actual || '—'}
                      </span>
                    </td>
                    <td><strong>{totalTalles(p.talles)} u.</strong></td>
                    <td>{fmtFecha(p.fecha)}</td>
                    <td style={{ fontSize: 11, color: 'var(--text2)' }}>
                      {p.talles ? Object.entries(p.talles).map(([t, c]) => `${t}:${c}`).join(' ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
