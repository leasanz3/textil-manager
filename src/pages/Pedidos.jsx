import React, { useState, useEffect, useRef } from 'react'
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
  adulto:   { label: 'Adulto',         talles: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  nino:     { label: 'Niño',           talles: ['2', '4', '6', '8', '10', '12', '14', '16'] },
  malla:    { label: 'Malla',          talles: ['40', '42', '44', '46', '48', '50', '52'] },
  mallaesp: { label: 'Malla Especial', talles: ['54', '56', '58'] },
}

const FLUJO_ETAPAS = ['corte', 'taller', 'estampado', 'sublimado', 'bordado', 'entrega']

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
  const [pedidos, setPedidos]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [modal, setModal]             = useState(false)
  const [editing, setEditing]         = useState(null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  // ── Autocomplete producto ──────────────────────────────────────────────────
  const [productoQuery, setProductoQuery]           = useState('')
  const [productosResults, setProductosResults]     = useState([])
  const [showDropdown, setShowDropdown]             = useState(false)
  const [searchingProductos, setSearchingProductos] = useState(false)
  const searchTimeout = useRef(null)

  // ── Modal nuevo producto ───────────────────────────────────────────────────
  const [modalProducto, setModalProducto]   = useState(false)
  const [nuevoProducto, setNuevoProducto]   = useState({ nombre: '', codigo: '', tabla: 'adulto' })
  const [savingProducto, setSavingProducto] = useState(false)
  const [errorProducto, setErrorProducto]   = useState('')

  // ── Autocomplete cliente ───────────────────────────────────────────────────
  const [clienteQuery, setClienteQuery]           = useState('')
  const [contactosResults, setContactosResults]   = useState([])
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [searchingContactos, setSearchingContactos]   = useState(false)
  const clienteSearchTimeout = useRef(null)

  // ── Modal nuevo contacto ───────────────────────────────────────────────────
  const [modalContacto, setModalContacto]   = useState(false)
  const [nuevoContacto, setNuevoContacto]   = useState({ nombre: '', tipo: '' })
  const [savingContacto, setSavingContacto] = useState(false)
  const [errorContacto, setErrorContacto]   = useState('')

  // ── Form state ─────────────────────────────────────────────────────────────
  const emptyForm = {
    producto:     '',
    producto_id:  null,
    cliente:      '',
    etapa_actual: 'corte',
    fecha:        '',
    tabla:        'adulto',
    talles:       {},
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
    setProductoQuery('')
    setProductosResults([])
    setShowDropdown(false)
    setClienteQuery('')
    setContactosResults([])
    setShowClienteDropdown(false)
    setError('')
    setModal(true)
  }

  function openEdit(p) {
    setEditing(p.id)
    const tabla = inferirTabla(p.talles)
    setForm({
      producto:     p.producto     || '',
      producto_id:  p.producto_id  || null,
      cliente:      p.cliente      || '',
      etapa_actual: p.etapa_actual || 'corte',
      fecha:        p.fecha        || '',
      tabla,
      talles: p.talles || {},
    })
    setProductoQuery(p.producto || '')
    setProductosResults([])
    setShowDropdown(false)
    setClienteQuery(p.cliente || '')
    setContactosResults([])
    setShowClienteDropdown(false)
    setError('')
    setModal(true)
  }

  // ── Autocomplete: buscar mientras escribe ──────────────────────────────────

  function onProductoInput(value) {
    setProductoQuery(value)
    setF('producto', value)
    setF('producto_id', null)

    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (!value.trim()) {
      setProductosResults([])
      setShowDropdown(false)
      return
    }

    setShowDropdown(true)
    searchTimeout.current = setTimeout(async () => {
      setSearchingProductos(true)
      const { data } = await supabase
        .from('productos')
        .select('id, nombre, codigo, tabla')
        .ilike('nombre', `%${value.trim()}%`)
        .limit(8)
      setProductosResults(data || [])
      setSearchingProductos(false)
    }, 250)
  }

  function seleccionarProducto(prod) {
    setForm(f => ({
      ...f,
      producto:    prod.nombre,
      producto_id: prod.id,
      tabla:       prod.tabla || f.tabla,
      talles:      prod.tabla && prod.tabla !== f.tabla ? {} : f.talles,
    }))
    setProductoQuery(prod.nombre)
    setShowDropdown(false)
    setProductosResults([])
  }

  function onProductoBlur() {
    // Timeout para que el click en el dropdown registre antes de cerrar
    setTimeout(() => setShowDropdown(false), 150)
  }

  // ── Guardar nuevo producto desde modal secundario ──────────────────────────

  function abrirModalProducto() {
    setNuevoProducto({ nombre: productoQuery, codigo: '', tabla: 'adulto' })
    setErrorProducto('')
    setShowDropdown(false)
    setModalProducto(true)
  }

  async function guardarNuevoProducto() {
    if (!nuevoProducto.nombre.trim()) { setErrorProducto('El nombre es obligatorio'); return }
    setSavingProducto(true)
    setErrorProducto('')

    const { data, error } = await supabase
      .from('productos')
      .insert({
        nombre: nuevoProducto.nombre.trim(),
        codigo: nuevoProducto.codigo.trim() || null,
        tabla:  nuevoProducto.tabla,
      })
      .select('id, nombre, codigo, tabla')
      .single()

    if (error) { setErrorProducto('Error: ' + error.message); setSavingProducto(false); return }

    seleccionarProducto(data)
    setModalProducto(false)
    setSavingProducto(false)
  }

  // ── Autocomplete cliente ───────────────────────────────────────────────────

  function onClienteInput(value) {
    setClienteQuery(value)
    setF('cliente', value)

    if (clienteSearchTimeout.current) clearTimeout(clienteSearchTimeout.current)

    if (!value.trim()) {
      setContactosResults([])
      setShowClienteDropdown(false)
      return
    }

    setShowClienteDropdown(true)
    clienteSearchTimeout.current = setTimeout(async () => {
      setSearchingContactos(true)
      const { data } = await supabase
        .from('contactos')
        .select('id, nombre, tipo')
        .ilike('nombre', `%${value.trim()}%`)
        .limit(8)
      setContactosResults(data || [])
      setSearchingContactos(false)
    }, 250)
  }

  function seleccionarContacto(contacto) {
    setF('cliente', contacto.nombre)
    setClienteQuery(contacto.nombre)
    setShowClienteDropdown(false)
    setContactosResults([])
  }

  function onClienteBlur() {
    setTimeout(() => setShowClienteDropdown(false), 150)
  }

  function abrirModalContacto() {
    setNuevoContacto({ nombre: clienteQuery, tipo: '' })
    setErrorContacto('')
    setShowClienteDropdown(false)
    setModalContacto(true)
  }

  async function guardarNuevoContacto() {
    if (!nuevoContacto.nombre.trim()) { setErrorContacto('El nombre es obligatorio'); return }
    setSavingContacto(true)
    setErrorContacto('')

    const { data, error } = await supabase
      .from('contactos')
      .insert({
        nombre: nuevoContacto.nombre.trim(),
        tipo:   nuevoContacto.tipo.trim() || null,
      })
      .select('id, nombre, tipo')
      .single()

    if (error) { setErrorContacto('Error: ' + error.message); setSavingContacto(false); return }

    seleccionarContacto(data)
    setModalContacto(false)
    setSavingContacto(false)
  }

  // ── Talles ─────────────────────────────────────────────────────────────────

  function onTablaChange(nuevaTabla) {
    setForm(f => ({ ...f, tabla: nuevaTabla, talles: {} }))
  }

  function setTalle(talle, val) {
    setForm(f => {
      const n = { ...f.talles }
      const num = parseInt(val) || 0
      if (num > 0) { n[talle] = num } else { delete n[talle] }
      return { ...f, talles: n }
    })
  }

  // ── Guardar pedido (insert o update) ──────────────────────────────────────

  async function handleSave() {
    if (!form.producto.trim())       { setError('El nombre del producto es obligatorio'); return }
    if (!form.cliente.trim())        { setError('El cliente es obligatorio'); return }
    if (totalTalles(form.talles) === 0) { setError('Ingresá al menos una cantidad de talle'); return }

    setSaving(true)
    setError('')

    const datos = {
      producto:     form.producto.trim(),
      producto_id:  form.producto_id || null,
      cliente:      form.cliente.trim(),
      etapa_actual: form.etapa_actual,
      fecha:        form.fecha || null,
      talles:       form.talles,
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

  // ── Acciones de lista ──────────────────────────────────────────────────────

  async function avanzarEtapa(p, e) {
    e.stopPropagation()
    const idx = FLUJO_ETAPAS.indexOf(p.etapa_actual)
    if (idx === -1 || idx >= FLUJO_ETAPAS.length - 1) return
    await supabase.from('pedidos').update({ etapa_actual: FLUJO_ETAPAS[idx + 1] }).eq('id', p.id)
    fetchPedidos()
  }

  async function cambiarEtapa(p, nuevaEtapa, e) {
    e.stopPropagation()
    await supabase.from('pedidos').update({ etapa_actual: nuevaEtapa }).eq('id', p.id)
    fetchPedidos()
  }

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
                      <tr key={p.id} onClick={() => openEdit(p)} style={{ cursor: 'pointer' }}>
                        <td><strong>{p.producto}</strong></td>
                        <td>{p.cliente}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <select
                            value={p.etapa_actual || ''}
                            onChange={e => cambiarEtapa(p, e.target.value, e)}
                            className={`badge ${ei.color}`}
                            style={{
                              border: 'none', background: 'transparent',
                              cursor: 'pointer', fontSize: 11, fontWeight: 600,
                              padding: '2px 4px', appearance: 'auto',
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
                              <button className="btn btn-secondary btn-sm" title="Avanzar etapa" onClick={e => avanzarEtapa(p, e)}>→</button>
                            )}
                            <button className="btn btn-secondary btn-sm" title="Editar" onClick={e => { e.stopPropagation(); openEdit(p) }}>✏</button>
                            <button className="btn btn-danger btn-sm" title="Eliminar" onClick={e => handleDelete(p, e)}>🗑</button>
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

      {/* ── Modal crear / editar pedido ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏ Editar pedido' : '📋 Nuevo pedido'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">

                {/* Campo Producto con autocomplete */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Producto *</label>
                  <input
                    value={productoQuery}
                    onChange={e => onProductoInput(e.target.value)}
                    onBlur={onProductoBlur}
                    onFocus={() => productoQuery.trim() && productosResults.length > 0 && setShowDropdown(true)}
                    placeholder="Buscá un producto..."
                    autoComplete="off"
                    autoFocus
                  />
                  {searchingProductos && (
                    <div style={{ position: 'absolute', right: 10, top: 34, fontSize: 11, color: 'var(--text2)' }}>
                      Buscando...
                    </div>
                  )}
                  {showDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                      maxHeight: 220,
                      overflowY: 'auto',
                    }}>
                      {productosResults.length > 0
                        ? productosResults.map(prod => (
                            <div
                              key={prod.id}
                              onMouseDown={() => seleccionarProducto(prod)}
                              style={{
                                padding: '9px 12px',
                                cursor: 'pointer',
                                fontSize: 13,
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                              onMouseLeave={e => e.currentTarget.style.background = ''}
                            >
                              <span>{prod.nombre}</span>
                              {prod.codigo && (
                                <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>
                                  {prod.codigo}
                                </span>
                              )}
                            </div>
                          ))
                        : null
                      }
                      <div
                        onMouseDown={abrirModalProducto}
                        style={{
                          padding: '9px 12px',
                          cursor: 'pointer',
                          fontSize: 13,
                          color: 'var(--accent)',
                          fontWeight: 600,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        + Agregar producto
                      </div>
                    </div>
                  )}
                </div>

                {/* Campo Cliente con autocomplete */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Cliente *</label>
                  <input
                    value={clienteQuery}
                    onChange={e => onClienteInput(e.target.value)}
                    onBlur={onClienteBlur}
                    onFocus={() => clienteQuery.trim() && contactosResults.length > 0 && setShowClienteDropdown(true)}
                    placeholder="Nombre del cliente"
                    autoComplete="off"
                  />
                  {searchingContactos && (
                    <div style={{ position: 'absolute', right: 10, top: 34, fontSize: 11, color: 'var(--text2)' }}>
                      Buscando...
                    </div>
                  )}
                  {showClienteDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                      maxHeight: 220,
                      overflowY: 'auto',
                    }}>
                      {contactosResults.map(c => (
                        <div
                          key={c.id}
                          onMouseDown={() => seleccionarContacto(c)}
                          style={{
                            padding: '9px 12px',
                            cursor: 'pointer',
                            fontSize: 13,
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                          <span>{c.nombre}</span>
                          {c.tipo && (
                            <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>
                              {c.tipo}
                            </span>
                          )}
                        </div>
                      ))}
                      <div
                        onMouseDown={abrirModalContacto}
                        style={{
                          padding: '9px 12px',
                          cursor: 'pointer',
                          fontSize: 13,
                          color: 'var(--accent)',
                          fontWeight: 600,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        + Agregar contacto
                      </div>
                    </div>
                  )}
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
                    <select value={form.tabla} onChange={e => onTablaChange(e.target.value)} style={{ fontSize: 11 }}>
                      {Object.entries(TABLAS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {tallesDeLaTabla.map(talle => (
                    <div key={talle} style={{ textAlign: 'center', minWidth: 52 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--accent)',
                        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3,
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

                {totalTalles(form.talles) > 0 && (
                  <div style={{
                    marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)',
                    fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap',
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

      {/* ── Modal nuevo contacto ── */}
      {modalContacto && (
        <div className="modal-overlay" style={{ zIndex: 200 }} onClick={() => setModalContacto(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Nuevo contacto</h3>
              <button className="close-btn" onClick={() => setModalContacto(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  value={nuevoContacto.nombre}
                  onChange={e => setNuevoContacto(c => ({ ...c, nombre: e.target.value }))}
                  placeholder="Nombre del cliente"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Tipo <span style={{ color: 'var(--text2)', fontWeight: 400 }}>(opcional)</span></label>
                <input
                  value={nuevoContacto.tipo}
                  onChange={e => setNuevoContacto(c => ({ ...c, tipo: e.target.value }))}
                  placeholder="ej: Club, Empresa, Particular..."
                />
              </div>
              {errorContacto && (
                <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>⚠ {errorContacto}</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalContacto(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarNuevoContacto} disabled={savingContacto}>
                {savingContacto ? 'Guardando...' : '✔ Guardar y seleccionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nuevo producto ── */}
      {modalProducto && (
        <div className="modal-overlay" style={{ zIndex: 200 }} onClick={() => setModalProducto(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Nuevo producto</h3>
              <button className="close-btn" onClick={() => setModalProducto(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  value={nuevoProducto.nombre}
                  onChange={e => setNuevoProducto(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="ej: Campera, Bata, Canguro..."
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Código <span style={{ color: 'var(--text2)', fontWeight: 400 }}>(opcional)</span></label>
                <input
                  value={nuevoProducto.codigo}
                  onChange={e => setNuevoProducto(p => ({ ...p, codigo: e.target.value }))}
                  placeholder="ej: CAM-001"
                />
              </div>
              <div className="form-group">
                <label>Tabla de talles</label>
                <select
                  value={nuevoProducto.tabla}
                  onChange={e => setNuevoProducto(p => ({ ...p, tabla: e.target.value }))}
                >
                  {Object.entries(TABLAS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              {errorProducto && (
                <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>⚠ {errorProducto}</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalProducto(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarNuevoProducto} disabled={savingProducto}>
                {savingProducto ? 'Guardando...' : '✔ Guardar y seleccionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
