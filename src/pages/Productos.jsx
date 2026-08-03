import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

function useIsTouch() {
  const [isTouch, setIsTouch] = useState(() => window.matchMedia('(hover: none)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(hover: none)')
    const handler = e => setIsTouch(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isTouch
}

const TABLAS = {
  adulto:   { label: 'Adulto',         talles: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  nino:     { label: 'Niño',           talles: ['2', '4', '6', '8', '10', '12', '14', '16'] },
  malla:    { label: 'Malla',          talles: ['40', '42', '44', '46', '48', '50', '52'] },
  mallaesp: { label: 'Malla Especial', talles: ['54', '56', '58'] },
}

const PROCESOS_DISPONIBLES = [
  { id: 'corte',      label: '✂ Corte',         icon: '✂'  },
  { id: 'bordado',    label: '🪡 Bordado',        icon: '🪡' },
  { id: 'estampado',  label: '🎨 Estampado',      icon: '🎨' },
  { id: 'sublimado',  label: '✨ Sublimado',       icon: '✨' },
  { id: 'taller',     label: '🧵 Taller',         icon: '🧵' },
  { id: 'planchado',  label: '🔥 Planchado',      icon: '🔥' },
  { id: 'ojal_boton', label: '🪢 Ojal y botón',   icon: '🪢' },
  { id: 'entrega',    label: '📦 Entrega',         icon: '📦' },
]

function telaRolLabel(rol, telasExtra) {
  if (rol === 'tela1') return 'Tela 1'
  if (rol === 'tela2') return 'Tela 2'
  if (rol === 'rib') return 'RIB'
  if (rol === 'entretela') return 'Entretela'
  const m = rol?.match(/^tela(\d+)$/)
  if (m) {
    const idx = parseInt(m[1]) - 3
    return telasExtra?.[idx]?.label || `Tela ${m[1]}`
  }
  return rol || '—'
}

function getTelaRoles(telasExtra) {
  const roles = [
    { value: 'tela1', label: 'Tela 1' },
    { value: 'tela2', label: 'Tela 2' },
  ]
  ;(telasExtra || []).forEach((te, i) => {
    roles.push({ value: `tela${i + 3}`, label: te.label || `Tela ${i + 3}` })
  })
  roles.push({ value: 'rib',       label: 'RIB'       })
  roles.push({ value: 'entretela', label: 'Entretela' })
  return roles
}

// ─── AvioSearch ───────────────────────────────────────────────────────────────

function AvioSearch({ onSelect }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [show, setShow]       = useState(false)
  const timeout = useRef(null)

  function onInput(val) {
    setQuery(val)
    if (timeout.current) clearTimeout(timeout.current)
    if (!val.trim()) { setResults([]); setShow(false); return }
    setShow(true)
    timeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('avios')
        .select('id, nombre, tipo, descripcion')
        .ilike('nombre', `%${val.trim()}%`)
        .limit(10)
      setResults(data || [])
    }, 250)
  }

  function seleccionar(av) {
    onSelect(av)
    setQuery('')
    setResults([])
    setShow(false)
  }

  return (
    <div style={{ position: 'relative', marginTop: 8 }}>
      <input
        value={query}
        onChange={e => onInput(e.target.value)}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        placeholder="Buscar avío del catálogo..."
        style={{ fontSize: 12 }}
      />
      {show && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', maxHeight: 220, overflowY: 'auto' }}>
          {results.map(av => (
            <div
              key={av.id}
              onMouseDown={() => seleccionar(av)}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span style={{ fontWeight: 600 }}>{av.nombre}</span>
              <span style={{ color: 'var(--text2)' }}>{av.tipo}{av.descripcion ? ` · ${av.descripcion}` : ''}</span>
            </div>
          ))}
        </div>
      )}
      {show && results.length === 0 && query.trim() && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--text2)' }}>
          Sin resultados para "{query}"
        </div>
      )}
    </div>
  )
}

// ─── PiezaRow ─────────────────────────────────────────────────────────────────

function PiezaRow({ pieza, index, total, telaRoles, onEdit, onDelete, onDragStart, onDragOver, onDrop, onMoveUp, onMoveDown }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState({ ...pieza })
  const isTouch = useIsTouch()

  function save() { onEdit(index, local); setEditing(false) }

  const rolLabel = telaRoles.find(r => r.value === pieza.tela_rol)?.label || pieza.tela_rol

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, background: 'var(--bg3)', padding: 6, borderRadius: 'var(--radius)', flexWrap: 'wrap' }}>
        <input value={local.nombre} onChange={e => setLocal(f => ({ ...f, nombre: e.target.value }))} style={{ flex: 2, minWidth: 100 }} autoFocus />
        <input value={local.mult} onChange={e => setLocal(f => ({ ...f, mult: e.target.value.replace(/[^0-9]/g, '') }))} style={{ width: 45 }} placeholder="1" />
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>x prenda</span>
        <select value={local.tela_rol} onChange={e => setLocal(f => ({ ...f, tela_rol: e.target.value }))} style={{ width: 110 }}>
          {telaRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={save}>✔</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>✕</button>
      </div>
    )
  }

  return (
    <div
      draggable={!isTouch}
      data-drag-index={index}
      onDragStart={!isTouch ? () => onDragStart(index) : undefined}
      onDragOver={!isTouch ? e => { e.preventDefault(); onDragOver(index) } : undefined}
      onDrop={!isTouch ? () => onDrop(index) : undefined}
      style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, fontSize: 12, cursor: isTouch ? 'default' : 'grab', padding: '4px 6px', borderRadius: 'var(--radius)', background: 'var(--bg2)' }}
    >
      {isTouch ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button onClick={onMoveUp} disabled={index === 0} style={{ width: 36, height: 36, fontSize: 16, lineHeight: 1, padding: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg3)', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}>↑</button>
          <button onClick={onMoveDown} disabled={index === total - 1} style={{ width: 36, height: 36, fontSize: 16, lineHeight: 1, padding: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg3)', cursor: index === total - 1 ? 'default' : 'pointer', opacity: index === total - 1 ? 0.3 : 1 }}>↓</button>
        </div>
      ) : (
        <span style={{ color: 'var(--text2)', fontSize: 14 }}>⠿</span>
      )}
      <span style={{ flex: 2 }}>{pieza.nombre}</span>
      <span style={{ color: 'var(--text2)' }}>×{pieza.mult}</span>
      <span style={{ color: 'var(--accent)', minWidth: 70 }}>{rolLabel}</span>
      <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏</button>
      <button className="btn btn-danger btn-sm" onClick={() => onDelete(index)}>✕</button>
    </div>
  )
}

// ─── ProcesoRow ───────────────────────────────────────────────────────────────

