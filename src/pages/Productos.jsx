import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const TABLAS = {
  adulto: { label: 'Adulto', talles: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  nino: { label: 'Niño', talles: ['2', '4', '6', '8', '10', '12', '14', '16'] },
  malla: { label: 'Malla', talles: ['40', '42', '44', '46', '48', '50', '52'] },
  mallaesp: { label: 'Malla Especial', talles: ['54', '56', '58'] }
}

const PROCESOS_DISPONIBLES = [
  { id: 'corte', label: '✂ Corte', icon: '✂' },
  { id: 'bordado', label: '🪡 Bordado', icon: '🪡' },
  { id: 'estampado', label: '🎨 Estampado', icon: '🎨' },
  { id: 'sublimado', label: '✨ Sublimado', icon: '✨' },
  { id: 'taller', label: '🧵 Taller', icon: '🧵' },
  { id: 'entrega', label: '📦 Entrega', icon: '📦' },
]

function PiezaRow({ pieza, index, onEdit, onDelete, onDragStart, onDragOver, onDrop }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState({ ...pieza })

  function save() { onEdit(index, local); setEditing(false) }

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, background: 'var(--bg3)', padding: 6, borderRadius: 'var(--radius)', flexWrap: 'wrap' }}>
        <input value={local.nombre} onChange={e => setLocal(f => ({ ...f, nombre: e.target.value }))} style={{ flex: 2, minWidth: 100 }} autoFocus />
        <input value={local.mult} onChange={e => setLocal(f => ({ ...f, mult: e.target.value.replace(/[^0-9]/g, '') }))} style={{ width: 45 }} placeholder="1" />
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>x prenda</span>
        <select value={local.tela_rol} onChange={e => setLocal(f => ({ ...f, tela_rol: e.target.value }))} style={{ width: 90 }}>
          <option value="tela1">Tela 1</option>
          <option value="tela2">Tela 2</option>
          <option value="rib">RIB</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={save}>✔</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>✕</button>
      </div>
    )
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index) }}
      onDrop={() => onDrop(index)}
      style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, fontSize: 12, cursor: 'grab', padding: '4px 6px', borderRadius: 'var(--radius)', background: 'var(--bg2)' }}
    >
      <span style={{ color: 'var(--text2)', fontSize: 14 }}>⠿</span>
      <span style={{ flex: 2 }}>{pieza.nombre}</span>
      <span style={{ color: 'var(--text2)' }}>×{pieza.mult}</span>
      <span style={{ color: 'var(--accent)', minWidth: 60 }}>
        {pieza.tela_rol === 'tela1' ? 'Tela 1' : pieza.tela_rol === 'tela2' ? 'Tela 2' : 'RIB'}
      </span>
      <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏</button>
      <button className="btn btn-danger btn-sm" onClick={() => onDelete(index)}>✕</button>
    </div>
  )
}

function ProcesoRow({ proceso, index, onEdit, onDelete, onDragStart, onDragOver, onDrop }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState({ ...proceso })

  function save() { onEdit(index, local); setEditing(false) }

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, background: 'var(--bg3)', padding: 6, borderRadius: 'var(--radius)', flexWrap: 'wrap' }}>
        <select value={local.id} onChange={e => {
          const p = PROCESOS_DISPONIBLES.find(x => x.id === e.target.value)
          setLocal(f => ({ ...f, id: e.target.value, label: p?.label || e.target.value }))
        }} style={{ width: 130 }}>
          {PROCESOS_DISPONIBLES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <input value={local.nota || ''} onChange={e => setLocal(f => ({ ...f, nota: e.target.value }))} placeholder="nota (ej: solo delantera)" style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={save}>✔</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>✕</button>
      </div>
    )
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index) }}
      onDrop={() => onDrop(index)}
      style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, fontSize: 12, cursor: 'grab', padding: '6px 8px', borderRadius: 'var(--radius)', background: 'var(--bg2)' }}
    >
      <span style={{ color: 'var(--text2)', fontSize: 14 }}>⠿</span>
      <span style={{ fontWeight: 600, minWidth: 110 }}>{proceso.label}</span>
      {proceso.nota && <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>— {proceso.nota}</span>}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(index)}>✕</button>
      </div>
    </div>
  )
}

