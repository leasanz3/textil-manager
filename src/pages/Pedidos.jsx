import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Constantes ───────────────────────────────────────────────────────────────

const ETAPAS = [
  { id: 'corte',     label: 'Corte',      color: 'badge-yellow' },
  { id: 'taller',    label: 'Taller',     color: 'badge-blue'   },
  { id: 'estampado', label: 'Estampado',  color: 'badge-red'    },
  { id: 'bordado',   label: 'Bordado',    color: 'badge-blue'   },
  { id: 'sublimado', label: 'Sublimado',  color: 'badge-green'  },
  { id: 'entrega',   label: 'Entregado',  color: 'badge-green'  },
  { id: 'cancelado', label: 'Cancelado',  color: 'badge-gray'   },
]

const TABLAS = {
  adulto:   { label: 'Adulto',        talles: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  nino:     { label: 'Niño',          talles: ['2', '4', '6', '8', '10', '12', '14', '16'] },
  malla:    { label: 'Malla',         talles: ['40', '42', '44', '46', '48', '50', '52'] },
  mallaesp: { label: 'Malla Especial', talles: ['54', '56', '58'] },
}

const FLUJO_ETAPAS = ['corte', 'taller', 'estampado', 'sublimado', 'bordado', 'entrega']

// Infiere la tabla de talles a partir de las keys del jsonb
function inferirTabla(talles) {
  if (!talles) return 'adulto'
  const keys = Object.keys(talles)
  if (keys.some(k => ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(k))) return 'adulto'
  if (keys.some(k => ['2', '4', '6', '8', '10'].includes(k))) return 'nino'
  if (keys.some(k => ['54', '56', '58'].includes(k))) return 'mallaesp'
  if (keys.some(k => ['40', '42', '44'].includes(k))) return 'malla'
  return 'adulto'
}

const fmtFecha = (f) => {
  if (!f) return '—'
  const [y, m, d] = f.split('-')
  return `${d}/${m}/${y}`
}

const totalTalles = (talles) => {
  if (!talles) return 0
  return Object.values(talles).reduce((a, b) => a + (Number(b) || 0), 0)
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Pedidos({ onMenuClick }) {
  const [pedidos, setPedidos]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState(null)   // id del pedido en edición, null = nuevo
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // Form state
  const emptyForm = {
    producto: '',
    cliente: '',
    etapa_actual: 'corte',
    fecha: '',
    tabla: 'adulto',    // solo UI, no se guarda
    talles: {},
  }
  const [form, setForm] = useState(emptyForm)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Fetch ──────────────────────────────────────────────────────────────────

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

  // ── Abrir modal ────────────────────────────────────────────────────────────

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModal(true)
  }

  function openEdit(p) {
    setEditing(p.id)
    const tabla = inferirTabla(p.talles)
    setForm({
      producto: p.producto || '',
      cliente: p.cliente || '',
      etapa_actual: p.etapa_actual || 'corte',
      fecha: p.fecha || '',
      tabla,
      talles: p.talles || {},
    })
    setError('')
    setModal(true)
  }

  // ── Cambiar tabla de talles en el form ─────────────────────────────────────

  function onTablaChange(nuevaTabla) {
    setForm(f => ({ ...f, tabla: nuevaTabla, talles: {} }))
  }

  // ── Actualizar un talle en el form ─────────────────────────────────────────

  function setTalle(talle, val) {
    setForm(f => {
      const n = { ...f.talles }
      const num = parseInt(val) || 0
      if (num > 0) {
        n[talle] = num
      } else {
        delete n[talle]
      }
      return { ...f, talles: n }
    })
  }

  // ── Guardar (insert o update) ──────────────────────────────────────────────

  async function handleSave() {
    if (!form.producto.trim()) { setError('El nombre del producto es obligatorio'); return }
    if (!form.cliente.trim())  { setError('El cliente es obligatorio'); return }
    if (totalTalles(form.talles) === 0) { setError('Ingresá al menos una cantidad de talle'); return }

    setSaving(true)
    setError('')

    const datos = {
      producto:    form.producto.trim(),
      cliente:     form.cliente.trim(),
      etapa_actual: form.etapa_actual,
      fecha:       form.fecha || null,
      talles:      form.talles,
    }

    if (editing) {
      const { error } = await supabase.from('pedidos').update(datos).eq('id', editing)
      if (error) { setError('Error al guardar: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('pedidos').insert(datos)
      if (error) { setError('Error al guardar: ' + error.message); setSaving(false); return }
    }

    setSaving(false)
    setModal(false)
    fetchPedidos()
  }

  // ── Avanzar etapa rápido desde la lista ───────────────────────────────────

  async function avanzarEtapa(p, e) {
    e.stopPropagation()
    const idx = FLUJO_ETAPAS.indexOf(p.etapa_actual)
    if (idx === -1 || idx >= FLUJO_ETAPAS.length - 1) return
    const siguiente = FLUJO_ETAPAS[idx + 1]
    await supabase.from('pedidos').update({ etapa_actual: siguiente }).eq('id', p.id)
    fetchPedidos()
  }

  // ── Cambiar etapa directo desde select en la lista ────────────────────────

  async function cambiarEtapa(p, nuevaEtapa, e) {
    e.stopPropagation()
    await supabase.from('pedidos').update({ etapa_actual: nuevaEtapa }).eq('id', p.id)
    fetchPedidos()
  }

  // ── Eliminar ───────────────────────────────────────────────────────────────

  async function handleDelete(p, e) {
    e.stopPropagation()
    if (!window.confirm(`¿Eliminar el pedido de "${p.producto}" para ${p.cliente}?`)) return
    await supabase.from('pedidos').delete().eq('id', p.id)
    fetchPedidos()
  }

  // ── Filtros ────────────────────────────────────────────────────────────────

  const filtered = pedidos.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.producto?.toLowerCase().includes(q) || p.cliente?.toLowerCase().includes(q)
    const matchEtapa  = !filtroEtapa || p.etapa_actual === filtroEtapa
    return matchSearch && matchEtapa
  })

  const enProduccion = pedidos.filter(p => p.etapa_actual !== 'entrega' && p.etapa_actual !== 'cancelado').length
  const etapaInfo = (id) => ETAPAS.find(e => e.id === id) || { label: id, color: 'badge-gray' }

  const tallesDeLaTabla = TABLAS[form.tabla]?.talles || []

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Topbar */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>📋 Pedidos</h2>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo pedido</button>
        </div>
      </div>

      <div className="content">
        {/* Stats */}
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

        {/* Tabla */}
        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 280 }}>
              <input
                placeholder="Buscar producto o cliente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)} style={{ width: 150 }}>
              <option value="">Todas las etapas</option>
              {ETAPAS.filter(e => e.id !== 'cancelado').map(e => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
              <option value="cancelado">Cancelado</option>
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
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cliente</th>
                    <th>Etapa</th>
                    <th>Total</th>
                    <th>Entrega</th>
                    <th>Talles</th>
                    <th style={{ width: 140 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const ei = etapaInfo(p.etapa_actual)
                    const puedeAvanzar = FLUJO_ETAPAS.indexOf(p.etapa_actual) < FLUJO_ETAPAS.length - 1
                    return (
                      <tr
                        key={p.id}
                        onClick={() => openEdit(p)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td><strong>{p.producto}</strong></td>
                        <td>{p.cliente}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <select
                            value={p.etapa_actual || ''}
                            onChange={e => cambiarEtapa(p, e.target.value, e)}
                            className={`badge ${ei.color}`}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 4px',
                              appearance: 'auto',
                            }}
                          >
                            {ETAPAS.map(e => (
                              <option key={e.id} value={e.id}>{e.label}</option>
                            ))}
                          </select>
                        </td>
                        <td><strong>{totalTalles(p.talles)} u.</strong></td>
                        <td style={{ color: p.fecha < new Date().toISOString().split('T')[0] && p.etapa_actual !== 'entrega' ? 'var(--danger)' : undefined }}>
                          {fmtFecha(p.fecha)}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text2)' }}>
                          {p.talles
                            ? Object.entries(p.talles).map(([t, c]) => `${t}:${c}`).join(' ')
                            : '—'}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {puedeAvanzar && p.etapa_actual !== 'cancelado' && (
                              <button
                                className="btn btn-secondary btn-sm"
                                title="Avanzar etapa"
                                onClick={e => avanzarEtapa(p, e)}
                              >
                                →
                              </button>
                            )}
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Editar"
                              onClick={e => { e.stopPropagation(); openEdit(p) }}
                            >
                              ✏
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              title="Eliminar"
                              onClick={e => handleDelete(p, e)}
                            >
                              🗑
                            </button>
                          </div>
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

      {/* ── Modal crear / editar ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏ Editar pedido' : '📋 Nuevo pedido'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Datos generales */}
              <div className="form-grid">
                <div className="form-group">
                  <label>Producto *</label>
                  <input
                    value={form.producto}
                    onChange={e => setF('producto', e.target.value)}
                    placeholder="ej: Campera, Bata, Canguro..."
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Cliente *</label>
                  <input
                    value={form.cliente}
                    onChange={e => setF('cliente', e.target.value)}
                    placeholder="ej: Club Atlético..."
                  />
                </div>
                <div className="form-group">
                  <label>Etapa actual</label>
                  <select value={form.etapa_actual} onChange={e => setF('etapa_actual', e.target.value)}>
                    {ETAPAS.map(e => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha de entrega</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={e => setF('fecha', e.target.value)}
                  />
                </div>
              </div>

              {/* Talles */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>📐 Talles</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>Tabla:</span>
                    <select
                      value={form.tabla}
                      onChange={e => onTablaChange(e.target.value)}
                      style={{ fontSize: 11 }}
                    >
                      {Object.entries(TABLAS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Grid de talles */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {tallesDeLaTabla.map(talle => (
                    <div key={talle} style={{ textAlign: 'center', minWidth: 52 }}>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--accent)',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        marginBottom: 3
                      }}>
                        {talle}
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={form.talles[talle] || ''}
                        onChange={e => setTalle(talle, e.target.value)}
                        placeholder="0"
                        style={{ width: 52, textAlign: 'center' }}
                      />
                    </div>
                  ))}
                </div>

                {/* Total */}
                {totalTalles(form.talles) > 0 && (
                  <div style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid var(--border)',
                    fontSize: 13,
                    display: 'flex',
                    gap: 16,
                    flexWrap: 'wrap'
                  }}>
                    <span>
                      <strong style={{ color: 'var(--accent)' }}>{totalTalles(form.talles)}</strong>
                      <span style={{ color: 'var(--text2)', marginLeft: 4 }}>unidades totales</span>
                    </span>
                    <span style={{ color: 'var(--text2)', fontSize: 12 }}>
                      {Object.entries(form.talles)
                        .filter(([, c]) => c > 0)
                        .map(([t, c]) => `${t}:${c}`)
                        .join('  ')}
                    </span>
                  </div>
                )}
              </div>

              {error && (
                <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>⚠ {error}</p>
              )}
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
