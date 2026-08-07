import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const F = 'Tahoma, Trebuchet MS, sans-serif'
const today = () => new Date().toISOString().slice(0, 10)
const fmtF  = (f) => { if (!f) return '—'; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}` }

const TIPOS = [
  { id: 'envio',      label: 'Envío al taller',      icon: '📤', color: '#1a3a6b' },
  { id: 'recepcion',  label: 'Recepción del taller', icon: '📥', color: '#1a5a1a' },
  { id: 'devolucion', label: 'Devolución al taller', icon: '🔁', color: '#6a006a' },
  { id: 'pago',       label: 'Pago al taller',       icon: '💰', color: '#5a3a00' },
  { id: 'entrega',    label: 'Entrega a cliente',    icon: '🛍️', color: '#7a3a00' },
  { id: 'concepto',   label: 'Concepto libre',       icon: '📋', color: '#2a5a6a' },
]
const fmtMoneda = (m) => m != null ? '$ ' + Number(m).toLocaleString('es-AR', { minimumFractionDigits: 0 }) : '—'
const TIPO_BY_ID = Object.fromEntries(TIPOS.map(t => [t.id, t]))

const TABLAS_TALLES = {
  adulto:   ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  nino:     ['2', '4', '6', '8', '10', '12', '14', '16'],
  malla:    ['40', '42', '44', '46', '48', '50', '52'],
  mallaesp: ['54', '56', '58'],
}
const TALLES_ADULTO = TABLAS_TALLES.adulto
const TALLES_NINO   = TABLAS_TALLES.nino

const S = {
  wrap:     { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: F, fontSize: 11, color: '#000', background: '#d4d0c8' },
  tbar:     { background: 'linear-gradient(to bottom,#e8eef7,#c8d4e8)', borderBottom: '2px solid #808080', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  body:     { flex: 1, overflowY: 'auto', padding: '8px' },
  btn:      { fontFamily: F, fontSize: 11, background: 'linear-gradient(to bottom,#f0f0e8,#d8d4c8)', border: '1px solid #808080', padding: '2px 8px', cursor: 'pointer' },
  btnP:     { fontFamily: F, fontSize: 11, background: 'linear-gradient(to bottom,#4a7ab8,#2a5a98)', color: '#fff', border: '1px solid #1a4a88', padding: '2px 8px', cursor: 'pointer' },
  btnD:     { fontFamily: F, fontSize: 11, background: 'none', border: 'none', color: '#a00', cursor: 'pointer', padding: '0 4px' },
  lbl:      { display: 'block', fontSize: 10, fontWeight: 700, color: '#444', marginBottom: 2, textTransform: 'uppercase' },
  inp:      { fontFamily: F, fontSize: 11, border: '1px solid #808080', padding: '2px 4px', background: '#fff' },
  inpC:     { fontFamily: F, fontSize: 11, border: '1px solid #a0a0a0', padding: '1px 3px', textAlign: 'center', background: '#fff' },
  sel:      { fontFamily: F, fontSize: 11, border: '1px solid #808080', padding: '2px 4px', background: '#fff' },
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:    { background: '#f0f0e8', border: '2px solid #808080', boxShadow: '4px 4px 0 #000', width: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  modalH:   { background: 'linear-gradient(to bottom,#4a7ab8,#2a5a98)', color: '#fff', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 },
  modalB:   { padding: 12, overflowY: 'auto', flex: 1 },
  card:     { border: '2px solid #a0a8b8', background: '#f4f4f0', marginBottom: 8, boxShadow: '1px 1px 0 #b8b8b8' },
  cardHead: { background: 'linear-gradient(to bottom,#e0e8f4,#d0ddf0)', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #a0a8b8' },
  tbl:      { borderCollapse: 'collapse', width: '100%', fontSize: 11 },
  th:       { border: '1px solid #c0c0c0', padding: '2px 6px', background: '#e8e8e0', fontWeight: 700, textAlign: 'center' },
  thL:      { border: '1px solid #c0c0c0', padding: '2px 6px', background: '#e8e8e0', fontWeight: 700, textAlign: 'left' },
  td:       { border: '1px solid #d0d0c8', padding: '2px 6px', textAlign: 'center' },
  tdL:      { border: '1px solid #d0d0c8', padding: '2px 6px', textAlign: 'left' },
  tag: (color) => ({ display: 'inline-block', background: color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 5px', marginRight: 4 }),
  tab: (active) => ({ fontFamily: F, fontSize: 11, padding: '3px 10px', cursor: 'pointer', border: '1px solid #808080', borderBottom: active ? 'none' : '1px solid #808080', background: active ? '#f0f0e8' : '#d8d4c8', fontWeight: active ? 700 : 400, marginBottom: active ? -1 : 0, position: 'relative', zIndex: active ? 1 : 0 }),
}

function AcList({ items, onPick, label }) {
  if (!items.length) return null
  return (
    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#fff', border: '1px solid #808080', maxHeight: 180, overflowY: 'auto', boxShadow: '2px 2px 4px rgba(0,0,0,.3)' }}>
      {items.map(r => (
        <div key={r.id} style={{ padding: '4px 8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
          onMouseDown={() => onPick(r)}>{label(r)}</div>
      ))}
    </div>
  )
}

// ── Bloque de producto en modal ───────────────────────────────────────────────

function newItem() {
  return { producto_id: null, prodQ: '', prodRes: [], tabla: 'adulto', talles: TALLES_ADULTO, conNino: false, cantidades: {}, observacion: '' }
}

function ItemProd({ item, index, tipo, onChange, onRemove, timers }) {
  function onProdInput(val) {
    onChange(index, { ...item, prodQ: val, producto_id: null, prodRes: [] })
    clearTimeout(timers.current[`prod${index}`])
    if (!val.trim()) return
    timers.current[`prod${index}`] = setTimeout(async () => {
      const { data } = await supabase.from('productos').select('id, nombre, tabla, precio_confeccion').ilike('nombre', `%${val.trim()}%`).limit(8)
      onChange(index, { ...item, prodQ: val, producto_id: null, prodRes: data || [] })
    }, 250)
  }

  function pickProd(p) {
    const talles = TABLAS_TALLES[p.tabla] || TALLES_ADULTO
    onChange(index, { ...item, producto_id: p.id, prodQ: p.nombre, prodRes: [], tabla: p.tabla, talles, conNino: false, cantidades: {}, observacion: '', precio_confeccion: p.precio_confeccion || null })
  }

  function toggleNino() {
    const conNino = !item.conNino
    onChange(index, { ...item, conNino, talles: conNino ? [...TALLES_ADULTO, ...TALLES_NINO] : TALLES_ADULTO })
  }

  function setCant(talle, val) {
    onChange(index, { ...item, cantidades: { ...item.cantidades, [talle]: val } })
  }

  const talles = item.talles || TALLES_ADULTO
  const qty = Object.values(item.cantidades || {}).reduce((s, v) => s + (parseInt(v) || 0), 0)
  const precioUnit = parseFloat(item.precio_confeccion) || 0
  const subtotal = qty * precioUnit

  return (
    <div style={{ border: '1px solid #c0c8d8', background: '#f8f8fc', padding: '6px 8px', marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input style={{ ...S.inp, width: '100%' }} value={item.prodQ} onChange={e => onProdInput(e.target.value)} placeholder="Buscar producto..." />
          <AcList items={item.prodRes || []} onPick={pickProd} label={r => r.nombre} />
        </div>
        {item.producto_id && item.tabla === 'adulto' && (
          <button style={{ ...S.btn, fontSize: 10, background: item.conNino ? '#4a2a6a' : undefined, color: item.conNino ? '#fff' : undefined }}
            onClick={toggleNino}>{item.conNino ? '✕ niño' : '+ niño'}</button>
        )}
        <button style={S.btnD} onClick={() => onRemove(index)}>✕</button>
      </div>
      {item.producto_id && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...S.tbl, marginBottom: 4 }}>
              <thead><tr>{talles.map(t => <th key={t} style={S.th}>{t}</th>)}</tr></thead>
              <tbody><tr>
                {talles.map(t => (
                  <td key={t} style={S.td}>
                    <input style={{ ...S.inpC, width: 36 }} type="number" min="0"
                      value={item.cantidades?.[t] || ''} placeholder="0"
                      onChange={e => setCant(t, e.target.value)} />
                  </td>
                ))}
              </tr></tbody>
            </table>
          </div>
          {tipo === 'recepcion' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, background: '#eaf4ea', border: '1px solid #b0d0b0', padding: '4px 6px' }}>
              <span style={{ fontSize: 11, color: '#555' }}>Precio/u:</span>
              <span style={{ fontWeight: 700, fontSize: 12 }}>$</span>
              <input style={{ ...S.inp, width: 80, fontSize: 12, fontWeight: 700 }} type="number" min="0" step="0.01"
                value={item.precio_confeccion != null ? item.precio_confeccion : ''}
                onChange={e => onChange(index, { ...item, precio_confeccion: e.target.value === '' ? null : e.target.value })}
                placeholder="0.00" />
              {qty > 0 && precioUnit > 0 && (
                <span style={{ fontSize: 12, color: '#1a5a1a', fontWeight: 700, marginLeft: 4 }}>
                  × {qty} u. = {fmtMoneda(subtotal)}
                </span>
              )}
            </div>
          )}
          <div style={{ marginTop: 4 }}>
            <input style={{ ...S.inp, width: '100%' }} value={item.observacion || ''}
              onChange={e => onChange(index, { ...item, observacion: e.target.value })}
              placeholder="Observación (opcional)" />
          </div>
        </>
      )}
    </div>
  )
}

// ── Pestaña Falladas ──────────────────────────────────────────────────────────

function TabFalladas({ selected, onToggle }) {
  const [fallas, setFallas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('taller_control_items')
        .select(`id, cant_falla, talle, observacion, movimiento_id,
          productos(id, nombre),
          taller_movimientos(id, fecha, contactos(nombre))`)
        .gt('cant_falla', 0)
        .order('created_at', { ascending: false })
      setFallas(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 8, color: '#666' }}>Cargando...</div>
  if (!fallas.length) return <div style={{ padding: 8, color: '#666', fontStyle: 'italic' }}>No hay prendas con falla registradas.</div>

  return (
    <div>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 6 }}>Seleccioná las prendas con falla que querés incluir en este envío.</div>
      {fallas.map(f => {
        const key = f.id
        const isSel = !!selected[key]
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', marginBottom: 4, background: isSel ? '#e8f0f8' : '#f8f8fc', border: `1px solid ${isSel ? '#4a7ab8' : '#c0c8d8'}`, cursor: 'pointer' }}
            onClick={() => onToggle(f)}>
            <input type="checkbox" checked={isSel} onChange={() => {}} />
            <div style={{ flex: 1 }}>
              <strong>{f.productos?.nombre || '?'}</strong>
              <span style={{ marginLeft: 6, color: '#1a3a6b', fontWeight: 700 }}>talle {f.talle}</span>
              <span style={{ marginLeft: 6, color: '#8a0000' }}>× {f.cant_falla}</span>
              {f.observacion && <span style={{ marginLeft: 6, color: '#666', fontStyle: 'italic' }}>{f.observacion}</span>}
            </div>
            <div style={{ fontSize: 10, color: '#888' }}>
              {fmtF(f.taller_movimientos?.fecha)} · {f.taller_movimientos?.contactos?.nombre || '?'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Formulario base de movimiento (compartido entre Nuevo y Editar) ───────────

function FormMovimiento({ tipo, setTipo, fecha, setFecha, tallerQ, setTallerQ, tallerId, setTallerId, tallerRes, setTallerRes, items, setItems, nota, setNota, monto, setMonto, tabItems, setTabItems, fallasSel, setFallasSel, timers, modoEditar }) {
  const conFallasTab  = tipo === 'envio' || tipo === 'devolucion'
  const esMonoMonto   = tipo === 'pago' || tipo === 'concepto'
  const esRecepcion   = tipo === 'recepcion'

  // Referencia de precio para recepciones
  const refPrecio = esRecepcion ? items.reduce((sum, it) => {
    const qty = Object.values(it.cantidades || {}).reduce((s, v) => s + (parseInt(v) || 0), 0)
    return sum + qty * (parseFloat(it.precio_confeccion) || 0)
  }, 0) : 0

  function updateItem(i, val) { setItems(prev => prev.map((it, j) => j === i ? val : it)) }
  function removeItem(i)      { setItems(prev => prev.filter((_, j) => j !== i)) }

  function onTallerInput(val) {
    setTallerQ(val); setTallerId(null)
    clearTimeout(timers.current.taller)
    if (!val.trim()) { setTallerRes([]); return }
    timers.current.taller = setTimeout(async () => {
      const { data } = await supabase.from('contactos').select('id, nombre').ilike('nombre', `%${val.trim()}%`).limit(8)
      setTallerRes(data || [])
    }, 250)
  }

  function toggleFalla(f) {
    setFallasSel(prev => {
      const next = { ...prev }
      if (next[f.id]) delete next[f.id]; else next[f.id] = f
      return next
    })
  }

  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <span style={S.lbl}>Tipo</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TIPOS.map(tp => (
            <button key={tp.id} style={{ ...S.btn, background: tipo === tp.id ? tp.color : undefined, color: tipo === tp.id ? '#fff' : undefined, border: tipo === tp.id ? `1px solid ${tp.color}` : undefined }}
              onClick={() => setTipo(tp.id)}>{tp.icon} {tp.label}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div>
          <span style={S.lbl}>Fecha</span>
          <input style={S.inp} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={S.lbl}>{tipo === 'entrega' ? 'Cliente' : 'Taller'}</span>
          <input style={{ ...S.inp, width: '100%' }} value={tallerQ} onChange={e => onTallerInput(e.target.value)} placeholder="Buscar en Contactos..." />
          {tallerId && <span style={{ fontSize: 10, color: '#2a6a2a' }}>✓ {tallerQ}</span>}
          <AcList items={tallerRes} onPick={r => { setTallerId(r.id); setTallerQ(r.nombre); setTallerRes([]) }} label={r => r.nombre} />
        </div>
      </div>

      {conFallasTab && (
        <div style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #808080', marginBottom: 0 }}>
            <button style={S.tab(tabItems === 'nuevo')}   onClick={() => setTabItems('nuevo')}>Nuevo</button>
            <button style={S.tab(tabItems === 'falladas')} onClick={() => setTabItems('falladas')}>⚠️ Falladas</button>
          </div>
          <div style={{ border: '1px solid #808080', borderTop: 'none', padding: '8px', marginBottom: 10, background: '#f8f8f4' }}>
            {tabItems === 'nuevo' ? (
              <>
                {items.map((it, i) => <ItemProd key={i} item={it} index={i} tipo={tipo} onChange={updateItem} onRemove={removeItem} timers={timers} />)}
                <button style={{ ...S.btn, fontSize: 10 }} onClick={() => setItems(prev => [...prev, newItem()])}>+ producto</button>
              </>
            ) : (
              <TabFalladas selected={fallasSel} onToggle={toggleFalla} />
            )}
          </div>
        </div>
      )}

      {!conFallasTab && tipo !== 'pago' && (
        <div style={{ marginBottom: 10 }}>
          <span style={S.lbl}>Productos</span>
          {items.map((it, i) => <ItemProd key={i} item={it} index={i} tipo={tipo} onChange={updateItem} onRemove={removeItem} timers={timers} />)}
          <button style={{ ...S.btn, fontSize: 10 }} onClick={() => setItems(prev => [...prev, newItem()])}>+ producto</button>
        </div>
      )}

      {esMonoMonto && (
        <div style={{ marginBottom: 10 }}>
          <span style={S.lbl}>{tipo === 'concepto' ? 'Concepto / descripción' : 'Monto'}</span>
          {tipo === 'concepto' && (
            <input style={{ ...S.inp, width: '100%', marginBottom: 6 }} value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: Boxers natación tela económica × 20 u." />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>$</span>
            <input style={{ ...S.inp, width: 120, fontSize: 14, fontWeight: 700 }}
              type="number" min="0" step="0.01"
              value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" />
          </div>
        </div>
      )}

      {esRecepcion && refPrecio > 0 && (
        <div style={{ marginBottom: 10, background: '#f0f8f0', border: '1px solid #b0d0b0', padding: '6px 10px' }}>
          <span style={S.lbl}>Total a pagar al taller</span>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a5a1a' }}>{fmtMoneda(refPrecio)}</div>
        </div>
      )}

      {tipo !== 'concepto' && (
        <div style={{ marginTop: 6 }}>
          <span style={S.lbl}>Nota</span>
          <input style={{ ...S.inp, width: '100%' }} value={nota} onChange={e => setNota(e.target.value)} placeholder="opcional" />
        </div>
      )}
    </>
  )
}

// ── Modal: Nuevo movimiento ───────────────────────────────────────────────────

function ModalNuevo({ onClose, onSave, tipoInicial }) {
  const [tipo,       setTipo]       = useState(tipoInicial || 'envio')
  const [fecha,      setFecha]      = useState(today())
  const [tallerQ,    setTallerQ]    = useState('')
  const [tallerId,   setTallerId]   = useState(null)
  const [tallerRes,  setTallerRes]  = useState([])
  const [items,      setItems]      = useState([newItem()])
  const [nota,       setNota]       = useState('')
  const [monto,      setMonto]      = useState('')
  const [tabItems,   setTabItems]   = useState('nuevo')
  const [fallasSel,  setFallasSel]  = useState({})
  const [saving,     setSaving]     = useState(false)
  const timers = useRef({})

  async function save() {
    if (!tallerId) { alert('Seleccioná un taller'); return }
    if (tipo === 'pago' || tipo === 'concepto') {
      if (!monto || parseFloat(monto) <= 0) { alert('Ingresá un monto'); return }
      if (tipo === 'concepto' && !nota.trim()) { alert('Ingresá un concepto / descripción'); return }
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('taller_movimientos')
        .insert({ tipo, fecha, contacto_id: tallerId, nota: nota.trim() || null, monto: parseFloat(monto), user_id: user?.id })
      if (error) { alert('Error: ' + error.message); setSaving(false); return }
      setSaving(false); onSave(); return
    }
    const rows = buildRows(tipo, tabItems, items, fallasSel)
    if (!rows.length) { alert('Ingresá al menos una cantidad'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const montoVal = tipo === 'recepcion'
      ? (items.reduce((sum, it) => {
          const qty = Object.values(it.cantidades || {}).reduce((s, v) => s + (parseInt(v) || 0), 0)
          return sum + qty * (parseFloat(it.precio_confeccion) || 0)
        }, 0) || null)
      : (monto && parseFloat(monto) > 0 ? parseFloat(monto) : null)
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo, fecha, contacto_id: tallerId, nota: nota.trim() || null, monto: montoVal, user_id: user?.id })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    for (const r of rows) await supabase.from('taller_movimientos_items').insert({ movimiento_id: mov.id, ...r })
    setSaving(false); onSave()
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalH}>
          <span>Nuevo movimiento</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalB}>
          <FormMovimiento tipo={tipo} setTipo={setTipo} fecha={fecha} setFecha={setFecha}
            tallerQ={tallerQ} setTallerQ={setTallerQ} tallerId={tallerId} setTallerId={setTallerId}
            tallerRes={tallerRes} setTallerRes={setTallerRes}
            items={items} setItems={setItems} nota={nota} setNota={setNota} monto={monto} setMonto={setMonto}
            tabItems={tabItems} setTabItems={setTabItems}
            fallasSel={fallasSel} setFallasSel={setFallasSel}
            timers={timers} />
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={S.btnP} onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Editar movimiento ──────────────────────────────────────────────────

function ModalEditar({ mov, onClose, onSave }) {
  const [tipo,      setTipo]      = useState(mov.tipo)
  const [fecha,     setFecha]     = useState(mov.fecha)
  const [tallerQ,   setTallerQ]   = useState(mov.contactos?.nombre || '')
  const [tallerId,  setTallerId]  = useState(mov.contactos?.id || null)
  const [tallerRes, setTallerRes] = useState([])
  const [nota,      setNota]      = useState(mov.nota || '')
  const [monto,     setMonto]     = useState(mov.monto ? String(mov.monto) : '')
  const [tabItems,  setTabItems]  = useState('nuevo')
  const [fallasSel, setFallasSel] = useState({})
  const [items,     setItems]     = useState(() => {
    const byProd = {}
    for (const it of (mov.taller_movimientos_items || [])) {
      const pid = it.producto_id
      if (!byProd[pid]) {
        const tabla  = it.productos?.tabla || 'adulto'
        const talles = TABLAS_TALLES[tabla] || TALLES_ADULTO
        byProd[pid] = { producto_id: pid, prodQ: it.productos?.nombre || '', prodRes: [], tabla, talles, conNino: false, cantidades: {}, observacion: it.observacion || '', precio_confeccion: it.productos?.precio_confeccion ?? null }
      }
      byProd[pid].cantidades[it.talle] = String(it.cantidad)
      if (TALLES_NINO.includes(it.talle)) {
        byProd[pid].conNino = true
        byProd[pid].talles = [...TALLES_ADULTO, ...TALLES_NINO]
      }
    }
    return Object.values(byProd).length ? Object.values(byProd) : [newItem()]
  })
  const [saving, setSaving] = useState(false)
  const timers = useRef({})

  useEffect(() => {
    if (mov.tipo !== 'recepcion') return
    const ids = [...new Set((mov.taller_movimientos_items || []).map(it => it.producto_id).filter(Boolean))]
    if (!ids.length) return
    supabase.from('productos').select('id, precio_confeccion').in('id', ids).then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(p => { map[p.id] = p.precio_confeccion })
      setItems(prev => prev.map(it => it.producto_id && map[it.producto_id] != null
        ? { ...it, precio_confeccion: map[it.producto_id] }
        : it))
    })
  }, [])

  async function save() {
    if (!tallerId) { alert('Seleccioná un taller'); return }
    if (tipo === 'pago' || tipo === 'concepto') {
      if (!monto || parseFloat(monto) <= 0) { alert('Ingresá un monto'); return }
      setSaving(true)
      await supabase.from('taller_movimientos').update({ tipo, fecha, contacto_id: tallerId, nota: nota.trim() || null, monto: parseFloat(monto) }).eq('id', mov.id)
      setSaving(false); onSave(); return
    }
    const rows = buildRows(tipo, tabItems, items, fallasSel)
    if (!rows.length) { alert('Ingresá al menos una cantidad'); return }
    setSaving(true)
    const montoVal = tipo === 'recepcion'
      ? (items.reduce((sum, it) => {
          const qty = Object.values(it.cantidades || {}).reduce((s, v) => s + (parseInt(v) || 0), 0)
          return sum + qty * (parseFloat(it.precio_confeccion) || 0)
        }, 0) || null)
      : (monto && parseFloat(monto) > 0 ? parseFloat(monto) : null)
    await supabase.from('taller_movimientos').update({ tipo, fecha, contacto_id: tallerId, nota: nota.trim() || null, monto: montoVal }).eq('id', mov.id)
    await supabase.from('taller_movimientos_items').delete().eq('movimiento_id', mov.id)
    for (const r of rows) await supabase.from('taller_movimientos_items').insert({ movimiento_id: mov.id, ...r })
    setSaving(false); onSave()
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalH}>
          <span>Editar movimiento</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalB}>
          <FormMovimiento tipo={tipo} setTipo={setTipo} fecha={fecha} setFecha={setFecha}
            tallerQ={tallerQ} setTallerQ={setTallerQ} tallerId={tallerId} setTallerId={setTallerId}
            tallerRes={tallerRes} setTallerRes={setTallerRes}
            items={items} setItems={setItems} nota={nota} setNota={setNota} monto={monto} setMonto={setMonto}
            tabItems={tabItems} setTabItems={setTabItems}
            fallasSel={fallasSel} setFallasSel={setFallasSel}
            timers={timers} modoEditar />
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={S.btnP} onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

function buildRows(tipo, tabItems, items, fallasSel) {
  const rows = []
  const useFallas = (tipo === 'envio' || tipo === 'devolucion') && tabItems === 'falladas'
  if (useFallas) {
    for (const f of Object.values(fallasSel)) {
      rows.push({ producto_id: f.productos?.id || f.producto_id, talle: f.talle, cantidad: f.cant_falla, observacion: f.observacion || null })
    }
  } else {
    for (const it of items) {
      if (!it.producto_id) continue
      for (const [talle, cant] of Object.entries(it.cantidades || {})) {
        const cantidad = parseInt(cant) || 0
        if (cantidad > 0) rows.push({ producto_id: it.producto_id, talle, cantidad, observacion: it.observacion?.trim() || null })
      }
    }
  }
  return rows
}

// ── Modal: Control de calidad ─────────────────────────────────────────────────

function ModalCalidad({ mov, entregasVinculadas, controlItems, onClose, onSave }) {
  const [entries, setEntries] = useState(() => {
    const entregado = {}
    for (const e of (entregasVinculadas || [])) {
      for (const ei of (e.taller_movimientos_items || [])) {
        const k = `${ei.producto_id}__${ei.talle}`
        entregado[k] = (entregado[k] || 0) + (ei.cantidad || 0)
      }
    }
    // Pre-cargar valores existentes de control de calidad
    const ctrlMap = {}
    for (const c of (controlItems || [])) {
      ctrlMap[`${c.producto_id}__${c.talle}`] = c
    }
    const rows = []
    for (const it of (mov.taller_movimientos_items || [])) {
      const k = `${it.producto_id}__${it.talle}`
      const existing = ctrlMap[k]
      const disponible = Math.max(0, it.cantidad - (entregado[k] || 0))
      rows.push({
        producto_id: it.producto_id, prodNombre: it.productos?.nombre || '?',
        talle: it.talle, recibido: it.cantidad, disponible,
        cant_ok:    existing ? String(existing.cant_ok)    : '',
        cant_falla: existing ? String(existing.cant_falla) : '',
        observacion: existing?.observacion || '',
      })
    }
    return rows.filter(r => r.disponible > 0 || (ctrlMap[`${r.producto_id}__${r.talle}`]))
  })
  const [saving, setSaving] = useState(false)

  function setField(i, k, v) {
    setEntries(prev => prev.map((e, j) => j === i ? { ...e, [k]: v } : e))
  }

  async function save() {
    setSaving(true)
    await supabase.from('taller_control_items').delete().eq('movimiento_id', mov.id)
    for (const e of entries) {
      const cant_ok    = parseInt(e.cant_ok)    || 0
      const cant_falla = parseInt(e.cant_falla) || 0
      if (cant_ok + cant_falla === 0) continue
      await supabase.from('taller_control_items').insert({
        movimiento_id: mov.id, producto_id: e.producto_id,
        talle: e.talle, cant_ok, cant_falla,
        observacion: e.observacion?.trim() || null,
      })
    }
    setSaving(false); onSave()
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 620 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...S.modalH, background: 'linear-gradient(to bottom,#6a8a2a,#4a6a10)' }}>
          <span>🔍 Control de calidad — {mov.contactos?.nombre} · {fmtF(mov.fecha)}</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalB}>
          <div style={{ fontSize: 10, color: '#555', marginBottom: 8 }}>Por cada talle, ingresá cuántas quedaron OK y cuántas tienen falla.</div>
          <table style={S.tbl}>
            <thead><tr>
              <th style={S.thL}>Producto</th>
              <th style={S.th}>Talle</th>
              <th style={S.th}>Disponible</th>
              <th style={S.th}>✅ OK</th>
              <th style={S.th}>⚠️ Falla</th>
              <th style={S.thL}>Observación</th>
            </tr></thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} style={{ background: parseInt(e.cant_falla) > 0 ? '#fff4f0' : 'transparent' }}>
                  <td style={S.tdL}>{e.prodNombre}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{e.talle}</td>
                  <td style={S.td}>{e.disponible}</td>
                  <td style={S.td}>
                    <input style={{ ...S.inpC, width: 40 }} type="number" min="0" max={e.disponible}
                      value={e.cant_ok} onChange={ev => setField(i, 'cant_ok', ev.target.value)} />
                  </td>
                  <td style={S.td}>
                    <input style={{ ...S.inpC, width: 40, background: parseInt(e.cant_falla) > 0 ? '#ffe8e0' : '#fff' }}
                      type="number" min="0" max={e.disponible}
                      value={e.cant_falla} onChange={ev => setField(i, 'cant_falla', ev.target.value)} />
                  </td>
                  <td style={S.tdL}>
                    <input style={{ ...S.inp, width: '100%', fontSize: 10 }} value={e.observacion}
                      onChange={ev => setField(i, 'observacion', ev.target.value)}
                      placeholder={parseInt(e.cant_falla) > 0 ? 'Ej: costura suelta' : ''} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btnP, background: 'linear-gradient(to bottom,#6a8a2a,#4a6a10)', border: '1px solid #3a5a00' }}
            onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar control'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Recepción rápida desde envío ──────────────────────────────────────

function ModalRecibir({ envio, onClose, onSave }) {
  const [fecha,   setFecha]   = useState(today())
  const [nota,    setNota]    = useState('')
  const [saving,  setSaving]  = useState(false)
  // una fila por ítem del envío, cantidad editable
  const [filas, setFilas] = useState(() =>
    (envio.taller_movimientos_items || []).map(it => ({
      producto_id: it.producto_id,
      prodNombre:  it.productos?.nombre || '?',
      talle:       it.talle,
      enviado:     it.cantidad,
      cantidad:    String(it.cantidad),
    }))
  )

  function setCant(i, val) {
    setFilas(prev => prev.map((f, j) => j === i ? { ...f, cantidad: val } : f))
  }

  async function save() {
    const rows = filas.filter(f => parseInt(f.cantidad) > 0)
    if (!rows.length) { alert('Ingresá al menos una cantidad'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo: 'recepcion', fecha, contacto_id: envio.contactos?.id || null, nota: nota.trim() || null, user_id: user?.id })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    for (const r of rows) {
      await supabase.from('taller_movimientos_items').insert({
        movimiento_id: mov.id, producto_id: r.producto_id,
        talle: r.talle, cantidad: parseInt(r.cantidad) || 0,
      })
    }
    setSaving(false); onSave()
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...S.modalH, background: 'linear-gradient(to bottom,#1a6a1a,#0a4a0a)' }}>
          <span>📥 Recibir — {envio.contactos?.nombre} (envío {fmtF(envio.fecha)})</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalB}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div>
              <span style={S.lbl}>Fecha de recepción</span>
              <input style={S.inp} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#555', marginBottom: 6 }}>Ajustá las cantidades recibidas (pueden ser menores a lo enviado).</div>
          <table style={S.tbl}>
            <thead><tr>
              <th style={S.thL}>Producto</th>
              <th style={S.th}>Talle</th>
              <th style={S.th}>Enviado</th>
              <th style={S.th}>Recibido</th>
            </tr></thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i}>
                  <td style={S.tdL}>{f.prodNombre}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{f.talle}</td>
                  <td style={{ ...S.td, color: '#888' }}>{f.enviado}</td>
                  <td style={S.td}>
                    <input style={{ ...S.inpC, width: 44 }} type="number" min="0" max={f.enviado}
                      value={f.cantidad} onChange={e => setCant(i, e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10 }}>
            <span style={S.lbl}>Nota</span>
            <input style={{ ...S.inp, width: '100%' }} value={nota} onChange={e => setNota(e.target.value)} placeholder="opcional" />
          </div>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btnP, background: 'linear-gradient(to bottom,#1a6a1a,#0a4a0a)', border: '1px solid #0a4a0a' }}
            onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Registrar recepción'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Enviar falla al taller externo ────────────────────────────────────

function ModalEnviarFalla({ falla, onClose, onSave }) {
  const [fecha,     setFecha]     = useState(today())
  const [tallerQ,   setTallerQ]   = useState('')
  const [tallerId,  setTallerId]  = useState(null)
  const [tallerRes, setTallerRes] = useState([])
  const [saving,    setSaving]    = useState(false)
  const timers = useRef({})

  function onTallerInput(val) {
    setTallerQ(val); setTallerId(null)
    clearTimeout(timers.current.taller)
    if (!val.trim()) { setTallerRes([]); return }
    timers.current.taller = setTimeout(async () => {
      const { data } = await supabase.from('contactos').select('id, nombre').ilike('nombre', `%${val.trim()}%`).limit(8)
      setTallerRes(data || [])
    }, 250)
  }

  async function save() {
    if (!tallerId) { alert('Seleccioná un taller'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo: 'devolucion', fecha, contacto_id: tallerId, nota: null, user_id: user?.id })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    await supabase.from('taller_movimientos_items').insert({
      movimiento_id: mov.id,
      producto_id: falla.producto_id,
      talle: falla.talle,
      cantidad: falla.cant_falla,
      observacion: falla.observacion || null,
    })
    await supabase.from('taller_control_items').update({
      enviado_taller: true,
      enviado_fecha: fecha,
      enviado_contacto_id: tallerId,
    }).eq('id', falla.id)
    setSaving(false); onSave()
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...S.modalH, background: 'linear-gradient(to bottom,#6a006a,#4a004a)' }}>
          <span>📤 Enviar falla al taller</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalB}>
          <div style={{ background: '#fff4f0', border: '1px solid #e0b0a0', padding: '6px 10px', marginBottom: 12, fontSize: 11 }}>
            <strong>{falla.productos?.nombre || '?'}</strong>
            <span style={{ marginLeft: 6, color: '#1a3a6b', fontWeight: 700 }}>talle {falla.talle}</span>
            <span style={{ marginLeft: 6, color: '#8a0000' }}>× {falla.cant_falla}</span>
            {falla.observacion && <span style={{ marginLeft: 6, color: '#666', fontStyle: 'italic' }}>{falla.observacion}</span>}
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div>
              <span style={S.lbl}>Fecha</span>
              <input style={S.inp} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={S.lbl}>Taller</span>
              <input style={{ ...S.inp, width: '100%' }} value={tallerQ} onChange={e => onTallerInput(e.target.value)} placeholder="Buscar en Contactos..." />
              {tallerId && <span style={{ fontSize: 10, color: '#2a6a2a' }}>✓ {tallerQ}</span>}
              <AcList items={tallerRes} onPick={r => { setTallerId(r.id); setTallerQ(r.nombre); setTallerRes([]) }} label={r => r.nombre} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#555' }}>Se creará una Devolución al taller seleccionado y la falla quedará marcada como enviada.</div>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btnP, background: 'linear-gradient(to bottom,#6a006a,#4a004a)', border: '1px solid #4a004a' }}
            onClick={save} disabled={saving}>{saving ? 'Guardando...' : '📤 Enviar al taller'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Entregar a cliente desde recepción ─────────────────────────────────

function ModalEntregarDesdeRecepcion({ recepcion, entregasVinculadas, onClose, onSave }) {
  const [fecha,      setFecha]      = useState(today())
  const [clienteQ,   setClienteQ]   = useState('')
  const [clienteId,  setClienteId]  = useState(null)
  const [clienteRes, setClienteRes] = useState([])
  const [nota,       setNota]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const timers = useRef({})

  // Calcular ya entregado por producto+talle de entregas anteriores vinculadas
  const yaEntregado = {}
  for (const e of (entregasVinculadas || [])) {
    for (const it of (e.taller_movimientos_items || [])) {
      const k = `${it.producto_id}__${it.talle}`
      yaEntregado[k] = (yaEntregado[k] || 0) + (it.cantidad || 0)
    }
  }

  const [filas] = useState(() =>
    (recepcion.taller_movimientos_items || []).map(it => {
      const k = `${it.producto_id}__${it.talle}`
      const entregado = yaEntregado[k] || 0
      const disponible = Math.max(0, (it.cantidad || 0) - entregado)
      return { producto_id: it.producto_id, prodNombre: it.productos?.nombre || '?', talle: it.talle, recibido: it.cantidad, entregado, disponible, cantidad: '' }
    })
  )
  const [vals, setVals] = useState(() => filas.map(() => ''))

  function setVal(i, v) { setVals(prev => prev.map((x, j) => j === i ? v : x)) }

  function onClienteInput(val) {
    setClienteQ(val); setClienteId(null)
    clearTimeout(timers.current.cli)
    if (!val.trim()) { setClienteRes([]); return }
    timers.current.cli = setTimeout(async () => {
      const { data } = await supabase.from('contactos').select('id, nombre').ilike('nombre', `%${val.trim()}%`).limit(8)
      setClienteRes(data || [])
    }, 250)
  }

  async function save() {
    if (!clienteId) { alert('Seleccioná un cliente'); return }
    const rows = filas.map((f, i) => ({ ...f, cantidad: parseInt(vals[i]) || 0 })).filter(f => f.cantidad > 0)
    if (!rows.length) { alert('Ingresá al menos una cantidad'); return }
    for (const r of rows) {
      if (r.cantidad > r.disponible) { alert(`Cantidad mayor al disponible para ${r.prodNombre} talle ${r.talle}`); return }
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo: 'entrega', fecha, contacto_id: clienteId, nota: nota.trim() || null, user_id: user?.id, origen_movimiento_id: recepcion.id })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    for (const r of rows) {
      await supabase.from('taller_movimientos_items').insert({ movimiento_id: mov.id, producto_id: r.producto_id, talle: r.talle, cantidad: r.cantidad })
    }
    setSaving(false); onSave()
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 620 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...S.modalH, background: 'linear-gradient(to bottom,#7a3a00,#5a2000)' }}>
          <span>🛍️ Entregar a cliente — {recepcion.contactos?.nombre} {fmtF(recepcion.fecha)}</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalB}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div>
              <span style={S.lbl}>Fecha</span>
              <input style={S.inp} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={S.lbl}>Cliente</span>
              <input style={{ ...S.inp, width: '100%' }} value={clienteQ} onChange={e => onClienteInput(e.target.value)} placeholder="Buscar en Contactos..." />
              {clienteId && <span style={{ fontSize: 10, color: '#2a6a2a' }}>✓ {clienteQ}</span>}
              <AcList items={clienteRes} onPick={r => { setClienteId(r.id); setClienteQ(r.nombre); setClienteRes([]) }} label={r => r.nombre} />
            </div>
          </div>
          <table style={S.tbl}>
            <thead><tr>
              <th style={S.thL}>Producto</th>
              <th style={S.th}>Talle</th>
              <th style={S.th}>Recibido</th>
              <th style={S.th}>Ya entregado</th>
              <th style={S.th}>Disponible</th>
              <th style={S.th}>A entregar</th>
            </tr></thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i} style={{ background: f.disponible === 0 ? '#f0f0f0' : parseInt(vals[i]) > 0 ? '#fef8f0' : 'transparent' }}>
                  <td style={S.tdL}>{f.prodNombre}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{f.talle}</td>
                  <td style={{ ...S.td, color: '#555' }}>{f.recibido}</td>
                  <td style={{ ...S.td, color: f.entregado > 0 ? '#7a3a00' : '#aaa' }}>{f.entregado || '—'}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: f.disponible === 0 ? '#aaa' : '#1a5a1a' }}>{f.disponible}</td>
                  <td style={S.td}>
                    {f.disponible > 0
                      ? <input style={{ ...S.inpC, width: 44, background: parseInt(vals[i]) > 0 ? '#fff8e8' : '#fff' }}
                          type="number" min="0" max={f.disponible}
                          value={vals[i]} onChange={e => setVal(i, e.target.value)} />
                      : <span style={{ color: '#aaa', fontSize: 10 }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10 }}>
            <span style={S.lbl}>Nota</span>
            <input style={{ ...S.inp, width: '100%' }} value={nota} onChange={e => setNota(e.target.value)} placeholder="opcional" />
          </div>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btnP, background: 'linear-gradient(to bottom,#7a3a00,#5a2000)', border: '1px solid #5a2000' }}
            onClick={save} disabled={saving}>{saving ? 'Guardando...' : '🛍️ Registrar entrega'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Inline: marcar falla como recibida de vuelta ─────────────────────────────

function RecibirFallaInline({ item, onSave }) {
  const [open,   setOpen]   = useState(false)
  const [fecha,  setFecha]  = useState(today())
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mov } = await supabase.from('taller_movimientos')
      .insert({ tipo: 'recepcion', fecha, contacto_id: item.enviado_contacto_id, nota: '🔁 Falla arreglada', user_id: user?.id })
      .select().single()
    if (mov) {
      await supabase.from('taller_movimientos_items').insert({
        movimiento_id: mov.id, producto_id: item.producto_id, talle: item.talle, cantidad: item.cant_falla,
      })
    }
    await supabase.from('taller_control_items').update({ devuelto_taller: true, devuelto_fecha: fecha, devuelto_recepcion_id: mov?.id || null }).eq('id', item.id)
    setSaving(false)
    setOpen(false)
    onSave()
  }

  if (!open) return (
    <button style={{ ...S.btn, fontSize: 10, padding: '1px 5px', color: '#1a5a1a' }}
      onClick={() => setOpen(true)}>✓ Recibí</button>
  )
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <input style={{ ...S.inp, width: 110, fontSize: 10, padding: '1px 4px' }} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
      <button style={{ ...S.btnP, fontSize: 10, padding: '1px 6px' }} onClick={save} disabled={saving}>{saving ? '...' : '✓'}</button>
      <button style={{ ...S.btn, fontSize: 10, padding: '1px 4px' }} onClick={() => setOpen(false)}>✕</button>
    </span>
  )
}

// ── Tarjeta de movimiento ─────────────────────────────────────────────────────

function MovCard({ mov, onDelete, onEdit, onCalidad, onRecibir, controlItems, onEnviarFalla, entregasVinculadas }) {
  const [collapsed,       setCollapsed]       = useState(false)
  const [expandedProds,   setExpandedProds]   = useState({})
  const [enviarFallaItem, setEnviarFallaItem] = useState(null)
  const [entregando,      setEntregando]      = useState(false)
  const [editandoEntrega, setEditandoEntrega] = useState(null)
  const t = TIPO_BY_ID[mov.tipo] || {}
  const esRecepcion = mov.tipo === 'recepcion'
  const esPago      = mov.tipo === 'pago'
  const hasControl  = controlItems?.length > 0
  const okItems     = controlItems?.filter(c => c.cant_ok > 0)    || []
  const fallaItems  = controlItems?.filter(c => c.cant_falla > 0) || []

  const esConcepto  = mov.tipo === 'concepto'
  const tieneItems  = !esPago && !esConcepto

  return (
    <div style={{ ...S.card, borderColor: t.color || '#a0a8b8' }}>
      <div style={{ ...S.cardHead, background: `linear-gradient(to bottom, ${t.color}22, ${t.color}11)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }} onClick={() => setCollapsed(c => !c)}>
          <span style={{ fontSize: 14 }}>{collapsed ? '▶' : '▼'}</span>
          <span style={S.tag(t.color)}>{t.icon} {t.label}</span>
          <span style={{ fontWeight: 700, fontSize: 12 }}>{fmtF(mov.fecha)}</span>
          {(esPago || esConcepto)
            ? <span style={{ fontWeight: 700, fontSize: 13, color: t.color }}>{fmtMoneda(mov.monto)}</span>
            : <span style={{ fontSize: 10, color: '#888' }}>{mov.taller_movimientos_items?.length || 0} ítem{mov.taller_movimientos_items?.length !== 1 ? 's' : ''}</span>
          }
          {esRecepcion && mov.monto != null && <span style={{ fontSize: 11, color: '#1a5a1a', fontWeight: 700 }}>→ {fmtMoneda(mov.monto)}</span>}
          {esRecepcion && hasControl && <span style={{ fontSize: 10, color: '#2a6a10', fontWeight: 700 }}>✓ ctrl</span>}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {mov.tipo === 'envio' && <button style={{ ...S.btn, fontSize: 10, padding: '1px 6px', color: '#1a5a1a', fontWeight: 700 }} onClick={() => onRecibir(mov)}>📥 Recibir</button>}
          {esRecepcion && <button style={{ ...S.btn, fontSize: 10, padding: '1px 6px' }} onClick={() => onCalidad(mov)}>🔍 Calidad</button>}
          {esRecepcion && <button style={{ ...S.btn, fontSize: 10, padding: '1px 6px', color: '#7a3a00', fontWeight: 700 }} onClick={() => setEntregando(true)}>🛍️ Entregar</button>}
          <button style={{ ...S.btn, fontSize: 10, padding: '1px 6px' }} onClick={() => onEdit(mov)}>✏️</button>
          <button style={S.btnD} onClick={() => onDelete(mov.id)}>✕</button>
        </div>
      </div>
      {!collapsed && (
        <div style={{ padding: '6px 10px' }}>
          {mov.nota && <div style={{ fontSize: 10, color: '#555', marginBottom: 6, fontStyle: 'italic' }}>📝 {mov.nota}</div>}

          {(esPago || esConcepto) && (
            <div style={{ fontSize: 12, color: t.color, fontWeight: 700 }}>{fmtMoneda(mov.monto)}</div>
          )}

          {/* Items */}
          {tieneItems && (() => {
            const its = mov.taller_movimientos_items || []
            const total = its.reduce((s, it) => s + (it.cantidad || 0), 0)

            if (esRecepcion) {
              // Calcular entregado y falla por (producto_id, talle)
              const entregado = {}
              for (const e of (entregasVinculadas || [])) {
                for (const ei of (e.taller_movimientos_items || [])) {
                  const k = `${ei.producto_id}__${ei.talle}`
                  entregado[k] = (entregado[k] || 0) + (ei.cantidad || 0)
                }
              }
              const fallaCtrl = {}
              for (const c of (controlItems || [])) {
                const k = `${c.producto_id}__${c.talle}`
                fallaCtrl[k] = (fallaCtrl[k] || 0) + (c.cant_falla || 0)
              }
              // Agrupar por producto
              const byProd = {}
              for (const it of its) {
                const pid = it.producto_id
                if (!byProd[pid]) byProd[pid] = { nombre: it.productos?.nombre || '?', pid, rows: [] }
                const k = `${pid}__${it.talle}`
                byProd[pid].rows.push({ ...it, entregadoQ: entregado[k] || 0, fallaQ: fallaCtrl[k] || 0 })
              }
              const grupos = Object.values(byProd)
              const totalEntregado = Object.values(entregado).reduce((s, v) => s + v, 0)
              const totalFalla = Object.values(fallaCtrl).reduce((s, v) => s + v, 0)
              const totalDisp = total - totalEntregado - totalFalla
              return (
                <div>
                  {grupos.map(g => {
                    const gRec  = g.rows.reduce((s, r) => s + r.cantidad, 0)
                    const gEnt  = g.rows.reduce((s, r) => s + r.entregadoQ, 0)
                    const gFall = g.rows.reduce((s, r) => s + r.fallaQ, 0)
                    const gDisp = gRec - gEnt - gFall
                    const expanded = !!expandedProds[g.pid]
                    return (
                      <div key={g.pid} style={{ marginBottom: 4 }}>
                        <button
                          style={{ width: '100%', textAlign: 'left', background: expanded ? '#e8f0e8' : '#f4f4f0', border: '1px solid #c8c8c0', padding: '4px 8px', cursor: 'pointer', fontFamily: F, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onClick={() => setExpandedProds(p => ({ ...p, [g.pid]: !p[g.pid] }))}
                        >
                          <span style={{ fontWeight: 700, fontSize: 11 }}>{g.nombre}</span>
                          <span style={{ fontSize: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ color: '#555' }}>{gRec} recibidos</span>
                            {gEnt  > 0 && <span style={{ color: '#7a3a00' }}>· {gEnt} entregados</span>}
                            {gFall > 0 && <span style={{ color: '#8a2000' }}>· ⚠️ {gFall} con falla</span>}
                            <span style={{ color: gDisp > 0 ? '#1a5a1a' : '#888', fontWeight: 700 }}>· {gDisp} disponibles</span>
                            <span style={{ color: '#888' }}>{expanded ? '▲' : '▼'}</span>
                          </span>
                        </button>
                        {expanded && (
                          <table style={{ ...S.tbl, marginTop: 0 }}>
                            <thead><tr>
                              <th style={S.th}>Talle</th>
                              <th style={S.th}>Recibido</th>
                              <th style={S.th}>Entregado</th>
                              <th style={S.th}>⚠️ Falla</th>
                              <th style={S.th}>Disponible</th>
                            </tr></thead>
                            <tbody>
                              {g.rows.map(r => {
                                const disp = r.cantidad - r.entregadoQ - r.fallaQ
                                return (
                                  <tr key={r.id} style={{ background: disp === 0 ? '#f0f0ec' : 'transparent' }}>
                                    <td style={{ ...S.td, fontWeight: 700 }}>{r.talle}</td>
                                    <td style={S.td}>{r.cantidad}</td>
                                    <td style={{ ...S.td, color: r.entregadoQ > 0 ? '#7a3a00' : '#bbb' }}>{r.entregadoQ || '—'}</td>
                                    <td style={{ ...S.td, color: r.fallaQ > 0 ? '#8a2000' : '#bbb', fontWeight: r.fallaQ > 0 ? 700 : 400 }}>{r.fallaQ || '—'}</td>
                                    <td style={{ ...S.td, fontWeight: 700, color: disp > 0 ? '#1a5a1a' : '#aaa' }}>{disp}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )
                  })}
                  <div style={{ fontSize: 10, color: '#555', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>Recibido: <strong>{total}</strong></span>
                    {totalEntregado > 0 && <span style={{ color: '#7a3a00' }}>· Entregado: <strong>{totalEntregado}</strong></span>}
                    {totalFalla > 0 && <span style={{ color: '#8a2000' }}>· ⚠️ Falla: <strong>{totalFalla}</strong></span>}
                    <span style={{ color: totalDisp > 0 ? '#1a5a1a' : '#888', fontWeight: 700 }}>· Disponible: {totalDisp}</span>
                  </div>
                </div>
              )
            }

            // No-recepcion: tabla simple
            const hasObs = its.some(it => it.observacion)
            const byProd = {}
            for (const it of its) {
              const pid = it.producto_id
              if (!byProd[pid]) byProd[pid] = { nombre: it.productos?.nombre || '?', rows: [], subtotal: 0 }
              byProd[pid].rows.push(it)
              byProd[pid].subtotal += it.cantidad || 0
            }
            const grupos = Object.values(byProd)
            const multiProd = grupos.length > 1
            return (
              <table style={S.tbl}>
                <thead><tr>
                  <th style={S.thL}>Producto</th>
                  <th style={S.th}>Talle</th>
                  <th style={S.th}>Cant.</th>
                  {hasObs && <th style={S.thL}>Observación</th>}
                </tr></thead>
                <tbody>
                  {grupos.map(g => g.rows.map((it, ri) => (
                    <tr key={it.id}>
                      <td style={S.tdL}>{ri === 0 ? it.productos?.nombre || '?' : ''}</td>
                      <td style={{ ...S.td, fontWeight: 700 }}>{it.talle}</td>
                      <td style={S.td}>{it.cantidad}</td>
                      {hasObs && <td style={S.tdL}>{it.observacion || ''}</td>}
                    </tr>
                  )).concat(
                    multiProd ? [
                      <tr key={`sub-${g.nombre}`} style={{ background: '#e8e8e0' }}>
                        <td style={{ ...S.tdL, fontSize: 10, color: '#444', fontStyle: 'italic' }}>subtotal {g.nombre}</td>
                        <td style={S.td}></td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{g.subtotal}</td>
                        {hasObs && <td style={S.tdL}></td>}
                      </tr>
                    ] : []
                  ))}
                  <tr style={{ background: '#d8d8d0', borderTop: '2px solid #a0a0a0' }}>
                    <td style={{ ...S.tdL, fontWeight: 700 }}>TOTAL</td>
                    <td style={S.td}></td>
                    <td style={{ ...S.td, fontWeight: 700, fontSize: 12 }}>{total}</td>
                    {hasObs && <td style={S.tdL}></td>}
                  </tr>
                </tbody>
              </table>
            )
          })()}

          {/* Control de calidad */}
          {esRecepcion && hasControl && (
            <div style={{ marginTop: 8 }}>
              {okItems.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#1a5a1a', marginBottom: 2 }}>✅ OK</div>
                  <table style={S.tbl}>
                    <tbody>
                      {okItems.map(c => (
                        <tr key={c.id} style={{ background: '#f0f8f0' }}>
                          <td style={S.tdL}>{c.productos?.nombre || '?'}</td>
                          <td style={{ ...S.td, fontWeight: 700 }}>{c.talle}</td>
                          <td style={S.td}>{c.cant_ok}</td>
                          <td style={S.tdL}></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {fallaItems.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#8a0000', marginBottom: 2 }}>⚠️ Falla</div>
                  <table style={S.tbl}>
                    <tbody>
                      {fallaItems.map(c => (
                        <tr key={c.id} style={{ background: '#fff4f0' }}>
                          <td style={S.tdL}>{c.productos?.nombre || '?'}</td>
                          <td style={{ ...S.td, fontWeight: 700 }}>{c.talle}</td>
                          <td style={{ ...S.td, color: '#8a0000', fontWeight: 700 }}>{c.cant_falla}</td>
                          <td style={{ ...S.tdL, color: '#666', fontStyle: 'italic' }}>{c.observacion || ''}</td>
                          <td style={{ ...S.td, minWidth: 160 }}>
                            {!c.enviado_taller && (
                              <button style={{ ...S.btn, fontSize: 10, padding: '1px 5px', color: '#6a006a' }}
                                onClick={() => setEnviarFallaItem(c)}>📤 Al taller</button>
                            )}
                            {c.enviado_taller && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontSize: 10, color: '#6a006a', fontWeight: 700 }}>📤 Enviado {c.enviado_fecha ? fmtF(c.enviado_fecha) : ''}</span>
                                  {!c.devuelto_taller && (
                                    <button style={{ ...S.btn, fontSize: 9, padding: '0px 4px', color: '#888' }}
                                      title="Deshacer — marcar como no enviado"
                                      onClick={async () => {
                                        await supabase.from('taller_control_items').update({ enviado_taller: false, enviado_fecha: null, enviado_contacto_id: null }).eq('id', c.id)
                                        onEnviarFalla()
                                      }}>✕</button>
                                  )}
                                </span>
                                {c.devuelto_taller
                                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <span style={{ fontSize: 10, color: '#1a5a1a', fontWeight: 700 }}>✓ Devuelto {c.devuelto_fecha ? fmtF(c.devuelto_fecha) : ''}</span>
                                      <button style={{ ...S.btn, fontSize: 9, padding: '0px 4px', color: '#888' }}
                                        title="Deshacer — marcar como no devuelto"
                                        onClick={async () => {
                                          if (c.devuelto_recepcion_id) {
                                            await supabase.from('taller_movimientos_items').delete().eq('movimiento_id', c.devuelto_recepcion_id)
                                            await supabase.from('taller_movimientos').delete().eq('id', c.devuelto_recepcion_id)
                                          }
                                          await supabase.from('taller_control_items').update({ devuelto_taller: false, devuelto_fecha: null, devuelto_recepcion_id: null }).eq('id', c.id)
                                          onEnviarFalla()
                                        }}>✕</button>
                                    </span>
                                  : <RecibirFallaInline item={c} onSave={onEnviarFalla} />
                                }
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* Entregas realizadas — listado compacto por cliente */}
          {esRecepcion && entregasVinculadas?.length > 0 && (
            <div style={{ marginTop: 6, borderTop: '1px solid #e0d8c8', paddingTop: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7a3a00', marginBottom: 3 }}>🛍️ Entregas</div>
              {entregasVinculadas.map(e => {
                const totalE = (e.taller_movimientos_items || []).reduce((s, it) => s + (it.cantidad || 0), 0)
                const byProd = {}
                for (const it of (e.taller_movimientos_items || [])) {
                  const nm = it.productos?.nombre || '?'
                  if (!byProd[nm]) byProd[nm] = []
                  byProd[nm].push(`${it.talle}×${it.cantidad}`)
                }
                return (
                  <div key={e.id} style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 3, fontSize: 11, flexWrap: 'wrap' }}>
                    <span style={{ color: '#888', fontSize: 10, minWidth: 52 }}>{fmtF(e.fecha)}</span>
                    <span style={{ fontWeight: 700, color: '#7a3a00' }}>{e.contactos?.nombre || '?'}</span>
                    <span style={{ color: '#666', flex: 1 }}>
                      {Object.entries(byProd).map(([nm, talles]) => `${nm}: ${talles.join(' ')}`).join(' · ')}
                    </span>
                    <span style={{ color: '#555', fontWeight: 700, fontSize: 10 }}>{totalE} u.</span>
                    <button style={{ ...S.btn, fontSize: 10, padding: '1px 4px' }} onClick={() => setEditandoEntrega(e)}>✏️</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      {enviarFallaItem && (
        <ModalEnviarFalla falla={enviarFallaItem} onClose={() => setEnviarFallaItem(null)}
          onSave={() => { setEnviarFallaItem(null); onEnviarFalla() }} />
      )}
      {entregando && (
        <ModalEntregarDesdeRecepcion recepcion={mov} entregasVinculadas={entregasVinculadas}
          onClose={() => setEntregando(false)} onSave={() => { setEntregando(false); onEnviarFalla() }} />
      )}
      {editandoEntrega && (
        <ModalEditar mov={editandoEntrega} onClose={() => setEditandoEntrega(null)} onSave={() => { setEditandoEntrega(null); onEnviarFalla() }} />
      )}
    </div>
  )
}

// ── Modal: Recibir desde resumen de stock ────────────────────────────────────

function ModalRecibirStock({ taller, stockItems, fallaControlItems, onClose, onSave }) {
  // stockItems: [{ producto_id, prodNombre, talle, n, normal, falla }]
  // fallaControlItems: taller_control_items[] con falla pendiente (opcional)
  const esFalla = fallaControlItems?.length > 0
  const obsTexto = esFalla
    ? [...new Set(fallaControlItems.map(c => c.observacion).filter(Boolean))].join(' / ')
    : ''
  const [fecha,   setFecha]   = useState(today())
  const [nota,    setNota]    = useState(esFalla ? '🔁 Falla arreglada' + (obsTexto ? ` — ${obsTexto}` : '') : '')
  const [saving,  setSaving]  = useState(false)
  const [filas,   setFilas]   = useState(() =>
    stockItems.map(it => ({ ...it, cantidad: String(it.n) }))
  )

  function setCant(i, val) {
    setFilas(prev => prev.map((f, j) => j === i ? { ...f, cantidad: val } : f))
  }

  async function save() {
    const rows = filas.filter(f => parseInt(f.cantidad) > 0)
    if (!rows.length) { alert('Ingresá al menos una cantidad'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo: 'recepcion', fecha, contacto_id: taller.id, nota: nota.trim() || null, user_id: user?.id })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    for (const r of rows) {
      await supabase.from('taller_movimientos_items').insert({
        movimiento_id: mov.id, producto_id: r.producto_id,
        talle: r.talle, cantidad: parseInt(r.cantidad) || 0,
      })
    }
    if (esFalla && mov) {
      for (const c of fallaControlItems) {
        await supabase.from('taller_control_items').update({
          devuelto_taller: true, devuelto_fecha: fecha, devuelto_recepcion_id: mov.id,
        }).eq('id', c.id)
      }
    }
    setSaving(false); onSave()
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...S.modalH, background: esFalla ? 'linear-gradient(to bottom,#6a006a,#4a0050)' : 'linear-gradient(to bottom,#1a6a1a,#0a4a0a)' }}>
          <span>{esFalla ? '🔁 Recibir falla arreglada' : '📥 Recibir'} — {taller.nombre}</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalB}>
          {esFalla && (
            <div style={{ background: '#fff0f8', border: '1px solid #d080b0', padding: '6px 10px', marginBottom: 10, fontSize: 11 }}>
              <strong>⚠️ Falla arreglada</strong>
              {obsTexto && <span style={{ color: '#666', marginLeft: 6 }}>— {obsTexto}</span>}
              <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Se marcará como devuelto en el control de calidad.</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div>
              <span style={S.lbl}>Fecha de recepción</span>
              <input style={S.inp} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#555', marginBottom: 6 }}>Ajustá las cantidades recibidas.</div>
          <table style={S.tbl}>
            <thead><tr>
              <th style={S.thL}>Producto</th>
              <th style={S.th}>Talle</th>
              <th style={S.th}>En taller</th>
              <th style={S.th}>Recibido</th>
            </tr></thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i} style={{ background: f.falla > 0 ? '#fff4f0' : 'transparent' }}>
                  <td style={S.tdL}>{f.prodNombre}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{f.talle}</td>
                  <td style={S.td}>
                    {f.normal > 0 && <span style={{ color: '#555', marginRight: 4 }}>{f.normal}</span>}
                    {f.falla > 0 && <span style={{ color: '#8a2000', fontWeight: 700 }}>⚠️ {f.falla}</span>}
                  </td>
                  <td style={S.td}>
                    <input style={{ ...S.inpC, width: 44 }} type="number" min="0" max={f.n}
                      value={f.cantidad} onChange={e => setCant(i, e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10 }}>
            <span style={S.lbl}>Nota</span>
            <input style={{ ...S.inp, width: '100%' }} value={nota} onChange={e => setNota(e.target.value)} placeholder="opcional" />
          </div>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btnP, background: 'linear-gradient(to bottom,#1a6a1a,#0a4a0a)', border: '1px solid #0a4a0a' }}
            onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Registrar recepción'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Resumen: stock actual en talleres ────────────────────────────────────────

function StockEnTalleres({ movimientos, controlMap, onRecibirStock }) {
  const [open, setOpen] = useState(true)

  // Acumular por contacto → producto → talle, separando normal (envio) y falla (devolucion)
  const stock = {} // { cid: { nombre, cid, prods: { pid: { prodNombre, talles: { talle: { normal, falla } } } } } }

  const movsAsc = [...movimientos].sort((a, b) => {
    const d = a.fecha.localeCompare(b.fecha)
    return d !== 0 ? d : (a.created_at || '').localeCompare(b.created_at || '')
  })

  for (const mov of movsAsc) {
    if (mov.tipo === 'pago' || mov.tipo === 'entrega') continue
    const cid    = mov.contactos?.id
    const nombre = mov.contactos?.nombre || '?'
    const esFalla = mov.tipo === 'devolucion'
    const sign    = (mov.tipo === 'envio' || mov.tipo === 'devolucion') ? 1 : -1
    for (const it of (mov.taller_movimientos_items || [])) {
      const pid  = it.producto_id
      const cant = (it.cantidad || 0) * sign
      if (!stock[cid]) stock[cid] = { nombre, cid, prods: {} }
      if (!stock[cid].prods[pid]) stock[cid].prods[pid] = { prodNombre: it.productos?.nombre || '?', pid, talles: {} }
      const t = it.talle
      if (!stock[cid].prods[pid].talles[t]) stock[cid].prods[pid].talles[t] = { normal: 0, falla: 0 }
      if (esFalla) {
        stock[cid].prods[pid].talles[t].falla += cant
      } else if (sign === -1) {
        // recepcion: descontar primero de falla, luego de normal
        const qty = it.cantidad || 0
        const desdeF = Math.min(stock[cid].prods[pid].talles[t].falla, qty)
        stock[cid].prods[pid].talles[t].falla  -= desdeF
        stock[cid].prods[pid].talles[t].normal -= (qty - desdeF)
      } else {
        stock[cid].prods[pid].talles[t].normal += cant
      }
    }
  }

  // Aplanar y filtrar positivos
  const talleres = Object.values(stock).map(({ nombre, cid, prods }) => {
    const prodList = Object.values(prods).map(({ prodNombre, pid, talles }) => {
      const filas = Object.entries(talles)
        .filter(([, v]) => v.normal > 0 || v.falla > 0)
        .map(([talle, v]) => ({ talle, normal: Math.max(0, v.normal), falla: Math.max(0, v.falla), n: Math.max(0, v.normal) + Math.max(0, v.falla), producto_id: pid, prodNombre }))
      const total = filas.reduce((s, f) => s + f.n, 0)
      return { prodNombre, filas, total }
    }).filter(p => p.filas.length > 0)
    const total = prodList.reduce((s, p) => s + p.total, 0)
    const stockItems = prodList.flatMap(p => p.filas)
    return { nombre, cid, prodList, total, stockItems }
  }).filter(t => t.prodList.length > 0)

  if (!talleres.length) return null

  return (
    <div style={{ border: '2px solid #1a3a6b', background: '#eef2f8', marginBottom: 10 }}>
      <div style={{ background: 'linear-gradient(to bottom,#1a3a6b,#0a2a5b)', color: '#fff', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}>
        <span style={{ fontWeight: 700, fontSize: 12 }}>{open ? '▼' : '▶'} 📦 En manos de talleres</span>
        <span style={{ fontSize: 10 }}>{talleres.length} taller{talleres.length !== 1 ? 'es' : ''} · {talleres.reduce((s, t) => s + t.total, 0)} prendas</span>
      </div>
      {open && (
        <div style={{ padding: '8px 10px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {talleres.map(t => (
            <div key={t.cid} style={{ border: '1px solid #a0b0c8', background: '#fff', padding: '6px 10px', minWidth: 220, flex: '1 1 220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, borderBottom: '1px solid #d0d8e8', paddingBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: '#1a3a6b' }}>{t.nombre} · <span style={{ fontWeight: 400, fontSize: 11 }}>{t.total} prendas</span></span>
                <button style={{ ...S.btnP, fontSize: 10, padding: '1px 7px' }}
                  onClick={() => onRecibirStock({ id: t.cid, nombre: t.nombre }, t.stockItems)}>
                  📥 Recibir
                </button>
              </div>
              {t.prodList.map(p => {
                const allCtrl = Object.values(controlMap).flat()
                const fallaCtrl = allCtrl.filter(c =>
                  c.enviado_contacto_id === t.cid &&
                  c.producto_id === p.filas[0]?.producto_id &&
                  !c.devuelto_taller && c.cant_falla > 0
                )
                const tieneFalla = p.filas.some(f => f.falla > 0)
                return (
                  <div key={p.prodNombre} style={{ marginBottom: 6 }}>
                    <button
                      style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, padding: 0, textDecoration: 'underline dotted', color: tieneFalla ? '#8a2000' : '#1a3a6b', textAlign: 'left' }}
                      title="Click para recibir solo este producto"
                      onClick={() => onRecibirStock({ id: t.cid, nombre: t.nombre }, p.filas, fallaCtrl)}
                    >{tieneFalla ? '⚠️ ' : ''}{p.prodNombre}</button>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {p.filas.map(f => (
                        <span key={f.talle} style={{ fontSize: 11, display: 'inline-flex', gap: 2, alignItems: 'center' }}>
                          {f.normal > 0 && (
                            <span style={{ background: '#e0e8f4', padding: '1px 6px', border: '1px solid #a0b0c8' }}>
                              {f.talle} × {f.normal}
                            </span>
                          )}
                          {f.falla > 0 && (
                            <span style={{ background: '#fff0e8', padding: '1px 6px', border: '1px solid #d08060', color: '#8a2000', fontWeight: 700 }}>
                              ⚠️ {f.talle} × {f.falla}
                            </span>
                          )}
                        </span>
                      ))}
                      <span style={{ fontSize: 10, color: '#555', alignSelf: 'center' }}>= {p.total}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal: Entregar a cliente ─────────────────────────────────────────────────

function ModalEntregarCliente({ miStockItems, onClose, onSave }) {
  const [fecha,      setFecha]      = useState(today())
  const [clienteQ,   setClienteQ]   = useState('')
  const [clienteId,  setClienteId]  = useState(null)
  const [clienteRes, setClienteRes] = useState([])
  const [nota,       setNota]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const [filas,      setFilas]      = useState(() =>
    miStockItems.map(it => ({ ...it, cantidad: '' }))
  )
  const timers = useRef({})

  function onClienteInput(val) {
    setClienteQ(val); setClienteId(null)
    clearTimeout(timers.current.cli)
    if (!val.trim()) { setClienteRes([]); return }
    timers.current.cli = setTimeout(async () => {
      const { data } = await supabase.from('contactos').select('id, nombre').ilike('nombre', `%${val.trim()}%`).limit(8)
      setClienteRes(data || [])
    }, 250)
  }

  function setCant(i, val) {
    setFilas(prev => prev.map((f, j) => j === i ? { ...f, cantidad: val } : f))
  }

  async function save() {
    if (!clienteId) { alert('Seleccioná un cliente'); return }
    const rows = filas.filter(f => parseInt(f.cantidad) > 0)
    if (!rows.length) { alert('Ingresá al menos una cantidad'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo: 'entrega', fecha, contacto_id: clienteId, nota: nota.trim() || null, user_id: user?.id })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    for (const r of rows) {
      await supabase.from('taller_movimientos_items').insert({
        movimiento_id: mov.id, producto_id: r.producto_id,
        talle: r.talle, cantidad: parseInt(r.cantidad),
      })
    }
    setSaving(false); onSave()
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 600 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...S.modalH, background: 'linear-gradient(to bottom,#7a3a00,#5a2000)' }}>
          <span>🛍️ Entregar a cliente</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalB}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div>
              <span style={S.lbl}>Fecha</span>
              <input style={S.inp} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={S.lbl}>Cliente</span>
              <input style={{ ...S.inp, width: '100%' }} value={clienteQ} onChange={e => onClienteInput(e.target.value)} placeholder="Buscar en Contactos..." />
              {clienteId && <span style={{ fontSize: 10, color: '#2a6a2a' }}>✓ {clienteQ}</span>}
              <AcList items={clienteRes} onPick={r => { setClienteId(r.id); setClienteQ(r.nombre); setClienteRes([]) }} label={r => r.nombre} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#555', marginBottom: 6 }}>Ingresá las cantidades a entregar (máx. stock disponible).</div>
          <table style={S.tbl}>
            <thead><tr>
              <th style={S.thL}>Producto</th>
              <th style={S.th}>Talle</th>
              <th style={S.th}>En mi taller</th>
              <th style={S.th}>A entregar</th>
            </tr></thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i} style={{ background: parseInt(f.cantidad) > 0 ? '#fef8f0' : 'transparent' }}>
                  <td style={S.tdL}>{f.prodNombre}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{f.talle}</td>
                  <td style={{ ...S.td, color: '#555' }}>{f.n}</td>
                  <td style={S.td}>
                    <input style={{ ...S.inpC, width: 44, background: parseInt(f.cantidad) > 0 ? '#fff8e8' : '#fff' }}
                      type="number" min="0" max={f.n}
                      value={f.cantidad} onChange={e => setCant(i, e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10 }}>
            <span style={S.lbl}>Nota</span>
            <input style={{ ...S.inp, width: '100%' }} value={nota} onChange={e => setNota(e.target.value)} placeholder="opcional" />
          </div>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btnP, background: 'linear-gradient(to bottom,#7a3a00,#5a2000)', border: '1px solid #5a2000' }}
            onClick={save} disabled={saving}>{saving ? 'Guardando...' : '🛍️ Registrar entrega'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Resumen: stock en mi taller ───────────────────────────────────────────────

function StockEnMiTaller({ movimientos, controlMap, onEntregar }) {
  const [open, setOpen] = useState(true)

  // recepcion suma, devolucion y entrega restan (envio se ignora)
  const stock = {} // { pid: { prodNombre, talles: { talle: { ok, falla } } } }

  // Fallas pendientes de envío: controlMap items con cant_falla > 0 y enviado_taller = false
  // agrupadas por producto_id + talle
  const fallasPendientes = {} // { `${pid}__${talle}`: cant }
  for (const items of Object.values(controlMap)) {
    for (const c of items) {
      if (c.cant_falla > 0 && !c.enviado_taller) {
        const k = `${c.producto_id}__${c.talle}`
        fallasPendientes[k] = (fallasPendientes[k] || 0) + c.cant_falla
      }
    }
  }

  for (const mov of movimientos) {
    if (mov.tipo === 'pago' || mov.tipo === 'envio') continue
    const sign = mov.tipo === 'recepcion' ? 1 : -1
    for (const it of (mov.taller_movimientos_items || [])) {
      const pid  = it.producto_id
      const cant = (it.cantidad || 0) * sign
      if (!stock[pid]) stock[pid] = { prodNombre: it.productos?.nombre || '?', pid, talles: {} }
      const t = it.talle
      if (!stock[pid].talles[t]) stock[pid].talles[t] = { ok: 0 }
      stock[pid].talles[t].ok = (stock[pid].talles[t].ok || 0) + cant
    }
  }

  const prodList = Object.values(stock).map(({ prodNombre, pid, talles }) => {
    const filas = Object.entries(talles)
      .map(([talle, v]) => {
        const falla = fallasPendientes[`${pid}__${talle}`] || 0
        const ok = Math.max(0, (v.ok || 0)) - falla
        return { talle, ok: Math.max(0, ok), falla, n: Math.max(0, ok) + falla, producto_id: pid, prodNombre }
      })
      .filter(f => f.ok > 0 || f.falla > 0)
    const total = filas.reduce((s, f) => s + f.n, 0)
    return { prodNombre, filas, total }
  }).filter(p => p.filas.length > 0)

  const totalPrendas = prodList.reduce((s, p) => s + p.total, 0)
  const miStockItems = prodList.flatMap(p => p.filas)

  if (!prodList.length) return null

  return (
    <div style={{ border: '2px solid #7a3a00', background: '#fdf5ee', marginBottom: 10 }}>
      <div style={{ background: 'linear-gradient(to bottom,#7a3a00,#5a2000)', color: '#fff', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}>
        <span style={{ fontWeight: 700, fontSize: 12 }}>{open ? '▼' : '▶'} 🏭 En mi taller</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10 }}>{totalPrendas} prenda{totalPrendas !== 1 ? 's' : ''}</span>
          <button style={{ ...S.btn, fontSize: 10, padding: '1px 8px', background: '#fff', color: '#7a3a00', fontWeight: 700, border: '1px solid #fff' }}
            onClick={e => { e.stopPropagation(); onEntregar(miStockItems) }}>
            🛍️ Entregar a cliente
          </button>
        </div>
      </div>
      {open && (
        <div style={{ padding: '8px 10px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {prodList.map(p => (
            <div key={p.prodNombre} style={{ border: '1px solid #c8a888', background: '#fff', padding: '6px 10px', minWidth: 200, flex: '1 1 200px' }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#7a3a00', marginBottom: 4, borderBottom: '1px solid #e8d8c8', paddingBottom: 3 }}>
                {p.prodNombre} · <span style={{ fontWeight: 400, fontSize: 11 }}>{p.total} u.</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {p.filas.map(f => (
                  <span key={f.talle} style={{ fontSize: 11, display: 'inline-flex', gap: 2 }}>
                    {f.ok > 0 && (
                      <span style={{ background: '#f0e4d4', padding: '1px 6px', border: '1px solid #c8a888' }}>
                        {f.talle} × {f.ok}
                      </span>
                    )}
                    {f.falla > 0 && (
                      <span style={{ background: '#fff0e8', padding: '1px 6px', border: '1px solid #d08060', color: '#8a2000', fontWeight: 700 }}>
                        ⚠️ {f.talle} × {f.falla}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Bloque por taller ────────────────────────────────────────────────────────

function TallerBlock({ nombre, movs, controlMap, entregasMap, onDelete, onEdit, onCalidad, onRecibir, onEnviarFalla }) {
  const [open, setOpen] = useState(true)

  // Saldo: debe = recepciones.monto + conceptos.monto  |  haber = pagos.monto
  let debe = 0, haber = 0
  for (const m of movs) {
    if ((m.tipo === 'recepcion' || m.tipo === 'concepto') && m.monto != null) debe += m.monto
    if (m.tipo === 'pago' && m.monto != null) haber += m.monto
  }
  const saldo = debe - haber
  const tieneSaldo = debe > 0 || haber > 0

  const sorted = [...movs].sort((a, b) => {
    const d = b.fecha.localeCompare(a.fecha)
    return d !== 0 ? d : (b.created_at || '').localeCompare(a.created_at || '')
  })

  const saldoColor = saldo > 0 ? '#8a2000' : saldo < 0 ? '#1a5a1a' : '#555'
  const saldoLabel = saldo > 0 ? `Adeudado: ${fmtMoneda(saldo)}` : saldo < 0 ? `A tu favor: ${fmtMoneda(-saldo)}` : '✓ Al día'

  return (
    <div style={{ border: '2px solid #7a8898', background: '#f4f4f0', marginBottom: 12 }}>
      <div style={{ background: 'linear-gradient(to bottom,#4a5a6a,#2a3a4a)', color: '#fff', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{open ? '▼' : '▶'} {nombre}</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {tieneSaldo && <span style={{ fontSize: 11, fontWeight: 700, color: saldo > 0 ? '#ffb0a0' : saldo < 0 ? '#a0ffb0' : '#ccc' }}>{saldoLabel}</span>}
          <span style={{ fontSize: 10, color: '#ccc' }}>{sorted.length} movimientos</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '6px 8px' }}>
          {sorted.map(m => (
            <MovCard key={m.id} mov={m} onDelete={onDelete} onEdit={onEdit}
              onCalidad={onCalidad} onRecibir={onRecibir}
              controlItems={controlMap[m.id]} onEnviarFalla={onEnviarFalla}
              entregasVinculadas={entregasMap[m.id]} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Talleres({ onMenuClick }) {
  const [movimientos,   setMovimientos]   = useState([])
  const [controlMap,    setControlMap]    = useState({})
  const [entregasMap,   setEntregasMap]   = useState({}) // recepcionId → entrega[]
  const [loading,       setLoading]       = useState(true)
  const [modal,         setModal]         = useState(false)
  const [editando,      setEditando]      = useState(null)
  const [calidad,       setCalidad]       = useState(null)
  const [recibiendo,    setRecibiendo]    = useState(null)
  const [filtroTipo,    setFiltroTipo]    = useState('')
  const [filtroQ,       setFiltroQ]       = useState('')
  const [recibiendoStock, setRecibiendoStock] = useState(null) // { taller, stockItems }
  const [entregando,      setEntregando]      = useState(null) // miStockItems[]

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const scrollY = window.scrollY
    setLoading(true)
    const [{ data: movs }, { data: ctrl }, { data: entregas }] = await Promise.all([
      supabase.from('taller_movimientos')
        .select(`id, tipo, fecha, nota, monto, created_at,
          contactos(id, nombre),
          taller_movimientos_items(id, producto_id, talle, cantidad, observacion,
            productos(id, nombre, tabla))`)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('taller_control_items')
        .select(`id, movimiento_id, producto_id, talle, cant_ok, cant_falla, observacion, enviado_taller, enviado_fecha, enviado_contacto_id, devuelto_taller, devuelto_fecha, devuelto_recepcion_id,
          productos(id, nombre)`),
      supabase.from('taller_movimientos')
        .select(`id, tipo, fecha, nota, origen_movimiento_id,
          contactos(id, nombre),
          taller_movimientos_items(id, producto_id, talle, cantidad, productos(id, nombre))`)
        .eq('tipo', 'entrega')
        .not('origen_movimiento_id', 'is', null),
    ])
    setMovimientos(movs || [])
    const map = {}
    for (const c of (ctrl || [])) {
      if (!map[c.movimiento_id]) map[c.movimiento_id] = []
      map[c.movimiento_id].push(c)
    }
    setControlMap(map)
    const eMap = {}
    for (const e of (entregas || [])) {
      const rid = e.origen_movimiento_id
      if (!eMap[rid]) eMap[rid] = []
      eMap[rid].push(e)
    }
    setEntregasMap(eMap)
    setLoading(false)
    requestAnimationFrame(() => window.scrollTo(0, scrollY))
  }

  async function deleteMov(id) {
    if (!window.confirm('¿Eliminar este movimiento?')) return
    await supabase.from('taller_control_items').delete().eq('movimiento_id', id)
    await supabase.from('taller_movimientos_items').delete().eq('movimiento_id', id)
    await supabase.from('taller_movimientos').delete().eq('id', id)
    fetchAll()
  }

  const filtered = movimientos.filter(m => {
    if (filtroTipo && m.tipo !== filtroTipo) return false
    if (filtroQ) {
      const q = filtroQ.toLowerCase()
      if (!m.contactos?.nombre?.toLowerCase().includes(q) &&
          !m.taller_movimientos_items?.some(it => it.productos?.nombre?.toLowerCase().includes(q))) return false
    }
    return true
  })

  return (
    <div style={S.wrap}>
      <div style={S.tbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={S.btn} onClick={onMenuClick}>☰</button>
          <span style={{ fontWeight: 700, fontSize: 13 }}>🧵 Talleres</span>
        </div>
        <button style={S.btnP} onClick={() => setModal(true)}>+ Movimiento</button>
      </div>

      <div style={S.body}>
        <StockEnTalleres movimientos={movimientos} controlMap={controlMap} onRecibirStock={(taller, stockItems, fallaCtrl) => setRecibiendoStock({ taller, stockItems, fallaControlItems: fallaCtrl || [] })} />
        <StockEnMiTaller movimientos={movimientos} controlMap={controlMap} onEntregar={items => setEntregando(items)} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select style={S.sel} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {TIPOS.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
          </select>
          <input style={{ ...S.inp, width: 180 }} value={filtroQ} onChange={e => setFiltroQ(e.target.value)} placeholder="Buscar taller o producto..." />
          {(filtroTipo || filtroQ) && <button style={S.btn} onClick={() => { setFiltroTipo(''); setFiltroQ('') }}>✕ limpiar</button>}
          <span style={{ fontSize: 10, color: '#666', marginLeft: 'auto' }}>{filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div style={{ padding: 20, color: '#666' }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 20, color: '#666', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🧵</div>
            <div>Sin movimientos{filtroTipo || filtroQ ? ' con ese filtro' : '. Creá el primero con + Movimiento'}.</div>
          </div>
        ) : (() => {
          // Agrupar por taller (contacto_id), ordenar por movimiento más reciente
          const grupos = {}
          for (const m of filtered) {
            const cid = m.contactos?.id || '__sin__'
            if (!grupos[cid]) grupos[cid] = { nombre: m.contactos?.nombre || '(sin taller)', movs: [], lastFecha: '' }
            grupos[cid].movs.push(m)
            if (m.fecha > grupos[cid].lastFecha) grupos[cid].lastFecha = m.fecha
          }
          const lista = Object.values(grupos).sort((a, b) => b.lastFecha.localeCompare(a.lastFecha))
          return lista.map(g => (
            <TallerBlock key={g.nombre} nombre={g.nombre} movs={g.movs}
              controlMap={controlMap} entregasMap={entregasMap}
              onDelete={deleteMov} onEdit={setEditando}
              onCalidad={setCalidad} onRecibir={setRecibiendo} onEnviarFalla={fetchAll} />
          ))
        })()}
      </div>

      {modal      && <ModalNuevo   onClose={() => setModal(false)}       onSave={() => { setModal(false);       fetchAll() }} />}
      {editando   && <ModalEditar  mov={editando}   onClose={() => setEditando(null)}   onSave={() => { setEditando(null);   fetchAll() }} />}
      {calidad    && <ModalCalidad mov={calidad} entregasVinculadas={entregasMap[calidad.id] || []} controlItems={controlMap[calidad.id] || []} onClose={() => setCalidad(null)} onSave={() => { setCalidad(null); fetchAll() }} />}
      {recibiendo && <ModalRecibir envio={recibiendo} onClose={() => setRecibiendo(null)} onSave={() => { setRecibiendo(null); fetchAll() }} />}
      {recibiendoStock && <ModalRecibirStock taller={recibiendoStock.taller} stockItems={recibiendoStock.stockItems} fallaControlItems={recibiendoStock.fallaControlItems} onClose={() => setRecibiendoStock(null)} onSave={() => { setRecibiendoStock(null); fetchAll() }} />}
      {entregando && <ModalEntregarCliente miStockItems={entregando} onClose={() => setEntregando(null)} onSave={() => { setEntregando(null); fetchAll() }} />}
    </div>
  )
}