function ProcesoRow({ proceso, index, total, onEdit, onDelete, onDragStart, onDragOver, onDrop, onMoveUp, onMoveDown }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState({ ...proceso })
  const isTouch = useIsTouch()

  function save() { onEdit(index, local); setEditing(false) }

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, background: 'var(--bg3)', padding: 6, borderRadius: 'var(--radius)', flexWrap: 'wrap' }}>
        <select value={local.id} onChange={e => {
          const p = PROCESOS_DISPONIBLES.find(x => x.id === e.target.value)
          setLocal(f => ({ ...f, id: e.target.value, label: p?.label || e.target.value }))
        }} style={{ width: 150 }}>
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
      draggable={!isTouch}
      data-drag-index={index}
      onDragStart={!isTouch ? () => onDragStart(index) : undefined}
      onDragOver={!isTouch ? e => { e.preventDefault(); onDragOver(index) } : undefined}
      onDrop={!isTouch ? () => onDrop(index) : undefined}
      style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, fontSize: 12, cursor: isTouch ? 'default' : 'grab', padding: '6px 8px', borderRadius: 'var(--radius)', background: 'var(--bg2)' }}
    >
      {isTouch ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button onClick={onMoveUp} disabled={index === 0} style={{ width: 36, height: 36, fontSize: 16, lineHeight: 1, padding: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg3)', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}>↑</button>
          <button onClick={onMoveDown} disabled={index === total - 1} style={{ width: 36, height: 36, fontSize: 16, lineHeight: 1, padding: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg3)', cursor: index === total - 1 ? 'default' : 'pointer', opacity: index === total - 1 ? 0.3 : 1 }}>↓</button>
        </div>
      ) : (
        <span style={{ color: 'var(--text2)', fontSize: 14 }}>⠿</span>
      )}
      <span style={{ fontWeight: 600, minWidth: 110 }}>{proceso.label}</span>
      {proceso.nota && <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>— {proceso.nota}</span>}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(index)}>✕</button>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Productos({ onMenuClick }) {
  const [productos, setProductos]   = useState([])
  const [telas, setTelas]           = useState([])
  const [avios, setAvios]           = useState([])
  const [contactos, setContactos]   = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [modal, setModal]           = useState(false)
  const [vistaFicha, setVistaFicha] = useState(null)
  const [editing, setEditing]       = useState(null)
  const [saving, setSaving]         = useState(false)
  const [fichaTelasCosto, setFichaTelasCosto] = useState([])
  const [fichaRefCot,     setFichaRefCot]     = useState({})
  const [editandoCostos,  setEditandoCostos]  = useState(false)
  const [costosDraft,     setCostosDraft]     = useState({})
  const [savingCostos,    setSavingCostos]    = useState(false)
  const [filterProvTela, setFilterProvTela]   = useState('')
  const [filterProvTela2, setFilterProvTela2] = useState('')
  const [filterProvRib, setFilterProvRib]     = useState('')
  const [filterProvAvio, setFilterProvAvio]   = useState('')
  const [nuevoAvioSelect, setNuevoAvioSelect] = useState({ prov_id: '', avio_id: '', cantidad: '' })
  const [clienteQuery, setClienteQuery]               = useState('')
  const [contactosResults, setContactosResults]       = useState([])
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [searchingContactos, setSearchingContactos]   = useState(false)
  const clienteSearchTimeout = useRef(null)
  const dragSrcPieza   = useRef(null)
  const dragSrcProceso = useRef(null)

  const emptyForm = {
    nombre: '', codigo: '', tabla: 'adulto', base_id: '',
    cliente_id: null,
    molde: '',
    tela1_id: '', tela2_id: '', rib_id: '',
    tela1_consumo: '', tela2_consumo: '', rib_consumo: '',
    telas_extra:  [],
    entretela_id: '',
    piezas: [],
    procesos: [
      { id: 'corte',   label: '✂ Corte',   nota: '' },
      { id: 'taller',  label: '🧵 Taller',  nota: '' },
      { id: 'entrega', label: '📦 Entrega', nota: '' },
    ],
    avios_ids: [],
    avios_medidas: [],
    terminaciones: { grifaTalle: false, grifa: false, talle: false },
    terminaciones_extra: [],
    planchado_pares: [],
    notas: '',
    tipo_cambio: '',
    estampados: [],
    precio_venta: '',
    cara_uso: '',
    costo_confeccion: '', costo_corte: '', costo_elasticos: '', costo_otros: '',
  }
  const [form, setForm]             = useState(emptyForm)
  const [nuevaPieza, setNuevaPieza] = useState({ nombre: '', mult: '1', tela_rol: 'tela1' })
  const [nuevoProceso, setNuevoProceso] = useState({ id: 'bordado', nota: '' })
  const [nuevoAvio, setNuevoAvio]   = useState({ nombre: '', unit: 'cm', todos: '', ancho: '' })
  const [nuevaTerm, setNuevaTerm]   = useState('')
  const [nuevoPar, setNuevoPar]     = useState({ piezaA: '', piezaB: '' })
  const [nuevoEstampado, setNuevoEstampado] = useState({ nombre: '', tipo: 'estampado', precio: '' })

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    setEditandoCostos(false)
    if (vistaFicha) loadFichaCostos(vistaFicha)
    else { setFichaTelasCosto([]); setFichaRefCot({}) }
  }, [vistaFicha?.id])

  async function loadFichaCostos(prod) {
    const ids = [prod.tela1_id, prod.tela2_id, prod.rib_id]
      .concat((prod.telas_extra || []).map(te => te.tela_id))
      .filter(Boolean).map(Number)

    // Map tela_id -> consumo (m/prenda) from the product. Use explicit null check — never derive from catalog.
    const toConsumo = v => (v != null && v !== '' && !isNaN(parseFloat(v))) ? parseFloat(v) : null
    const consumoMap = {}
    if (prod.tela1_id) consumoMap[Number(prod.tela1_id)] = toConsumo(prod.tela1_consumo)
    if (prod.tela2_id) consumoMap[Number(prod.tela2_id)] = toConsumo(prod.tela2_consumo)
    if (prod.rib_id)   consumoMap[Number(prod.rib_id)]   = toConsumo(prod.rib_consumo)
    ;(prod.telas_extra || []).forEach(te => {
      if (te.tela_id) consumoMap[Number(te.tela_id)] = toConsumo(te.consumo)
    })

    const [{ data: telasD }, { data: rends }, { data: cots }] = await Promise.all([
      ids.length > 0
        ? supabase.from('telas').select('id, tipo, color, precio, rendimiento, unidad, moneda').in('id', ids)
        : Promise.resolve({ data: [] }),
      ids.length > 0
        ? supabase.from('rendimientos_tela').select('tela_id, rendimiento').in('tela_id', ids)
        : Promise.resolve({ data: [] }),
      supabase.from('cotizaciones')
        .select('costo_confeccion, costo_corte, costo_elasticos, costo_estampado_frente, costo_estampado_espalda, costo_otros')
        .eq('producto_id', prod.id),
    ])

    // Rendimiento real promedio por tela
    const rendRealMap = {}
    ;(rends || []).forEach(r => {
      if (r.rendimiento == null) return
      if (!rendRealMap[r.tela_id]) rendRealMap[r.tela_id] = []
      rendRealMap[r.tela_id].push(parseFloat(r.rendimiento))
    })

    setFichaTelasCosto((telasD || []).map(t => {
      const consumo = consumoMap[t.id] ?? null
      // precio/m: if unit=kg divide by rendimiento, if unit=m use precio directly
      const precioMetro = t.unidad === 'kg'
        ? (t.rendimiento ? (parseFloat(t.precio) || 0) / parseFloat(t.rendimiento) : null)
        : (parseFloat(t.precio) || null)
      const costo = (consumo != null && precioMetro != null) ? precioMetro * consumo : null
      return {
        ...t,
        consumo,
        precioMetro,
        costo,
        rendReal:     rendRealMap[t.id]?.length > 0
                        ? rendRealMap[t.id].reduce((a, b) => a + b, 0) / rendRealMap[t.id].length
                        : null,
        rendRealCount: rendRealMap[t.id]?.length || 0,
      }
    }))

    // Promedios de cotizaciones por campo
    const REF_KEYS = ['costo_confeccion','costo_corte','costo_elasticos','costo_estampado_frente','costo_estampado_espalda','costo_otros']
    const ref = {}
    REF_KEYS.forEach(k => {
      const vals = (cots || []).map(c => c[k]).filter(v => v != null && parseFloat(v) > 0)
      ref[k] = vals.length > 0
        ? { promedio: vals.reduce((a, b) => a + parseFloat(b), 0) / vals.length, count: vals.length }
        : null
    })
    setFichaRefCot(ref)
  }

  async function fetchAll() {
    setLoading(true)
    const [{ data: p }, { data: t }, { data: prov }, { data: a }, { data: c }] = await Promise.all([
      supabase.from('productos').select('*').order('nombre'),
      supabase.from('telas').select('id, tipo, color, unidad, proveedor_id, proveedor').order('tipo'),
      supabase.from('proveedores').select('id, nombre').order('nombre'),
      supabase.from('avios').select('id, nombre, tipo, unidad, precio, proveedor_id').order('nombre'),
      supabase.from('contactos').select('id, nombre, tipo').order('nombre'),
    ])
    setProductos(p || [])
    setTelas(t || [])
    setProveedores(prov || [])
    setAvios(a || [])
    setContactos(c || [])
    setLoading(false)
  }

  const aviosEntretela = avios.filter(a => a.tipo?.toLowerCase() === 'entretela')

  function telasFiltradas(provId) {
    if (!provId) return telas
    return telas.filter(t => String(t.proveedor_id) === String(provId))
  }

  function aviosFiltrados(provId) {
    const base = avios.filter(a => a.tipo?.toLowerCase() !== 'entretela')
    if (!provId) return base
    return base.filter(a => String(a.proveedor_id) === String(provId))
  }

  function telaLabel(id) {
    const t = telas.find(x => x.id === parseInt(id))
    return t ? `${t.tipo}${t.color ? ` · ${t.color}` : ''}` : '—'
  }

  function avioLabel(id) {
    const a = avios.find(x => x.id === parseInt(id))
    return a ? a.nombre : '—'
  }

  // ── Abrir modal ──────────────────────────────────────────────────────────────

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setFilterProvTela(''); setFilterProvTela2(''); setFilterProvRib(''); setFilterProvAvio('')
    setNuevoAvioSelect({ prov_id: '', avio_id: '', cantidad: '' })
    setClienteQuery(''); setContactosResults([]); setShowClienteDropdown(false)
    setModal(true)
  }

  function openEdit(p) {
    setEditing(p.id)
    const t1  = telas.find(t => t.id === p.tela1_id)
    const t2  = telas.find(t => t.id === p.tela2_id)
    const rib = telas.find(t => t.id === p.rib_id)
    setFilterProvTela(t1?.proveedor_id  ? String(t1.proveedor_id)  : '')
    setFilterProvTela2(t2?.proveedor_id ? String(t2.proveedor_id)  : '')
    setFilterProvRib(rib?.proveedor_id  ? String(rib.proveedor_id) : '')
    setFilterProvAvio('')
    setNuevoAvioSelect({ prov_id: '', avio_id: '', cantidad: '' })
    const clienteDeProducto = contactos.find(c => c.id === p.cliente_id)
    setClienteQuery(clienteDeProducto?.nombre || '')
    setContactosResults([]); setShowClienteDropdown(false)
    setForm({
      nombre:             p.nombre             || '',
      codigo:             p.codigo             || '',
      tabla:              p.tabla              || 'adulto',
      base_id:            p.base_id            || '',
      cliente_id:         p.cliente_id         || null,
      molde:              p.molde              || '',
      tela1_id:           p.tela1_id           || '',
      tela2_id:           p.tela2_id           || '',
      rib_id:             p.rib_id             || '',
      tela1_consumo:      p.tela1_consumo      != null ? String(p.tela1_consumo) : '',
      tela2_consumo:      p.tela2_consumo      != null ? String(p.tela2_consumo) : '',
      rib_consumo:        p.rib_consumo        != null ? String(p.rib_consumo)   : '',
      telas_extra:        (p.telas_extra || []).map(te => {
        const t = telas.find(x => x.id === parseInt(te.tela_id))
        return { ...te, prov_id: t?.proveedor_id ? String(t.proveedor_id) : '' }
      }),
      entretela_id:       p.entretela_id       || '',
      piezas:             p.piezas             || [],
      procesos:           p.procesos           || emptyForm.procesos,
      avios_ids:          p.avios_ids          || [],
      avios_medidas:      p.avios_medidas      || [],
      terminaciones:      p.terminaciones      || { grifaTalle: false, grifa: false, talle: false },
      terminaciones_extra: p.terminaciones_extra || [],
      planchado_pares:    p.planchado_pares    || [],
      notas:              p.notas              || '',
      tipo_cambio:             p.tipo_cambio             != null ? String(p.tipo_cambio)             : '',
      costo_confeccion:        p.costo_confeccion        != null ? String(p.costo_confeccion)        : '',
      costo_corte:             p.costo_corte             != null ? String(p.costo_corte)             : '',
      costo_elasticos:         p.costo_elasticos         != null ? String(p.costo_elasticos)         : '',
      estampados:              p.estampados              || [],
      precio_venta:            p.precio_venta            != null ? String(p.precio_venta)            : '',
      cara_uso:                p.cara_uso                || '',
      costo_otros:             p.costo_otros             != null ? String(p.costo_otros)             : '',
    })
    setModal(true)
  }

  function aplicarBase(baseId) {
    if (!baseId) { setForm(f => ({ ...f, base_id: '' })); return }
    const base = productos.find(p => p.id === parseInt(baseId))
    if (!base) return
    const t1  = telas.find(t => t.id === base.tela1_id)
    const t2  = telas.find(t => t.id === base.tela2_id)
    const rib = telas.find(t => t.id === base.rib_id)
    setFilterProvTela(t1?.proveedor_id  ? String(t1.proveedor_id)  : '')
    setFilterProvTela2(t2?.proveedor_id ? String(t2.proveedor_id)  : '')
    setFilterProvRib(rib?.proveedor_id  ? String(rib.proveedor_id) : '')
    setForm(f => ({
      ...f,
      base_id:            baseId,
      tabla:              base.tabla        || f.tabla,
      tela1_id:           base.tela1_id     || '',
      tela2_id:           base.tela2_id     || '',
      rib_id:             base.rib_id       || '',
      tela1_consumo:      base.tela1_consumo != null ? String(base.tela1_consumo) : '',
      tela2_consumo:      base.tela2_consumo != null ? String(base.tela2_consumo) : '',
      rib_consumo:        base.rib_consumo   != null ? String(base.rib_consumo)   : '',
      telas_extra:        (base.telas_extra || []).map(te => {
        const t = telas.find(x => x.id === parseInt(te.tela_id))
        return { ...te, prov_id: t?.proveedor_id ? String(t.proveedor_id) : '' }
      }),
      entretela_id:       base.entretela_id || '',
      piezas:             (base.piezas          || []).map(x => ({ ...x })),
      procesos:           (base.procesos         || emptyForm.procesos).map(x => ({ ...x })),
      avios_medidas:      (base.avios_medidas    || []).map(x => ({ ...x, medidas: { ...x.medidas } })),
      terminaciones:      { ...(base.terminaciones || {}) },
      terminaciones_extra: (base.terminaciones_extra || []).map(x => ({ ...x })),
      planchado_pares:    (base.planchado_pares  || []).map(x => ({ ...x })),
    }))
  }

  // ── Autocomplete cliente asociado ────────────────────────────────────────────

  function onClienteInput(value) {
    setClienteQuery(value)
    if (!value.trim()) {
      setForm(f => ({ ...f, cliente_id: null }))
      setContactosResults([])
      setShowClienteDropdown(false)
      return
    }
    setShowClienteDropdown(true)
    if (clienteSearchTimeout.current) clearTimeout(clienteSearchTimeout.current)
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
    setForm(f => ({ ...f, cliente_id: contacto.id }))
    setClienteQuery(contacto.nombre)
    setShowClienteDropdown(false)
    setContactosResults([])
  }

  function limpiarCliente() {
    setForm(f => ({ ...f, cliente_id: null }))
    setClienteQuery('')
    setContactosResults([])
    setShowClienteDropdown(false)
  }

  function onClienteBlur() { setTimeout(() => setShowClienteDropdown(false), 150) }

  // ── Drag ──────────────────────────────────────────────────────────────────────

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
  function movePieza(from, to) {
    setForm(f => {
      const arr = [...f.piezas]
      const [m] = arr.splice(from, 1)
      arr.splice(to, 0, m)
      return { ...f, piezas: arr }
    })
  }

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
  function moveProceso(from, to) {
    setForm(f => {
      const arr = [...f.procesos]
      const [m] = arr.splice(from, 1)
      arr.splice(to, 0, m)
      return { ...f, procesos: arr }
    })
  }

  // ── Piezas ────────────────────────────────────────────────────────────────────

  function editPieza(i, v)   { setForm(f => ({ ...f, piezas: f.piezas.map((p, j) => j === i ? { ...v, mult: parseInt(v.mult) || 1 } : p) })) }
  function deletePieza(i)    { setForm(f => ({ ...f, piezas: f.piezas.filter((_, j) => j !== i) })) }

  function agregarPieza() {
    if (!nuevaPieza.nombre) return
    setForm(f => ({ ...f, piezas: [...f.piezas, { ...nuevaPieza, mult: parseInt(nuevaPieza.mult) || 1 }] }))
    setNuevaPieza({ nombre: '', mult: '1', tela_rol: 'tela1' })
  }

  // ── Procesos ──────────────────────────────────────────────────────────────────

  function editProceso(i, v)  { setForm(f => ({ ...f, procesos: f.procesos.map((p, j) => j === i ? v : p) })) }
  function deleteProceso(i)   { setForm(f => ({ ...f, procesos: f.procesos.filter((_, j) => j !== i) })) }

  function agregarProceso() {
    const p = PROCESOS_DISPONIBLES.find(x => x.id === nuevoProceso.id)
    setForm(f => ({ ...f, procesos: [...f.procesos, { id: nuevoProceso.id, label: p?.label || nuevoProceso.id, nota: nuevoProceso.nota }] }))
    setNuevoProceso({ id: 'bordado', nota: '' })
  }

  // ── Telas extra ───────────────────────────────────────────────────────────────

  function agregarTela() {
    const idx = form.telas_extra.length + 3
    setForm(f => ({ ...f, telas_extra: [...f.telas_extra, { label: `Tela ${idx}`, tela_id: '', prov_id: '' }] }))
  }

  function updateTelaExtra(i, changes) {
    setForm(f => ({ ...f, telas_extra: f.telas_extra.map((te, j) => j === i ? { ...te, ...changes } : te) }))
  }

  function removeTelaExtra(i) {
    setForm(f => ({ ...f, telas_extra: f.telas_extra.filter((_, j) => j !== i) }))
  }

  // ── Avíos con medidas ─────────────────────────────────────────────────────────

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

  // ── Terminaciones ─────────────────────────────────────────────────────────────

  function agregarTerminacion() {
    if (!nuevaTerm) return
    setForm(f => ({ ...f, terminaciones_extra: [...f.terminaciones_extra, { nombre: nuevaTerm }] }))
    setNuevaTerm('')
  }

  // ── Planchado pares ───────────────────────────────────────────────────────────

  function agregarPar() {
    if (!nuevoPar.piezaA || !nuevoPar.piezaB) return
    setForm(f => ({ ...f, planchado_pares: [...f.planchado_pares, { ...nuevoPar }] }))
    setNuevoPar({ piezaA: '', piezaB: '' })
  }

  function deletePar(i) { setForm(f => ({ ...f, planchado_pares: f.planchado_pares.filter((_, j) => j !== i) })) }

  // ── Código auto ───────────────────────────────────────────────────────────────

  function generarCodigo(nombre) {
    const pre = { canguro: 'CANG', remera: 'REM', buzo: 'BUZO', pantalon: 'PANT', malla: 'MALL', polo: 'POLO', short: 'SHORT', chomba: 'CHOM' }
    let p = 'PROD'
    for (const [k, v] of Object.entries(pre)) { if (nombre.toLowerCase().includes(k)) { p = v; break } }
    const nums = productos.filter(x => x.codigo?.startsWith(p)).map(x => { const m = x.codigo?.match(/\d+$/); return m ? parseInt(m[0]) : 0 })
    return p + '-' + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')
  }

  // ── Guardar ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.nombre) return alert('El nombre del producto es obligatorio')
    setSaving(true)
    const datos = {
      nombre:              form.nombre,
      codigo:              form.codigo || generarCodigo(form.nombre),
      tabla:               form.tabla,
      base_id:             parseInt(form.base_id) || null,
      cliente_id:          form.cliente_id || null,
      molde:               form.molde || null,
      tela1_id:            parseInt(form.tela1_id) || null,
      tela2_id:            parseInt(form.tela2_id) || null,
      rib_id:              parseInt(form.rib_id) || null,
      tela1_consumo:       parseFloat(form.tela1_consumo) || null,
      tela2_consumo:       parseFloat(form.tela2_consumo) || null,
      rib_consumo:         parseFloat(form.rib_consumo) || null,
      telas_extra:         form.telas_extra.map(({ label, tela_id, consumo }) => ({ label, tela_id: parseInt(tela_id) || null, consumo: parseFloat(consumo) || null })),
      entretela_id:        parseInt(form.entretela_id) || null,
      piezas:              form.piezas,
      procesos:            form.procesos,
      avios_ids:           form.avios_ids,
      avios_medidas:       form.avios_medidas,
      terminaciones:       form.terminaciones,
      terminaciones_extra: form.terminaciones_extra,
      planchado_pares:     form.planchado_pares,
      notas:               form.notas || null,
      tipo_cambio:              parseFloat(form.tipo_cambio) || null,
      costo_confeccion:         parseFloat(form.costo_confeccion)        || 0,
      costo_corte:              parseFloat(form.costo_corte)             || 0,
      costo_elasticos:          parseFloat(form.costo_elasticos)         || 0,
      estampados:               (form.estampados || []).map(e => ({ ...e, precio: parseFloat(e.precio) || 0 })),
      precio_venta:             parseFloat(form.precio_venta) || null,
      cara_uso:                 form.cara_uso.trim() || null,
      costo_otros:              parseFloat(form.costo_otros)             || 0,
    }
    if (editing) {
      await supabase.from('productos').update(datos).eq('id', editing)
    } else {
      await supabase.from('productos').insert(datos)
    }
    setSaving(false)
    setModal(false)
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

  // ── Costos inline ────────────────────────────────────────────────────────────

  function abrirEditarCostos() {
    const consumos = {}
    if (vistaFicha.tela1_id != null && vistaFicha.tela1_consumo != null)
      consumos[vistaFicha.tela1_id] = String(vistaFicha.tela1_consumo)
    if (vistaFicha.tela2_id != null && vistaFicha.tela2_consumo != null)
      consumos[vistaFicha.tela2_id] = String(vistaFicha.tela2_consumo)
    if (vistaFicha.rib_id   != null && vistaFicha.rib_consumo   != null)
      consumos[vistaFicha.rib_id]   = String(vistaFicha.rib_consumo)
    ;(vistaFicha.telas_extra || []).forEach(te => {
      if (te.tela_id != null && te.consumo != null)
        consumos[Number(te.tela_id)] = String(te.consumo)
    })
    const avios_cantidades = {}
    ;(vistaFicha.avios_ids || []).forEach(av => {
      avios_cantidades[av.avio_id] = av.cantidad != null ? String(av.cantidad) : ''
    })
    setCostosDraft({
      consumos,
      avios_cantidades,
      tipo_cambio:             vistaFicha.tipo_cambio             != null ? String(vistaFicha.tipo_cambio)             : '',
      costo_confeccion:        vistaFicha.costo_confeccion        != null ? String(vistaFicha.costo_confeccion)        : '',
      costo_corte:             vistaFicha.costo_corte             != null ? String(vistaFicha.costo_corte)             : '',
      costo_elasticos:         vistaFicha.costo_elasticos         != null ? String(vistaFicha.costo_elasticos)         : '',
      estampados:              (vistaFicha.estampados || []).map(e => ({ ...e, precio: e.precio != null ? String(e.precio) : '' })),
      costo_otros:             vistaFicha.costo_otros             != null ? String(vistaFicha.costo_otros)             : '',
    })
    setEditandoCostos(true)
  }

  async function guardarCostos() {
    setSavingCostos(true)
    const c = costosDraft.consumos || {}
    const toC = v => (v != null && v !== '' && !isNaN(parseFloat(v))) ? parseFloat(v) : null
    const datos = {
      tela1_consumo:       vistaFicha.tela1_id != null ? toC(c[vistaFicha.tela1_id]) : vistaFicha.tela1_consumo,
      tela2_consumo:       vistaFicha.tela2_id != null ? toC(c[vistaFicha.tela2_id]) : vistaFicha.tela2_consumo,
      rib_consumo:         vistaFicha.rib_id   != null ? toC(c[vistaFicha.rib_id])   : vistaFicha.rib_consumo,
      telas_extra:         (vistaFicha.telas_extra || []).map(te => ({
        ...te,
        consumo: toC(c[Number(te.tela_id)]),
      })),
      tipo_cambio:             parseFloat(costosDraft.tipo_cambio)             || null,
      costo_confeccion:        parseFloat(costosDraft.costo_confeccion)        || 0,
      costo_corte:             parseFloat(costosDraft.costo_corte)             || 0,
      costo_elasticos:         parseFloat(costosDraft.costo_elasticos)         || 0,
      estampados:              (costosDraft.estampados || []).map(e => ({ ...e, precio: parseFloat(e.precio) || 0 })),
      costo_otros:             parseFloat(costosDraft.costo_otros)             || 0,
      avios_ids: (vistaFicha.avios_ids || []).map(av => ({
        ...av,
        cantidad: costosDraft.avios_cantidades?.[av.avio_id] != null
          ? costosDraft.avios_cantidades[av.avio_id]
          : av.cantidad,
      })),
    }
    await supabase.from('productos').update(datos).eq('id', vistaFicha.id)
    const { data } = await supabase.from('productos').select('*').eq('id', vistaFicha.id).single()
    if (data) {
      setVistaFicha(data)
      setProductos(prev => prev.map(p => p.id === data.id ? data : p))
      loadFichaCostos(data)
    }
    setSavingCostos(false)
    setEditandoCostos(false)
  }

  // ── Cómputos render ───────────────────────────────────────────────────────────

  const filtered      = productos.filter(p => !search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.codigo?.toLowerCase().includes(search.toLowerCase()))
  const talles        = TABLAS[form.tabla]?.talles || []
  const telaRoles     = getTelaRoles(form.telas_extra)
  const tienePlanchado = form.procesos.some(p => p.id === 'planchado')
  const nombresPiezas = form.piezas.map(p => p.nombre).filter(Boolean)

  // ── Render ────────────────────────────────────────────────────────────────────

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

        {/* ── FICHA TÉCNICA ── */}
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

              {/* Precio de venta + cara de uso */}
              <div style={{ marginBottom: 14, fontSize: 13, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--text2)' }}>Precio de venta:</span>
                  {vistaFicha.precio_venta != null
                    ? <strong style={{ color: 'var(--success)', fontSize: 15 }}>$ {Number(vistaFicha.precio_venta).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    : <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>— sin precio base</span>
                  }
                </div>
                {vistaFicha.cara_uso && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--text2)' }}>Cara de uso:</span>
                    <span style={{
                      background: '#8060c022', color: '#8060c0',
                      border: '1px solid #8060c088',
                      padding: '1px 8px', fontSize: 11, fontWeight: 700, borderRadius: 2,
                    }}>{vistaFicha.cara_uso}</span>
                  </div>
                )}
              </div>

              {/* Molde */}
              {vistaFicha.molde && (
                <div style={{ fontSize: 12, marginBottom: 12 }}>
                  <span style={{ color: 'var(--text2)', marginRight: 6 }}>Molde:</span>
                  <strong>{vistaFicha.molde}</strong>
                </div>
              )}

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
                {[
                  ['Tela 1', vistaFicha.tela1_id, vistaFicha.tela1_consumo],
                  ['Tela 2', vistaFicha.tela2_id, vistaFicha.tela2_consumo],
                  ...((vistaFicha.telas_extra || []).map((te, i) => [te.label || `Tela ${i + 3}`, te.tela_id, te.consumo])),
                  ['RIB', vistaFicha.rib_id, vistaFicha.rib_consumo],
                ].map(([rol, id, consumo]) => id ? (() => {
                  const tc = fichaTelasCosto.find(t => t.id === Number(id))
                  const fmtM = n => n != null ? Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null
                  const toNum = v => (v != null && v !== '' && !isNaN(parseFloat(v))) ? parseFloat(v) : null
                  const tipoCambio = toNum(vistaFicha.tipo_cambio)
                  const esUSD = tc?.moneda === 'USD'
                  const costoBase = tc?.precioMetro != null && consumo != null ? tc.precioMetro * parseFloat(consumo) : null
                  const costoFila = costoBase == null ? null
                    : esUSD ? (tipoCambio != null ? costoBase * tipoCambio : null)
                    : costoBase
                  return (
                    <div key={rol} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, minWidth: 70, color: 'var(--text2)', fontSize: 13 }}>{rol}</span>
                      <span style={{ fontWeight: 600, fontSize: 14, flex: 2 }}>
                        {telaLabel(id)}
                        {esUSD && <span style={{ marginLeft: 6, fontSize: 10, color: '#1a6b3a', fontWeight: 700, background: '#e6f4ea', borderRadius: 4, padding: '1px 4px' }}>U$D</span>}
                      </span>
                      <span style={{ fontSize: 13, minWidth: 60, color: consumo != null ? 'inherit' : 'var(--text2)' }}>
                        {consumo != null ? `${fmtM(consumo)} m` : <span style={{ fontStyle: 'italic' }}>sin consumo</span>}
                      </span>
                      {tc?.precioMetro != null && (
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                          {esUSD ? 'U$D' : '$'} {Number(tc.precioMetro).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/m
                        </span>
                      )}
                      {costoFila != null ? (
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>
                          = ${Number(costoFila).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : costoBase != null && esUSD ? (
                        <span style={{ fontSize: 12, color: '#c87000', fontStyle: 'italic' }}>⚠ falta T/C</span>
                      ) : null}
                    </div>
                  )
                })() : null)}
                {vistaFicha.entretela_id ? (
                  <div style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 700, minWidth: 70, color: 'var(--text2)', fontSize: 14 }}>Entretela</span>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{avioLabel(vistaFicha.entretela_id)}</span>
                  </div>
                ) : null}
              </div>

              {/* Avíos vinculados */}
              {vistaFicha.avios_ids?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>🧷 Avíos</div>
                  {vistaFicha.avios_ids.map((av, i) => {
                    const cat = avios.find(a => a.id === av.avio_id)
                    return (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <span style={{ fontWeight: 600, flex: 2 }}>{av.nombre}</span>
                        {av.cantidad && <span style={{ color: 'var(--text2)' }}>{av.cantidad} {cat?.unidad || av.unidad || 'u.'}</span>}
                        {cat?.precio != null && <span style={{ color: 'var(--accent)', fontSize: 11 }}>ref. ${Number(cat.precio).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Piezas */}
              {vistaFicha.piezas?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>✂ Piezas de corte</div>
                  {vistaFicha.piezas.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 700, flex: 2, fontSize: 14 }}>{p.nombre}</span>
                      <span style={{ color: 'var(--text2)', fontSize: 13 }}>×{p.mult}</span>
                      <span style={{ color: 'var(--accent)', fontSize: 13, minWidth: 70 }}>
                        {telaRolLabel(p.tela_rol, vistaFicha.telas_extra)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Planchado pares */}
              {vistaFicha.planchado_pares?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>🔥 Planchado</div>
                  {vistaFicha.planchado_pares.map((par, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                      <span style={{ fontWeight: 600 }}>{par.piezaA}</span>
                      <span style={{ color: 'var(--text2)' }}>+</span>
                      <span style={{ fontWeight: 600 }}>{par.piezaB}</span>
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

              {/* Estampados y bordados */}
              {(vistaFicha.estampados || []).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>🎨 Estampados y bordados</div>
                  {(vistaFicha.estampados || []).map((e, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13, alignItems: 'center' }}>
                      <span style={{ flex: 1 }}>{e.nombre}</span>
                      <span style={{ fontSize: 11, color: '#555', background: '#eee', borderRadius: 4, padding: '1px 6px' }}>{e.tipo === 'bordado' ? '🪡 bordado' : '🎨 estampado'}</span>
                      {e.precio != null && <span style={{ fontWeight: 700, color: 'var(--accent)' }}>${Number(e.precio).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* 💰 Costos */}
              {(() => {
                const COSTO_KEYS = [
                  { key: 'costo_confeccion',  label: 'Confección'        },
                  { key: 'costo_corte',       label: 'Corte'             },
                  { key: 'costo_elasticos',   label: 'Elásticos'         },
                  { key: 'costo_otros',       label: 'Otros costos'      },
                ]
                const estampadosConPrecio = editandoCostos
                  ? (costosDraft.estampados || [])
                  : (vistaFicha.estampados || [])
                const TH  = { padding: '4px 8px', color: '#1a3a6b', background: 'linear-gradient(to bottom, #e8eef7, #c8d4e8)', fontSize: 11, border: '1px solid #c8d4e8', fontWeight: 700 }
                const TD  = { padding: '5px 8px', border: '1px solid #eee', fontSize: 12, verticalAlign: 'middle' }
                const SEC = { padding: '3px 8px', background: '#f0f4f8', fontWeight: 700, color: '#1a3a6b', fontSize: 11, border: '1px solid #e0e8f0' }

                // In edit mode: resolve consumo/tipoCambio from draft; in read mode: from saved product
                const toNum = v => (v != null && v !== '' && !isNaN(parseFloat(v))) ? parseFloat(v) : null
                const tipoCambio = toNum(editandoCostos ? costosDraft.tipo_cambio : vistaFicha.tipo_cambio)
                const hayUSD = fichaTelasCosto.some(t => t.moneda === 'USD')

                const telasConCosto = fichaTelasCosto.map(t => {
                  const consumo = editandoCostos
                    ? toNum((costosDraft.consumos || {})[t.id])
                    : t.consumo
                  const esUSD = t.moneda === 'USD'
                  // costo in UYU: for USD telas multiply by tipoCambio; if no tipoCambio, costo is null
                  const costoBase = (consumo != null && t.precioMetro != null) ? t.precioMetro * consumo : null
                  const costoUYU = costoBase == null ? null
                    : esUSD ? (tipoCambio != null ? costoBase * tipoCambio : null)
                    : costoBase
                  return { ...t, consumoDraft: consumo, esUSD, costoBase, costoUYU }
                })

                const subtotalTelas = telasConCosto.reduce((a, t) => a + (t.costoUYU ?? 0), 0)
                const aviosConCosto = (vistaFicha.avios_ids || []).map(av => {
                  const cat = avios.find(a => a.id === av.avio_id)
                  const precio = parseFloat(cat?.precio) || 0
                  const cantBase = editandoCostos
                    ? (costosDraft.avios_cantidades?.[av.avio_id] ?? av.cantidad)
                    : av.cantidad
                  const cantidad = parseFloat(cantBase) || 1
                  return { avio_id: av.avio_id, nombre: av.nombre, unidad: cat?.unidad || av.unidad || 'u.', cantidad, precio, costo: precio * cantidad }
                })
                const subtotalAvios = aviosConCosto.reduce((s, a) => s + a.costo, 0)
                const subtotalOtros = COSTO_KEYS.reduce((a, c) => {
                  const v = editandoCostos ? costosDraft[c.key] : vistaFicha[c.key]
                  return a + (parseFloat(v) || 0)
                }, 0) + estampadosConPrecio.reduce((a, e) => a + (parseFloat(e.precio) || 0), 0)
                const costoTotal = subtotalTelas + subtotalAvios + subtotalOtros
                const fmtUYU  = n => '$ ' + Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                const fmtUSD  = n => 'U$D ' + Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>💰 Costos</span>
                      {!editandoCostos
                        ? <button className="btn btn-secondary btn-sm" onClick={abrirEditarCostos}>✏ Editar costos</button>
                        : <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditandoCostos(false)}>Cancelar</button>
                            <button className="btn btn-primary btn-sm" onClick={guardarCostos} disabled={savingCostos}>
                              {savingCostos ? 'Guardando...' : '✔ Guardar costos'}
                            </button>
                          </div>
                      }
                    </div>

                    {/* Tipo de cambio — solo visible si hay telas en USD */}
                    {(hayUSD || editandoCostos) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12 }}>
                        <span style={{ color: 'var(--text2)' }}>Tipo de cambio:</span>
                        {editandoCostos ? (
                          <>
                            <strong>$</strong>
                            <input
                              type="number"
                              value={costosDraft.tipo_cambio || ''}
                              onChange={e => setCostosDraft(d => ({ ...d, tipo_cambio: e.target.value }))}
                              placeholder="ej: 43.50"
                              style={{ width: 90, fontSize: 12 }}
                            />
                            <span style={{ color: 'var(--text2)' }}>/ U$D</span>
                            {!hayUSD && <span style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic' }}>— ninguna tela en USD, no afecta el cálculo</span>}
                          </>
                        ) : tipoCambio != null ? (
                          <strong>${tipoCambio.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / U$D</strong>
                        ) : (
                          <span style={{ color: '#c87000', fontStyle: 'italic' }}>⚠ No definido — necesario para calcular telas en U$D</span>
                        )}
                      </div>
                    )}

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'Tahoma, Arial, sans-serif' }}>
                      <thead>
                        <tr>
                          <th style={{ ...TH, textAlign: 'left', width: '28%' }}>Tela / ítem</th>
                          <th style={{ ...TH, textAlign: 'center', width: '16%' }}>Consumo</th>
                          <th style={{ ...TH, textAlign: 'right', width: '16%' }}>Precio/m</th>
                          <th style={{ ...TH, textAlign: 'right', width: '16%' }}>Costo ($)</th>
                          <th style={{ ...TH, textAlign: 'left',  width: '24%' }}>Ref. catálogo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* — Telas — */}
                        <tr><td colSpan={5} style={SEC}>🧶 Telas</td></tr>
                        {telasConCosto.length === 0 ? (
                          <tr><td colSpan={5} style={{ ...TD, color: '#888', fontStyle: 'italic' }}>Sin telas con datos de precio</td></tr>
                        ) : telasConCosto.map(t => (
                          <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = '#ffffcc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <td style={TD}>
                              {t.tipo}{t.color ? ` · ${t.color}` : ''}
                              {t.esUSD && <span style={{ marginLeft: 4, fontSize: 10, color: '#1a6b3a', fontWeight: 700, background: '#e6f4ea', borderRadius: 4, padding: '1px 4px' }}>U$D</span>}
                            </td>
                            <td style={{ ...TD, textAlign: 'center' }}>
                              {editandoCostos ? (
                                <input
                                  type="number"
                                  value={(costosDraft.consumos || {})[t.id] || ''}
                                  onChange={e => setCostosDraft(d => ({ ...d, consumos: { ...(d.consumos || {}), [t.id]: e.target.value } }))}
                                  placeholder="m/prenda"
                                  style={{ width: 70, textAlign: 'right', fontSize: 11 }}
                                />
                              ) : (
                                t.consumoDraft != null
                                  ? <span style={{ fontWeight: 600 }}>{Number(t.consumoDraft).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m</span>
                                  : <span style={{ color: '#c87000', fontStyle: 'italic' }}>— sin consumo</span>
                              )}
                            </td>
                            <td style={{ ...TD, textAlign: 'right', color: '#555' }}>
                              {t.precioMetro != null
                                ? (t.esUSD ? fmtUSD(t.precioMetro) : fmtUYU(t.precioMetro))
                                : '—'}
                            </td>
                            <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>
                              {t.costoUYU != null
                                ? fmtUYU(t.costoUYU)
                                : t.costoBase != null && t.esUSD
                                  ? <span style={{ color: '#c87000', fontStyle: 'italic', fontWeight: 400 }}>⚠ falta T/C</span>
                                  : '—'}
                            </td>
                            <td style={{ ...TD, color: '#888', fontStyle: 'italic', fontSize: 10 }}>
                              {t.rendimiento != null ? `rend: ${Number(t.rendimiento).toFixed(2)} m/kg` : '—'}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f4f8f0' }}>
                          <td colSpan={3} style={{ ...TD, fontWeight: 700 }}>Subtotal telas</td>
                          <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{fmtUYU(subtotalTelas)}</td>
                          <td style={TD}></td>
                        </tr>

                        {/* — Avíos — */}
                        {aviosConCosto.length > 0 && (<>
                          <tr><td colSpan={5} style={SEC}>🧷 Avíos</td></tr>
                          {aviosConCosto.map((av, i) => (
                            <tr key={i} onMouseEnter={e => e.currentTarget.style.background = '#ffffcc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                              <td style={TD}>{av.nombre}</td>
                              <td style={{ ...TD, textAlign: 'center' }}>
                                {editandoCostos ? (
                                  <input
                                    type="number"
                                    value={costosDraft.avios_cantidades?.[av.avio_id] ?? ''}
                                    onChange={e => setCostosDraft(d => ({ ...d, avios_cantidades: { ...(d.avios_cantidades || {}), [av.avio_id]: e.target.value } }))}
                                    placeholder="cant."
                                    style={{ width: 60, textAlign: 'right', fontSize: 11 }}
                                  />
                                ) : (
                                  <span>{av.cantidad} {av.unidad}</span>
                                )}
                              </td>
                              <td style={{ ...TD, textAlign: 'right', color: '#555' }}>{av.precio > 0 ? fmtUYU(av.precio) : '—'}</td>
                              <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{av.costo > 0 ? fmtUYU(av.costo) : '—'}</td>
                              <td style={{ ...TD, color: '#888', fontStyle: 'italic', fontSize: 10 }}>precio catálogo</td>
                            </tr>
                          ))}
                          <tr style={{ background: '#f4f8f0' }}>
                            <td colSpan={3} style={{ ...TD, fontWeight: 700 }}>Subtotal avíos</td>
                            <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{fmtUYU(subtotalAvios)}</td>
                            <td style={TD}></td>
                          </tr>
                        </>)}

                        {/* — Otros costos — */}
                        <tr><td colSpan={5} style={SEC}>✂ Confección / Estampado / Otros</td></tr>
                        {COSTO_KEYS.map(({ key, label }) => {
                          const val = editandoCostos ? costosDraft[key] : (vistaFicha[key] || 0)
                          const refCot = fichaRefCot[key]
                          return (
                            <tr key={key} onMouseEnter={e => e.currentTarget.style.background = '#ffffcc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                              <td style={TD}>{label}</td>
                              <td style={{ ...TD, textAlign: 'center' }}></td>
                              <td style={TD}></td>
                              <td style={{ ...TD, textAlign: 'right', fontWeight: editandoCostos ? 400 : 700 }}>
                                {editandoCostos ? (
                                  <input
                                    type="number"
                                    value={val}
                                    onChange={e => setCostosDraft(d => ({ ...d, [key]: e.target.value }))}
                                    placeholder="0"
                                    style={{ width: 80, textAlign: 'right', fontSize: 11 }}
                                  />
                                ) : fmtUYU(val)}
                              </td>
                              <td style={{ ...TD, color: '#888', fontStyle: 'italic', fontSize: 10 }}>
                                {refCot ? `prom. ${fmtUYU(refCot.promedio)} (${refCot.count})` : '—'}
                              </td>
                            </tr>
                          )
                        })}

                        {/* — Estampados / bordados — */}
                        {estampadosConPrecio.length > 0 && (
                          <>
                            <tr><td colSpan={5} style={SEC}>🎨 Estampados y bordados</td></tr>
                            {estampadosConPrecio.map((e, i) => (
                              <tr key={i} onMouseEnter={ev => ev.currentTarget.style.background = '#ffffcc'} onMouseLeave={ev => ev.currentTarget.style.background = ''}>
                                <td style={TD}>
                                  {e.nombre}
                                  <span style={{ marginLeft: 6, fontSize: 10, color: '#555', background: '#eee', borderRadius: 4, padding: '1px 4px' }}>
                                    {e.tipo === 'bordado' ? '🪡' : '🎨'}
                                  </span>
                                </td>
                                <td style={{ ...TD, textAlign: 'center' }}></td>
                                <td style={TD}></td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: editandoCostos ? 400 : 700 }}>
                                  {editandoCostos ? (
                                    <input
                                      type="number"
                                      value={e.precio || ''}
                                      onChange={ev => setCostosDraft(d => ({
                                        ...d,
                                        estampados: (d.estampados || []).map((x, j) => j === i ? { ...x, precio: ev.target.value } : x)
                                      }))}
                                      placeholder="0"
                                      style={{ width: 80, textAlign: 'right', fontSize: 11 }}
                                    />
                                  ) : fmtUYU(e.precio || 0)}
                                </td>
                                <td style={{ ...TD, color: '#888', fontStyle: 'italic', fontSize: 10 }}>—</td>
                              </tr>
                            ))}
                          </>
                        )}

                        {/* — Total — */}
                        <tr style={{ background: 'linear-gradient(to bottom, #e8eef7, #c8d4e8)' }}>
                          <td colSpan={3} style={{ padding: 8, fontWeight: 700, fontSize: 13, color: '#1a3a6b', border: '1px solid #6b83a8' }}>COSTO TOTAL</td>
                          <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, fontSize: 15, color: '#1a3a6b', border: '1px solid #6b83a8' }}>{fmtUYU(costoTotal)}</td>
                          <td style={{ border: '1px solid #6b83a8' }}></td>
                        </tr>

                        {/* — Precio de venta + margen — */}
                        {(() => {
                          const pv = parseFloat(vistaFicha.precio_venta)
                          if (!pv) return (
                            <tr>
                              <td colSpan={5} style={{ ...TD, color: '#888', fontStyle: 'italic' }}>
                                💲 Precio de venta: — sin precio base
                              </td>
                            </tr>
                          )
                          const margen = costoTotal > 0 ? ((pv - costoTotal) / costoTotal) * 100 : null
                          const margenColor = margen == null ? '#888' : margen >= 0 ? '#1a7a1a' : '#c06060'
                          return (
                            <tr style={{ background: '#f0f8f0' }}>
                              <td colSpan={3} style={{ ...TD, fontWeight: 700 }}>💲 Precio de venta</td>
                              <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: '#1a5a1a', fontSize: 13 }}>{fmtUYU(pv)}</td>
                              <td style={{ ...TD, fontWeight: 700, color: margenColor }}>
                                {margen != null ? `${margen >= 0 ? '+' : ''}${margen.toFixed(1)}% margen` : '—'}
                              </td>
                            </tr>
                          )
                        })()}
                      </tbody>
                    </table>
                  </div>
                )
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

      {/* ── MODAL ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏ Editar producto' : '📦 Nuevo producto'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Datos generales */}
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
                <div className="form-group">
                  <label>Molde</label>
                  <input value={form.molde} onChange={e => setForm(f => ({ ...f, molde: e.target.value }))} placeholder="ej: Canguro M-12" />
                </div>
              </div>

              {/* Procesos */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>⚙ Flujo de producción <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 400 }}>arrastrá para reordenar</span></div>
                {form.procesos.map((p, i) => (
                  <ProcesoRow
                    key={i} proceso={p} index={i} total={form.procesos.length}
                    onEdit={editProceso} onDelete={deleteProceso}
                    onDragStart={handleDragStartProceso} onDragOver={() => {}} onDrop={handleDropProceso}
                    onMoveUp={() => moveProceso(i, i - 1)} onMoveDown={() => moveProceso(i, i + 1)}
                  />
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <select value={nuevoProceso.id} onChange={e => setNuevoProceso(f => ({ ...f, id: e.target.value }))} style={{ width: 160 }}>
                    {PROCESOS_DISPONIBLES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <input value={nuevoProceso.nota} onChange={e => setNuevoProceso(f => ({ ...f, nota: e.target.value }))} placeholder="nota (ej: solo delantera)" style={{ flex: 1 }} />
                  <button className="btn btn-secondary btn-sm" onClick={agregarProceso}>+ Agregar</button>
                </div>
              </div>

              {/* Piezas de corte */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>✂ Piezas de corte <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 400 }}>arrastrá para reordenar · clic ✏ para editar</span></div>
                {form.piezas.map((p, i) => (
                  <PiezaRow
                    key={i} pieza={p} index={i} total={form.piezas.length} telaRoles={telaRoles}
                    onEdit={editPieza} onDelete={deletePieza}
                    onDragStart={handleDragStartPieza} onDragOver={() => {}} onDrop={handleDropPieza}
                    onMoveUp={() => movePieza(i, i - 1)} onMoveDown={() => movePieza(i, i + 1)}
                  />
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <input value={nuevaPieza.nombre} onChange={e => setNuevaPieza(f => ({ ...f, nombre: e.target.value }))} placeholder="ej: Delantera" style={{ flex: 2, minWidth: 100 }} onKeyDown={e => e.key === 'Enter' && agregarPieza()} />
                  <input value={nuevaPieza.mult} onChange={e => setNuevaPieza(f => ({ ...f, mult: e.target.value.replace(/[^0-9]/g, '') }))} style={{ width: 45 }} placeholder="1" />
                  <span style={{ fontSize: 11, color: 'var(--text2)', alignSelf: 'center' }}>x prenda</span>
                  <select value={nuevaPieza.tela_rol} onChange={e => setNuevaPieza(f => ({ ...f, tela_rol: e.target.value }))} style={{ width: 110 }}>
                    {telaRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={agregarPieza}>+ Agregar</button>
                </div>
              </div>

              {/* Telas */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 10 }}>🧶 Telas del producto</div>

                {/* Tela 1 */}
                {[
                  { label: 'Tela 1', field: 'tela1_id', conField: 'tela1_consumo', prov: filterProvTela,  setProv: setFilterProvTela  },
                  { label: 'Tela 2', field: 'tela2_id', conField: 'tela2_consumo', prov: filterProvTela2, setProv: setFilterProvTela2 },
                ].map(({ label, field, conField, prov, setProv }) => (
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
                      <input
                        type="number"
                        value={form[conField]}
                        onChange={e => setForm(f => ({ ...f, [conField]: e.target.value }))}
                        placeholder="m/prenda"
                        style={{ width: 80 }}
                        title="Consumo en metros por prenda"
                      />
                      <span style={{ fontSize: 11, color: 'var(--text2)', alignSelf: 'center' }}>m</span>
                    </div>
                  </div>
                ))}

                {/* Telas extra (Tela 3, 4...) */}
                {form.telas_extra.map((te, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{te.label}</span>
                      <button className="btn btn-danger btn-sm" onClick={() => removeTelaExtra(i)}>✕</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select
                        value={te.prov_id || ''}
                        onChange={e => updateTelaExtra(i, { prov_id: e.target.value, tela_id: '' })}
                        style={{ width: 160 }}
                      >
                        <option value="">Todos los proveedores</option>
                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                      <select
                        value={te.tela_id || ''}
                        onChange={e => updateTelaExtra(i, { tela_id: e.target.value })}
                        style={{ flex: 1 }}
                      >
                        <option value="">— Sin {te.label} —</option>
                        {telasFiltradas(te.prov_id).map(t => (
                          <option key={t.id} value={t.id}>{t.tipo}{t.color ? ` · ${t.color}` : ''}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={te.consumo || ''}
                        onChange={e => updateTelaExtra(i, { consumo: e.target.value })}
                        placeholder="m/prenda"
                        style={{ width: 80 }}
                        title="Consumo en metros por prenda"
                      />
                      <span style={{ fontSize: 11, color: 'var(--text2)', alignSelf: 'center' }}>m</span>
                    </div>
                  </div>
                ))}

                <button className="btn btn-secondary btn-sm" style={{ marginBottom: 12 }} onClick={agregarTela}>
                  + Agregar tela
                </button>

                {/* RIB */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>RIB</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={filterProvRib} onChange={e => { setFilterProvRib(e.target.value); setForm(f => ({ ...f, rib_id: '' })) }} style={{ width: 160 }}>
                      <option value="">Todos los proveedores</option>
                      {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    <select value={form.rib_id} onChange={e => setForm(f => ({ ...f, rib_id: e.target.value }))} style={{ flex: 1 }}>
                      <option value="">— Sin RIB —</option>
                      {telasFiltradas(filterProvRib).map(t => (
                        <option key={t.id} value={t.id}>{t.tipo}{t.color ? ` · ${t.color}` : ''}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={form.rib_consumo}
                      onChange={e => setForm(f => ({ ...f, rib_consumo: e.target.value }))}
                      placeholder="m/prenda"
                      style={{ width: 80 }}
                      title="Consumo en metros por prenda"
                    />
                    <span style={{ fontSize: 11, color: 'var(--text2)', alignSelf: 'center' }}>m</span>
                  </div>
                </div>

                {/* Entretela */}
                <div style={{ marginBottom: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Entretela</div>
                  <select value={form.entretela_id} onChange={e => setForm(f => ({ ...f, entretela_id: e.target.value }))} style={{ width: '100%' }}>
                    <option value="">— Sin Entretela —</option>
                    {aviosEntretela.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Planchado — solo si el producto tiene ese proceso */}
              {tienePlanchado && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>🔥 Pares de planchado</div>
                  {form.planchado_pares.length === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>No hay pares definidos aún.</div>
                  )}
                  {form.planchado_pares.map((par, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, fontSize: 12, background: 'var(--bg2)', padding: '4px 8px', borderRadius: 'var(--radius)' }}>
                      <span style={{ flex: 1, fontWeight: 600 }}>{par.piezaA}</span>
                      <span style={{ color: 'var(--text2)' }}>+</span>
                      <span style={{ flex: 1, fontWeight: 600 }}>{par.piezaB}</span>
                      <button className="btn btn-danger btn-sm" onClick={() => deletePar(i)}>✕</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={nuevoPar.piezaA} onChange={e => setNuevoPar(f => ({ ...f, piezaA: e.target.value }))} style={{ flex: 1, minWidth: 100 }}>
                      <option value="">Pieza A...</option>
                      {nombresPiezas.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span style={{ color: 'var(--text2)' }}>+</span>
                    <select value={nuevoPar.piezaB} onChange={e => setNuevoPar(f => ({ ...f, piezaB: e.target.value }))} style={{ flex: 1, minWidth: 100 }}>
                      <option value="">Pieza B...</option>
                      {nombresPiezas.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button className="btn btn-secondary btn-sm" onClick={agregarPar}>+ Agregar par</button>
                  </div>
                </div>
              )}

              {/* Avíos del producto */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>🧷 Avíos del producto</div>
                {form.avios_ids.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>No hay avíos vinculados aún.</div>
                )}
                {form.avios_ids.map((av, i) => {
                  const cat = avios.find(a => a.id === av.avio_id)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12, background: 'var(--bg2)', padding: '4px 8px', borderRadius: 'var(--radius)' }}>
                      <span style={{ flex: 2, fontWeight: 600 }}>{av.nombre}</span>
                      <input
                        type="number"
                        value={av.cantidad || ''}
                        onChange={e => setForm(f => ({ ...f, avios_ids: f.avios_ids.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x) }))}
                        placeholder="cant."
                        style={{ width: 70 }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text2)', minWidth: 30 }}>{cat?.unidad || av.unidad || 'u.'}</span>
                      <button className="btn btn-danger btn-sm" onClick={() => setForm(f => ({ ...f, avios_ids: f.avios_ids.filter((_, j) => j !== i) }))}>✕</button>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <select
                    value={nuevoAvioSelect.prov_id}
                    onChange={e => setNuevoAvioSelect(f => ({ ...f, prov_id: e.target.value, avio_id: '' }))}
                    style={{ width: 160 }}
                  >
                    <option value="">Todos los proveedores</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <select
                    value={nuevoAvioSelect.avio_id}
                    onChange={e => setNuevoAvioSelect(f => ({ ...f, avio_id: e.target.value }))}
                    style={{ flex: 1 }}
                  >
                    <option value="">— Seleccionar avío —</option>
                    {aviosFiltrados(nuevoAvioSelect.prov_id).map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}{a.tipo ? ` · ${a.tipo}` : ''}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={nuevoAvioSelect.cantidad}
                    onChange={e => setNuevoAvioSelect(f => ({ ...f, cantidad: e.target.value }))}
                    placeholder="cant."
                    style={{ width: 70 }}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (!nuevoAvioSelect.avio_id) return
                      if (form.avios_ids.find(a => a.avio_id === parseInt(nuevoAvioSelect.avio_id))) return
                      const cat = avios.find(a => a.id === parseInt(nuevoAvioSelect.avio_id))
                      setForm(f => ({ ...f, avios_ids: [...f.avios_ids, { avio_id: parseInt(nuevoAvioSelect.avio_id), nombre: cat?.nombre || '', cantidad: nuevoAvioSelect.cantidad, unidad: cat?.unidad || '' }] }))
                      setNuevoAvioSelect(f => ({ ...f, avio_id: '', cantidad: '' }))
                    }}
                  >+ Agregar</button>
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

              {/* Precio de venta + cara de uso */}
              <div className="form-grid">
                <div className="form-group">
                  <label>💲 Precio de venta $</label>
                  <input
                    type="number"
                    value={form.precio_venta}
                    onChange={e => setForm(f => ({ ...f, precio_venta: e.target.value }))}
                    placeholder="ej: 1500"
                  />
                </div>
                <div className="form-group">
                  <label>✂ Cara de uso</label>
                  <input
                    value={form.cara_uso}
                    onChange={e => setForm(f => ({ ...f, cara_uso: e.target.value }))}
                    placeholder="ej: Revés, Textura, Derecho..."
                  />
                </div>
              </div>

              {/* Costos */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 10 }}>💰 Costos por unidad</div>
                <div className="form-grid">
                  {[
                    ['costo_confeccion', 'Confección'],
                    ['costo_corte',      'Corte'],
                    ['costo_elasticos',  'Elásticos y avíos'],
                    ['costo_otros',      'Otros'],
                  ].map(([key, label]) => (
                    <div key={key} className="form-group">
                      <label>{label}</label>
                      <input
                        type="number"
                        value={form[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>

                {/* Estampados / bordados */}
                <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 6, color: 'var(--text2)' }}>🎨 Estampados y bordados</div>
                  {form.estampados.map((e, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
                      <span style={{ flex: 2 }}>{e.nombre}</span>
                      <span style={{ fontSize: 10, color: '#555', background: '#eee', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>
                        {e.tipo === 'bordado' ? '🪡 bordado' : '🎨 estampado'}
                      </span>
                      <input
                        type="number"
                        value={e.precio != null ? e.precio : ''}
                        onChange={ev => setForm(f => ({ ...f, estampados: f.estampados.map((x, j) => j === i ? { ...x, precio: ev.target.value } : x) }))}
                        placeholder="$ 0"
                        style={{ width: 80, textAlign: 'right', fontSize: 11 }}
                      />
                      <button className="btn btn-danger btn-sm" onClick={() => setForm(f => ({ ...f, estampados: f.estampados.filter((_, j) => j !== i) }))}>✕</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                    <input
                      value={nuevoEstampado.nombre}
                      onChange={e => setNuevoEstampado(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="ej: Estampado frente"
                      style={{ flex: 2 }}
                    />
                    <select
                      value={nuevoEstampado.tipo}
                      onChange={e => setNuevoEstampado(f => ({ ...f, tipo: e.target.value }))}
                      style={{ width: 120 }}
                    >
                      <option value="estampado">🎨 Estampado</option>
                      <option value="bordado">🪡 Bordado</option>
                    </select>
                    <input
                      type="number"
                      value={nuevoEstampado.precio}
                      onChange={e => setNuevoEstampado(f => ({ ...f, precio: e.target.value }))}
                      placeholder="$ 0"
                      style={{ width: 70, textAlign: 'right' }}
                    />
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (!nuevoEstampado.nombre) return
                        setForm(f => ({ ...f, estampados: [...f.estampados, { nombre: nuevoEstampado.nombre, tipo: nuevoEstampado.tipo, precio: parseFloat(nuevoEstampado.precio) || 0 }] }))
                        setNuevoEstampado({ nombre: '', tipo: 'estampado', precio: '' })
                      }}
                    >+ Agregar</button>
                  </div>
                </div>
              </div>

              {/* Cliente asociado */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Cliente asociado <span style={{ color: 'var(--text2)', fontWeight: 400 }}>(opcional)</span></label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={clienteQuery}
                    onChange={e => onClienteInput(e.target.value)}
                    onBlur={onClienteBlur}
                    onFocus={() => clienteQuery.trim() && contactosResults.length > 0 && setShowClienteDropdown(true)}
                    placeholder="Buscar contacto..."
                    autoComplete="off"
                    style={{ flex: 1 }}
                  />
                  {clienteQuery && (
                    <button className="btn btn-secondary btn-sm" onClick={limpiarCliente} title="Quitar cliente">✕</button>
                  )}
                </div>
                {searchingContactos && (
                  <div style={{ position: 'absolute', right: 48, top: 34, fontSize: 11, color: 'var(--text2)' }}>Buscando...</div>
                )}
                {showClienteDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', maxHeight: 200, overflowY: 'auto' }}>
                    {contactosResults.length === 0 ? (
                      <div style={{ padding: '9px 12px', fontSize: 13, color: 'var(--text2)' }}>Sin resultados</div>
                    ) : contactosResults.map(c => (
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
                  </div>
                )}
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
