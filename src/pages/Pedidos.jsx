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

function pedidoTotal(p) {
  if (p.items && p.items.length > 0) return p.items.reduce((a, it) => a + totalTalles(it.talles), 0)
  return totalTalles(p.talles)
}

// ─── ItemPedido ───────────────────────────────────────────────────────────────

function ItemPedido({ item, index, total, clienteId, onUpdate, onDelete, onOpenNewProduct }) {
  const [query, setQuery]                   = useState(item.producto || '')
  const [results, setResults]               = useState([])
  const [clienteResults, setClienteResults] = useState([])
  const [showDropdown, setShowDropdown]     = useState(false)
  const [searching, setSearching]           = useState(false)
  const timeout = useRef(null)

  useEffect(() => { setQuery(item.producto || '') }, [item.producto])

  function onInput(value) {
    setQuery(value)
    onUpdate({ producto: value, producto_id: null })
    if (timeout.current) clearTimeout(timeout.current)
    if (!value.trim()) {
      setResults([]); setClienteResults([]); setShowDropdown(false); return
    }
    setShowDropdown(true)
    timeout.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('productos')
        .select('id, nombre, codigo, tabla, cliente_id')
        .ilike('nombre', `%${value.trim()}%`)
        .limit(12)
      const all = data || []
      if (clienteId) {
        setClienteResults(all.filter(p => p.cliente_id === clienteId))
        setResults(all.filter(p => p.cliente_id !== clienteId))
      } else {
        setClienteResults([])
        setResults(all)
      }
      setSearching(false)
    }, 250)
  }

  function seleccionar(prod) {
    onUpdate({ producto: prod.nombre, producto_id: prod.id, tabla: prod.tabla || item.tabla })
    setQuery(prod.nombre)
    setShowDropdown(false)
    setResults([])
    setClienteResults([])
  }

  function onBlur() { setTimeout(() => setShowDropdown(false), 150) }

  const tallesDeLaTabla = TABLAS[item.tabla]?.talles || []

  function setTalle(talle, val) {
    const n = { ...item.talles }
    const num = parseInt(val) || 0
    if (num > 0) { n[talle] = num } else { delete n[talle] }
    onUpdate({ talles: n })
  }

  function DropItem({ prod }) {
    return (
      <div
        onMouseDown={() => seleccionar(prod)}
        style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
        onMouseLeave={e => e.currentTarget.style.background = ''}
      >
        <span>{prod.nombre}</span>
        {prod.codigo && <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>{prod.codigo}</span>}
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>📦 Ítem {index + 1}</span>
        {total > 1 && <button className="btn btn-danger btn-sm" onClick={onDelete}>✕ Quitar</button>}
      </div>

      {/* Producto autocomplete */}
      <div className="form-group" style={{ position: 'relative' }}>
        <label>Producto *</label>
        <input
          value={query}
          onChange={e => onInput(e.target.value)}
          onBlur={onBlur}
          onFocus={() => query.trim() && (results.length > 0 || clienteResults.length > 0) && setShowDropdown(true)}
          placeholder="Buscá un producto..."
          autoComplete="off"
        />
        {searching && <div style={{ position: 'absolute', right: 10, top: 34, fontSize: 11, color: 'var(--text2)' }}>Buscando...</div>}
        {showDropdown && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', maxHeight: 260, overflowY: 'auto' }}>
            {clienteResults.length > 0 && (
              <>
                <div style={{ padding: '5px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, background: 'var(--bg2)' }}>
                  Productos de este cliente
                </div>
                {clienteResults.map(prod => <DropItem key={prod.id} prod={prod} />)}
              </>
            )}
            {results.length > 0 && (
              <>
                {clienteResults.length > 0 && (
                  <div style={{ padding: '5px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, background: 'var(--bg2)' }}>
                    Otros productos
                  </div>
                )}
                {results.map(prod => <DropItem key={prod.id} prod={prod} />)}
              </>
            )}
            <div
              onMouseDown={() => { setShowDropdown(false); onOpenNewProduct(query, index) }}
              style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              + Agregar producto
            </div>
          </div>
        )}
      </div>

      {/* Talles */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>📐 Talles</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Tabla:</span>
            <select value={item.tabla} onChange={e => onUpdate({ tabla: e.target.value, talles: {} })} style={{ fontSize: 11 }}>
              {Object.entries(TABLAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {tallesDeLaTabla.map(talle => (
            <div key={talle} style={{ textAlign: 'center', minWidth: 52 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{talle}</div>
              <input type="number" min="0" value={item.talles[talle] || ''} onChange={e => setTalle(talle, e.target.value)} placeholder="0" style={{ width: 52, textAlign: 'center' }} />
            </div>
          ))}
        </div>
        {totalTalles(item.talles) > 0 && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>
              <strong style={{ color: 'var(--accent)' }}>{totalTalles(item.talles)}</strong>
              <span style={{ color: 'var(--text2)', marginLeft: 4 }}>unidades</span>
            </span>
            <span style={{ color: 'var(--text2)' }}>
              {Object.entries(item.talles).filter(([, c]) => c > 0).map(([t, c]) => `${t}:${c}`).join('  ')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
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
  const [vistaFicha, setVistaFicha]   = useState(null)

  // ── Autocomplete cliente ───────────────────────────────────────────────────
  const [clienteQuery, setClienteQuery]               = useState('')
  const [contactosResults, setContactosResults]       = useState([])
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [searchingContactos, setSearchingContactos]   = useState(false)
  const clienteSearchTimeout = useRef(null)

  // ── Modal nuevo producto (desde un ítem) ──────────────────────────────────
  const [modalProducto, setModalProducto]             = useState(false)
  const [nuevoProducto, setNuevoProducto]             = useState({ nombre: '', codigo: '', tabla: 'adulto' })
  const [savingProducto, setSavingProducto]           = useState(false)
  const [errorProducto, setErrorProducto]             = useState('')
  const [pendingProductoItemIdx, setPendingProductoItemIdx] = useState(null)

  // ── Modal nuevo contacto ───────────────────────────────────────────────────
  const [modalContacto, setModalContacto]   = useState(false)
  const [nuevoContacto, setNuevoContacto]   = useState({ nombre: '', tipo: '' })
  const [savingContacto, setSavingContacto] = useState(false)
  const [errorContacto, setErrorContacto]   = useState('')

  // ── Form state ─────────────────────────────────────────────────────────────
  const emptyForm = {
    cliente:      '',
    cliente_id:   null,
    etapa_actual: 'corte',
    fecha_pedido: '',
    fecha:        '',
    items: [{ producto: '', producto_id: null, tabla: 'adulto', talles: {} }],
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
    setClienteQuery('')
    setContactosResults([])
    setShowClienteDropdown(false)
    setPendingProductoItemIdx(null)
    setError('')
    setModal(true)
  }

  function openEdit(p) {
    setEditing(p.id)
    setForm({
      cliente:      p.cliente      || '',
      cliente_id:   null,
      etapa_actual: p.etapa_actual || 'corte',
      fecha_pedido: p.fecha_pedido || '',
      fecha:        p.fecha        || '',
      items: p.items && p.items.length > 0
        ? p.items
        : [{ producto: p.producto || '', producto_id: p.producto_id || null, tabla: inferirTabla(p.talles), talles: p.talles || {} }],
    })
    setClienteQuery(p.cliente || '')
    setContactosResults([])
    setShowClienteDropdown(false)
    setPendingProductoItemIdx(null)
    setError('')
    setModal(true)
  }

  // ── Items management ───────────────────────────────────────────────────────

  function updateItem(idx, changes) {
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, ...changes } : it) }))
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { producto: '', producto_id: null, tabla: 'adulto', talles: {} }] }))
  }

  function deleteItem(idx) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  // ── Autocomplete cliente ───────────────────────────────────────────────────

  function onClienteInput(value) {
    setClienteQuery(value)
    setF('cliente', value)
    setF('cliente_id', null)
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
        .from('contactos').select('id, nombre, tipo')
        .ilike('nombre', `%${value.trim()}%`).limit(8)
      setContactosResults(data || [])
      setSearchingContactos(false)
    }, 250)
  }

  function seleccionarContacto(contacto) {
    setForm(f => ({ ...f, cliente: contacto.nombre, cliente_id: contacto.id }))
    setClienteQuery(contacto.nombre)
    setShowClienteDropdown(false)
    setContactosResults([])
  }

  function onClienteBlur() { setTimeout(() => setShowClienteDropdown(false), 150) }

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
      .insert({ nombre: nuevoContacto.nombre.trim(), tipo: nuevoContacto.tipo.trim() || null })
      .select('id, nombre, tipo').single()
    if (error) { setErrorContacto('Error: ' + error.message); setSavingContacto(false); return }
    seleccionarContacto(data)
    setModalContacto(false)
    setSavingContacto(false)
  }

  // ── Nuevo producto desde ítem ──────────────────────────────────────────────

  function abrirModalProductoParaItem(query, idx) {
    setNuevoProducto({ nombre: query, codigo: '', tabla: 'adulto' })
    setErrorProducto('')
    setPendingProductoItemIdx(idx)
    setModalProducto(true)
  }

  async function guardarNuevoProducto() {
    if (!nuevoProducto.nombre.trim()) { setErrorProducto('El nombre es obligatorio'); return }
    setSavingProducto(true)
    setErrorProducto('')
    const { data, error } = await supabase
      .from('productos')
      .insert({ nombre: nuevoProducto.nombre.trim(), codigo: nuevoProducto.codigo.trim() || null, tabla: nuevoProducto.tabla })
      .select('id, nombre, codigo, tabla').single()
    if (error) { setErrorProducto('Error: ' + error.message); setSavingProducto(false); return }
    if (pendingProductoItemIdx !== null) {
      updateItem(pendingProductoItemIdx, { producto: data.nombre, producto_id: data.id, tabla: data.tabla || 'adulto' })
      setPendingProductoItemIdx(null)
    }
    setModalProducto(false)
    setSavingProducto(false)
  }

  // ── Guardar pedido ─────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.cliente.trim())                                { setError('El cliente es obligatorio'); return }
    if (form.items.length === 0)                             { setError('Agregá al menos un producto'); return }
    if (form.items.some(it => !it.producto.trim()))          { setError('Todos los ítems deben tener un producto'); return }
    if (form.items.every(it => totalTalles(it.talles) === 0)) { setError('Ingresá al menos una cantidad de talle'); return }

    setSaving(true)
    setError('')

    const firstItem = form.items[0]
    const datos = {
      producto:     firstItem.producto.trim(),
      producto_id:  firstItem.producto_id || null,
      cliente:      form.cliente.trim(),
      etapa_actual: form.etapa_actual,
      fecha_pedido: form.fecha_pedido || null,
      fecha:        form.fecha || null,
      talles:       firstItem.talles,
      items:        form.items,
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
    if (vistaFicha?.id === editing) {
      const { data } = await supabase.from('pedidos').select('*').eq('id', editing).single()
      if (data) setVistaFicha(data)
    }
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
    const label = p.items?.length > 0 ? p.items[0].producto : p.producto
    if (!window.confirm(`¿Eliminar el pedido de "${label}" para ${p.cliente}?`)) return
    await supabase.from('pedidos').delete().eq('id', p.id)
    if (vistaFicha?.id === p.id) setVistaFicha(null)
    fetchPedidos()
  }

  // ── Filtros ────────────────────────────────────────────────────────────────

  const filtered = pedidos.filter(p => {
    const q = search.toLowerCase()
    const itemsMatch = (p.items || []).some(it => it.producto?.toLowerCase().includes(q))
    const matchSearch = !q || p.producto?.toLowerCase().includes(q) || p.cliente?.toLowerCase().includes(q) || itemsMatch
    const matchEtapa  = !filtroEtapa || p.etapa_actual === filtroEtapa
    return matchSearch && matchEtapa
  })

  const enProduccion = pedidos.filter(p => p.etapa_actual !== 'entrega' && p.etapa_actual !== 'cancelado').length
  const etapaInfo = (id) => ETAPAS.find(e => e.id === id) || { label: id, color: 'badge-gray' }

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
              {pedidos.reduce((a, p) => a + pedidoTotal(p), 0)}
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
                    <th>Pedido</th>
                    <th>Entrega</th>
                    <th>Detalle</th>
                    <th style={{ width: 140 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const ei = etapaInfo(p.etapa_actual)
                    const puedeAvanzar = FLUJO_ETAPAS.indexOf(p.etapa_actual) < FLUJO_ETAPAS.length - 1
                    const items = p.items && p.items.length > 0 ? p.items : null
                    return (
                      <tr key={p.id} onClick={() => setVistaFicha(vistaFicha?.id === p.id ? null : p)} style={{ cursor: 'pointer' }}>
                        <td>
                          <strong>{items ? items[0].producto : p.producto}</strong>
                          {items && items.length > 1 && (
                            <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 6 }}>+{items.length - 1} más</span>
                          )}
                        </td>
                        <td>{p.cliente}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <select
                            value={p.etapa_actual || ''}
                            onChange={e => cambiarEtapa(p, e.target.value, e)}
                            className={`badge ${ei.color}`}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '2px 4px', appearance: 'auto' }}
                          >
                            {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                          </select>
                        </td>
                        <td><strong>{pedidoTotal(p)} u.</strong></td>
                        <td style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtFecha(p.fecha_pedido)}</td>
                        <td style={{ color: p.fecha < new Date().toISOString().split('T')[0] && p.etapa_actual !== 'entrega' ? 'var(--danger)' : undefined }}>
                          {fmtFecha(p.fecha)}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text2)' }}>
                          {items
                            ? items.map((it, i) => (
                                <div key={i}>
                                  {items.length > 1 && <span style={{ fontWeight: 600 }}>{it.producto}: </span>}
                                  {Object.entries(it.talles).filter(([, c]) => c > 0).map(([t, c]) => `${t}:${c}`).join(' ')}
                                </div>
                              ))
                            : p.talles
                              ? Object.entries(p.talles).map(([t, c]) => `${t}:${c}`).join(' ')
                              : '—'
                          }
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

        {/* ── FICHA DEL PEDIDO ── */}
        {vistaFicha && (() => {
          const ei = etapaInfo(vistaFicha.etapa_actual)
          const items = vistaFicha.items && vistaFicha.items.length > 0
            ? vistaFicha.items
            : [{ producto: vistaFicha.producto, talles: vistaFicha.talles || {} }]
          return (
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 15 }}>
                  📋 {items[0].producto}
                  {items.length > 1 && <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 8 }}>+{items.length - 1} ítem{items.length > 2 ? 's' : ''}</span>}
                  <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 10, fontWeight: 400 }}>— {vistaFicha.cliente}</span>
                </strong>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(vistaFicha)}>✏ Editar</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setVistaFicha(null)}>✕</button>
                </div>
              </div>
              <div style={{ padding: 16 }}>

                {/* Metadatos */}
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 20, fontSize: 13 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Cliente</div>
                    <strong>{vistaFicha.cliente}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Etapa</div>
                    <span className={`badge ${ei.color}`}>{ei.label}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Total</div>
                    <strong style={{ color: 'var(--accent)' }}>{pedidoTotal(vistaFicha)} u.</strong>
                  </div>
                  {vistaFicha.fecha_pedido && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Fecha pedido</div>
                      <span>{fmtFecha(vistaFicha.fecha_pedido)}</span>
                    </div>
                  )}
                  {vistaFicha.fecha && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Entrega</div>
                      <span style={{ color: vistaFicha.fecha < new Date().toISOString().split('T')[0] && vistaFicha.etapa_actual !== 'entrega' ? 'var(--danger)' : undefined }}>
                        {fmtFecha(vistaFicha.fecha)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Ítems con talles */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>📦 Productos</div>
                  {items.map((it, i) => {
                    const tallesActivos = Object.entries(it.talles || {}).filter(([, c]) => Number(c) > 0)
                    return (
                      <div key={i} style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                          {it.producto || '—'}
                          <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text2)', fontWeight: 400 }}>
                            {totalTalles(it.talles)} u. en total
                          </span>
                        </div>
                        {tallesActivos.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {tallesActivos.map(([t, c]) => (
                              <div key={t} style={{ textAlign: 'center', minWidth: 48, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 8px' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>{t}</div>
                                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{c}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>Sin talles cargados</span>
                        )}
                      </div>
                    )
                  })}
                </div>

              </div>
            </div>
          )
        })()}
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

              {/* Cliente + metadatos */}
              <div className="form-grid">
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Cliente *</label>
                  <input
                    value={clienteQuery}
                    onChange={e => onClienteInput(e.target.value)}
                    onBlur={onClienteBlur}
                    onFocus={() => clienteQuery.trim() && contactosResults.length > 0 && setShowClienteDropdown(true)}
                    placeholder="Nombre del cliente"
                    autoComplete="off"
                    autoFocus
                  />
                  {searchingContactos && (
                    <div style={{ position: 'absolute', right: 10, top: 34, fontSize: 11, color: 'var(--text2)' }}>Buscando...</div>
                  )}
                  {showClienteDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', maxHeight: 220, overflowY: 'auto' }}>
                      {contactosResults.map(c => (
                        <div
                          key={c.id}
                          onMouseDown={() => seleccionarContacto(c)}
                          style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                          <span>{c.nombre}</span>
                          {c.tipo && <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>{c.tipo}</span>}
                        </div>
                      ))}
                      <div
                        onMouseDown={abrirModalContacto}
                        style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}
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
                    {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha del pedido</label>
                  <input type="date" value={form.fecha_pedido} onChange={e => setF('fecha_pedido', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Fecha de entrega</label>
                  <input type="date" value={form.fecha} onChange={e => setF('fecha', e.target.value)} />
                </div>
              </div>

              {/* Ítems */}
              <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Productos del pedido</div>
              {form.items.map((item, i) => (
                <ItemPedido
                  key={i}
                  item={item}
                  index={i}
                  total={form.items.length}
                  clienteId={form.cliente_id}
                  onUpdate={changes => updateItem(i, changes)}
                  onDelete={() => deleteItem(i)}
                  onOpenNewProduct={(query, idx) => abrirModalProductoParaItem(query, idx)}
                />
              ))}
              <button className="btn btn-secondary btn-sm" style={{ marginBottom: 12 }} onClick={addItem}>
                + Agregar producto
              </button>

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
                <input value={nuevoContacto.nombre} onChange={e => setNuevoContacto(c => ({ ...c, nombre: e.target.value }))} placeholder="Nombre del cliente" autoFocus />
              </div>
              <div className="form-group">
                <label>Tipo <span style={{ color: 'var(--text2)', fontWeight: 400 }}>(opcional)</span></label>
                <input value={nuevoContacto.tipo} onChange={e => setNuevoContacto(c => ({ ...c, tipo: e.target.value }))} placeholder="ej: Club, Empresa, Particular..." />
              </div>
              {errorContacto && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>⚠ {errorContacto}</p>}
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
                <input value={nuevoProducto.nombre} onChange={e => setNuevoProducto(p => ({ ...p, nombre: e.target.value }))} placeholder="ej: Campera, Bata, Canguro..." autoFocus />
              </div>
              <div className="form-group">
                <label>Código <span style={{ color: 'var(--text2)', fontWeight: 400 }}>(opcional)</span></label>
                <input value={nuevoProducto.codigo} onChange={e => setNuevoProducto(p => ({ ...p, codigo: e.target.value }))} placeholder="ej: CAM-001" />
              </div>
              <div className="form-group">
                <label>Tabla de talles</label>
                <select value={nuevoProducto.tabla} onChange={e => setNuevoProducto(p => ({ ...p, tabla: e.target.value }))}>
                  {Object.entries(TABLAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {errorProducto && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>⚠ {errorProducto}</p>}
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
