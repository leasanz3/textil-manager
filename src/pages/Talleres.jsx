import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { TABLAS_TALLES, TALLES_ADULTO, TALLES_NINO } from '../constants/talles'

const F = 'Tahoma, Trebuchet MS, sans-serif'
const today = () => new Date().toISOString().slice(0, 10)
const fmtF  = (f) => { if (!f) return '—'; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}` }
const TALLE_ORD = ['XS','S','M','L','XL','XXL','XXXL','XXXXL']
function cmpTalle(a, b) {
  const ai = TALLE_ORD.indexOf(String(a).toUpperCase())
  const bi = TALLE_ORD.indexOf(String(b).toUpperCase())
  if (ai !== -1 && bi !== -1) return ai - bi
  const an = parseInt(a), bn = parseInt(b)
  if (!isNaN(an) && !isNaN(bn)) return an - bn
  if (!isNaN(an)) return 1    // numérico después que letra
  if (!isNaN(bn)) return -1
  return String(a).localeCompare(String(b))
}

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
const LOTE_COLORS = ['#d0e8ff','#d0f0d8','#fff0c8','#f0d8ff','#ffd8d0','#d8f0f0','#f8e0b8','#e0d8f8']
function loteColor(loteId) {
  if (!loteId) return '#e8e8e0'
  let h = 0
  for (let i = 0; i < loteId.length; i++) h = (h * 31 + loteId.charCodeAt(i)) >>> 0
  return LOTE_COLORS[h % LOTE_COLORS.length]
}

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

function AcList({ items, onPick, label, anchorRef }) {
  if (!items.length) return null
  const r = anchorRef?.current?.getBoundingClientRect()
  const style = r
    ? { position: 'fixed', top: r.bottom, left: r.left, width: r.width, zIndex: 9999, background: '#fff', border: '1px solid #808080', maxHeight: 180, overflowY: 'auto', boxShadow: '2px 2px 4px rgba(0,0,0,.3)' }
    : { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#fff', border: '1px solid #808080', maxHeight: 180, overflowY: 'auto', boxShadow: '2px 2px 4px rgba(0,0,0,.3)' }
  return (
    <div style={style}>
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
  const prodInputRef = React.useRef(null)
  function onProdInput(val) {
    onChange(index, { ...item, prodQ: val, producto_id: null, prodRes: [] })
    clearTimeout(timers.current[`prod${index}`])
    if (!val.trim()) return
    const capturedVal = val
    timers.current[`prod${index}`] = setTimeout(async () => {
      const { data, error } = await supabase.from('productos').select('id, nombre, tabla, costo_confeccion').ilike('nombre', `%${capturedVal.trim()}%`).limit(8)
      onChange(index, { ...item, prodQ: capturedVal, producto_id: null, prodRes: data || [] })
    }, 250)
  }

  function pickProd(p) {
    const talles = TABLAS_TALLES[p.tabla] || TALLES_ADULTO
    onChange(index, { ...item, producto_id: p.id, prodQ: p.nombre, prodRes: [], tabla: p.tabla, talles, conNino: false, cantidades: {}, observacion: '', precio_confeccion: p.costo_confeccion || null })
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
          <input ref={prodInputRef} style={{ ...S.inp, width: '100%' }} value={item.prodQ} onChange={e => onProdInput(e.target.value)} placeholder="Buscar producto..." />
          <AcList items={item.prodRes || []} onPick={pickProd} label={r => r.nombre} anchorRef={prodInputRef} />
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
  const tallerInputRef = React.useRef(null)
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
          {TIPOS.filter(tp => tp.id !== 'entrega' && tp.id !== 'devolucion_cliente').map(tp => (
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
          <input ref={tallerInputRef} style={{ ...S.inp, width: '100%' }} value={tallerQ} onChange={e => onTallerInput(e.target.value)} placeholder="Buscar en Contactos..." />
          {tallerId && <span style={{ fontSize: 10, color: '#2a6a2a' }}>✓ {tallerQ}</span>}
          <AcList items={tallerRes} onPick={r => { setTallerId(r.id); setTallerQ(r.nombre); setTallerRes([]) }} label={r => r.nombre} anchorRef={tallerInputRef} />
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

function ModalNuevo({ onClose, onSave, tipoInicial, tallerInicial, itemsInicial }) {
  const [tipo,       setTipo]       = useState(tipoInicial || 'envio')
  const [fecha,      setFecha]      = useState(today())
  const [tallerQ,    setTallerQ]    = useState(tallerInicial?.nombre || '')
  const [tallerId,   setTallerId]   = useState(tallerInicial?.id || null)
  const [tallerRes,  setTallerRes]  = useState([])
  const [items,      setItems]      = useState(itemsInicial || [newItem()])
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
    // Un lote por producto — formato: {CODIGO_PROD}-{seq:003}
    const lotesPorProd = {}
    if (tipo === 'envio') {
      for (const r of rows) {
        if (!lotesPorProd[r.producto_id]) {
          const { data: prod } = await supabase.from('productos').select('codigo').eq('id', r.producto_id).single()
          const codigo = prod?.codigo || 'PROD'
          const { data: existing } = await supabase.from('taller_movimientos_items')
            .select('lote_id').eq('producto_id', r.producto_id).not('lote_id', 'is', null)
          const uniqueLotes = new Set((existing || []).map(x => x.lote_id))
          const seq = (uniqueLotes.size + 1).toString().padStart(3, '0')
          lotesPorProd[r.producto_id] = `${codigo}-L${seq}`
        }
      }
    }
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo, fecha, contacto_id: tallerId, nota: nota.trim() || null, monto: montoVal, user_id: user?.id })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    for (const r of rows) await supabase.from('taller_movimientos_items').insert({ movimiento_id: mov.id, ...r, lote_id: lotesPorProd[r.producto_id] || null })
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

function ModalEditar({ mov, onClose, onSave, onDelete }) {
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
        byProd[pid] = { producto_id: pid, prodQ: it.productos?.nombre || '', prodRes: [], tabla, talles, conNino: false, cantidades: {}, observacion: it.observacion || '', precio_confeccion: it.precio_unit ?? it.productos?.costo_confeccion ?? null }
      }
      byProd[pid].cantidades[it.talle] = String(it.cantidad)
      if (TALLES_NINO.includes(it.talle)) {
        byProd[pid].conNino = true
        byProd[pid].talles = [...TALLES_ADULTO, ...TALLES_NINO]
      }
    }
    return Object.values(byProd).length ? Object.values(byProd) : [newItem()]
  })
  const [ctrl,        setCtrl]        = useState({}) // `${pid}__${talle}` → { cant_ok, cant_falla }
  const [saving,      setSaving]      = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const timers = useRef({})

  useEffect(() => {
    if (mov.tipo !== 'recepcion') return
    supabase.from('taller_control_items').select('*').eq('movimiento_id', mov.id).then(({ data }) => {
      const map = {}
      for (const c of (data || [])) map[`${c.producto_id}__${c.talle}`] = { cant_ok: String(c.cant_ok ?? ''), cant_falla: String(c.cant_falla ?? '') }
      setCtrl(map)
    })
  }, [])

  function setCtrlField(key, field, val) {
    setCtrl(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: val } }))
  }

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
    const { data: existingItems } = await supabase.from('taller_movimientos_items').select('producto_id, lote_id').eq('movimiento_id', mov.id)
    const lotesPorProd = {}
    for (const it of (existingItems || [])) { if (it.lote_id) lotesPorProd[it.producto_id] = it.lote_id }
    await supabase.from('taller_movimientos_items').delete().eq('movimiento_id', mov.id)
    for (const r of rows) await supabase.from('taller_movimientos_items').insert({ movimiento_id: mov.id, ...r, lote_id: lotesPorProd[r.producto_id] || null })
    if (tipo === 'recepcion') {
      await supabase.from('taller_control_items').delete().eq('movimiento_id', mov.id)
      for (const [key, val] of Object.entries(ctrl)) {
        const [pidStr, talle] = key.split('__')
        const cant_ok = parseInt(val.cant_ok) || 0
        const cant_falla = parseInt(val.cant_falla) || 0
        if (cant_ok + cant_falla > 0) {
          await supabase.from('taller_control_items').insert({ movimiento_id: mov.id, producto_id: parseInt(pidStr), talle, cant_ok, cant_falla })
        }
      }
    }
    setSaving(false); onSave()
  }

  async function handleDelete() {
    setSaving(true)
    await onDelete(mov.id)
    setSaving(false)
  }

  // Build calidad rows from current items (for recepcion)
  const calidadRows = []
  if (tipo === 'recepcion') {
    for (const it of items) {
      if (!it.producto_id) continue
      for (const [talle, cantStr] of Object.entries(it.cantidades || {})) {
        const cantidad = parseInt(cantStr) || 0
        if (cantidad <= 0) continue
        const key = `${it.producto_id}__${talle}`
        calidadRows.push({ key, prodNombre: it.prodQ, talle, cantidad, pid: it.producto_id })
      }
    }
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 680 }} onClick={e => e.stopPropagation()}>
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

          {/* Control de calidad integrado */}
          {tipo === 'recepcion' && calidadRows.length > 0 && (
            <div style={{ marginTop: 12, border: '1px solid #b0c8b0', background: '#f4faf4' }}>
              <div style={{ padding: '5px 10px', background: '#d0e8d0', borderBottom: '1px solid #b0c8b0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 12 }}>Control de calidad</span>
                <button style={{ ...S.btn, fontSize: 10, padding: '1px 8px', marginLeft: 'auto', color: '#2a6a10', fontWeight: 700, border: '1px solid #5a9a30' }}
                  onClick={() => {
                    const next = {}
                    for (const r of calidadRows) next[r.key] = { cant_ok: String(r.cantidad), cant_falla: '0' }
                    setCtrl(next)
                  }}>✅ Todo OK</button>
              </div>
              <table style={{ ...S.tbl, fontSize: 12 }}>
                <thead><tr>
                  <th style={S.thL}>Producto</th>
                  <th style={S.th}>Talle</th>
                  <th style={S.th}>Cant.</th>
                  <th style={S.th}>✅ OK</th>
                  <th style={S.th}>⚠ Falla</th>
                </tr></thead>
                <tbody>
                  {calidadRows.map(r => {
                    const v = ctrl[r.key] || {}
                    const hasFalla = parseInt(v.cant_falla) > 0
                    return (
                      <tr key={r.key} style={{ background: hasFalla ? '#fff0ee' : 'transparent' }}>
                        <td style={S.tdL}>{r.prodNombre}</td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{r.talle}</td>
                        <td style={S.td}>{r.cantidad}</td>
                        <td style={S.td}>
                          <input style={{ ...S.inpC, width: 44, background: parseInt(v.cant_ok) > 0 ? '#e8f8e8' : undefined }}
                            type="number" min="0" max={r.cantidad}
                            value={v.cant_ok ?? ''} onChange={e => setCtrlField(r.key, 'cant_ok', e.target.value)} />
                        </td>
                        <td style={S.td}>
                          <input style={{ ...S.inpC, width: 44, background: hasFalla ? '#ffe8e0' : undefined }}
                            type="number" min="0" max={r.cantidad}
                            value={v.cant_falla ?? ''} onChange={e => setCtrlField(r.key, 'cant_falla', e.target.value)} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          {/* Delete con confirmación */}
          {!confirmDel
            ? <button style={{ ...S.btn, color: '#8a0000', border: '1px solid #c08080', fontSize: 11 }} onClick={() => setConfirmDel(true)}>Eliminar movimiento</button>
            : <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#8a0000', fontWeight: 700 }}>¿Confirmar eliminación?</span>
                <button style={{ ...S.btn, color: '#fff', background: '#a03030', border: '1px solid #801010', fontWeight: 700 }} onClick={handleDelete} disabled={saving}>Sí, eliminar</button>
                <button style={S.btn} onClick={() => setConfirmDel(false)}>Cancelar</button>
              </div>
          }
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={S.btn} onClick={onClose}>Cancelar</button>
            <button style={S.btnP} onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
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
        const precioUnit = parseFloat(it.precio_confeccion) || null
        if (cantidad > 0) rows.push({ producto_id: it.producto_id, talle, cantidad, observacion: it.observacion?.trim() || null, precio_unit: precioUnit })
      }
    }
  }
  return rows
}

// ── Modal: Control de calidad ─────────────────────────────────────────────────

// ── Modal: Control de calidad (paso separado del RECIBIDO) ───────────────────

function ModalControl({ movId, items, tallerNombre, onClose, onSave }) {
  const [entries, setEntries] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('taller_control_items').select('*').eq('movimiento_id', movId).then(({ data }) => {
      const map = {}
      for (const c of (data || [])) map[`${c.producto_id}__${c.talle}`] = c
      setEntries(items.map(it => {
        const ex = map[`${it.producto_id}__${it.talle}`]
        return {
          producto_id: it.producto_id,
          prodNombre: it.productos?.nombre || '?',
          talle: it.talle,
          cantidad: it.cantidad,
          cant_ok: ex ? String(ex.cant_ok ?? '') : '',
          cant_falla: ex ? String(ex.cant_falla ?? '') : '',
          observacion: ex?.observacion || '',
        }
      }))
    })
  }, [movId])

  function setField(i, field, val) {
    setEntries(prev => prev.map((e, j) => j === i ? { ...e, [field]: val } : e))
  }

  function todoOk() {
    setEntries(prev => prev.map(e => ({ ...e, cant_ok: String(e.cantidad), cant_falla: '0' })))
  }

  async function save() {
    setSaving(true)
    await supabase.from('taller_control_items').delete().eq('movimiento_id', movId)
    for (const e of entries) {
      const ok = parseInt(e.cant_ok) || 0
      const falla = parseInt(e.cant_falla) || 0
      if (ok + falla > 0) {
        await supabase.from('taller_control_items').insert({
          movimiento_id: movId, producto_id: e.producto_id,
          talle: e.talle, cant_ok: ok, cant_falla: falla,
          observacion: e.observacion?.trim() || null,
        })
      }
    }
    setSaving(false); onSave()
  }

  const totalFalla = entries.reduce((s, e) => s + (parseInt(e.cant_falla) || 0), 0)

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 580 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...S.modalH, background: 'linear-gradient(to bottom,#4a6a3a,#2a4a1a)' }}>
          <span>🔍 Control de calidad — {tallerNombre}</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalB}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>
            Revisá cada talle e ingresá cuántas quedaron OK y cuántas tienen falla.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
            <button style={{ ...S.btn, fontSize: 10, padding: '2px 10px', color: '#2a6a10', fontWeight: 700, border: '1px solid #5a9a30' }} onClick={todoOk}>✅ Todo OK</button>
          </div>
          <table style={S.tbl}>
            <thead><tr>
              <th style={S.thL}>Producto</th>
              <th style={S.th}>Talle</th>
              <th style={S.th}>Recibido</th>
              <th style={S.th}>✅ OK</th>
              <th style={S.th}>⚠ Falla</th>
              <th style={S.thL}>Observación</th>
            </tr></thead>
            <tbody>
              {entries.map((e, i) => {
                const hasFalla = parseInt(e.cant_falla) > 0
                return (
                  <tr key={i} style={{ background: hasFalla ? '#fff0ee' : 'transparent' }}>
                    <td style={S.tdL}>{e.prodNombre}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{e.talle}</td>
                    <td style={{ ...S.td, color: '#666' }}>{e.cantidad}</td>
                    <td style={S.td}>
                      <input style={{ ...S.inpC, width: 44, background: parseInt(e.cant_ok) > 0 ? '#e8f8e8' : undefined }}
                        type="number" min="0" max={e.cantidad}
                        value={e.cant_ok} onChange={ev => setField(i, 'cant_ok', ev.target.value)} />
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.inpC, width: 44, background: hasFalla ? '#ffe8e0' : undefined }}
                        type="number" min="0" max={e.cantidad}
                        value={e.cant_falla} onChange={ev => setField(i, 'cant_falla', ev.target.value)} />
                    </td>
                    <td style={S.tdL}>
                      <input style={{ ...S.inp, width: '100%', fontSize: 10 }} value={e.observacion}
                        onChange={ev => setField(i, 'observacion', ev.target.value)}
                        placeholder={hasFalla ? 'Ej: costura suelta' : ''} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {totalFalla > 0 && (
            <div style={{ marginTop: 8, background: '#fff0ee', border: '1px solid #e0b0b0', padding: '5px 10px', fontSize: 11, color: '#8a2a00', fontWeight: 700 }}>
              ⚠ {totalFalla} prendas con falla — quedarán pendientes para enviar de vuelta al taller.
            </div>
          )}
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btnP, background: 'linear-gradient(to bottom,#4a6a3a,#2a4a1a)', border: '1px solid #2a4a1a' }}
            onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar control'}</button>
        </div>
      </div>
    </div>
  )
}

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: '#555' }}>Por cada talle, ingresá cuántas quedaron OK y cuántas tienen falla.</span>
            <button style={{ ...S.btn, fontSize: 10, padding: '2px 10px', color: '#2a6a10', fontWeight: 700, border: '1px solid #5a9a30', marginLeft: 'auto' }}
              onClick={() => setEntries(prev => prev.map(e => ({ ...e, cant_ok: String(e.disponible), cant_falla: '0' })))}>
              ✅ Todo OK
            </button>
          </div>
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
  // Precio por producto_id (un precio para todos los talles del mismo producto)
  const preciosPorProd = {}
  for (const it of (envio.taller_movimientos_items || [])) {
    if (!(it.producto_id in preciosPorProd))
      preciosPorProd[it.producto_id] = it.precio_unit ?? it.productos?.costo_confeccion ?? null
  }
  const [precios, setPrecios] = useState(() => ({ ...preciosPorProd }))

  const [filas, setFilas] = useState(() =>
    (envio.taller_movimientos_items || []).map(it => ({
      producto_id: it.producto_id,
      prodNombre:  it.productos?.nombre || '?',
      talle:       it.talle,
      enviado:     it.cantidad,
      cantidad:    String(it.cantidad),
      lote_id:     it.lote_id || null,
    }))
  )

  function setCant(i, val) {
    setFilas(prev => prev.map((f, j) => j === i ? { ...f, cantidad: val } : f))
  }

  // Monto total = suma(cant × precio) por producto
  const montoTotal = filas.reduce((sum, f) => {
    const cant = parseInt(f.cantidad) || 0
    const precio = parseFloat(precios[f.producto_id]) || 0
    return sum + cant * precio
  }, 0)

  async function save() {
    const rows = filas.filter(f => parseInt(f.cantidad) > 0)
    if (!rows.length) { alert('Ingresá al menos una cantidad'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo: 'recepcion', fecha, contacto_id: envio.contactos?.id || null, nota: nota.trim() || null, monto: montoTotal > 0 ? montoTotal : null, user_id: user?.id })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    for (const r of rows) {
      const precioU = parseFloat(precios[r.producto_id]) || null
      await supabase.from('taller_movimientos_items').insert({
        movimiento_id: mov.id, producto_id: r.producto_id,
        talle: r.talle, cantidad: parseInt(r.cantidad) || 0,
        lote_id: r.lote_id || null,
        precio_unit: precioU,
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
              <th style={S.th}>$ / u</th>
            </tr></thead>
            <tbody>
              {filas.map((f, i) => {
                const esPrimeroDeProd = i === 0 || filas[i-1].producto_id !== f.producto_id
                return (
                  <tr key={i}>
                    <td style={S.tdL}>{f.prodNombre}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{f.talle}</td>
                    <td style={{ ...S.td, color: '#888' }}>{f.enviado}</td>
                    <td style={S.td}>
                      <input style={{ ...S.inpC, width: 44 }} type="number" min="0" max={f.enviado}
                        value={f.cantidad} onChange={e => setCant(i, e.target.value)} />
                    </td>
                    <td style={S.td}>
                      {esPrimeroDeProd && (
                        <input style={{ ...S.inpC, width: 60 }} type="number" min="0" step="0.01"
                          value={precios[f.producto_id] ?? ''}
                          onChange={e => setPrecios(p => ({ ...p, [f.producto_id]: e.target.value === '' ? null : e.target.value }))}
                          placeholder="0.00" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {montoTotal > 0 && (
            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#8a3a3a', marginTop: 6 }}>
              Total a pagar: ${montoTotal.toLocaleString('es-AR')}
            </div>
          )}
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
  const tallerInputRef = useRef(null)

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
      enviado_movimiento_id: mov.id,
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
              <input ref={tallerInputRef} style={{ ...S.inp, width: '100%' }} value={tallerQ} onChange={e => onTallerInput(e.target.value)} placeholder="Buscar en Contactos..." />
              {tallerId && <span style={{ fontSize: 10, color: '#2a6a2a' }}>✓ {tallerQ}</span>}
              <AcList items={tallerRes} onPick={r => { setTallerId(r.id); setTallerQ(r.nombre); setTallerRes([]) }} label={r => r.nombre} anchorRef={tallerInputRef} />
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

// ── Modal: Enviar TODAS las fallas al taller desde En mi taller ───────────────

function ModalEnviarTodasFallas({ fallaGroups, onClose, onSave }) {
  const [fecha,     setFecha]     = useState(today())
  const [tallerQ,   setTallerQ]   = useState('')
  const [tallerId,  setTallerId]  = useState(null)
  const [tallerRes, setTallerRes] = useState([])
  const [filas,     setFilas]     = useState(() => fallaGroups.map(g => ({ ...g, cantidad: String(g.totalCant) })))
  const [saving,    setSaving]    = useState(false)
  const timers = useRef({})
  const tallerInputRef = useRef(null)

  function onTallerInput(val) {
    setTallerQ(val); setTallerId(null)
    clearTimeout(timers.current.taller)
    if (!val.trim()) { setTallerRes([]); return }
    timers.current.taller = setTimeout(async () => {
      const { data } = await supabase.from('contactos').select('id, nombre').ilike('nombre', `%${val.trim()}%`).limit(8)
      setTallerRes(data || [])
    }, 250)
  }

  function setCant(i, val) {
    setFilas(prev => prev.map((f, j) => j === i ? { ...f, cantidad: val } : f))
  }

  async function save() {
    if (!tallerId) { alert('Seleccioná un taller'); return }
    const rows = filas.filter(f => parseInt(f.cantidad) > 0)
    if (!rows.length) { alert('Ingresá al menos una cantidad'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo: 'devolucion', fecha, contacto_id: tallerId, nota: '🔁 Fallas enviadas al taller', user_id: user?.id })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    for (const r of rows) {
      const cant = parseInt(r.cantidad)
      await supabase.from('taller_movimientos_items').insert({
        movimiento_id: mov.id, producto_id: r.producto_id, talle: r.talle, cantidad: cant,
      })
      let remaining = cant
      for (const c of r.controlItems) {
        if (remaining <= 0) break
        await supabase.from('taller_control_items').update({
          enviado_taller: true, enviado_fecha: fecha, enviado_contacto_id: tallerId, enviado_movimiento_id: mov.id,
        }).eq('id', c.id)
        remaining -= c.cant_falla
      }
    }
    setSaving(false); onSave()
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 600 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...S.modalH, background: 'linear-gradient(to bottom,#6a006a,#4a004a)' }}>
          <span>📤 Enviar fallas al taller</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalB}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div>
              <span style={S.lbl}>Fecha</span>
              <input style={S.inp} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={S.lbl}>Taller</span>
              <input ref={tallerInputRef} style={{ ...S.inp, width: '100%' }} value={tallerQ} onChange={e => onTallerInput(e.target.value)} placeholder="Buscar en Contactos..." />
              {tallerId && <span style={{ fontSize: 10, color: '#2a6a2a' }}>✓ {tallerQ}</span>}
              <AcList items={tallerRes} onPick={r => { setTallerId(r.id); setTallerQ(r.nombre); setTallerRes([]) }} label={r => r.nombre} anchorRef={tallerInputRef} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#555', marginBottom: 6 }}>Cantidades a enviar (máx. fallas pendientes).</div>
          <table style={S.tbl}>
            <thead><tr>
              <th style={S.thL}>Producto</th>
              <th style={S.th}>Talle</th>
              <th style={S.th}>Con falla</th>
              <th style={S.th}>A enviar</th>
            </tr></thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i} style={{ background: parseInt(f.cantidad) > 0 ? '#fff4f0' : 'transparent' }}>
                  <td style={S.tdL}>{f.prodNombre}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{f.talle}</td>
                  <td style={{ ...S.td, color: '#8a2000' }}>⚠️ {f.totalCant}</td>
                  <td style={S.td}>
                    <input style={{ ...S.inpC, width: 44, background: parseInt(f.cantidad) > 0 ? '#fff0e8' : '#fff' }}
                      type="number" min="0" max={f.totalCant}
                      value={f.cantidad} onChange={e => setCant(i, e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

// ── Modal: Enviar falla al taller desde En mi taller (FIFO) ───────────────────

function ModalEnviarFallasDesdeStock({ fallaGroup, onClose, onSave }) {
  const { prodNombre, talle, totalCant, controlItems, producto_id } = fallaGroup
  const [fecha,     setFecha]     = useState(today())
  const [cantidad,  setCantidad]  = useState(String(totalCant))
  const [tallerQ,   setTallerQ]   = useState('')
  const [tallerId,  setTallerId]  = useState(null)
  const [tallerRes, setTallerRes] = useState([])
  const [saving,    setSaving]    = useState(false)
  const timers = useRef({})
  const tallerInputRef = useRef(null)

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
    const cant = parseInt(cantidad) || 0
    if (cant <= 0) { alert('Cantidad inválida'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo: 'devolucion', fecha, contacto_id: tallerId, nota: '🔁 Falla enviada al taller', user_id: user?.id })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    await supabase.from('taller_movimientos_items').insert({
      movimiento_id: mov.id, producto_id, talle, cantidad: cant,
    })
    // Marcar controlItems FIFO (más viejo primero) hasta completar la cantidad
    let remaining = cant
    for (const c of controlItems) {
      if (remaining <= 0) break
      await supabase.from('taller_control_items').update({
        enviado_taller: true, enviado_fecha: fecha, enviado_contacto_id: tallerId, enviado_movimiento_id: mov.id,
      }).eq('id', c.id)
      remaining -= c.cant_falla
    }
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
            <strong>{prodNombre}</strong>
            <span style={{ marginLeft: 6, color: '#1a3a6b', fontWeight: 700 }}>talle {talle}</span>
            <span style={{ marginLeft: 6, color: '#8a0000' }}>× {totalCant} con falla</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div>
              <span style={S.lbl}>Cantidad</span>
              <input style={{ ...S.inp, width: 60 }} type="number" min={1} max={totalCant} value={cantidad} onChange={e => setCantidad(e.target.value)} />
            </div>
            <div>
              <span style={S.lbl}>Fecha</span>
              <input style={S.inp} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={S.lbl}>Taller</span>
              <input ref={tallerInputRef} style={{ ...S.inp, width: '100%' }} value={tallerQ} onChange={e => onTallerInput(e.target.value)} placeholder="Buscar en Contactos..." />
              {tallerId && <span style={{ fontSize: 10, color: '#2a6a2a' }}>✓ {tallerQ}</span>}
              <AcList items={tallerRes} onPick={r => { setTallerId(r.id); setTallerQ(r.nombre); setTallerRes([]) }} label={r => r.nombre} anchorRef={tallerInputRef} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#555' }}>Se creará una Devolución al taller seleccionado y las fallas quedarán marcadas como enviadas (FIFO por fecha de recepción).</div>
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
  const clienteInputRef = useRef(null)

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
              <input ref={clienteInputRef} style={{ ...S.inp, width: '100%' }} value={clienteQ} onChange={e => onClienteInput(e.target.value)} placeholder="Buscar en Contactos..." />
              {clienteId && <span style={{ fontSize: 10, color: '#2a6a2a' }}>✓ {clienteQ}</span>}
              <AcList items={clienteRes} onPick={r => { setClienteId(r.id); setClienteQ(r.nombre); setClienteRes([]) }} label={r => r.nombre} anchorRef={clienteInputRef} />
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

function MovCard({ mov, onDelete, onEdit, onCalidad, onRecibir, controlItems, onEnviarFalla, entregasVinculadas, onVerDetalle }) {
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
          {onVerDetalle
            ? <button onClick={e => { e.stopPropagation(); onVerDetalle() }} style={{ fontFamily: F, fontSize: 12, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', color: '#1a3a6b', textDecoration: 'underline dotted', padding: 0 }}>{fmtF(mov.fecha)}</button>
            : <span style={{ fontWeight: 700, fontSize: 12 }}>{fmtF(mov.fecha)}</span>
          }
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
                if (c.devuelto_taller) continue // ya fue devuelto/arreglado
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
                      <td style={S.tdL}>{ri === 0 ? (<>
                        {it.productos?.nombre || '?'}
                        {it.productos?.telas && (
                          <span style={{ marginLeft: 5, fontSize: 10, color: '#666', fontWeight: 400 }}>
                            · {it.productos.telas.tipo}{it.productos.telas.color ? ` ${it.productos.telas.color}` : ''}
                          </span>
                        )}
                      </>) : ''}</td>
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
    stockItems.map(it => ({ ...it, cantidad: '' }))
  )
  const [precios, setPrecios] = useState(() => {
    const m = {}
    for (const it of stockItems) { if (!(it.producto_id in m)) m[it.producto_id] = '' }
    return m
  })

  function setCant(i, val) {
    setFilas(prev => prev.map((f, j) => j === i ? { ...f, cantidad: val } : f))
  }

  function ponerTodo() {
    setFilas(prev => prev.map(f => ({ ...f, cantidad: String(f.n) })))
  }

  // Total = suma por producto de (precio × cantidades recibidas de ese producto)
  const totalMonto = filas.reduce((sum, f) => {
    const precio = parseFloat(precios[f.producto_id]) || 0
    const cant   = parseInt(f.cantidad) || 0
    return sum + precio * cant
  }, 0)

  async function save() {
    const rows = filas.filter(f => parseInt(f.cantidad) > 0)
    if (!rows.length) { alert('Ingresá al menos una cantidad'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const montoVal = totalMonto > 0 ? totalMonto : null
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo: 'recepcion', fecha, contacto_id: taller.id, nota: nota.trim() || null, monto: montoVal, user_id: user?.id })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    for (const r of rows) {
      const precioU = parseFloat(precios[r.producto_id]) || null
      await supabase.from('taller_movimientos_items').insert({
        movimiento_id: mov.id, producto_id: r.producto_id,
        talle: r.talle, cantidad: parseInt(r.cantidad) || 0,
        precio_unit: precioU,
        lote_id: r.lote_id || null,
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
          <div style={{ fontSize: 10, color: '#555', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Ingresá las cantidades recibidas.</span>
            <button style={{ ...S.btn, fontSize: 10, padding: '2px 8px' }} onClick={ponerTodo}>Poner todo</button>
          </div>
          <table style={S.tbl}>
            <thead><tr>
              <th style={S.thL}>Producto</th>
              <th style={S.th}>Talle</th>
              <th style={S.th}>En taller</th>
              <th style={S.th}>Recibido</th>
              <th style={S.th}>Precio/u</th>
            </tr></thead>
            <tbody>
              {(() => {
                const seen = {}
                return filas.map((f, i) => {
                  const firstOfProd = !seen[f.producto_id]
                  if (firstOfProd) seen[f.producto_id] = true
                  const precio = parseFloat(precios[f.producto_id]) || 0
                  const cantProd = filas.filter(x => x.producto_id === f.producto_id).reduce((s, x) => s + (parseInt(x.cantidad) || 0), 0)
                  const subtotal = precio > 0 && cantProd > 0 ? precio * cantProd : null
                  return (
                    <tr key={i} style={{ background: f.falla > 0 ? '#fff4f0' : 'transparent' }}>
                      <td style={S.tdL}>{f.prodNombre}</td>
                      <td style={{ ...S.td, fontWeight: 700 }}>{f.talle}</td>
                      <td style={S.td}>
                        {f.normal > 0 && <span style={{ color: '#555', marginRight: 4 }}>{f.normal}</span>}
                        {f.falla > 0 && <span style={{ color: '#8a2000', fontWeight: 700 }}>⚠️ {f.falla}</span>}
                      </td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input style={{ ...S.inpC, width: 44 }} type="number" min="0" max={f.n}
                            value={f.cantidad} onChange={e => setCant(i, e.target.value)}
                            onFocus={e => e.target.select()} />
                          <button style={{ fontFamily: F, fontSize: 10, background: '#e8eef8', border: '1px solid #a0b0c8', cursor: 'pointer', color: '#1a3a6b', padding: '2px 7px', whiteSpace: 'nowrap' }}
                            onClick={() => setCant(i, String(f.n))}>todo</button>
                        </div>
                      </td>
                      <td style={S.td}>
                        {firstOfProd && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 11, color: '#555' }}>$</span>
                            <input style={{ ...S.inpC, width: 60 }} type="number" min="0" step="0.01"
                              value={precios[f.producto_id]}
                              onChange={e => setPrecios(p => ({ ...p, [f.producto_id]: e.target.value }))}
                              onFocus={e => e.target.select()}
                              placeholder="0.00" />
                            {subtotal != null && (
                              <span style={{ fontSize: 10, color: '#1a5a1a', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                = {fmtMoneda(subtotal)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
          {totalMonto > 0 && (
            <div style={{ marginTop: 8, background: '#eaf4ea', border: '1px solid #b0d0b0', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#555' }}>Total a pagar</span>
              <strong style={{ fontSize: 13, color: '#1a5a1a' }}>{fmtMoneda(totalMonto)}</strong>
            </div>
          )}
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

function StockEnTalleres({ movimientos, controlMap, onRecibirStock, filterCid }) {
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

  // Envíos por taller con capacidad restante (descontando recepciones por lote, luego FIFO)
  const enviosPorTaller = {} // cid -> [{ envio, cap: { pid__talle: qty }, lotes: Set<lote_id> }]
  for (const mov of movsAsc) {
    if (mov.tipo !== 'envio' && mov.tipo !== 'devolucion') continue
    const cid = mov.contactos?.id
    if (!cid) continue
    const cap = {}
    const lotes = new Set()
    for (const it of (mov.taller_movimientos_items || [])) {
      const k = `${it.producto_id}__${it.talle}`
      cap[k] = (cap[k] || 0) + (it.cantidad || 0)
      if (it.lote_id) lotes.add(it.lote_id)
    }
    if (!enviosPorTaller[cid]) enviosPorTaller[cid] = []
    enviosPorTaller[cid].push({ envio: mov, cap, lotes })
  }
  // Descontar recepciones: si el item tiene lote_id, buscar el envío de ese lote primero; si no, FIFO más reciente
  for (const mov of movsAsc) {
    if (mov.tipo !== 'recepcion') continue
    const cid = mov.contactos?.id
    if (!cid || !enviosPorTaller[cid]) continue
    for (const it of (mov.taller_movimientos_items || [])) {
      const k = `${it.producto_id}__${it.talle}`
      let rem = it.cantidad || 0
      const elegibles = [...enviosPorTaller[cid]]
        .filter(b => b.envio.fecha <= mov.fecha)
        .reverse()
      // Si tiene lote_id, priorizar el bloque que lo contiene
      const ordenados = it.lote_id
        ? [...elegibles].sort((a, b) => (b.lotes.has(it.lote_id) ? 1 : 0) - (a.lotes.has(it.lote_id) ? 1 : 0))
        : elegibles
      for (const bloque of ordenados) {
        if (!bloque.cap[k] || bloque.cap[k] <= 0) continue
        const desc = Math.min(bloque.cap[k], rem)
        bloque.cap[k] -= desc
        rem -= desc
        if (rem <= 0) break
      }
    }
  }

  // Aplanar y filtrar positivos
  const talleres = Object.values(stock).map(({ nombre, cid, prods }) => {
    const prodList = Object.values(prods).map(({ prodNombre, pid, talles }) => {
      const filas = Object.entries(talles)
        .filter(([, v]) => v.normal > 0 || v.falla > 0)
        .map(([talle, v]) => ({ talle, normal: Math.max(0, v.normal), falla: Math.max(0, v.falla), n: Math.max(0, v.normal) + Math.max(0, v.falla), producto_id: pid, prodNombre }))
        .sort((a, b) => cmpTalle(a.talle, b.talle))
      const total = filas.reduce((s, f) => s + f.n, 0)
      return { prodNombre, filas, total }
    }).filter(p => p.filas.length > 0)
    const total = prodList.reduce((s, p) => s + p.total, 0)
    const stockItems = prodList.flatMap(p => p.filas)
    const envios = (enviosPorTaller[cid] || []).filter(b => Object.values(b.cap).some(v => v > 0))
    return { nombre, cid, prodList, total, stockItems, envios }
  }).filter(t => t.prodList.length > 0 && (!filterCid || t.cid === filterCid))

  if (!talleres.length) return null

  const esFiltrado = !!filterCid
  const titulo = esFiltrado
    ? `📦 En manos · ${talleres[0]?.total || 0} prendas`
    : `📦 En manos de talleres`

  return (
    <div style={{ border: `2px solid ${esFiltrado ? '#5a8a3a' : '#1a3a6b'}`, background: esFiltrado ? '#f0f6ec' : '#eef2f8', marginBottom: 10 }}>
      <div style={{ background: esFiltrado ? 'linear-gradient(to bottom,#5a8a3a,#3a6a1a)' : 'linear-gradient(to bottom,#1a3a6b,#0a2a5b)', color: '#fff', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}>
        <span style={{ fontWeight: 700, fontSize: 12 }}>{open ? '▼' : '▶'} {titulo}</span>
        {!esFiltrado && <span style={{ fontSize: 10 }}>{talleres.length} taller{talleres.length !== 1 ? 'es' : ''} · {talleres.reduce((s, t) => s + t.total, 0)} prendas</span>}
      </div>
      {open && (
        <div style={{ padding: '8px 10px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {talleres.map(t => (
            <div key={t.cid} style={{ border: '1px solid #a0b0c8', background: '#fff', padding: '6px 10px', minWidth: 220, flex: '1 1 220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, borderBottom: '1px solid #d0d8e8', paddingBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: '#1a3a6b' }}>{t.nombre} · <span style={{ fontWeight: 400, fontSize: 11 }}>{t.total} prendas</span></span>
                <button style={{ ...S.btnP, fontSize: 10, padding: '1px 7px' }}
                  onClick={() => onRecibirStock({ id: t.cid, nombre: t.nombre }, t.stockItems)}>
                  📥 Recibir
                </button>
              </div>
              {/* Envíos pendientes agrupados por producto → lote */}
              {(() => {
                const byProd = {}
                for (const { envio, cap } of t.envios) {
                  for (const it of (envio.taller_movimientos_items || [])) {
                    const k = `${it.producto_id}__${it.talle}`
                    const restante = cap[k] || 0
                    if (restante <= 0) continue
                    const pid = it.producto_id
                    const loteId = it.lote_id || null
                    const nombre = it.productos?.nombre || `#${pid}`
                    if (!byProd[pid]) byProd[pid] = { nombre, pid, lotes: [] }
                    let lote = byProd[pid].lotes.find(l => l.loteId === loteId)
                    if (!lote) { lote = { loteId, fecha: envio.fecha, envio, filas: [] }; byProd[pid].lotes.push(lote) }
                    lote.filas.push({ talle: it.talle, cant: restante })
                  }
                }
                return Object.values(byProd).map(prod => {
                  const totalProd = prod.lotes.reduce((s, l) => s + l.filas.reduce((ss, f) => ss + f.cant, 0), 0)
                  return (
                    <div key={prod.pid} style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px dashed #d0d8e8' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#333', marginBottom: 4 }}>
                        {prod.nombre} <span style={{ fontWeight: 400, color: '#666', fontSize: 10 }}>· {totalProd} u.</span>
                      </div>
                      {[...prod.lotes].sort((a, b) => b.fecha < a.fecha ? -1 : 1).map(lote => {
                        const bg = loteColor(lote.loteId)
                        const short = lote.loteId ? (lote.loteId.startsWith('LOT-') ? lote.loteId.slice(-6) : lote.loteId) : null
                        const totalLote = lote.filas.reduce((s, f) => s + f.cant, 0)
                        const loteStockItems = lote.filas.map(f => ({
                          producto_id: prod.pid, prodNombre: prod.nombre,
                          talle: f.talle, normal: f.cant, falla: 0, n: f.cant,
                          lote_id: lote.loteId || null,
                        }))
                        return (
                          <div key={lote.loteId || lote.fecha} style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                            {short && (
                              <span style={{ fontSize: 10, fontFamily: "'Courier New', monospace", fontWeight: 700, background: bg, color: '#1a1a1a', padding: '1px 5px', borderRadius: 3, border: '1px solid rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
                                {short}
                              </span>
                            )}
                            <span style={{ fontSize: 10, color: '#4a5a7a', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtF(lote.fecha)}</span>
                            <span style={{ fontSize: 10, color: '#999' }}>·</span>
                            {[...lote.filas].sort((a, b) => cmpTalle(a.talle, b.talle)).map((f, i) => (
                              <span key={i} style={{ background: '#e0e8f4', padding: '1px 5px', border: '1px solid #a0b0c8', fontSize: 10, whiteSpace: 'nowrap' }}>
                                {f.talle}×{f.cant}
                              </span>
                            ))}
                            <button onClick={() => onRecibirStock({ id: t.cid, nombre: t.nombre }, loteStockItems, [])}
                              style={{ fontFamily: F, fontSize: 10, background: 'linear-gradient(to bottom,#e0f0e8,#c8e0d0)', border: '1px solid #80a890', padding: '0px 5px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              📥 Recibir
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              })()}
              {/* Fallas pendientes — sección separada al final */}
              {t.stockItems.some(s => s.falla > 0) && (() => {
                const allCtrl = Object.values(controlMap).flat()
                // fecha más reciente de devolucion para este taller
                const devFecha = movimientos
                  .filter(m => m.tipo === 'devolucion' && m.contactos?.id === t.cid)
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))[0]?.fecha || null
                const porProd = {}
                for (const s of t.stockItems.filter(s => s.falla > 0)) {
                  if (!porProd[s.producto_id]) porProd[s.producto_id] = { nombre: s.prodNombre, pid: s.producto_id, filas: [] }
                  porProd[s.producto_id].filas.push({ talle: s.talle, falla: s.falla })
                }
                const fallaStockItems = t.stockItems
                  .filter(s => s.falla > 0)
                  .map(s => ({ ...s, normal: 0, n: s.falla }))
                const fallaCtrlAll = allCtrl.filter(c => c.enviado_contacto_id === t.cid && !c.devuelto_taller && c.cant_falla > 0)
                return (
                  <div style={{ borderTop: '1px solid #e0c0b0', paddingTop: 6, marginTop: 2 }}>
                    {devFecha
                      ? <button onClick={() => onRecibirStock({ id: t.cid, nombre: t.nombre }, fallaStockItems, fallaCtrlAll)}
                          style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: '#8a2000', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted', marginBottom: 4, display: 'block' }}>
                          ⚠️ Fallas — {fmtF(devFecha)}
                        </button>
                      : <div style={{ fontSize: 10, fontWeight: 700, color: '#8a2000', marginBottom: 4 }}>⚠️ Fallas</div>
                    }
                    {Object.values(porProd).map(p => (
                      <div key={p.pid} style={{ marginBottom: 3 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: '#8a2000' }}>⚠️ {p.nombre}</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {[...p.filas].sort((a,b) => cmpTalle(a.talle, b.talle)).map((f, i) => (
                            <span key={i} style={{ background: '#fff0e8', padding: '1px 6px', border: '1px solid #d08060', color: '#8a2000', fontWeight: 700, fontSize: 11 }}>⚠️ {f.talle} × {f.falla}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Popup hilo de envío */}
    </div>
  )
}

// ── Modal: Entregar a cliente ─────────────────────────────────────────────────

const TIPOS_TALLER = ['Taller', 'Estampador', 'Bordador']

function ModalNuevoTaller({ onClose, onSave }) {
  const [nombre,  setNombre]  = useState('')
  const [tipo,    setTipo]    = useState('Taller')
  const [telefono,setTelefono]= useState('')
  const [saving,  setSaving]  = useState(false)

  async function save() {
    if (!nombre.trim()) { alert('Ingresá un nombre'); return }
    setSaving(true)
    const { data, error } = await supabase.from('contactos')
      .insert({ nombre: nombre.trim(), tipo, telefono: telefono.trim() || null })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setSaving(false); onSave(data.id)
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 360 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalH}>
          <span>Nuevo taller / contacto</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalB}>
          <div style={{ marginBottom: 10 }}>
            <span style={S.lbl}>Nombre</span>
            <input style={{ ...S.inp, width: '100%', boxSizing: 'border-box' }} value={nombre}
              onChange={e => setNombre(e.target.value)} placeholder="Nombre del taller o persona" autoFocus />
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={S.lbl}>Tipo</span>
            <select style={{ ...S.sel, width: '100%' }} value={tipo} onChange={e => setTipo(e.target.value)}>
              {TIPOS_TALLER.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={S.lbl}>Teléfono (opcional)</span>
            <input style={{ ...S.inp, width: '100%', boxSizing: 'border-box' }} value={telefono}
              onChange={e => setTelefono(e.target.value)} placeholder="Ej: 099 123 456" />
          </div>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={S.btnP} onClick={save} disabled={saving}>{saving ? 'Guardando...' : '✔ Crear taller'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Acción desde mi taller (entregar cliente o enviar taller) ──────────

function ModalAccionMiTaller({ producto, filas, onClose, onSave }) {
  const [accion,     setAccion]    = useState('entregar') // 'entregar' | 'enviar'
  const [fecha,      setFecha]     = useState(today())
  const [contactoQ,  setContactoQ] = useState('')
  const [contactoId, setContactoId]= useState(null)
  const [contactoNombre, setContactoNombre] = useState('')
  const [contactoRes,setContactoRes]= useState([])
  const [nota,       setNota]      = useState('')
  const [saving,     setSaving]    = useState(false)
  const [rows,       setRows]      = useState(() => filas.map(f => ({ ...f, cantidad: '' })))
  const timers = useRef({})

  function setCant(i, val) { setRows(prev => prev.map((r, j) => j === i ? { ...r, cantidad: val } : r)) }
  function ponerTodo() { setRows(prev => prev.map(r => ({ ...r, cantidad: String(r.ok || r.n || 0) }))) }

  function onContactoInput(val) {
    setContactoQ(val); setContactoId(null); setContactoNombre('')
    clearTimeout(timers.current.c)
    if (!val.trim()) { setContactoRes([]); return }
    timers.current.c = setTimeout(async () => {
      const { data } = await supabase.from('contactos').select('id, nombre, tipo').ilike('nombre', `%${val.trim()}%`).limit(8)
      setContactoRes(data || [])
    }, 250)
  }

  async function save() {
    const validos = rows.filter(r => parseInt(r.cantidad) > 0)
    if (!validos.length) { alert('Ingresá al menos una cantidad'); return }
    if (!contactoId) { alert(accion === 'entregar' ? 'Seleccioná un cliente' : 'Seleccioná un taller'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const tipo = accion === 'entregar' ? 'entrega' : 'envio'
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo, fecha, contacto_id: contactoId, nota: nota.trim() || null, user_id: user?.id })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    for (const r of validos) {
      await supabase.from('taller_movimientos_items').insert({
        movimiento_id: mov.id, producto_id: r.producto_id, talle: r.talle, cantidad: parseInt(r.cantidad),
      })
    }
    setSaving(false); onSave()
  }

  const colorH = accion === 'entregar' ? 'linear-gradient(to bottom,#1a5a1a,#0a3a0a)' : 'linear-gradient(to bottom,#1a3a6b,#0a2a5b)'
  const labelContacto = accion === 'entregar' ? 'Cliente' : 'Taller / Estampador'

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...S.modalH, background: colorH }}>
          <span>📦 {producto} — ¿Qué hacemos?</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalB}>
          {/* Selector de acción */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[{ id: 'entregar', label: '🛍️ Entregar a cliente' }, { id: 'enviar', label: '📦 Enviar a taller' }].map(op => (
              <button key={op.id} onClick={() => { setAccion(op.id); setContactoQ(''); setContactoId(null); setContactoRes([]) }}
                style={{ flex: 1, fontFamily: F, fontSize: 11, fontWeight: 700, padding: '6px 0', cursor: 'pointer',
                  background: accion === op.id ? (op.id === 'entregar' ? '#1a5a1a' : '#1a3a6b') : '#e8eef8',
                  color: accion === op.id ? '#fff' : '#333',
                  border: `2px solid ${accion === op.id ? (op.id === 'entregar' ? '#1a5a1a' : '#1a3a6b') : '#c0c8d8'}` }}>
                {op.label}
              </button>
            ))}
          </div>

          {/* Tabla de cantidades */}
          <div style={{ fontSize: 10, color: '#555', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Cantidades a {accion === 'entregar' ? 'entregar' : 'enviar'}</span>
            <button style={{ ...S.btn, fontSize: 10, padding: '2px 8px' }} onClick={ponerTodo}>Poner todo</button>
          </div>
          <table style={S.tbl}>
            <thead><tr>
              <th style={S.th}>Talle</th>
              <th style={S.th}>Disponible</th>
              <th style={S.th}>Cantidad</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...S.td, fontWeight: 700 }}>{r.talle}</td>
                  <td style={S.td}>{r.ok || r.n || 0}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input style={{ ...S.inpC, width: 44 }} type="number" min="0"
                        value={r.cantidad} onChange={e => setCant(i, e.target.value)} onFocus={e => e.target.select()} />
                      <button style={{ fontFamily: F, fontSize: 10, background: '#e8eef8', border: '1px solid #a0b0c8', cursor: 'pointer', color: '#1a3a6b', padding: '2px 7px' }}
                        onClick={() => setCant(i, String(r.ok || r.n || 0))}>todo</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Contacto */}
          <div style={{ marginTop: 12 }}>
            <span style={S.lbl}>{labelContacto}</span>
            <div style={{ position: 'relative' }}>
              <input style={{ ...S.inp, width: '100%' }} value={contactoQ}
                onChange={e => onContactoInput(e.target.value)}
                placeholder={`Buscar ${labelContacto.toLowerCase()}...`} />
              {contactoRes.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #c0c8d0', zIndex: 10, maxHeight: 160, overflowY: 'auto' }}>
                  {contactoRes.map(c => (
                    <div key={c.id} style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}
                      onMouseDown={() => { setContactoId(c.id); setContactoNombre(c.nombre); setContactoQ(c.nombre); setContactoRes([]) }}>
                      {c.nombre} <span style={{ fontSize: 10, color: '#888' }}>({c.tipo})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={S.lbl}>Fecha</span>
              <input style={S.inp} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div style={{ flex: 2 }}>
              <span style={S.lbl}>Nota</span>
              <input style={{ ...S.inp, width: '100%' }} value={nota} onChange={e => setNota(e.target.value)} placeholder="opcional" />
            </div>
          </div>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btnP, background: accion === 'entregar' ? 'linear-gradient(to bottom,#1a5a1a,#0a3a0a)' : 'linear-gradient(to bottom,#1a3a6b,#0a2a5b)', border: 'none' }}
            onClick={save} disabled={saving}>{saving ? 'Guardando...' : accion === 'entregar' ? '✔ Entregar' : '✔ Enviar'}</button>
        </div>
      </div>
    </div>
  )
}

function ModalEntregarCliente({ miStockItems, onClose, onSave, titulo = '📤 Entregar', contactoLabel = 'Destino' }) {
  const [fecha,       setFecha]      = useState(today())
  const [clienteQ,    setClienteQ]   = useState('')
  const [clienteId,   setClienteId]  = useState(null)
  const [clienteTipo, setClienteTipo]= useState(null)
  const [clienteRes,  setClienteRes] = useState([])
  const [nota,       setNota]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const [filas,      setFilas]      = useState(() =>
    miStockItems.map(it => ({ ...it, cantidad: '' }))
  )
  const timers = useRef({})
  const clienteInputRef = useRef(null)

  function onClienteInput(val) {
    setClienteQ(val); setClienteId(null)
    clearTimeout(timers.current.cli)
    if (!val.trim()) { setClienteRes([]); return }
    timers.current.cli = setTimeout(async () => {
      const { data } = await supabase.from('contactos').select('id, nombre, tipo').ilike('nombre', `%${val.trim()}%`).limit(8)
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
    const tipoMov = TIPOS_TALLER.includes(clienteTipo) ? 'envio' : 'entrega'
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo: tipoMov, fecha, contacto_id: clienteId, nota: nota.trim() || null, user_id: user?.id })
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
          <span>{titulo}</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalB}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div>
              <span style={S.lbl}>Fecha</span>
              <input style={S.inp} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={S.lbl}>{contactoLabel}</span>
              <input ref={clienteInputRef} style={{ ...S.inp, width: '100%' }} value={clienteQ} onChange={e => onClienteInput(e.target.value)} placeholder="Buscar en Contactos..." />
              {clienteId && <span style={{ fontSize: 10, color: '#2a6a2a' }}>✓ {clienteQ}</span>}
              <AcList items={clienteRes} onPick={r => { setClienteId(r.id); setClienteQ(r.nombre); setClienteTipo(r.tipo); setClienteRes([]) }} label={r => r.nombre} anchorRef={clienteInputRef} />
            </div>
          </div>
          {clienteId && (
            <div style={{ fontSize: 10, marginBottom: 6, color: TIPOS_TALLER.includes(clienteTipo) ? '#1a5a8a' : '#5a3a00' }}>
              {TIPOS_TALLER.includes(clienteTipo) ? '🏭 Se registrará como envío al taller — aparecerá en "En talleres"' : '🛍️ Se registrará como entrega a cliente'}
            </div>
          )}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <input style={{ ...S.inpC, width: 44, background: parseInt(f.cantidad) > 0 ? '#fff8e8' : '#fff' }}
                        type="number" min="0" max={f.n}
                        value={f.cantidad} onChange={e => setCant(i, e.target.value)} />
                      <button style={{ fontSize: 9, padding: '1px 4px', fontFamily: F, background: '#e8f0e8', border: '1px solid #a8c8a8', cursor: 'pointer', color: '#2a5a2a', whiteSpace: 'nowrap' }}
                        onClick={() => setCant(i, String(f.n))}>Todo</button>
                    </div>
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

function StockEnMiTaller({ movimientos, controlMap, onEntregar, onEnviarFallaStock, onEnviarTodasFallas }) {
  const [open, setOpen] = useState(true)
  const [accionProd, setAccionProd] = useState(null) // { nombre, filas }

  // recepcion suma, devolucion y entrega restan (envio se ignora)
  const stock = {} // { pid: { prodNombre, talles: { talle: { ok, falla } } } }

  // Fallas pendientes de envío: controlMap items con cant_falla > 0 y enviado_taller = false
  // agrupadas por producto_id + talle, con los items reales ordenados FIFO (más viejo primero)
  const movFechaMap = {}
  for (const m of movimientos) movFechaMap[m.id] = m.fecha

  const fallasPendientes = {} // { `${pid}__${talle}`: { cant, items, prodNombre, producto_id, talle } }
  for (const items of Object.values(controlMap)) {
    for (const c of items) {
      if (c.cant_falla > 0 && !c.enviado_taller) {
        const k = `${c.producto_id}__${c.talle}`
        if (!fallasPendientes[k]) fallasPendientes[k] = { cant: 0, items: [], prodNombre: c.productos?.nombre || '?', producto_id: c.producto_id, talle: c.talle }
        fallasPendientes[k].cant += c.cant_falla
        fallasPendientes[k].items.push(c)
      }
    }
  }
  for (const v of Object.values(fallasPendientes)) {
    v.items.sort((a, b) => (movFechaMap[a.movimiento_id] || '').localeCompare(movFechaMap[b.movimiento_id] || ''))
  }

  // Fecha más vieja de recepción por pid__talle (para orden FIFO en entrega)
  const oldestRecepcion = {}
  for (const mov of movimientos) {
    if (mov.tipo !== 'recepcion') continue
    for (const it of (mov.taller_movimientos_items || [])) {
      const k = `${it.producto_id}__${it.talle}`
      if (!oldestRecepcion[k] || mov.fecha < oldestRecepcion[k]) oldestRecepcion[k] = mov.fecha
    }
  }

  // Procesar en orden cronológico y nunca bajar de 0:
  // un envio de producción (sin stock previo) no descuenta — el recepcion de vuelta siempre suma.
  const movsParaMiTaller = [...movimientos]
    .filter(m => m.tipo !== 'pago')
    .sort((a, b) => {
      const d = a.fecha.localeCompare(b.fecha)
      return d !== 0 ? d : (a.created_at || '').localeCompare(b.created_at || '')
    })
  for (const mov of movsParaMiTaller) {
    const sign = mov.tipo === 'recepcion' ? 1 : -1
    for (const it of (mov.taller_movimientos_items || [])) {
      const pid  = it.producto_id
      const cant = (it.cantidad || 0) * sign
      if (!stock[pid]) stock[pid] = { prodNombre: it.productos?.nombre || '?', pid, talles: {} }
      const t = it.talle
      if (!stock[pid].talles[t]) stock[pid].talles[t] = { ok: 0 }
      stock[pid].talles[t].ok = Math.max(0, (stock[pid].talles[t].ok || 0) + cant)
    }
  }

  const prodList = Object.values(stock).map(({ prodNombre, pid, talles }) => {
    const filas = Object.entries(talles)
      .map(([talle, v]) => {
        const falla = fallasPendientes[`${pid}__${talle}`]?.cant || 0
        const ok = Math.max(0, (v.ok || 0)) - falla
        const oldest = oldestRecepcion[`${pid}__${talle}`] || '9999'
        return { talle, ok: Math.max(0, ok), falla, n: Math.max(0, ok) + falla, producto_id: pid, prodNombre, oldest }
      })
      .filter(f => f.ok > 0 || f.falla > 0)
    const total = filas.reduce((s, f) => s + f.n, 0)
    const oldestProd = filas.reduce((min, f) => f.oldest < min ? f.oldest : min, '9999')
    return { prodNombre, filas, total, oldestProd }
  }).filter(p => p.filas.length > 0)

  const totalPrendas = prodList.reduce((s, p) => s + p.total, 0)
  // FIFO: ordenar por producto más viejo primero, dentro de cada producto por talle más viejo
  const miStockItems = prodList
    .sort((a, b) => a.oldestProd.localeCompare(b.oldestProd))
    .flatMap(p => p.filas.sort((a, b) => a.oldest.localeCompare(b.oldest)))

  // todasFallas derivado de prodList (lo que ya se muestra en las cards)
  const todasFallas = prodList.flatMap(p =>
    p.filas.filter(f => f.falla > 0).map(f => {
      const fg = fallasPendientes[`${f.producto_id}__${f.talle}`]
      return { prodNombre: f.prodNombre, talle: f.talle, totalCant: f.falla, controlItems: fg?.items || [], producto_id: f.producto_id }
    })
  )
  const tieneFallas = todasFallas.length > 0

  if (!prodList.length) return null

  return (
    <div style={{ border: '2px solid #7a3a00', background: '#fdf5ee', marginBottom: 10 }}>
      <div style={{ background: 'linear-gradient(to bottom,#7a3a00,#5a2000)', color: '#fff', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}>
        <span style={{ fontWeight: 700, fontSize: 12 }}>{open ? '▼' : '▶'} 🏭 En mi taller</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10 }}>{totalPrendas} prenda{totalPrendas !== 1 ? 's' : ''}</span>
          {tieneFallas && (
            <button style={{ ...S.btn, fontSize: 10, padding: '1px 8px', background: '#fff0e8', color: '#8a2000', fontWeight: 700, border: '1px solid #d08060' }}
              onClick={e => { e.stopPropagation(); onEnviarTodasFallas && onEnviarTodasFallas(todasFallas) }}>
              ⚠️ Con falla
            </button>
          )}
        </div>
      </div>
      {open && (
        <div style={{ padding: '8px 10px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {prodList.map(p => {
            const tieneFalla = p.filas.some(f => f.falla > 0)
            const tieneOk    = p.filas.some(f => f.ok > 0)
            return (
              <div key={p.prodNombre} style={{ border: '1px solid #c8a888', background: '#fff', padding: '6px 10px', minWidth: 200, flex: '1 1 200px' }}>
                <div style={{ marginBottom: 4, borderBottom: '1px solid #e8d8c8', paddingBottom: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    style={{ fontFamily: F, fontWeight: 700, fontSize: 12, color: tieneFalla ? '#8a2000' : '#7a3a00', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted', textAlign: 'left' }}
                    onClick={() => setAccionProd({ nombre: p.prodNombre, filas: p.filas.filter(f => f.ok > 0).map(f => ({ ...f, n: f.ok, producto_id: f.producto_id })) })}
                  >{tieneFalla ? '⚠️ ' : ''}{p.prodNombre}</button>
                  <span style={{ fontSize: 10, color: '#888' }}>{p.total} u.</span>
                </div>
                {tieneOk && (
                  <div style={{ marginBottom: tieneFalla ? 4 : 0 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {p.filas.filter(f => f.ok > 0).map(f => (
                        <span key={f.talle} style={{ fontSize: 11, background: '#f0e4d4', padding: '1px 6px', border: '1px solid #c8a888' }}>
                          {f.talle} × {f.ok}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {tieneFalla && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <button
                        style={{ fontSize: 10, color: '#8a2000', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, padding: 0, textDecoration: 'underline dotted' }}
                        title="Click para enviar todas las fallas de este producto"
                        onClick={() => {
                          const grupos = p.filas.filter(f => f.falla > 0).map(f => {
                            const fg = fallasPendientes[`${f.producto_id}__${f.talle}`]
                            return { prodNombre: f.prodNombre, talle: f.talle, totalCant: f.falla, controlItems: fg?.items || [], producto_id: f.producto_id }
                          })
                          onEnviarTodasFallas && onEnviarTodasFallas(grupos)
                        }}
                      >⚠️ Con falla</button>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {p.filas.filter(f => f.falla > 0).map(f => {
                        const fg = fallasPendientes[`${f.producto_id}__${f.talle}`]
                        return (
                          <button key={f.talle}
                            style={{ fontSize: 11, background: 'none', border: 'none', padding: 0, color: '#8a2000', fontWeight: 700, cursor: 'pointer', fontFamily: F, textDecoration: 'underline dotted' }}
                            title="Click para enviar esta falla al taller"
                            onClick={() => onEnviarFallaStock && onEnviarFallaStock({ prodNombre: f.prodNombre, talle: f.talle, totalCant: f.falla, controlItems: fg?.items || [], producto_id: f.producto_id })}
                          >
                            ⚠️ {f.talle} × {f.falla}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {accionProd && (
        <ModalAccionMiTaller
          producto={accionProd.nombre}
          filas={accionProd.filas}
          onClose={() => setAccionProd(null)}
          onSave={() => { setAccionProd(null); window.location.reload() }}
        />
      )}
    </div>
  )
}

// ── Bloque por taller ────────────────────────────────────────────────────────

function ModalEntregarDesdeLote({ allEvents, entregasLote, prodNombreLote, onClose, onSave }) {
  const [fecha,      setFecha]      = useState(today())
  const [clienteQ,   setClienteQ]   = useState('')
  const [clienteId,  setClienteId]  = useState(null)
  const [clienteRes, setClienteRes] = useState([])
  const [nota,       setNota]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const timers = useRef({})
  const clienteInputRef = useRef(null)

  // Stock disponible por talle: RECIBIDO + − CONTROL fallas − ENTREGAS
  const stockPorTalle = {}
  const prodIdPorTalle = {}
  const recepcionesPorTalle = {} // talle → array de {mov, fecha} desc
  for (const ev of allEvents) {
    if (ev.kind === 'control') {
      for (const c of ev.ctrl) {
        stockPorTalle[c.talle] = (stockPorTalle[c.talle] || 0) - (c.cant_falla || 0)
      }
      continue
    }
    if (ev.isEntrega) {
      for (const it of ev.items) {
        stockPorTalle[it.talle] = (stockPorTalle[it.talle] || 0) - (it.cantidad || 0)
      }
      continue
    }
    if (ev.m.tipo === 'recepcion') {
      for (const it of ev.items) {
        stockPorTalle[it.talle] = (stockPorTalle[it.talle] || 0) + (it.cantidad || 0)
        if (!prodIdPorTalle[it.talle]) prodIdPorTalle[it.talle] = it.producto_id
        if (!recepcionesPorTalle[it.talle]) recepcionesPorTalle[it.talle] = []
        recepcionesPorTalle[it.talle].push({ mov: ev.m })
      }
    }
  }

  const filas = Object.entries(stockPorTalle)
    .filter(([, disp]) => disp > 0)
    .sort(([a], [b]) => cmpTalle(a, b))
    .map(([talle, disponible]) => ({ talle, disponible, producto_id: prodIdPorTalle[talle] }))

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
      if (r.cantidad > r.disponible) { alert(`Cantidad mayor al disponible para talle ${r.talle}`); return }
    }
    // Origen: recepción más reciente que tenga algún talle entregado
    const tallesEntregados = new Set(rows.map(r => r.talle))
    const recsCandidatas = allEvents
      .filter(ev => ev.kind === 'mov' && !ev.isEntrega && ev.m.tipo === 'recepcion' && ev.items.some(it => tallesEntregados.has(it.talle)))
      .map(ev => ev.m)
      .sort((a, b) => b.fecha < a.fecha ? -1 : b.fecha > a.fecha ? 1 : 0)
    const origenId = recsCandidatas[0]?.id || null
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo: 'entrega', fecha, contacto_id: clienteId, nota: nota.trim() || null, user_id: user?.id, origen_movimiento_id: origenId })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    for (const r of rows) {
      await supabase.from('taller_movimientos_items').insert({ movimiento_id: mov.id, producto_id: r.producto_id, talle: r.talle, cantidad: r.cantidad })
    }
    setSaving(false); onSave()
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...S.modalH, background: 'linear-gradient(to bottom,#7a3a00,#5a2000)' }}>
          <span>🛍️ Entregar a cliente — {prodNombreLote || 'Lote'}</span>
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
              <input ref={clienteInputRef} style={{ ...S.inp, width: '100%' }} value={clienteQ} onChange={e => onClienteInput(e.target.value)} placeholder="Buscar en Contactos..." />
              {clienteId && <span style={{ fontSize: 10, color: '#2a6a2a' }}>✓ {clienteQ}</span>}
              <AcList items={clienteRes} onPick={r => { setClienteId(r.id); setClienteQ(r.nombre); setClienteRes([]) }} label={r => r.nombre} anchorRef={clienteInputRef} />
            </div>
          </div>
          {filas.length === 0
            ? <div style={{ color: '#888', fontSize: 13, padding: '8px 0' }}>Sin stock disponible en este lote.</div>
            : <table style={S.tbl}>
                <thead><tr>
                  <th style={S.th}>Talle</th>
                  <th style={S.th}>Disponible</th>
                  <th style={S.th}>A entregar</th>
                </tr></thead>
                <tbody>
                  {filas.map((f, i) => (
                    <tr key={f.talle} style={{ background: parseInt(vals[i]) > 0 ? '#fef8f0' : 'transparent' }}>
                      <td style={{ ...S.td, fontWeight: 700 }}>{f.talle}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: '#1a5a1a' }}>{f.disponible}</td>
                      <td style={S.td}>
                        <input style={{ ...S.inpC, width: 44, background: parseInt(vals[i]) > 0 ? '#fff8e8' : '#fff' }}
                          type="number" min="0" max={f.disponible}
                          value={vals[i]} onChange={e => setVal(i, e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
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

function TallerBlock({ nombre, movs, controlMap, entregasMap, onDelete, onEdit, onCalidad, onRecibir, onEnviarFalla, onRepetir }) {
  const [openRows, setOpenRows] = useState({})
  const [sortMode, setSortMode] = useState('lote') // 'lote' | 'fecha' | 'producto' | 'conta'
  const [selectedLote, setSelectedLote] = useState(null) // lote_id en detalle
  const [editPrecio, setEditPrecio] = useState(null) // { movId, value }
  const [controlando, setControlando] = useState(null) // { movId, items, tallerNombre }
  const [entregandoLote, setEntregandoLote] = useState(false)
  function toggleRow(id) { setOpenRows(o => ({ ...o, [id]: !o[id] })) }

  // Resumen por lote y saldo calculados desde items
  const loteResumen = {}
  const pagosRows = []
  let debe = 0, haber = 0
  for (const m of movs) {
    const mItems = m.taller_movimientos_items || []
    const ctrl = controlMap[m.id] || []
    if (m.tipo === 'envio' || m.tipo === 'devolucion') {
      for (const it of mItems) {
        const lid = it.lote_id; if (!lid) continue
        if (!loteResumen[lid]) loteResumen[lid] = { loteId: lid, prodNombre: null, prodCodigo: null, fechaEnvio: null, enviado: 0, reenviado: 0, recibido: 0, debe: 0, haber: 0 }
        const l = loteResumen[lid]
        if (!l.prodNombre && it.productos?.nombre) { l.prodNombre = it.productos.nombre; l.prodCodigo = it.productos.codigo || null }
        if (m.tipo === 'envio') { l.enviado += it.cantidad || 0; if (!l.fechaEnvio || m.fecha < l.fechaEnvio) l.fechaEnvio = m.fecha }
        else l.reenviado += it.cantidad || 0
      }
    } else if (m.tipo === 'recepcion') {
      for (const it of mItems) {
        const lid = it.lote_id; if (!lid) continue
        if (!loteResumen[lid]) loteResumen[lid] = { loteId: lid, prodNombre: null, prodCodigo: null, fechaEnvio: null, enviado: 0, reenviado: 0, recibido: 0, debe: 0, haber: 0 }
        const l = loteResumen[lid]
        if (!l.prodNombre && it.productos?.nombre) { l.prodNombre = it.productos.nombre; l.prodCodigo = it.productos.codigo || null }
        const qty = it.cantidad || 0
        const pu = it.precio_unit != null ? it.precio_unit : (it.productos?.costo_confeccion != null ? Number(it.productos.costo_confeccion) : null)
        l.recibido += qty
        if (pu != null) {
          l.debe += qty * pu                                         // todo lo recibido
          const c = ctrl.find(ci => ci.talle === it.talle)
          const fallaQty = c ? (c.cant_falla || 0) : 0
          l.haber += fallaQty * pu                                   // crédito por fallas (queda adentro del lote)
        }
      }
    } else if (m.tipo === 'pago') {
      pagosRows.push(m)
      haber += m.monto || 0
    } else if (m.tipo === 'concepto' && m.monto != null) {
      debe += m.monto
    }
  }
  for (const l of Object.values(loteResumen)) { debe += l.debe - l.haber } // créditos de falla quedan adentro del lote
  const saldo = debe - haber
  const tieneSaldo = debe > 0 || haber > 0

  const sortedAsc = [...movs].sort((a, b) => {
    const d = a.fecha.localeCompare(b.fecha)
    return d !== 0 ? d : (a.created_at || '').localeCompare(b.created_at || '')
  })

  const balance = {}
  const rows = []

  const TIPO_CFG = {
    envio:     { label: 'ENVIADO',       border: '#4a6a9a', bg: '#edf2fa', sign: +1 },
    recepcion: { label: 'RECIBIDO',      border: '#2d7a3a', bg: '#edf7ee', sign: -1 },
    devolucion:{ label: 'ENVIADO-FALLA', border: '#b06010', bg: '#fdf3e0', sign: +1 },
    pago:      { label: 'PAGO',          border: '#5a3a8a', bg: '#f4eefa', sign:  0 },
    concepto:  { label: 'CONCEPTO',      border: '#555555', bg: '#f2f2ee', sign:  0 },
  }

  for (const m of sortedAsc) {
    const cfg = TIPO_CFG[m.tipo] || { label: m.tipo?.toUpperCase(), border: '#777', bg: '#f2f2ee', sign: 0 }
    const mItems = m.taller_movimientos_items || []
    const mFallas = (controlMap[m.id] || []).filter(c => (c.cant_falla || 0) > 0 && !c.devuelto_taller)
    const hasFalla = mFallas.length > 0

    if (mItems.length > 0) {
      const byProd = {}
      for (const it of mItems) {
        const pid = it.producto_id
        if (!byProd[pid]) byProd[pid] = { nombre: it.productos?.nombre || '?', codigo: it.productos?.codigo || null, items: [], total: 0, loteId: it.lote_id || null, precioUnit: it.precio_unit ?? it.productos?.costo_confeccion ?? null }
        byProd[pid].items.push(it)
        byProd[pid].total += it.cantidad || 0
      }
      for (const [pid, pd] of Object.entries(byProd)) {
        balance[pid] = (balance[pid] || 0) + cfg.sign * pd.total
        const prodFallas = mFallas.filter(f => f.producto_id === Number(pid))

        if (m.tipo === 'recepcion' && prodFallas.length > 0) {
          // Split: fila RECIBIDO (ok) + fila FALLA
          const fallaTotal = prodFallas.reduce((s, f) => s + (f.cant_falla || 0), 0)
          const okTotal = pd.total - fallaTotal
          const okItems = [], fallaItemsDisplay = []
          for (const it of pd.items) {
            const ctrl = prodFallas.find(f => f.talle === it.talle)
            const okQty = ctrl ? (ctrl.cant_ok || 0) : it.cantidad
            const fallaQty = ctrl ? (ctrl.cant_falla || 0) : 0
            if (okQty > 0) okItems.push({ ...it, cantidad: okQty })
            if (fallaQty > 0) fallaItemsDisplay.push({ ...it, cantidad: fallaQty, id: `falla-${it.id}` })
          }
          if (okTotal > 0) {
            rows.push({
              key: `${m.id}-${pid}-ok`, movId: m.id, mov: m, pid: Number(pid),
              fecha: m.fecha, cfg,
              prodNombre: pd.nombre, prodCodigo: pd.codigo, items: okItems, total: okTotal,
              enManos: Math.max(0, balance[pid] || 0),
              fallas: [], monto: null, nota: m.nota, loteId: pd.loteId,
              precioUnit: pd.precioUnit ?? null,
              subtotal: pd.precioUnit != null ? okTotal * pd.precioUnit : null,
            })
          }
          if (fallaTotal > 0) {
            const cfgFalla = { label: 'FALLA', border: '#b03030', bg: '#fff0ee', sign: 0 }
            rows.push({
              key: `${m.id}-${pid}-falla`, movId: m.id, mov: m, pid: Number(pid),
              fecha: m.fecha, cfg: cfgFalla,
              prodNombre: pd.nombre, prodCodigo: pd.codigo, items: fallaItemsDisplay, total: fallaTotal,
              enManos: null,
              fallas: prodFallas, monto: null, nota: m.nota, loteId: pd.loteId,
              precioUnit: null, subtotal: null,
            })
          }
        } else {
          rows.push({
            key: `${m.id}-${pid}`, movId: m.id, mov: m, pid: Number(pid),
            fecha: m.fecha, cfg,
            prodNombre: pd.nombre, prodCodigo: pd.codigo, items: pd.items, total: pd.total,
            enManos: Math.max(0, balance[pid] || 0),
            fallas: prodFallas, monto: null, nota: m.nota, loteId: pd.loteId,
            precioUnit: pd.precioUnit ?? null,
            subtotal: pd.precioUnit != null ? pd.total * pd.precioUnit : null,
          })
        }
      }
    } else {
      rows.push({
        key: m.id, movId: m.id, mov: m, pid: null,
        fecha: m.fecha, cfg,
        prodNombre: null, items: [], total: null,
        enManos: null, fallas: [], monto: m.monto, nota: m.nota, loteId: m.lote_id || null,
      })
    }
  }

  const totalEnManos = Object.values(balance).reduce((s, v) => s + Math.max(0, v), 0)

  // Vista por producto: agrupar filas con pid
  const prodRowsOnly = rows.filter(r => r.pid != null)
  const pagoRows     = rows.filter(r => r.pid == null)
  const prodMap = {}
  for (const r of prodRowsOnly) {
    if (!prodMap[r.pid]) prodMap[r.pid] = { nombre: r.prodNombre, pid: r.pid, rows: [] }
    prodMap[r.pid].rows.push(r)
  }
  const prodGroups = Object.values(prodMap).sort((a, b) => a.nombre.localeCompare(b.nombre))

  // Subcomponente reutilizable: tabla de talles expandida
  function TalleDetalle({ row }) {
    return (
      <div style={{ padding: '0 12px 10px 20px' }}>
        {row.nota && <div style={{ fontSize: 12, color: '#444', fontStyle: 'italic', padding: '4px 0' }}>📝 {row.nota}</div>}
        <table style={{ borderCollapse: 'collapse', fontSize: 13, marginTop: 4 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #b8b8b0', padding: '3px 10px', background: '#dcdcd4', fontWeight: 700, textAlign: 'center', color: '#111' }}>Talle</th>
              <th style={{ border: '1px solid #b8b8b0', padding: '3px 10px', background: '#dcdcd4', fontWeight: 700, textAlign: 'center', color: '#111' }}>Cant.</th>
              {row.fallas.length > 0 && <th style={{ border: '1px solid #b8b8b0', padding: '3px 10px', background: '#f0d8d8', fontWeight: 700, textAlign: 'center', color: '#111' }}>⚠ Falla</th>}
            </tr>
          </thead>
          <tbody>
            {[...row.items].sort((a, b) => cmpTalle(a.talle, b.talle)).map(it => {
              const falla = row.fallas.find(f => f.talle === it.talle)
              return (
                <tr key={it.id} style={{ background: falla ? '#fdeaea' : 'transparent' }}>
                  <td style={{ border: '1px solid #c8c8c0', padding: '3px 10px', textAlign: 'center', fontWeight: 700, color: '#111' }}>{it.talle}</td>
                  <td style={{ border: '1px solid #c8c8c0', padding: '3px 10px', textAlign: 'center', color: '#111' }}>{it.cantidad}</td>
                  {row.fallas.length > 0 && <td style={{ border: '1px solid #c8c8c0', padding: '3px 10px', textAlign: 'center', color: '#b03030', fontWeight: 700 }}>{falla ? falla.cant_falla : '—'}</td>}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ border: '1px solid #b8b8b0', padding: '3px 10px', background: '#dcdcd4', fontWeight: 700, textAlign: 'right', color: '#111' }}>Subtotal</td>
              <td style={{ border: '1px solid #b8b8b0', padding: '3px 10px', background: '#dcdcd4', fontWeight: 700, textAlign: 'center', color: '#111' }}>{row.total}</td>
              {row.fallas.length > 0 && <td style={{ border: '1px solid #b8b8b0', padding: '3px 10px', background: '#f0d8d8', fontWeight: 700, textAlign: 'center', color: '#b03030' }}>{row.fallas.reduce((s, f) => s + (f.cant_falla || 0), 0)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  function AccionesFila({ row }) {
    return (
      <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
        {row.mov.tipo === 'envio' && !sortedAsc.some(r => r.tipo === 'recepcion' && r.fecha >= row.mov.fecha) && (
          <button style={{ ...S.btn, fontSize: 10, padding: '1px 6px' }} onClick={() => onRecibir(row.mov)}>Recibir</button>
        )}
        {row.mov.tipo === 'envio' && onRepetir && (
          <button style={{ ...S.btn, fontSize: 10, padding: '1px 6px' }} title="Repetir" onClick={() => onRepetir(row.mov)}>🔁</button>
        )}
        <button style={{ ...S.btn, fontSize: 10, padding: '1px 6px' }} onClick={() => onEdit(row.mov)}>✏️</button>
      </div>
    )
  }

  const thBase = { padding: '5px 8px', fontWeight: 700, borderBottom: '2px solid #a8a8a0', color: '#111', fontSize: 12, background: '#dcdcd4', userSelect: 'none' }

  // Saldo acumulado por fila (de más viejo a más nuevo)
  let _saldoAcum = 0
  const saldoMap = {}
  for (const row of rows) {
    if (row.mov.tipo === 'recepcion' && row.subtotal != null) _saldoAcum += row.subtotal
    else if (row.mov.tipo === 'pago' && row.mov.monto != null) _saldoAcum -= row.mov.monto
    saldoMap[row.key] = _saldoAcum
  }

  // Última fecha de movimiento para mostrar en header
  const ultimaFecha = rows.length > 0 ? rows[rows.length - 1].fecha : null

  function LoteBadge({ loteId, clickable }) {
    if (!loteId) return null
    const bg = loteColor(loteId)
    const short = loteId.startsWith('LOT-') ? loteId.slice(-6) : loteId
    return (
      <span
        onClick={clickable ? (e) => { e.stopPropagation(); setSelectedLote(loteId) } : undefined}
        style={{ display: 'inline-block', marginLeft: 4, fontSize: 11, fontFamily: "'Courier New', Courier, monospace", letterSpacing: '0.04em', fontWeight: 700, background: bg, color: '#1a1a1a', padding: '2px 7px', borderRadius: 4, border: `1px solid rgba(0,0,0,0.18)`, whiteSpace: 'nowrap', cursor: clickable ? 'pointer' : 'default', lineHeight: '1.4', verticalAlign: 'middle' }}
        title={clickable ? `Lote ${loteId}` : loteId}>
        {short}
      </span>
    )
  }

  // ── Detalle de lote ─────────────────────────────────────────────────────────
  if (selectedLote) {
    const loteShort = selectedLote.slice(-6)
    const loteBg = loteColor(selectedLote)

    // Nombre del producto del lote
    let prodNombreLote = null
    for (const m of movs) {
      const it = (m.taller_movimientos_items || []).find(i => i.lote_id === selectedLote)
      if (it?.productos?.nombre) { prodNombreLote = it.productos.nombre; break }
    }

    // Movimientos con items de este lote
    const loteMov = movs.filter(m =>
      (m.taller_movimientos_items || []).some(it => it.lote_id === selectedLote)
    )
    const recIds = loteMov.filter(m => m.tipo === 'recepcion').map(m => m.id)
    const entregasLote = recIds.flatMap(rid => entregasMap[rid] || [])

    // Construir eventos (movimientos + entregas + controles sintéticos)
    const allEvents = []
    for (const m of loteMov) {
      const items = (m.taller_movimientos_items || []).filter(it => it.lote_id === selectedLote)
      const total = items.reduce((s, it) => s + (it.cantidad || 0), 0)
      const ctrlAll = controlMap[m.id] || []
      const loteItemTalles = new Set(items.map(it => it.talle))
      const ctrlFalla = ctrlAll.filter(c => c.cant_falla > 0 && loteItemTalles.has(c.talle))
      const fallaCount = ctrlFalla.reduce((s, c) => s + (c.cant_falla || 0), 0)
      const okCount = total - fallaCount
      const precioUnit = items[0]?.precio_unit != null ? items[0].precio_unit
        : items[0]?.productos?.costo_confeccion != null ? Number(items[0].productos.costo_confeccion) : null
      allEvents.push({ kind: 'mov', m, items, total, ctrl: ctrlFalla, fallaCount, okCount, precioUnit, isEntrega: false, debe: null, haber: null })
      // fila CONTROL sintética para recepciones con fallas ya controladas
      if (m.tipo === 'recepcion' && fallaCount > 0 && precioUnit != null) {
        allEvents.push({ kind: 'control', m, items, total: fallaCount, ctrl: ctrlFalla, fallaCount, okCount, precioUnit, isEntrega: false, debe: null, haber: null })
      }
    }
    for (const e of entregasLote) {
      const items = e.taller_movimientos_items || []
      const total = items.reduce((s, it) => s + (it.cantidad || 0), 0)
      allEvents.push({ kind: 'mov', m: e, items, total, ctrl: [], fallaCount: 0, okCount: total, precioUnit: null, isEntrega: true, debe: null, haber: null })
    }

    // Ordenar más viejo primero; CONTROL siempre después de su RECIBIDO del mismo día
    allEvents.sort((a, b) => {
      const dd = a.m.fecha < b.m.fecha ? -1 : a.m.fecha > b.m.fecha ? 1 : 0
      if (dd !== 0) return dd
      return (a.kind === 'control' ? 1 : 0) - (b.kind === 'control' ? 1 : 0)
    })
    // enviado por talle (para sub-rows)
    const envioEv = allEvents.find(ev => !ev.isEntrega && ev.m.tipo === 'envio')
    const talleEnviado = {}
    for (const it of (envioEv?.items || [])) {
      talleEnviado[it.talle] = (talleEnviado[it.talle] || 0) + it.cantidad
    }
    const totalEnviado = Object.values(talleEnviado).reduce((s, v) => s + v, 0)

    let stStock = 0, stTaller = 0, stFalla = 0, stCliente = 0, stSaldo = 0
    for (const ev of allEvents) {
      ev.dStock = 0; ev.dTaller = 0; ev.dFalla = 0; ev.dCliente = 0
      if (ev.kind === 'control') {
        // solo monetario; las unidades se mueven: fallas salen de stock, van a falla
        ev.haber = ev.fallaCount * ev.precioUnit
        stSaldo -= ev.haber
        ev.dStock = -ev.fallaCount; ev.dFalla = ev.fallaCount
        stStock += ev.dStock; stFalla += ev.dFalla
      } else if (ev.isEntrega) {
        ev.dStock = -ev.total; ev.dCliente = ev.total
        stStock += ev.dStock; stCliente += ev.dCliente
      } else if (ev.m.tipo === 'envio') {
        ev.dTaller = ev.total
        stTaller += ev.dTaller
      } else if (ev.m.tipo === 'recepcion') {
        // RECIBIDO: todo va a stock, taller baja; fallas se separan recién en CONTROL
        ev.dTaller = -ev.total; ev.dStock = ev.total
        stTaller += ev.dTaller; stStock += ev.dStock
        ev.debe = ev.precioUnit != null ? ev.total * ev.precioUnit : null
        if (ev.debe != null) stSaldo += ev.debe
      } else if (ev.m.tipo === 'devolucion') {
        ev.dTaller = ev.total; ev.dFalla = -ev.total
        stTaller += ev.dTaller; stFalla += ev.dFalla
      } else if (ev.m.tipo === 'pago') {
        ev.haber = ev.m.monto
        if (ev.m.monto != null) stSaldo -= ev.m.monto
      }
      ev.stock = stStock; ev.taller = stTaller; ev.falla = stFalla; ev.cliente = stCliente; ev.saldo = stSaldo
    }
    const thL2 = { ...thBase, textAlign: 'left', whiteSpace: 'nowrap' }
    const thR2 = { ...thBase, textAlign: 'right', whiteSpace: 'nowrap' }
    const thC2 = { ...thBase, textAlign: 'center', whiteSpace: 'nowrap' }
    const LCFG = {
      envio:     { label: 'ENVIADO',       border: '#4a6a9a' },
      recepcion: { label: 'RECIBIDO',      border: '#2d7a3a' },
      devolucion:{ label: 'REENVIADO',     border: '#b06010' },
      pago:      { label: 'PAGO',          border: '#5a3a8a' },
    }

    return (
      <>
      <div style={{ background: '#f8f8f4', marginBottom: 12, border: '1px solid #c8c8c0' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(to bottom,#3a4a5a,#1e2e3e)', color: '#fff', padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setSelectedLote(null)}
            style={{ fontFamily: F, fontSize: 11, padding: '2px 8px', cursor: 'pointer', border: '1px solid #7a9aba', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 2 }}>
            ← Volver
          </button>
          <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, background: loteBg, color: '#222', padding: '2px 7px', borderRadius: 3 }}>{loteShort}</span>
          {prodNombreLote && <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{prodNombreLote}</span>}
          <button onClick={() => setEntregandoLote(true)}
            style={{ fontFamily: F, fontSize: 11, padding: '2px 8px', cursor: 'pointer', border: '1px solid #7a5a00', background: 'rgba(122,58,0,0.55)', color: '#ffd080', borderRadius: 2, marginLeft: 'auto' }}>
            🛍️ Entregar
          </button>
        </div>

        {/* Resumen */}
        {(() => {
          const lastEv = allEvents.length > 0 ? allEvents[allEvents.length - 1] : null
          const fStock = lastEv?.stock ?? 0
          const fFalla = lastEv?.falla ?? 0
          const fTaller = lastEv?.taller ?? totalEnviado
          const fCliente = lastEv?.cliente ?? 0
          const fSaldo = lastEv?.saldo ?? 0
          return (
            <div style={{ display: 'flex', borderBottom: '2px solid #c8c8c0' }}>
              {[
                { label: 'TOTAL',   val: totalEnviado, color: '#4a6a9a' },
                { label: 'STOCK',   val: fStock,       color: '#2d7a3a' },
                { label: 'FALLA',   val: fFalla,       color: '#b03030' },
                { label: 'TALLER',  val: fTaller,      color: '#1a3a6b' },
                { label: 'CLIENTE', val: fCliente,     color: '#1a6a1a' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ flex: 1, padding: '8px 10px', borderRight: '1px solid #d8d8d0', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#666', fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color }}>{val}u</div>
                </div>
              ))}
              <div style={{ flex: 1, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#666', fontWeight: 700 }}>SALDO $</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: fSaldo > 0 ? '#8a3a3a' : '#1a6a1a' }}>
                  {fmtMoneda(Math.abs(fSaldo))} {fSaldo > 0 ? 'D' : 'H'}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Matriz por talle */}
        {(() => {
          const mEnv = {}, mRec = {}, mOk = {}, mFalla = {}, mReenv = {}
          for (const ev of allEvents) {
            if (ev.kind === 'control') {
              // fallas contabilizadas desde la fila CONTROL sintética, no desde RECIBIDO
              for (const c of ev.ctrl) mFalla[c.talle] = (mFalla[c.talle] || 0) + (c.cant_falla || 0)
              continue
            }
            if (ev.m.tipo === 'envio') {
              for (const it of ev.items) mEnv[it.talle] = (mEnv[it.talle] || 0) + (it.cantidad || 0)
            } else if (ev.m.tipo === 'recepcion') {
              for (const it of ev.items) {
                mRec[it.talle] = (mRec[it.talle] || 0) + (it.cantidad || 0)
                if (ev.ctrl.length > 0) {
                  // recepcion controlada: ok = recibido − falla para este talle
                  const c = ev.ctrl.find(ci => ci.talle === it.talle)
                  const falla = c ? (c.cant_falla || 0) : 0
                  mOk[it.talle] = (mOk[it.talle] || 0) + Math.max(0, (it.cantidad || 0) - falla)
                }
                // sin control: queda en SIN CONTROLAR = mRec - mOk - mFalla
              }
            } else if (ev.m.tipo === 'devolucion') {
              for (const it of ev.items) mReenv[it.talle] = (mReenv[it.talle] || 0) + (it.cantidad || 0)
            }
          }
          const talles = [...new Set([...Object.keys(mEnv), ...Object.keys(mRec), ...Object.keys(mReenv)])].sort(cmpTalle)
          if (talles.length === 0) return null
          const g = (obj, t) => obj[t] || 0
          const s = (obj) => talles.reduce((a, t) => a + g(obj, t), 0)
          const hasSC = talles.some(t => g(mRec, t) - g(mOk, t) - g(mFalla, t) > 0)
          const thM = { ...thBase, textAlign: 'center', whiteSpace: 'nowrap', fontSize: 11 }
          const tdM = { padding: '3px 8px', borderBottom: '1px solid #ececec', textAlign: 'center', fontSize: 12, fontWeight: 700 }
          const tdML = { padding: '3px 8px', borderBottom: '1px solid #ececec', textAlign: 'left', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }
          const rows = [
            { key: 'env',  label: 'ENVIADO',       get: t => g(mEnv, t),   total: () => s(mEnv) },
            { key: 'rec',  label: 'RECIBIDO',       get: t => g(mRec, t),   total: () => s(mRec) },
            { key: 'ok',   label: 'OK',             get: t => g(mOk, t),    total: () => s(mOk),   indent: true },
            { key: 'fal',  label: 'FALLA',          get: t => g(mFalla, t), total: () => s(mFalla), indent: true, isFalla: true },
            ...(hasSC ? [{ key: 'sc', label: 'SIN CONTROLAR', get: t => g(mRec,t)-g(mOk,t)-g(mFalla,t), total: () => s(mRec)-s(mOk)-s(mFalla), indent: true, isSC: true }] : []),
            { key: 'reenv',label: 'REENVIADO',      get: t => g(mReenv, t), total: () => s(mReenv) },
            { key: 'tal',  label: 'EN TALLER',      get: t => g(mEnv,t)+g(mReenv,t)-g(mRec,t), total: () => s(mEnv)+s(mReenv)-s(mRec), bold: true },
          ]
          const cColor = (row, val) => {
            if (row.isSC) return '#888'
            if (row.isFalla && val > 0) return '#b03030'
            if (val === 0) return '#aaa'
            return '#333'
          }
          return (
            <div style={{ overflowX: 'auto', borderBottom: '2px solid #c8c8c0' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ ...thM, textAlign: 'left', minWidth: 110 }}></th>
                    {talles.map(t => <th key={t} style={thM}>{t}</th>)}
                    <th style={{ ...thM, borderLeft: '1px solid #d8d8d0' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const tot = row.total()
                    return (
                      <tr key={row.key} style={{ background: row.indent ? '#f4f4f0' : 'transparent' }}>
                        <td style={{ ...tdML, color: row.isSC ? '#888' : '#333', fontWeight: row.bold ? 700 : 400, paddingLeft: row.indent ? 22 : 8 }}>{row.label}</td>
                        {talles.map(t => { const v = row.get(t); return <td key={t} style={{ ...tdM, color: cColor(row, v), fontWeight: row.bold ? 700 : 400 }}>{v}</td> })}
                        <td style={{ ...tdM, color: cColor(row, tot), fontWeight: row.bold ? 700 : 400, borderLeft: '1px solid #e0e0d8' }}>{tot}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })()}

        {/* Tabla */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: 'right', color: '#aaa', width: 24 }}>#</th>
                <th style={thL2}>Fecha</th>
                <th style={thL2}>Movimiento</th>
                <th style={{ ...thC2, color: '#4a6a9a' }}>Total</th>
                <th style={{ ...thC2, color: '#2d7a3a' }}>Stock</th>
                <th style={{ ...thC2, color: '#b03030' }}>Falla</th>
                <th style={{ ...thC2, color: '#1a3a6b' }}>Taller</th>
                <th style={{ ...thC2, color: '#1a6a1a' }}>Cliente</th>
                <th style={{ ...thR2, color: '#6a4a00' }}>P/u</th>
                <th style={{ ...thR2, color: '#8a3a3a' }}>Debe</th>
                <th style={{ ...thR2, color: '#1a6a1a' }}>Haber</th>
                <th style={thR2}>Saldo</th>
                <th style={thBase}></th>
              </tr>
            </thead>
            <tbody>
              {[...allEvents].reverse().map((ev, i) => {
                const tdS = { padding: '3px 6px', borderBottom: '1px solid #ececec', background: '#f4f4f0' }
                // ── fila CONTROL sintética ──────────────────────────────────
                if (ev.kind === 'control') {
                  const ctrlRowKey = `ctrl-${ev.m.id}`
                  const isCtrlOpen = !!openRows[ctrlRowKey]
                  const showSaldo = ev.haber != null
                  return (
                    <React.Fragment key={ctrlRowKey}>
                      <tr onClick={() => ev.ctrl.length > 0 && toggleRow(ctrlRowKey)}
                        style={{ borderLeft: '4px solid #2d7a3a', borderBottom: '1px solid #e0e0d8', cursor: ev.ctrl.length > 0 ? 'pointer' : 'default', background: isCtrlOpen ? '#f0f0e8' : 'transparent' }}>
                        <td style={{ padding: '4px 6px' }}></td>
                        <td style={{ padding: '4px 6px', whiteSpace: 'nowrap', color: '#444' }}>{fmtF(ev.m.fecha)}</td>
                        <td style={{ padding: '4px 6px' }}>
                          <span style={{ fontWeight: 700, color: '#2d7a3a' }}>CONTROL</span>
                          <span style={{ marginLeft: 8, color: '#888', fontSize: 11 }}>
                            {ev.fallaCount}u falla × {fmtMoneda(ev.precioUnit)}
                          </span>
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: '#4a6a9a' }}>{`${ev.fallaCount}u`}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: '#2d7a3a' }}>{`−${ev.fallaCount}u`}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: '#b03030' }}>{`+${ev.fallaCount}u`}</td>
                        <td style={{ padding: '4px 6px' }}></td>
                        <td style={{ padding: '4px 6px' }}></td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', color: '#9a7a30', fontSize: 10 }}>{fmtMoneda(ev.precioUnit)}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right' }}></td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: '#1a6a1a' }}>{fmtMoneda(ev.haber)}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: ev.saldo > 0 ? '#8a3a3a' : '#1a6a1a' }}>
                          {showSaldo ? `${fmtMoneda(Math.abs(ev.saldo))} ${ev.saldo > 0 ? 'D' : 'H'}` : ''}
                        </td>
                        <td></td>
                      </tr>
                      {isCtrlOpen && [...ev.ctrl].sort((a, b) => cmpTalle(a.talle, b.talle)).map(c => (
                        <tr key={c.talle} style={{ background: '#f4f4f0' }}>
                          <td style={tdS} /><td style={tdS} />
                          <td style={{ ...tdS, fontWeight: 700, color: '#b03030', paddingLeft: 20 }}>{c.talle}</td>
                          <td style={tdS} />
                          <td style={tdS} />
                          <td style={{ ...tdS, textAlign: 'center', fontWeight: 700, color: '#b03030' }}>{c.cant_falla}u</td>
                          <td style={tdS} /><td style={tdS} /><td style={tdS} /><td style={tdS} /><td style={tdS} /><td style={tdS} /><td style={tdS} />
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                }
                // ── filas normales ──────────────────────────────────────────
                const tipoCfg = ev.isEntrega
                  ? { label: 'ENTREGADO', border: '#1a6a1a' }
                  : (LCFG[ev.m.tipo] || { label: ev.m.tipo?.toUpperCase(), border: '#777' })
                const rowKey = `lote-${ev.m.id}-${i}`
                const isOpen = !!openRows[rowKey]
                const hasTalles = ev.items.length > 0
                const showSaldo = ev.debe != null || ev.haber != null
                return (
                  <React.Fragment key={rowKey}>
                    <tr onClick={() => hasTalles && toggleRow(rowKey)}
                      style={{ borderLeft: `4px solid ${tipoCfg.border}`, borderBottom: '1px solid #e0e0d8', cursor: hasTalles ? 'pointer' : 'default', background: isOpen ? '#f0f0e8' : 'transparent' }}>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: '#bbb', fontSize: 10, userSelect: 'none' }}>{allEvents.length - i}</td>
                      <td style={{ padding: '4px 6px', whiteSpace: 'nowrap', color: '#444' }}>{fmtF(ev.m.fecha)}</td>
                      <td style={{ padding: '4px 6px' }}>
                        <span style={{ fontWeight: 700, color: tipoCfg.border }}>
                          {tipoCfg.label}
                          {ev.isEntrega && ev.m.contactos?.nombre && <span style={{ marginLeft: 6, color: '#555', fontWeight: 400 }}>{ev.m.contactos.nombre}</span>}
                        </span>
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: '#4a6a9a' }}>{`${ev.total}u`}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: '#2d7a3a' }}>{ev.dStock !== 0 ? `${ev.dStock > 0 ? '+' : ''}${ev.dStock}u` : ''}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: '#b03030' }}>{ev.dFalla !== 0 ? `${ev.dFalla > 0 ? '+' : ''}${ev.dFalla}u` : ''}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: '#1a3a6b' }}>{ev.dTaller !== 0 ? `${ev.dTaller > 0 ? '+' : ''}${ev.dTaller}u` : ''}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: '#1a6a1a' }}>{ev.dCliente !== 0 ? `${ev.dCliente > 0 ? '+' : ''}${ev.dCliente}u` : ''}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: '#9a7a30', fontSize: 10 }}>
                        {ev.m.tipo === 'recepcion' && ev.precioUnit != null ? fmtMoneda(ev.precioUnit) : ''}
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: '#8a3a3a' }}>{ev.debe != null ? fmtMoneda(ev.debe) : ''}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: '#1a6a1a' }}>{ev.haber != null ? fmtMoneda(ev.haber) : ''}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: ev.saldo > 0 ? '#8a3a3a' : '#1a6a1a' }}>
                        {showSaldo ? `${fmtMoneda(Math.abs(ev.saldo))} ${ev.saldo > 0 ? 'D' : 'H'}` : ''}
                      </td>
                      <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                        {!ev.isEntrega && <AccionesFila row={{ mov: { ...ev.m, taller_movimientos_items: ev.items }, cfg: tipoCfg, fallas: ev.ctrl, items: ev.items, enManos: 0 }} />}
                        {ev.m.tipo === 'recepcion' && (() => {
                          const yaControlado = (controlMap[ev.m.id] || []).length > 0
                          return yaControlado
                            ? <span style={{ fontSize: 10, color: '#4a7a3a', marginLeft: 4 }}>✓</span>
                            : <button onClick={() => setControlando({ movId: ev.m.id, items: ev.items, tallerNombre: nombre })}
                                style={{ fontFamily: F, fontSize: 10, background: 'linear-gradient(to bottom,#e8f4e0,#d0e8c0)', border: '1px solid #7aaa50', padding: '1px 6px', cursor: 'pointer', marginLeft: 4, whiteSpace: 'nowrap' }}>
                                🔍 Controlar
                              </button>
                        })()}
                      </td>
                    </tr>
                    {isOpen && hasTalles && (() => {
                      const sortedItems = [...ev.items].sort((a, b) => cmpTalle(a.talle, b.talle))
                      if (ev.m.tipo === 'recepcion') {
                        const itemMap = Object.fromEntries(ev.items.map(i => [i.talle, i]))
                        const allTalles = Object.keys(talleEnviado).sort(cmpTalle)
                        const totalRecibido = ev.items.reduce((s, i) => s + (i.cantidad || 0), 0)
                        const totalDebe = ev.items.reduce((s, i) => s + (i.precio_unit != null ? i.cantidad * i.precio_unit : 0), 0)
                        const itemRows = allTalles.map(talle => {
                          const it = itemMap[talle]
                          const recibido = it?.cantidad || 0
                          const itPrecio = it?.precio_unit ?? null
                          const itDebe = itPrecio != null && recibido > 0 ? recibido * itPrecio : null
                          const isEditingItem = it && editPrecio?.itemId === it.id
                          const saveItemPrecio = async () => {
                            const val = parseFloat(editPrecio.value)
                            if (!isNaN(val) && it) {
                              await supabase.from('taller_movimientos_items').update({ precio_unit: val }).eq('id', it.id)
                              onEnviarFalla()
                            }
                            setEditPrecio(null)
                          }
                          return (
                            <tr key={talle} style={{ background: recibido > 0 ? '#f4f4f0' : '#f9f9f6' }}>
                              <td style={tdS} /><td style={tdS} />
                              <td style={{ ...tdS, fontWeight: 700, color: recibido > 0 ? '#333' : '#aaa', paddingLeft: 20 }}>{talle}</td>
                              <td style={{ ...tdS, textAlign: 'center', color: '#4a6a9a', fontWeight: 700 }}>{recibido > 0 ? recibido : '—'}</td>
                              <td style={tdS} /><td style={tdS} />
                              <td style={{ ...tdS, textAlign: 'center', color: '#1a3a6b', fontWeight: 700 }}>{recibido > 0 ? `−${recibido}` : ''}</td>
                              <td style={tdS} />
                              <td style={{ ...tdS, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                {it && (isEditingItem ? (
                                  <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
                                    <span style={{ color: '#6a4a00', fontSize: 10 }}>$</span>
                                    <input autoFocus type="number" value={editPrecio.value}
                                      onChange={e => setEditPrecio(p => ({ ...p, value: e.target.value }))}
                                      onBlur={saveItemPrecio}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') { e.preventDefault(); saveItemPrecio() }
                                        else if (e.key === 'Escape') { e.preventDefault(); setEditPrecio(null) }
                                      }}
                                      style={{ ...S.inpC, width: 50, fontSize: 11 }} />
                                    <button onMouseDown={e => { e.preventDefault(); saveItemPrecio() }}
                                      style={{ fontFamily: F, fontSize: 11, background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 2, padding: '1px 4px', cursor: 'pointer' }}>✓</button>
                                    <button onMouseDown={e => { e.preventDefault(); setEditPrecio(null) }}
                                      style={{ fontFamily: F, fontSize: 11, background: '#aaa', color: '#fff', border: 'none', borderRadius: 2, padding: '1px 4px', cursor: 'pointer' }}>✕</button>
                                  </span>
                                ) : (
                                  <span onClick={() => setEditPrecio({ itemId: it.id, value: itPrecio ?? '' })}
                                    style={{ cursor: 'pointer', color: itPrecio != null ? '#6a4a00' : '#bbb', fontWeight: itPrecio != null ? 700 : 400, borderBottom: '1px dashed #c0a060' }}
                                    title="Tocar para editar precio/u">
                                    {itPrecio != null ? fmtMoneda(itPrecio) : '—'}
                                  </span>
                                ))}
                              </td>
                              <td style={{ ...tdS, textAlign: 'right', color: '#8a3a3a', fontWeight: 700 }}>{itDebe != null ? fmtMoneda(itDebe) : ''}</td>
                              <td style={tdS} /><td style={tdS} /><td style={tdS} />
                            </tr>
                          )
                        })
                        return [
                          ...itemRows,
                          <tr key={`tot-${ev.m.id}`} style={{ background: '#e8e8e0', borderTop: '2px solid #c8c8b8' }}>
                            <td style={tdS} /><td style={tdS} />
                            <td style={{ ...tdS, fontWeight: 700, color: '#555', paddingLeft: 20 }}>Total</td>
                            <td style={{ ...tdS, textAlign: 'center', color: '#4a6a9a', fontWeight: 700 }}>{totalRecibido}u</td>
                            <td style={tdS} /><td style={tdS} /><td style={tdS} /><td style={tdS} />
                            <td style={tdS} />
                            <td style={{ ...tdS, textAlign: 'right', color: '#8a3a3a', fontWeight: 700 }}>{totalDebe > 0 ? fmtMoneda(totalDebe) : ''}</td>
                            <td style={tdS} /><td style={tdS} /><td style={tdS} />
                          </tr>
                        ]
                      }
                      return sortedItems.map(it => {
                        const fallaCtrl = ev.ctrl.find(c => c.talle === it.talle)
                        const cantFalla = fallaCtrl?.cant_falla || 0
                        const cantOk = it.cantidad
                        const cantEnviado = talleEnviado[it.talle] ?? '?'
                        const itPrecio = it.precio_unit ?? null
                        const itDebe = itPrecio != null && ev.m.tipo === 'envio' ? cantOk * itPrecio : null
                        const isEditingItem = editPrecio?.itemId === it.id
                        const saveItemPrecio = async () => {
                          const val = parseFloat(editPrecio.value)
                          if (!isNaN(val)) {
                            await supabase.from('taller_movimientos_items').update({ precio_unit: val }).eq('id', it.id)
                            onEnviarFalla()
                          }
                          setEditPrecio(null)
                        }
                        return (
                          <tr key={it.id} style={{ background: cantFalla > 0 ? '#fdf4f0' : '#f4f4f0' }}>
                            <td style={tdS}></td><td style={tdS}></td>
                            <td style={{ ...tdS, fontWeight: 700, color: '#333', paddingLeft: 20 }}>{it.talle}</td>
                            <td style={tdS}></td>
                            <td style={tdS}></td>
                            <td style={{ ...tdS, textAlign: 'center', color: '#b03030', fontWeight: 700 }}>{cantFalla > 0 ? cantFalla : '—'}</td>
                            <td style={{ ...tdS, textAlign: 'center', color: '#1a3a6b', fontWeight: 700 }}>{!ev.isEntrega && cantOk > 0 ? cantOk : '—'}</td>
                            <td style={{ ...tdS, textAlign: 'center', color: '#1a6a1a', fontWeight: 700 }}>{ev.isEntrega && cantOk > 0 ? cantOk : '—'}</td>
                            <td style={{ ...tdS, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                              {ev.m.tipo === 'envio' && (isEditingItem ? (
                                <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
                                  <span style={{ color: '#6a4a00', fontSize: 10 }}>$</span>
                                  <input autoFocus type="number" value={editPrecio.value}
                                    onChange={e => setEditPrecio(p => ({ ...p, value: e.target.value }))}
                                    onBlur={saveItemPrecio}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') { e.preventDefault(); saveItemPrecio() }
                                      else if (e.key === 'Escape') { e.preventDefault(); setEditPrecio(null) }
                                    }}
                                    style={{ ...S.inpC, width: 50, fontSize: 11 }} />
                                  <button onMouseDown={e => { e.preventDefault(); saveItemPrecio() }}
                                    style={{ fontFamily: F, fontSize: 11, background: '#2d7a3a', color: '#fff', border: 'none', borderRadius: 2, padding: '1px 4px', cursor: 'pointer' }}>✓</button>
                                  <button onMouseDown={e => { e.preventDefault(); setEditPrecio(null) }}
                                    style={{ fontFamily: F, fontSize: 11, background: '#aaa', color: '#fff', border: 'none', borderRadius: 2, padding: '1px 4px', cursor: 'pointer' }}>✕</button>
                                </span>
                              ) : (
                                <span onClick={() => setEditPrecio({ itemId: it.id, value: itPrecio ?? '' })}
                                  style={{ cursor: 'pointer', color: itPrecio != null ? '#6a4a00' : '#bbb', fontWeight: itPrecio != null ? 700 : 400, borderBottom: '1px dashed #c0a060' }}
                                  title="Tocar para editar precio/u">
                                  {itPrecio != null ? fmtMoneda(itPrecio) : '—'}
                                </span>
                              ))}
                            </td>
                            <td style={{ ...tdS, textAlign: 'right', color: '#8a3a3a', fontWeight: 700 }}>{itDebe != null ? fmtMoneda(itDebe) : ''}</td>
                            <td style={tdS}></td><td style={tdS}></td><td style={tdS}></td>
                          </tr>
                        )
                      })
                    })()}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        {allEvents.length === 0 && <div style={{ padding: 16, color: '#888', fontSize: 13 }}>Sin movimientos en este lote.</div>}
      </div>
      {controlando && (
        <ModalControl
          movId={controlando.movId}
          items={controlando.items}
          tallerNombre={controlando.tallerNombre}
          onClose={() => setControlando(null)}
          onSave={() => { setControlando(null); onEnviarFalla() }}
        />
      )}
      {entregandoLote && (
        <ModalEntregarDesdeLote
          allEvents={allEvents}
          entregasLote={entregasLote}
          prodNombreLote={prodNombreLote}
          onClose={() => setEntregandoLote(false)}
          onSave={() => { setEntregandoLote(false); onEnviarFalla() }}
        />
      )}
    </>
    )
  }

  return (
    <>
    <div style={{ background: '#f8f8f4', marginBottom: 12, border: '1px solid #c8c8c0' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(to bottom,#3a4a5a,#1e2e3e)', color: '#fff', padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>📋 Movimientos</span>
          {ultimaFecha && <span style={{ fontSize: 11, color: '#bbb' }}>último: {fmtF(ultimaFecha)}</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {totalEnManos > 0 && <span style={{ fontSize: 11, color: '#ffd080', fontWeight: 700 }}>📤 {totalEnManos} en taller</span>}
          {debe > 0 && <span style={{ fontSize: 11, color: '#ffb0a0' }}>DEBE {fmtMoneda(debe)}</span>}
          {haber > 0 && <span style={{ fontSize: 11, color: '#90f090' }}>HABER {fmtMoneda(haber)}</span>}
          {tieneSaldo && <span style={{ fontSize: 12, fontWeight: 700, color: saldo > 0 ? '#ffb0a0' : '#90f090' }}>
            {saldo > 0 ? `Adeudado: ${fmtMoneda(saldo)}` : `A tu favor: ${fmtMoneda(-saldo)}`}
          </span>}
          <button onClick={() => setSortMode(m => m === 'lote' ? 'fecha' : m === 'fecha' ? 'producto' : m === 'producto' ? 'conta' : 'lote')}
            style={{ fontFamily: F, fontSize: 10, padding: '2px 7px', cursor: 'pointer', border: '1px solid #7a9aba', background: sortMode !== 'lote' ? '#4a7aaa' : 'transparent', color: '#fff', borderRadius: 2 }}>
            {sortMode === 'lote' ? '📅 Cronológico' : sortMode === 'fecha' ? '📦 Por producto' : sortMode === 'producto' ? '📒 Contaduría' : '🗂️ Por lote'}
          </button>
        </div>
      </div>

      {/* ── Vista POR LOTE (default) ── */}
      {sortMode === 'lote' && (() => {
        // Timeline: lotes + pagos entrelazados por fecha, con saldo acumulado
        // Orden ascendente para calcular saldo acumulado (viejo→nuevo), luego se invierte para mostrar nuevo arriba
        const tl = [
          ...Object.values(loteResumen).map(l => ({ kind: 'lote', date: l.fechaEnvio || '', l })),
          ...pagosRows.map(m => ({ kind: 'pago', date: m.fecha || '', m }))
        ].sort((a, b) => a.date.localeCompare(b.date))
        let rSaldo = 0
        const tlAsc = tl.map(item => {
          if (item.kind === 'lote') { rSaldo += item.l.debe - item.l.haber }
          else                      { rSaldo -= item.m.monto || 0 }
          return { ...item, rSaldo }
        })
        const tlRows = [...tlAsc].reverse() // más nuevo arriba
        const thS = { padding: '5px 6px', borderBottom: '2px solid #a8a8a0', background: '#dcdcd4', fontFamily: F, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }
        return (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ ...thS, textAlign: 'right', color: '#aaa', width: 28 }}>#</th>
                  <th style={{ ...thS, textAlign: 'left' }}>Lote</th>
                  <th style={{ ...thS, textAlign: 'left' }}>Producto</th>
                  <th style={{ ...thS, textAlign: 'center' }}>Fecha</th>
                  <th style={{ ...thS, textAlign: 'center', color: '#1a3a6b' }}>En taller</th>
                  <th style={{ ...thS, textAlign: 'right', color: '#8a3a3a' }}>Debe</th>
                  <th style={{ ...thS, textAlign: 'right', color: '#1a6a1a' }}>Haber</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {tlRows.map((item, i) => {
                  const rs = item.rSaldo
                  const scol = rs > 0 ? '#8a3a3a' : rs < 0 ? '#1a6a1a' : '#888'
                  const slbl = rs !== 0 ? `${fmtMoneda(Math.abs(rs))} ${rs > 0 ? 'D' : 'H'}` : '—'
                  if (item.kind === 'lote') {
                    const l = item.l
                    const enTaller = l.enviado + l.reenviado - l.recibido
                    return (
                      <tr key={l.loteId}
                        onClick={() => setSelectedLote(l.loteId)}
                        style={{ cursor: 'pointer', borderLeft: '4px solid #4a6a9a', borderBottom: '1px solid #e0e0d8', background: '#fff' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f4fa'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        <td style={{ padding: '4px 6px', textAlign: 'right', color: '#bbb', fontSize: 10, userSelect: 'none' }}>{tlRows.length - i}</td>
                        <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#d8d8d0', padding: '1px 4px', borderRadius: 2, color: '#222' }}>{l.loteId}</span>
                        </td>
                        <td style={{ padding: '4px 6px', color: '#111' }}>
                          {l.prodNombre || '—'}
                          {l.prodCodigo && <span style={{ marginLeft: 5, fontSize: 10, color: '#444', fontFamily: 'monospace', background: '#e8e8e0', padding: '1px 3px', borderRadius: 2 }}>{l.prodCodigo}</span>}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', color: '#666', fontSize: 11, whiteSpace: 'nowrap' }}>{l.fechaEnvio ? fmtF(l.fechaEnvio) : '—'}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: enTaller > 0 ? '#1a3a6b' : '#aaa' }}>{enTaller > 0 ? `${enTaller}u` : '—'}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: '#8a3a3a' }}>{(l.debe - l.haber) > 0 ? fmtMoneda(l.debe - l.haber) : '—'}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: '#1a6a1a' }}>{'—'}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: scol }}>{slbl}</td>
                      </tr>
                    )
                  } else {
                    const m = item.m
                    return (
                      <tr key={m.id} style={{ borderLeft: '4px solid #5a3a8a', borderBottom: '1px solid #e0e0d8', background: '#f8f4fc' }}>
                        <td style={{ padding: '4px 6px', textAlign: 'right', color: '#bbb', fontSize: 10, userSelect: 'none' }}>{tlRows.length - i}</td>
                        <td style={{ padding: '4px 6px', color: '#5a3a8a', fontWeight: 700, fontSize: 11 }}>—</td>
                        <td style={{ padding: '4px 6px', color: '#5a3a8a', fontWeight: 700 }}>PAGO{m.descripcion ? ` — ${m.descripcion}` : ''}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', color: '#666', fontSize: 11 }}>{fmtF(m.fecha)}</td>
                        <td style={{ padding: '4px 6px' }}></td>
                        <td style={{ padding: '4px 6px' }}></td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: '#1a6a1a' }}>{fmtMoneda(m.monto)}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: scol }}>{slbl}</td>
                      </tr>
                    )
                  }
                })}
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* ── Vista CRONOLÓGICA (default) ── */}
      {sortMode === 'fecha' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: 'right', color: '#aaa', width: 28 }}>#</th>
                <th style={{ ...thBase, textAlign: 'left', whiteSpace: 'nowrap' }}>Fecha</th>
                <th style={{ ...thBase, textAlign: 'left', whiteSpace: 'nowrap' }}>Movimiento</th>
                <th style={{ ...thBase, textAlign: 'left' }}>Lote</th>
                <th style={{ ...thBase, textAlign: 'left', width: '30%' }}>Producto</th>
                <th style={{ ...thBase, textAlign: 'center', whiteSpace: 'nowrap' }}>Cant.</th>
                <th style={{ ...thBase, textAlign: 'right', whiteSpace: 'nowrap', color: '#8a3a3a' }}>Debe</th>
                <th style={{ ...thBase, textAlign: 'right', whiteSpace: 'nowrap', color: '#1a6a1a' }}>Haber</th>
                <th style={{ ...thBase, textAlign: 'right', whiteSpace: 'nowrap' }}>Saldo</th>
                <th style={{ ...thBase, textAlign: 'center', whiteSpace: 'nowrap' }}>En manos</th>
                <th style={{ ...thBase }}></th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((row, rowIdx) => {
                const isOpen = !!openRows[row.key]
                const cfg = row.cfg
                return (
                  <React.Fragment key={row.key}>
                    <tr onClick={() => row.items.length > 0 && toggleRow(row.key)}
                      style={{ borderLeft: `4px solid ${cfg.border}`, background: isOpen ? cfg.bg : 'transparent',
                        cursor: row.items.length > 0 ? 'pointer' : 'default', borderBottom: '1px solid #e0e0d8' }}>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: '#bbb', fontSize: 10, userSelect: 'none' }}>{rows.length - rowIdx}</td>
                      <td style={{ padding: '4px 6px', whiteSpace: 'nowrap', color: '#222', fontSize: 11 }}>{fmtF(row.fecha)}</td>
                      <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 11, color: cfg.border }}>{cfg.label}</span>
                        {row.fallas.length > 0 && <span style={{ marginLeft: 4, fontSize: 10, color: '#b03030' }}>⚠</span>}
                      </td>
                      <td style={{ padding: '4px 6px' }} onClick={e => e.stopPropagation()}>
                        <LoteBadge loteId={row.loteId} clickable={true} />
                      </td>
                      <td style={{ padding: '4px 6px', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.prodNombre
                          ? <span>{row.prodNombre}{row.prodCodigo && <span style={{ marginLeft: 5, fontSize: 10, color: '#444', fontFamily: 'monospace', background: '#d8d8d0', padding: '1px 3px', borderRadius: 2 }}>{row.prodCodigo}</span>}</span>
                          : <span style={{ color: '#555', fontSize: 11 }}>{row.nota || '—'}</span>}
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: '#111' }}>
                        {row.total != null ? `${row.total}u` : '—'}
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: '#8a3a3a' }}>
                        {row.mov.tipo === 'recepcion' && row.subtotal != null ? fmtMoneda(row.subtotal) : ''}
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: '#1a6a1a' }}>
                        {row.mov.tipo === 'pago' && row.mov.monto != null ? fmtMoneda(row.mov.monto) : ''}
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: (saldoMap[row.key] || 0) > 0 ? '#8a3a3a' : '#1a6a1a' }}>
                        {(row.mov.tipo === 'recepcion' && row.subtotal != null) || (row.mov.tipo === 'pago' && row.mov.monto != null)
                          ? `${fmtMoneda(Math.abs(saldoMap[row.key] || 0))} ${(saldoMap[row.key] || 0) > 0 ? 'D' : 'H'}`
                          : ''}
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: row.enManos > 0 ? '#7a4a00' : '#1e6a1e' }}>
                        {row.enManos != null ? `${row.enManos}u` : '—'}
                      </td>
                      <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                        <AccionesFila row={row} />
                      </td>
                    </tr>
                    {isOpen && row.items.length > 0 && [...row.items].sort((a, b) => cmpTalle(a.talle, b.talle)).map(it => {
                      const falla = row.fallas.find(f => f.talle === it.talle)
                      const hasPrecio = row.mov.tipo === 'recepcion' && row.precioUnit != null
                      const tdSub = { padding: '4px 6px', borderBottom: '1px solid #e8e8e0', background: '#f4f4f0' }
                      return (
                        <tr key={it.id} style={{ background: falla ? '#fdeaea' : '#f4f4f0' }}>
                          <td style={tdSub}></td>
                          <td style={tdSub}></td>
                          <td style={tdSub}></td>
                          <td style={{ ...tdSub, paddingLeft: 24, fontWeight: 700, color: falla ? '#8a2a2a' : '#333' }}>
                            {it.talle}{falla ? <span style={{ marginLeft: 6, color: '#b03030', fontSize: 10 }}>⚠{falla.cant_falla}</span> : null}
                          </td>
                          <td style={{ ...tdSub, textAlign: 'center', fontWeight: 700 }}>{it.cantidad}</td>
                          <td style={{ ...tdSub, textAlign: 'right', color: '#8a3a3a' }}>
                            {hasPrecio ? fmtMoneda(it.cantidad * row.precioUnit) : ''}
                          </td>
                          <td style={tdSub}></td>
                          <td style={tdSub}></td>
                          <td style={tdSub}></td>
                          <td style={tdSub}></td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Vista CONTADURÍA ── */}
      {sortMode === 'conta' && (() => {
        // Filas contables: recepcion con monto → DEBE; pago → HABER
        const contaFilas = []
        for (const m of [...sortedAsc].reverse()) {
          if (m.tipo === 'recepcion') {
            // agrupar por producto para mostrar una fila por producto con subtotal
            const byProdC = {}
            for (const it of (m.taller_movimientos_items || [])) {
              const pid = it.producto_id
              if (!byProdC[pid]) byProdC[pid] = { nombre: it.productos?.nombre || '?', total: 0, precioUnit: it.precio_unit ?? it.productos?.costo_confeccion ?? null }
              byProdC[pid].total += it.cantidad || 0
            }
            for (const pd of Object.values(byProdC)) {
              const subtotal = pd.precioUnit != null ? pd.total * pd.precioUnit : null
              if (subtotal != null) contaFilas.push({ fecha: m.fecha, concepto: `Rec. ${pd.nombre} (${pd.total}u × $${pd.precioUnit})`, debe: subtotal, haber: null, movId: m.id })
            }
          } else if (m.tipo === 'pago') {
            if (m.monto != null) contaFilas.push({ fecha: m.fecha, concepto: m.nota || 'Pago', debe: null, haber: m.monto, movId: m.id })
          }
        }
        // calcular saldo acumulado (más viejo primero = contaFilas invertido)
        let saldoAcum = 0
        const filasConSaldo = [...contaFilas].reverse().map(f => {
          saldoAcum += (f.debe || 0) - (f.haber || 0)
          return { ...f, saldo: saldoAcum }
        }).reverse()
        const thC = { padding: '5px 8px', fontWeight: 700, borderBottom: '2px solid #a8a8a0', color: '#111', fontSize: 12, background: '#dcdcd4' }
        return (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ ...thC, textAlign: 'left', whiteSpace: 'nowrap' }}>Fecha</th>
                  <th style={{ ...thC, textAlign: 'left' }}>Concepto</th>
                  <th style={{ ...thC, textAlign: 'right', color: '#8a3a3a' }}>Debe</th>
                  <th style={{ ...thC, textAlign: 'right', color: '#1a6a1a' }}>Haber</th>
                  <th style={{ ...thC, textAlign: 'right' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {filasConSaldo.map((f, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e0e0d8', background: i % 2 === 0 ? '#fafaf6' : 'transparent' }}>
                    <td style={{ padding: '4px 8px', whiteSpace: 'nowrap', color: '#444' }}>{fmtF(f.fecha)}</td>
                    <td style={{ padding: '4px 8px', color: '#111' }}>{f.concepto}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', color: '#8a3a3a', fontWeight: f.debe ? 700 : 400 }}>{f.debe != null ? fmtMoneda(f.debe) : ''}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', color: '#1a6a1a', fontWeight: f.haber ? 700 : 400 }}>{f.haber != null ? fmtMoneda(f.haber) : ''}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: f.saldo > 0 ? '#8a3a3a' : '#1a6a1a' }}>{fmtMoneda(Math.abs(f.saldo))}{f.saldo > 0 ? ' D' : ' H'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #a8a8a0', background: '#dcdcd4' }}>
                  <td colSpan={2} style={{ padding: '5px 8px', fontWeight: 700, fontSize: 12 }}>Total</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#8a3a3a' }}>{fmtMoneda(filasConSaldo.reduce((s, f) => s + (f.debe || 0), 0))}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#1a6a1a' }}>{fmtMoneda(filasConSaldo.reduce((s, f) => s + (f.haber || 0), 0))}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: filasConSaldo[0]?.saldo > 0 ? '#8a3a3a' : '#1a6a1a' }}>
                    {filasConSaldo.length > 0 ? (fmtMoneda(Math.abs(filasConSaldo[0].saldo)) + (filasConSaldo[0].saldo > 0 ? ' D' : ' H')) : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )
      })()}

      {/* ── Vista POR PRODUCTO ── */}
      {sortMode === 'producto' && (
        <div>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: 'left', width: '35%' }}>Producto</th>
                <th style={{ ...thBase, textAlign: 'left' }}>Último mov.</th>
                <th style={{ ...thBase, textAlign: 'left' }}>Movimiento</th>
                <th style={{ ...thBase, textAlign: 'center' }}>Cant.</th>
                <th style={{ ...thBase, textAlign: 'center' }}>En manos</th>
                <th style={{ ...thBase }}></th>
              </tr>
            </thead>
          </table>
          {prodGroups.map(g => {
            const lastRow = g.rows[g.rows.length - 1]
            const enManosActual = lastRow?.enManos ?? 0
            const isGroupOpen = openRows[`g-${g.pid}`] !== false
            return (
              <div key={g.pid} style={{ borderBottom: '2px solid #c8c8c0' }}>
                <div onClick={() => setOpenRows(o => ({ ...o, [`g-${g.pid}`]: !isGroupOpen }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: '#eeeee8', cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ fontSize: 11, color: '#555' }}>{isGroupOpen ? '▼' : '▶'}</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>{g.nombre}</span>
                    {lastRow?.prodCodigo && <span style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', background: '#d0d0c8', padding: '1px 5px', borderRadius: 2 }}>{lastRow.prodCodigo}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: '#666', marginRight: 8 }}>{lastRow ? fmtF(lastRow.fecha) : ''}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: enManosActual > 0 ? '#7a4a00' : '#1e6a1e' }}>
                    {enManosActual > 0 ? `${enManosActual}u en taller` : '✓ recibido todo'}
                  </span>
                </div>
                {isGroupOpen && (
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                    <tbody>
                      {[...g.rows].reverse().map(row => {
                        const isOpen = !!openRows[row.key]
                        const cfg = row.cfg
                        return (
                          <React.Fragment key={row.key}>
                            <tr onClick={() => row.items.length > 0 && toggleRow(row.key)}
                              style={{ borderLeft: `4px solid ${cfg.border}`, background: isOpen ? cfg.bg : 'transparent',
                                cursor: row.items.length > 0 ? 'pointer' : 'default', borderBottom: '1px solid #e0e0d8' }}>
                              <td style={{ padding: '5px 8px', width: '35%' }}></td>
                              <td style={{ padding: '5px 8px', whiteSpace: 'nowrap', color: '#222', fontSize: 12 }}>{fmtF(row.fecha)}</td>
                              <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: 700, fontSize: 12, color: cfg.border }}>{cfg.label}</span>
                                {row.fallas.length > 0 && <span style={{ marginLeft: 4, fontSize: 11, color: '#b03030' }}>⚠</span>}
                                <LoteBadge loteId={row.loteId} />
                              </td>
                              <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700, color: '#111' }}>
                                {row.total != null ? `${row.total}u` : '—'}
                              </td>
                              <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700, color: row.enManos > 0 ? '#7a4a00' : '#1e6a1e' }}>
                                {row.enManos != null ? `${row.enManos}u` : '—'}
                              </td>
                              <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                                <AccionesFila row={row} />
                              </td>
                            </tr>
                            {isOpen && row.items.length > 0 && (
                              <tr style={{ background: cfg.bg }}>
                                <td colSpan={6} style={{ borderBottom: '1px solid #ddd' }}>
                                  <TalleDetalle row={row} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
          {pagoRows.length > 0 && (
            <div style={{ borderTop: '2px solid #c8c8c0' }}>
              <div style={{ padding: '5px 10px', background: '#eeeee8', fontSize: 12, fontWeight: 700, color: '#333' }}>💰 Pagos y conceptos</div>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                <tbody>
                  {[...pagoRows].reverse().map(row => {
                    const cfg = row.cfg
                    return (
                      <tr key={row.key} style={{ borderLeft: `4px solid ${cfg.border}`, background: 'transparent', borderBottom: '1px solid #e0e0d8' }}>
                        <td style={{ padding: '5px 8px', color: '#222', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtF(row.fecha)}</td>
                        <td style={{ padding: '5px 8px' }}><span style={{ fontWeight: 700, fontSize: 12, color: cfg.border }}>{cfg.label}</span></td>
                        <td style={{ padding: '5px 8px', color: '#111' }}>{row.nota || '—'}</td>
                        <td style={{ padding: '5px 8px', fontWeight: 700, color: '#111' }}>{row.monto != null ? fmtMoneda(row.monto) : '—'}</td>
                        <td style={{ padding: '5px 8px' }} onClick={e => e.stopPropagation()}><AccionesFila row={row} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
    {controlando && (
      <ModalControl
        movId={controlando.movId}
        items={controlando.items}
        tallerNombre={controlando.tallerNombre}
        onClose={() => setControlando(null)}
        onSave={() => { setControlando(null); onEnviarFalla() }}
      />
    )}
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Talleres({ onMenuClick }) {
  const [movimientos,   setMovimientos]   = useState([])
  const [controlMap,    setControlMap]    = useState({})
  const [entregasMap,   setEntregasMap]   = useState({}) // recepcionId → entrega[]
  const [loading,       setLoading]       = useState(true)
  const initialLoad = React.useRef(true)
  const [modal,         setModal]         = useState(false)
  const [modalNuevoTaller, setModalNuevoTaller] = useState(false)
  const [editando,      setEditando]      = useState(null)
  const [calidad,       setCalidad]       = useState(null)
  const [recibiendo,    setRecibiendo]    = useState(null)
  const [filtroTipo,    setFiltroTipo]    = useState('')
  const [filtroQ,       setFiltroQ]       = useState('')
  const [filtroTaller,  setFiltroTaller]  = useState('')
  const [filtroProd,    setFiltroProd]    = useState('')
  const [recibiendoStock,   setRecibiendoStock]   = useState(null)
  const [repitiendo,        setRepitiendo]        = useState(null) // { taller, itemsInicial }
  const [selectedTaller,    setSelectedTaller]    = useState(null) // cid seleccionado en el master

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const isRefresh = !initialLoad.current
    const scrollY = window.scrollY
    if (!isRefresh) setLoading(true)
    const [{ data: movs }, { data: ctrl }, { data: entregas }] = await Promise.all([
      supabase.from('taller_movimientos')
        .select(`id, tipo, fecha, nota, monto, lote_id, created_at,
          contactos(id, nombre),
          taller_movimientos_items(id, producto_id, talle, cantidad, observacion, lote_id, precio_unit,
            productos(id, nombre, codigo, tabla, tela1_id, costo_confeccion, telas:tela1_id(tipo, color))))`)
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
    initialLoad.current = false
    if (isRefresh) requestAnimationFrame(() => window.scrollTo(0, scrollY))
  }

  async function deleteMov(id) {
    if (!window.confirm('¿Eliminar este movimiento?')) return
    // Si es una devolución, resetear los control items que marcó como enviados
    await supabase.from('taller_control_items')
      .update({ enviado_taller: false, enviado_fecha: null, enviado_contacto_id: null, enviado_movimiento_id: null })
      .eq('enviado_movimiento_id', id)
    await supabase.from('taller_control_items').delete().eq('movimiento_id', id)
    await supabase.from('taller_movimientos_items').delete().eq('movimiento_id', id)
    await supabase.from('taller_movimientos').delete().eq('id', id)
    fetchAll()
  }

  const filtered = movimientos.filter(m => {
    if (m.tipo === 'entrega' || m.tipo === 'devolucion_cliente') return false
    if (filtroTipo && m.tipo !== filtroTipo) return false
    if (filtroTaller) {
      const q = filtroTaller.toLowerCase()
      if (!m.contactos?.nombre?.toLowerCase().includes(q)) return false
    }
    if (filtroProd) {
      const q = filtroProd.toLowerCase()
      if (!m.taller_movimientos_items?.some(it => it.productos?.nombre?.toLowerCase().includes(q))) return false
    }
    if (filtroQ) {
      const q = filtroQ.toLowerCase()
      if (!m.contactos?.nombre?.toLowerCase().includes(q) &&
          !m.taller_movimientos_items?.some(it => it.productos?.nombre?.toLowerCase().includes(q))) return false
    }
    return true
  })

  // Agrupar todos los movimientos (sin filtros) para el sidebar — saldo y lista completa
  const todosTalleres = {}
  for (const m of movimientos.filter(m => m.tipo !== 'entrega' && m.tipo !== 'devolucion_cliente')) {
    const cid = m.contactos?.id || '__sin__'
    if (!todosTalleres[cid]) todosTalleres[cid] = { cid, nombre: m.contactos?.nombre || '(sin taller)', movs: [], lastFecha: '' }
    todosTalleres[cid].movs.push(m)
    if (m.fecha > todosTalleres[cid].lastFecha) todosTalleres[cid].lastFecha = m.fecha
  }
  const listaSidebar = Object.values(todosTalleres)
    .filter(g => !filtroTaller || g.nombre.toLowerCase().includes(filtroTaller.toLowerCase()))
    .sort((a, b) => b.lastFecha.localeCompare(a.lastFecha))

  // Agrupar filtered para el panel derecho
  const grupos = {}
  for (const m of filtered) {
    const cid = m.contactos?.id || '__sin__'
    if (!grupos[cid]) grupos[cid] = { cid, nombre: m.contactos?.nombre || '(sin taller)', movs: [] }
    grupos[cid].movs.push(m)
  }
  const selCid = selectedTaller || listaSidebar[0]?.cid || null
  const selGrupo = grupos[selCid] || (selCid && todosTalleres[selCid] ? { ...todosTalleres[selCid], movs: [] } : null)

  function handleRepetir(envio) {
    const byProd = {}
    for (const it of (envio.taller_movimientos_items || [])) {
      const pid = it.producto_id
      if (!byProd[pid]) {
        const tabla  = it.productos?.tabla || 'adulto'
        const talles = TABLAS_TALLES[tabla] || TALLES_ADULTO
        byProd[pid] = { producto_id: pid, prodQ: it.productos?.nombre || '', prodRes: [], tabla, talles, conNino: false, cantidades: {}, observacion: '', precio_confeccion: it.productos?.costo_confeccion ?? null }
      }
      byProd[pid].cantidades[it.talle] = String(it.cantidad)
      if (TALLES_NINO.includes(it.talle)) { byProd[pid].conNino = true; byProd[pid].talles = [...TALLES_ADULTO, ...TALLES_NINO] }
    }
    const itemsInicial = Object.values(byProd).length ? Object.values(byProd) : [newItem()]
    const taller = envio.contactos ? { id: envio.contacto_id, nombre: envio.contactos.nombre } : null
    setRepitiendo({ taller, itemsInicial })
  }

  return (
    <div style={{ ...S.wrap, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={S.tbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={S.btn} onClick={onMenuClick}>☰</button>
          <span style={{ fontWeight: 700, fontSize: 13 }}>🧵 Talleres</span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Panel izquierdo: lista de talleres */}
        <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid #c8cce0', background: '#eef0f8', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #c8cce0', display: 'flex', gap: 4 }}>
            <input style={{ ...S.inp, flex: 1, minWidth: 0 }} value={filtroTaller}
              onChange={e => setFiltroTaller(e.target.value)} placeholder="Buscar taller..." />
            <button style={{ ...S.btnP, padding: '2px 8px', fontWeight: 700, flexShrink: 0 }}
              title="Nuevo taller" onClick={() => setModalNuevoTaller(true)}>+</button>
          </div>
          {loading ? (
            <div style={{ padding: 12, color: '#888', fontSize: 11 }}>Cargando...</div>
          ) : listaSidebar.length === 0 ? (
            <div style={{ padding: 12, color: '#888', fontSize: 11 }}>Sin talleres</div>
          ) : listaSidebar.map(g => {
            const isActive = (selectedTaller ? selectedTaller === g.cid : g === listaSidebar[0])
            const saldo = g.movs.reduce((s, m) => {
              if ((m.tipo === 'recepcion' || m.tipo === 'concepto') && m.monto != null) return s + m.monto
              if (m.tipo === 'pago' && m.monto != null) return s - m.monto
              return s
            }, 0)
            return (
              <div key={g.cid}
                onClick={() => setSelectedTaller(g.cid)}
                style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #d8dce8',
                  background: isActive ? '#1a3a6b' : 'transparent',
                  color: isActive ? '#fff' : '#1a3a6b' }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>🧵 {g.nombre}</div>
                <div style={{ fontSize: 10, marginTop: 2, color: isActive ? '#c8d8f0' : '#888' }}>
                  {g.movs.length} mov · {g.lastFecha ? g.lastFecha.slice(0,7) : ''}
                  {saldo > 0 && <span style={{ marginLeft: 6, color: isActive ? '#ffd080' : '#8a5a00' }}>$ {saldo.toLocaleString('es-UY')}</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Panel derecho: detalle del taller seleccionado */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {selGrupo && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 8px' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>🧵 {selGrupo.nombre}</span>
              <button style={S.btnP} onClick={() => setModal(true)}>+ Movimiento</button>
            </div>
          )}

          <StockEnTalleres movimientos={movimientos} controlMap={controlMap}
            filterCid={selCid}
            onRecibirStock={(taller, stockItems, fallaCtrl) => setRecibiendoStock({ taller, stockItems, fallaControlItems: fallaCtrl || [] })} />


          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={S.sel} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              {TIPOS.filter(t => t.id !== 'entrega' && t.id !== 'devolucion_cliente').map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
            <input style={{ ...S.inp, width: 150 }} value={filtroProd} onChange={e => setFiltroProd(e.target.value)} placeholder="Producto..." />
            {(filtroTipo || filtroProd) && <button style={S.btn} onClick={() => { setFiltroTipo(''); setFiltroProd('') }}>✕ limpiar</button>}
          </div>

          {loading ? (
            <div style={{ padding: 20, color: '#666' }}>Cargando...</div>
          ) : !selGrupo ? (
            <div style={{ padding: 20, color: '#666', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🧵</div>
              <div>Sin movimientos. Creá el primero con + Movimiento.</div>
            </div>
          ) : (
            <TallerBlock key={selGrupo.nombre} nombre={selGrupo.nombre} movs={selGrupo.movs}
              controlMap={controlMap} entregasMap={entregasMap}
              onDelete={deleteMov} onEdit={setEditando}
              onCalidad={setCalidad} onRecibir={setRecibiendo} onEnviarFalla={fetchAll}
              onRepetir={handleRepetir} />
          )}
        </div>
      </div>

      {modal      && <ModalNuevo   onClose={() => setModal(false)}       onSave={() => { setModal(false);       fetchAll() }}
                      tallerInicial={selCid && todosTalleres[selCid] ? { id: selCid, nombre: todosTalleres[selCid].nombre } : null} />}
      {repitiendo && <ModalNuevo   onClose={() => setRepitiendo(null)}  onSave={() => { setRepitiendo(null);  fetchAll() }}
                      tipoInicial="envio" tallerInicial={repitiendo.taller} itemsInicial={repitiendo.itemsInicial} />}
      {editando   && <ModalEditar  mov={editando}   onClose={() => setEditando(null)}   onSave={() => { setEditando(null);   fetchAll() }} onDelete={async (id) => { await supabase.from('taller_movimientos').delete().eq('id', id); setEditando(null); fetchAll() }} />}
      {calidad    && <ModalCalidad mov={calidad} entregasVinculadas={entregasMap[calidad.id] || []} controlItems={controlMap[calidad.id] || []} onClose={() => setCalidad(null)} onSave={() => { setCalidad(null); fetchAll() }} />}
      {recibiendo && <ModalRecibir envio={recibiendo} onClose={() => setRecibiendo(null)} onSave={() => { setRecibiendo(null); fetchAll() }} />}
      {recibiendoStock && <ModalRecibirStock taller={recibiendoStock.taller} stockItems={recibiendoStock.stockItems} fallaControlItems={recibiendoStock.fallaControlItems} onClose={() => setRecibiendoStock(null)} onSave={() => { setRecibiendoStock(null); fetchAll() }} />}
      {modalNuevoTaller && <ModalNuevoTaller onClose={() => setModalNuevoTaller(false)} onSave={(cid) => { setModalNuevoTaller(false); fetchAll(); setSelectedTaller(cid) }} />}
    </div>
  )
}