export default function Productos({ onMenuClick }) {
  const [productos, setProductos] = useState([])
  const [telas, setTelas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [vistaFicha, setVistaFicha] = useState(null)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterProvTela, setFilterProvTela] = useState('')
  const [filterProvTela2, setFilterProvTela2] = useState('')
  const [filterProvRib, setFilterProvRib] = useState('')
  const dragSrcPieza = useRef(null)
  const dragSrcProceso = useRef(null)

  const emptyForm = {
    nombre: '', codigo: '', tabla: 'adulto', base_id: '',
    tela1_id: '', tela2_id: '', rib_id: '',
    piezas: [],
    procesos: [
      { id: 'corte', label: '✂ Corte', nota: '' },
      { id: 'taller', label: '🧵 Taller', nota: '' },
      { id: 'entrega', label: '📦 Entrega', nota: '' }
    ],
    avios_medidas: [],
    terminaciones: { grifaTalle: false, grifa: false, talle: false },
    terminaciones_extra: [],
    notas: ''
  }
  const [form, setForm] = useState(emptyForm)
  const [nuevaPieza, setNuevaPieza] = useState({ nombre: '', mult: '1', tela_rol: 'tela1' })
  const [nuevoProceso, setNuevoProceso] = useState({ id: 'bordado', nota: '' })
  const [nuevoAvio, setNuevoAvio] = useState({ nombre: '', unit: 'cm', todos: '', ancho: '' })
  const [nuevaTerm, setNuevaTerm] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: p }, { data: t }, { data: prov }] = await Promise.all([
      supabase.from('productos').select('*').order('nombre'),
      supabase.from('telas').select('id, tipo, color, unidad, proveedor_id, proveedor').order('tipo'),
      supabase.from('proveedores').select('id, nombre').order('nombre')
    ])
    setProductos(p || [])
    setTelas(t || [])
    setProveedores(prov || [])
    setLoading(false)
  }

  function telasFiltradas(provId) {
    if (!provId) return telas
    return telas.filter(t => String(t.proveedor_id) === String(provId))
  }

  function telaLabel(id) {
    const t = telas.find(x => x.id === parseInt(id))
    return t ? `${t.tipo}${t.color ? ` · ${t.color}` : ''}` : '—'
  }

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setFilterProvTela(''); setFilterProvTela2(''); setFilterProvRib('')
    setModal(true)
  }

  function openEdit(p) {
    setEditing(p.id)
    const t1 = telas.find(t => t.id === p.tela1_id)
    const t2 = telas.find(t => t.id === p.tela2_id)
    const rib = telas.find(t => t.id === p.rib_id)
    setFilterProvTela(t1?.proveedor_id ? String(t1.proveedor_id) : '')
    setFilterProvTela2(t2?.proveedor_id ? String(t2.proveedor_id) : '')
    setFilterProvRib(rib?.proveedor_id ? String(rib.proveedor_id) : '')
    setForm({
      nombre: p.nombre || '',
      codigo: p.codigo || '',
      tabla: p.tabla || 'adulto',
      base_id: p.base_id || '',
      tela1_id: p.tela1_id || '',
      tela2_id: p.tela2_id || '',
      rib_id: p.rib_id || '',
      piezas: p.piezas || [],
      procesos: p.procesos || emptyForm.procesos,
      avios_medidas: p.avios_medidas || [],
      terminaciones: p.terminaciones || { grifaTalle: false, grifa: false, talle: false },
      terminaciones_extra: p.terminaciones_extra || [],
      notas: p.notas || ''
    })
    setModal(true)
  }

  function aplicarBase(baseId) {
    if (!baseId) { setForm(f => ({ ...f, base_id: '' })); return }
    const base = productos.find(p => p.id === parseInt(baseId))
    if (!base) return
    const t1 = telas.find(t => t.id === base.tela1_id)
    const t2 = telas.find(t => t.id === base.tela2_id)
    const rib = telas.find(t => t.id === base.rib_id)
    setFilterProvTela(t1?.proveedor_id ? String(t1.proveedor_id) : '')
    setFilterProvTela2(t2?.proveedor_id ? String(t2.proveedor_id) : '')
    setFilterProvRib(rib?.proveedor_id ? String(rib.proveedor_id) : '')
    setForm(f => ({
      ...f,
      base_id: baseId,
      tabla: base.tabla || f.tabla,
      tela1_id: base.tela1_id || '',
      tela2_id: base.tela2_id || '',
      rib_id: base.rib_id || '',
      piezas: (base.piezas || []).map(x => ({ ...x })),
      procesos: (base.procesos || emptyForm.procesos).map(x => ({ ...x })),
      avios_medidas: (base.avios_medidas || []).map(x => ({ ...x, medidas: { ...x.medidas } })),
      terminaciones: { ...(base.terminaciones || {}) },
      terminaciones_extra: (base.terminaciones_extra || []).map(x => ({ ...x }))
    }))
  }

  // Drag piezas
  function handleDragStartPieza(i) { dragSrcPieza.current = i }
  function handleDropPieza(i) {
    if (dragSrcPieza.current === null || dragSrcPieza.current === i) return
    setForm(f => {
      const arr = [...f.piezas]
      const [m] = arr.splice(dragSrcPieza.current, 1)
      arr.splice(i, 0, m)
      dragSrcPieza.current = null
      return { ...f, piezas: arr }
    })
  }

  // Drag procesos
  function handleDragStartProceso(i) { dragSrcProceso.current = i }
  function handleDropProceso(i) {
    if (dragSrcProceso.current === null || dragSrcProceso.current === i) return
    setForm(f => {
      const arr = [...f.procesos]
      const [m] = arr.splice(dragSrcProceso.current, 1)
      arr.splice(i, 0, m)
      dragSrcProceso.current = null
      return { ...f, procesos: arr }
    })
  }

  function editPieza(i, v) { setForm(f => ({ ...f, piezas: f.piezas.map((p, j) => j === i ? { ...v, mult: parseInt(v.mult) || 1 } : p) })) }
  function deletePieza(i) { setForm(f => ({ ...f, piezas: f.piezas.filter((_, j) => j !== i) })) }
  function editProceso(i, v) { setForm(f => ({ ...f, procesos: f.procesos.map((p, j) => j === i ? v : p) })) }
  function deleteProceso(i) { setForm(f => ({ ...f, procesos: f.procesos.filter((_, j) => j !== i) })) }

  function agregarPieza() {
    if (!nuevaPieza.nombre) return
    setForm(f => ({ ...f, piezas: [...f.piezas, { ...nuevaPieza, mult: parseInt(nuevaPieza.mult) || 1 }] }))
    setNuevaPieza({ nombre: '', mult: '1', tela_rol: 'tela1' })
  }

  function agregarProceso() {
    const p = PROCESOS_DISPONIBLES.find(x => x.id === nuevoProceso.id)
    setForm(f => ({ ...f, procesos: [...f.procesos, { id: nuevoProceso.id, label: p?.label || nuevoProceso.id, nota: nuevoProceso.nota }] }))
    setNuevoProceso({ id: 'bordado', nota: '' })
  }

  function agregarAvio() {
    if (!nuevoAvio.nombre) return
    const talles = TABLAS[form.tabla]?.talles || []
    const medidas = {}
    talles.forEach(t => { medidas[t] = '' })
    setForm(f => ({ ...f, avios_medidas: [...f.avios_medidas, { nombre: nuevoAvio.nombre, unit: nuevoAvio.unit, todos: nuevoAvio.todos, ancho: nuevoAvio.ancho, medidas }] }))
    setNuevoAvio({ nombre: '', unit: 'cm', todos: '', ancho: '' })
  }

  function updateMedidaAvio(ai, talle, valor) {
    setForm(f => ({ ...f, avios_medidas: f.avios_medidas.map((a, i) => i !== ai ? a : { ...a, medidas: { ...a.medidas, [talle]: valor } }) }))
  }

  function updateTodosAvio(ai, valor) {
    setForm(f => ({ ...f, avios_medidas: f.avios_medidas.map((a, i) => { if (i !== ai) return a; const medidas = {}; Object.keys(a.medidas).forEach(t => { medidas[t] = valor }); return { ...a, todos: valor, medidas } }) }))
  }

  function updateAnchoAvio(ai, valor) {
    setForm(f => ({ ...f, avios_medidas: f.avios_medidas.map((a, i) => i !== ai ? a : { ...a, ancho: valor }) }))
  }

  function agregarTerminacion() {
    if (!nuevaTerm) return
    setForm(f => ({ ...f, terminaciones_extra: [...f.terminaciones_extra, { nombre: nuevaTerm }] }))
    setNuevaTerm('')
  }

  function generarCodigo(nombre) {
    const pre = { canguro: 'CANG', remera: 'REM', buzo: 'BUZO', pantalon: 'PANT', malla: 'MALL', polo: 'POLO', short: 'SHORT', chomba: 'CHOM' }
    let p = 'PROD'
    for (const [k, v] of Object.entries(pre)) { if (nombre.toLowerCase().includes(k)) { p = v; break } }
    const nums = productos.filter(x => x.codigo?.startsWith(p)).map(x => { const m = x.codigo?.match(/\d+$/); return m ? parseInt(m[0]) : 0 })
    return p + '-' + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')
  }

  async function handleSave() {
    if (!form.nombre) return alert('El nombre del producto es obligatorio')
    setSaving(true)
    const datos = {
      nombre: form.nombre,
      codigo: form.codigo || generarCodigo(form.nombre),
      tabla: form.tabla,
      base_id: parseInt(form.base_id) || null,
      tela1_id: parseInt(form.tela1_id) || null,
      tela2_id: parseInt(form.tela2_id) || null,
      rib_id: parseInt(form.rib_id) || null,
      piezas: form.piezas,
      procesos: form.procesos,
      avios_medidas: form.avios_medidas,
      terminaciones: form.terminaciones,
      terminaciones_extra: form.terminaciones_extra,
      notas: form.notas || null
    }
    if (editing) {
      await supabase.from('productos').update(datos).eq('id', editing)
    } else {
      await supabase.from('productos').insert(datos)
    }
    setSaving(false)
    setModal(false)
    // Actualizar vista ficha si estaba abierta
    if (vistaFicha?.id === editing) {
      const { data } = await supabase.from('productos').select('*').eq('id', editing).single()
      if (data) setVistaFicha(data)
    }
    fetchAll()
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('¿Borrar este producto?')) return
    await supabase.from('productos').delete().eq('id', id)
    if (vistaFicha?.id === id) setVistaFicha(null)
    fetchAll()
  }

  const filtered = productos.filter(p =>
    !search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.codigo?.toLowerCase().includes(search.toLowerCase())
  )

  const talles = TABLAS[form.tabla]?.talles || []

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>📦 Productos</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo producto</button>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">{productos.length}</div><div className="stat-label">Productos</div></div>
          <div className="stat-card"><div className="stat-value">{productos.filter(p => !p.base_id).length}</div><div className="stat-label">Base</div></div>
          <div className="stat-card"><div className="stat-value">{productos.filter(p => p.base_id).length}</div><div className="stat-label">Derivados</div></div>
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 280 }}>
              <input placeholder="Buscar producto o código..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? <div className="loading"><div className="spinner" /> Cargando...</div>
          : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📦</div>
              <h3>No hay productos</h3>
              <p>Creá tu primer producto con el botón de arriba</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Código</th><th>Nombre</th><th>Base/Derivado</th>
                    <th>Talles</th><th>Procesos</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const base = p.base_id ? productos.find(x => x.id === p.base_id) : null
                    return (
                      <tr key={p.id} onClick={() => setVistaFicha(vistaFicha?.id === p.id ? null : p)} style={{ cursor: 'pointer' }}>
                        <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{p.codigo || '—'}</td>
                        <td><strong>{p.nombre}</strong></td>
                        <td style={{ fontSize: 11 }}>
                          {base ? <span className="badge badge-blue">hijo · {base.nombre}</span>
                            : <span className="badge badge-yellow">base</span>}
                        </td>
                        <td style={{ fontSize: 11 }}>{TABLAS[p.tabla]?.label || p.tabla}</td>
                        <td style={{ fontSize: 11 }}>
                          {(p.procesos || []).map(x => x.icon || x.label?.split(' ')[0]).join(' → ')}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>✏</button>
                          <button className="btn btn-danger btn-sm" style={{ marginLeft: 4 }} onClick={e => handleDelete(p.id, e)}>🗑</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FICHA TÉCNICA */}
        {vistaFicha && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 15 }}>📋 {vistaFicha.nombre} <span style={{ fontSize: 12, color: 'var(--text2)' }}>{TABLAS[vistaFicha.tabla]?.label}</span></strong>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(vistaFicha)}>✏ Editar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setVistaFicha(null)}>✕</button>
              </div>
            </div>
            <div style={{ padding: 16 }}>

              {/* Procesos */}
              {vistaFicha.procesos?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>⚙ Flujo de producción</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {vistaFicha.procesos.map((p, i) => (
                      <React.Fragment key={i}>
                        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 13 }}>
                          <div style={{ fontWeight: 700 }}>{p.label}</div>
                          {p.nota && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{p.nota}</div>}
                        </div>
                        {i < vistaFicha.procesos.length - 1 && <span style={{ color: 'var(--text2)', fontSize: 18 }}>→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Telas */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>🧶 Telas</div>
                {[['Tela 1', vistaFicha.tela1_id], ['Tela 2', vistaFicha.tela2_id], ['RIB', vistaFicha.rib_id]].map(([rol, id]) =>
                  id ? (
                    <div key={rol} style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 700, minWidth: 70, color: 'var(--text2)', fontSize: 14 }}>{rol}</span>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{telaLabel(id)}</span>
                    </div>
                  ) : null
                )}
              </div>

              {/* Piezas */}
              {vistaFicha.piezas?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>✂ Piezas de corte</div>
                  {vistaFicha.piezas.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 700, flex: 2, fontSize: 14 }}>{p.nombre}</span>
                      <span style={{ color: 'var(--text2)', fontSize: 13 }}>×{p.mult}</span>
                      <span style={{ color: 'var(--accent)', fontSize: 13, minWidth: 60 }}>
                        {p.tela_rol === 'tela1' ? 'Tela 1' : p.tela_rol === 'tela2' ? 'Tela 2' : 'RIB'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Avíos con medidas */}
              {vistaFicha.avios_medidas?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>📐 Medidas por talle</div>
                  {vistaFicha.avios_medidas.map((a, i) => (
                    <div key={i} style={{ marginBottom: 20 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{a.nombre}</div>
                      {a.ancho && (
                        <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 6, paddingLeft: 12 }}>
                          Ancho: <strong>{a.ancho} {a.unit}</strong>
                        </div>
                      )}
                      {a.todos ? (
                        <div style={{ fontSize: 16, color: 'var(--success)', paddingLeft: 12 }}>
                          Todos los talles → <strong>{a.todos} {a.unit}</strong>
                        </div>
                      ) : (
                        <div style={{ paddingLeft: 12 }}>
                          {TABLAS[vistaFicha.tabla]?.talles.map(t =>
                            a.medidas?.[t] ? (
                              <div key={t} style={{ fontSize: 16, padding: '5px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ color: 'var(--text2)', minWidth: 45, fontWeight: 600 }}>T{t}</span>
                                <strong style={{ fontSize: 18 }}>{a.medidas[t]} {a.unit}</strong>
                              </div>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Terminaciones */}
              {(() => {
                const terms = []
                if (vistaFicha.terminaciones?.grifaTalle) terms.push('Grifa con talle')
                if (vistaFicha.terminaciones?.grifa) terms.push('Grifa sola')
                if (vistaFicha.terminaciones?.talle) terms.push('Talle solo')
                ;(vistaFicha.terminaciones_extra || []).forEach(t => terms.push(t.nombre))
                return terms.length > 0 ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>🏷 Terminaciones</div>
                    {terms.map((t, i) => (
                      <div key={i} style={{ fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>• {t}</div>
                    ))}
                  </div>
                ) : null
              })()}

              {vistaFicha.notas && (
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>
                  <strong>Notas:</strong> {vistaFicha.notas}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏ Editar producto' : '📦 Nuevo producto'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="ej: Canguro IEP" autoFocus />
                </div>
                <div className="form-group">
                  <label>Código (auto si vacío)</label>
                  <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="ej: CANG-001" />
                </div>
                <div className="form-group">
                  <label>Tabla de talles</label>
                  <select value={form.tabla} onChange={e => setForm(f => ({ ...f, tabla: e.target.value }))}>
                    <option value="adulto">Adulto (XS-XXL)</option>
                    <option value="nino">Niño (2-16)</option>
                    <option value="malla">Malla (40-52)</option>
                    <option value="mallaesp">Malla Especial (54-58)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Producto base (opcional)</label>
                  <select value={form.base_id} onChange={e => aplicarBase(e.target.value)}>
                    <option value="">— Sin base —</option>
                    {productos.filter(p => p.id !== editing).map(p => (
                      <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Procesos */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>⚙ Flujo de producción <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 400 }}>arrastrá para reordenar</span></div>
                {form.procesos.map((p, i) => (
                  <ProcesoRow
                    key={i}
                    proceso={p}
                    index={i}
                    onEdit={editProceso}
                    onDelete={deleteProceso}
                    onDragStart={handleDragStartProceso}
                    onDragOver={() => {}}
                    onDrop={handleDropProceso}
                  />
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <select value={nuevoProceso.id} onChange={e => setNuevoProceso(f => ({ ...f, id: e.target.value }))} style={{ width: 140 }}>
                    {PROCESOS_DISPONIBLES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <input value={nuevoProceso.nota} onChange={e => setNuevoProceso(f => ({ ...f, nota: e.target.value }))} placeholder="nota (ej: solo delantera)" style={{ flex: 1 }} />
                  <button className="btn btn-secondary btn-sm" onClick={agregarProceso}>+ Agregar</button>
                </div>
              </div>

              {/* Telas */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 10 }}>🧶 Telas del producto</div>
                {[
                  { label: 'Tela 1', field: 'tela1_id', prov: filterProvTela, setProv: setFilterProvTela },
                  { label: 'Tela 2', field: 'tela2_id', prov: filterProvTela2, setProv: setFilterProvTela2 },
                  { label: 'RIB', field: 'rib_id', prov: filterProvRib, setProv: setFilterProvRib },
                ].map(({ label, field, prov, setProv }) => (
                  <div key={field} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select value={prov} onChange={e => { setProv(e.target.value); setForm(f => ({ ...f, [field]: '' })) }} style={{ width: 160 }}>
                        <option value="">Todos los proveedores</option>
                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                      <select value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={{ flex: 1 }}>
                        <option value="">— Sin {label} —</option>
                        {telasFiltradas(prov).map(t => (
                          <option key={t.id} value={t.id}>{t.tipo}{t.color ? ` · ${t.color}` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Piezas */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>✂ Piezas de corte <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 400 }}>arrastrá para reordenar · clic ✏ para editar</span></div>
                {form.piezas.map((p, i) => (
                  <PiezaRow key={i} pieza={p} index={i} onEdit={editPieza} onDelete={deletePieza}
                    onDragStart={handleDragStartPieza} onDragOver={() => {}} onDrop={handleDropPieza} />
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <input value={nuevaPieza.nombre} onChange={e => setNuevaPieza(f => ({ ...f, nombre: e.target.value }))} placeholder="ej: Delantera" style={{ flex: 2, minWidth: 100 }} onKeyDown={e => e.key === 'Enter' && agregarPieza()} />
                  <input value={nuevaPieza.mult} onChange={e => setNuevaPieza(f => ({ ...f, mult: e.target.value.replace(/[^0-9]/g, '') }))} style={{ width: 45 }} placeholder="1" />
                  <span style={{ fontSize: 11, color: 'var(--text2)', alignSelf: 'center' }}>x prenda</span>
                  <select value={nuevaPieza.tela_rol} onChange={e => setNuevaPieza(f => ({ ...f, tela_rol: e.target.value }))} style={{ width: 90 }}>
                    <option value="tela1">Tela 1</option>
                    <option value="tela2">Tela 2</option>
                    <option value="rib">RIB</option>
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={agregarPieza}>+ Agregar</button>
                </div>
              </div>

              {/* Avíos con medidas */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>📐 Avíos y medidas por talle</div>
                {form.avios_medidas.map((a, ai) => (
                  <div key={ai} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ fontSize: 13 }}>{a.nombre} ({a.unit})</strong>
                      <button className="btn btn-danger btn-sm" onClick={() => setForm(f => ({ ...f, avios_medidas: f.avios_medidas.filter((_, j) => j !== ai) }))}>✕</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 11, color: 'var(--text2)' }}>Ancho (igual para todos):</label>
                      <input value={a.ancho || ''} onChange={e => updateAnchoAvio(ai, e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="ej: 6" style={{ width: 70 }} />
                      <span style={{ fontSize: 11, color: 'var(--text2)' }}>{a.unit}</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 11, color: 'var(--text2)' }}>Largo igual para todos los talles:</label>
                      <input value={a.todos || ''} onChange={e => updateTodosAvio(ai, e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="ej: 120" style={{ width: 80, marginLeft: 8 }} />
                      <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 4 }}>{a.unit} — dejá vacío para poner por talle</span>
                    </div>
                    {!a.todos && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {talles.map(t => (
                          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, minWidth: 40, color: 'var(--accent)' }}>T{t}</span>
                            <input value={a.medidas?.[t] || ''} onChange={e => updateMedidaAvio(ai, t, e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0" style={{ width: 80 }} />
                            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{a.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <input value={nuevoAvio.nombre} onChange={e => setNuevoAvio(f => ({ ...f, nombre: e.target.value }))} placeholder="ej: Puño, Faja, Elástico..." style={{ flex: 2 }} onKeyDown={e => e.key === 'Enter' && agregarAvio()} />
                  <select value={nuevoAvio.unit} onChange={e => setNuevoAvio(f => ({ ...f, unit: e.target.value }))} style={{ width: 70 }}>
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                    <option value="unidad">u.</option>
                    <option value="g">g</option>
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={agregarAvio}>+ Agregar</button>
                </div>
              </div>

              {/* Terminaciones */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>🏷 Terminaciones y etiquetas</div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
                  {[['grifaTalle', 'Grifa con talle'], ['grifa', 'Grifa sola'], ['talle', 'Talle solo']].map(([k, l]) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.terminaciones?.[k] || false} onChange={e => setForm(f => ({ ...f, terminaciones: { ...f.terminaciones, [k]: e.target.checked } }))} />
                      {l}
                    </label>
                  ))}
                </div>
                {form.terminaciones_extra.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ flex: 1 }}>{t.nombre}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => setForm(f => ({ ...f, terminaciones_extra: f.terminaciones_extra.filter((_, j) => j !== i) }))}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input value={nuevaTerm} onChange={e => setNuevaTerm(e.target.value)} placeholder="ej: Planchado cartera con entretela" style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && agregarTerminacion()} />
                  <button className="btn btn-secondary btn-sm" onClick={agregarTerminacion}>+ Agregar</button>
                </div>
              </div>

              <div className="form-group">
                <label>Notas</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Molde, observaciones..." style={{ height: 60 }} />
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
