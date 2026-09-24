import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { TABLAS_TALLES, TALLES_ADULTO, TALLES_NINO } from '../constants/talles'

const F = 'Tahoma, Arial, sans-serif'
const today = () => new Date().toISOString().slice(0, 10)

const S = {
  wrap:     { fontFamily: F, fontSize: 12, background: '#f4f4ec' },
  tbar:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#1a3a6b', color: '#fff', position: 'sticky', top: 0, zIndex: 10 },
  btn:      { fontFamily: F, fontSize: 11, padding: '3px 10px', cursor: 'pointer', border: '1px solid #888', background: '#f0f0e8' },
  btnD:     { fontFamily: F, fontSize: 11, background: 'none', border: 'none', color: '#a00', cursor: 'pointer', padding: '0 4px' },
  inpC:     { fontFamily: F, fontSize: 11, border: '1px solid #a0a0a0', padding: '1px 3px', textAlign: 'center', background: '#fff' },
  inp:      { fontFamily: F, fontSize: 11, padding: '3px 6px', border: '1px solid #aaa', background: '#fff' },
  sel:      { fontFamily: F, fontSize: 11, padding: '3px 6px', border: '1px solid #aaa', background: '#fff' },
  card:     { border: '2px solid #a0a8b8', background: '#f4f4f0', marginBottom: 8, boxShadow: '1px 1px 0 #b8b8b8' },
  cardHead: { background: 'linear-gradient(to bottom,#e0e8f4,#d0ddf0)', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #a0a8b8' },
  tag:      (color) => ({ display: 'inline-block', background: color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 5px', marginRight: 4 }),
  tbl:      { borderCollapse: 'collapse', width: '100%', fontSize: 11 },
  th:       { border: '1px solid #c0c0c0', padding: '2px 6px', background: '#e8e8e0', fontWeight: 700, textAlign: 'center' },
  td:       { border: '1px solid #d0d0c8', padding: '2px 6px', textAlign: 'center' },
}

function fmtF(f) {
  if (!f) return '—'
  const [y, m, d] = f.split('-')
  return `${d}/${m}/${y}`
}

const lbl = { display: 'block', fontSize: 10, fontWeight: 700, color: '#444', marginBottom: 2, textTransform: 'uppercase' }
const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const modal = { background: '#f0f0e8', border: '2px solid #808080', boxShadow: '4px 4px 0 #000', width: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }
const modalH = { background: 'linear-gradient(to bottom,#6a006a,#4a004a)', color: '#fff', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }
const modalB = { padding: 12, overflowY: 'auto', flex: 1 }

function ModalDevolucionCliente({ clienteId, clienteNombre, onClose, onSave }) {
  const [fecha,      setFecha]      = useState(today())
  const [prodQ,      setProdQ]      = useState('')
  const [prodId,     setProdId]     = useState(null)
  const [prodRes,    setProdRes]    = useState([])
  const [talle,      setTalle]      = useState('')
  const [cantidad,   setCantidad]   = useState('1')
  const [motivo,     setMotivo]     = useState('')
  const [saving,     setSaving]     = useState(false)
  const timers = useRef({})

  function onProdInput(val) {
    setProdQ(val); setProdId(null)
    clearTimeout(timers.current.p)
    if (!val.trim()) { setProdRes([]); return }
    timers.current.p = setTimeout(async () => {
      const { data } = await supabase.from('productos').select('id, nombre').ilike('nombre', `%${val.trim()}%`).limit(8)
      setProdRes(data || [])
    }, 250)
  }

  async function save() {
    if (!prodId) { alert('Seleccioná un producto'); return }
    if (!talle.trim()) { alert('Ingresá el talle'); return }
    const cant = parseInt(cantidad) || 0
    if (cant <= 0) { alert('Cantidad inválida'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo: 'devolucion_cliente', fecha, contacto_id: clienteId, nota: motivo.trim() || null, user_id: user?.id })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    await supabase.from('taller_movimientos_items').insert({
      movimiento_id: mov.id, producto_id: prodId, talle: talle.trim(), cantidad: cant,
    })
    await supabase.from('taller_control_items').insert({
      movimiento_id: mov.id, producto_id: prodId, talle: talle.trim(),
      cant_ok: 0, cant_falla: cant, observacion: motivo.trim() || `Devuelto por ${clienteNombre}`,
      enviado_taller: false,
    })
    setSaving(false); onSave()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={modalH}>
          <span>↩ Devolución de {clienteNombre}</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={modalB}>
          <div style={{ background: '#f8f0f8', border: '1px solid #d0a0d0', padding: '6px 10px', marginBottom: 12, fontSize: 11, color: '#4a004a' }}>
            El producto volverá a <strong>Mi Taller</strong> con falla pendiente de arreglo.
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <div>
              <span style={lbl}>Fecha</span>
              <input style={{ ...S.inp }} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 10, position: 'relative' }}>
            <span style={lbl}>Producto</span>
            <input style={{ ...S.inp, width: '100%', boxSizing: 'border-box' }} value={prodQ}
              onChange={e => onProdInput(e.target.value)} placeholder="Buscar producto..." />
            {prodId && <span style={{ fontSize: 10, color: '#2a6a2a' }}>✓ {prodQ}</span>}
            {prodRes.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #c0c8d0', zIndex: 10, maxHeight: 160, overflowY: 'auto' }}>
                {prodRes.map(p => (
                  <div key={p.id} style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #eee' }}
                    onMouseDown={() => { setProdId(p.id); setProdQ(p.nombre); setProdRes([]) }}>
                    {p.nombre}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={lbl}>Talle</span>
              <input style={{ ...S.inp, width: '100%', boxSizing: 'border-box' }} value={talle}
                onChange={e => setTalle(e.target.value)} placeholder="Ej: S, M, L, 38..." />
            </div>
            <div style={{ width: 80 }}>
              <span style={lbl}>Cantidad</span>
              <input style={{ ...S.inp, width: '100%', boxSizing: 'border-box' }} type="number" min="1" value={cantidad}
                onChange={e => setCantidad(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={lbl}>Motivo / Falla</span>
            <input style={{ ...S.inp, width: '100%', boxSizing: 'border-box' }} value={motivo}
              onChange={e => setMotivo(e.target.value)} placeholder="Ej: costura rota, manchado, medida incorrecta..." />
          </div>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btn, background: 'linear-gradient(to bottom,#6a006a,#4a004a)', color: '#fff', border: '1px solid #4a004a' }}
            onClick={save} disabled={saving}>{saving ? 'Guardando...' : '↩ Registrar devolución'}</button>
        </div>
      </div>
    </div>
  )
}

function newEntregaItem() {
  return { producto_id: null, prodQ: '', prodRes: [], tabla: 'adulto', talles: TALLES_ADULTO, conNino: false, cantidades: {}, precio_unitario: '', precioConIVA: null, precioSinIVA: null, precioMode: null }
}

const fmtMoneda = v => v == null ? '—' : `$${Number(v).toLocaleString('es-UY', { minimumFractionDigits: 0 })}`

function EntregaItemProd({ item, index, onChange, onRemove, timers, clienteId }) {
  const ref = useRef(null)

  function onProdInput(val) {
    onChange(index, { ...item, prodQ: val, producto_id: null, prodRes: [] })
    clearTimeout(timers.current[`p${index}`])
    if (!val.trim()) return
    timers.current[`p${index}`] = setTimeout(async () => {
      const { data } = await supabase.from('productos').select('id, nombre, tabla, precio_venta').ilike('nombre', `%${val.trim()}%`).limit(8)
      onChange(index, { ...item, prodQ: val, producto_id: null, prodRes: data || [] })
    }, 250)
  }

  async function pickProd(p) {
    const talles = TABLAS_TALLES[p.tabla] || TALLES_ADULTO
    const precioConIVA = p.precio_venta != null ? Math.round(Number(p.precio_venta)) : null
    const precioSinIVA = p.precio_venta != null ? Math.round(Number(p.precio_venta) / 1.22) : null
    // Buscar último precio usado para este cliente + producto
    let precioMode = null
    let precio_unitario = ''
    if (clienteId && p.id) {
      const { data: hist } = await supabase
        .from('taller_movimientos_items')
        .select('precio_unit, taller_movimientos!inner(contacto_id)')
        .eq('producto_id', p.id)
        .eq('taller_movimientos.contacto_id', clienteId)
        .not('precio_unit', 'is', null)
        .order('taller_movimientos.fecha', { ascending: false })
        .limit(1)
      if (hist?.length > 0) {
        const lastPu = Math.round(Number(hist[0].precio_unit))
        if (precioConIVA != null && lastPu === precioConIVA) { precioMode = 'conIVA'; precio_unitario = String(precioConIVA) }
        else if (precioSinIVA != null && lastPu === precioSinIVA) { precioMode = 'sinIVA'; precio_unitario = String(precioSinIVA) }
        else { precio_unitario = String(hist[0].precio_unit) }
      }
    }
    onChange(index, { ...item, producto_id: p.id, prodQ: p.nombre, prodRes: [], tabla: p.tabla, talles, conNino: false, cantidades: {}, precioConIVA, precioSinIVA, precioMode, precio_unitario })
  }

  function toggleNino() {
    const conNino = !item.conNino
    onChange(index, { ...item, conNino, talles: conNino ? [...TALLES_ADULTO, ...TALLES_NINO] : TALLES_ADULTO })
  }

  function setCant(talle, val) {
    onChange(index, { ...item, cantidades: { ...item.cantidades, [talle]: val } })
  }

  const qty = Object.values(item.cantidades || {}).reduce((s, v) => s + (parseInt(v) || 0), 0)
  const precio = parseFloat(item.precio_unitario) || 0
  const subtotal = qty * precio

  return (
    <div style={{ border:'1px solid #c0c8d8', background:'#f8f8fc', padding:'6px 8px', marginBottom:8 }}>
      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:6 }}>
        <div style={{ flex:1, position:'relative' }}>
          <input ref={ref} style={{ ...S.inp, width:'100%' }} value={item.prodQ}
            onChange={e => onProdInput(e.target.value)} placeholder="Buscar producto..." />
          {item.prodRes?.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #c0c8d0', zIndex:10, maxHeight:160, overflowY:'auto' }}>
              {item.prodRes.map(p => (
                <div key={p.id} style={{ padding:'5px 10px', cursor:'pointer', fontSize:12, borderBottom:'1px solid #eee' }}
                  onMouseDown={() => pickProd(p)}>
                  {p.nombre}
                  {p.precio_venta != null && <span style={{ color:'#888', marginLeft:6 }}>${p.precio_venta}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        {item.producto_id && item.tabla === 'adulto' && (
          <button style={{ ...S.btn, fontSize:10, background: item.conNino ? '#4a2a6a' : undefined, color: item.conNino ? '#fff' : undefined }}
            onClick={toggleNino}>{item.conNino ? '✕ niño' : '+ niño'}</button>
        )}
        <button style={S.btnD} onClick={() => onRemove(index)}>✕</button>
      </div>
      {item.producto_id && (
        <>
          <div style={{ overflowX:'auto' }}>
            <table style={{ ...S.tbl, marginBottom:4 }}>
              <thead><tr>{item.talles.map(t => <th key={t} style={S.th}>{t}</th>)}</tr></thead>
              <tbody><tr>
                {item.talles.map(t => (
                  <td key={t} style={S.td}>
                    <input style={{ ...S.inpC, width:36 }} type="number" min="0"
                      value={item.cantidades?.[t] || ''} placeholder="0"
                      onChange={e => setCant(t, e.target.value)} />
                  </td>
                ))}
              </tr></tbody>
            </table>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:4, background:'#eaf4ea', border:'1px solid #b0d0b0', padding:'4px 8px', flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:'#555' }}>P/u:</span>
            <span style={{ fontWeight:700 }}>$</span>
            <input style={{ ...S.inp, width:70, fontSize:12, fontWeight:700 }} type="number" min="0" step="1"
              value={item.precio_unitario} onChange={e => onChange(index, { ...item, precio_unitario: e.target.value, precioMode: null })}
              placeholder="0" />
            {item.precioConIVA != null && (
              <button
                onClick={() => onChange(index, { ...item, precio_unitario: String(item.precioConIVA), precioMode: 'conIVA' })}
                style={{ fontFamily: F, fontSize: 10, padding: '1px 6px', cursor: 'pointer', border: `1px solid ${item.precioMode === 'conIVA' ? '#1a5a1a' : '#aaa'}`, background: item.precioMode === 'conIVA' ? '#1a5a1a' : '#f0f0e8', color: item.precioMode === 'conIVA' ? '#fff' : '#333', borderRadius: 2 }}>
                Con IVA ${item.precioConIVA}
              </button>
            )}
            {item.precioSinIVA != null && item.precioSinIVA !== item.precioConIVA && (
              <button
                onClick={() => onChange(index, { ...item, precio_unitario: String(item.precioSinIVA), precioMode: 'sinIVA' })}
                style={{ fontFamily: F, fontSize: 10, padding: '1px 6px', cursor: 'pointer', border: `1px solid ${item.precioMode === 'sinIVA' ? '#7a3a00' : '#aaa'}`, background: item.precioMode === 'sinIVA' ? '#7a3a00' : '#f0f0e8', color: item.precioMode === 'sinIVA' ? '#fff' : '#333', borderRadius: 2 }}>
                Sin IVA ${item.precioSinIVA}
              </button>
            )}
            {qty > 0 && precio > 0 && (
              <span style={{ fontSize:12, color:'#1a5a1a', fontWeight:700, marginLeft:4 }}>
                × {qty}u = {fmtMoneda(subtotal)}
              </span>
            )}
            {qty > 0 && precio === 0 && (
              <span style={{ fontSize:10, color:'#888' }}>{qty} prenda{qty !== 1 ? 's' : ''} · sin precio</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ModalEntregaCliente({ clienteId, clienteNombre, onClose, onSave }) {
  const [fecha,      setFecha]      = useState(today())
  const [cliQ,       setCliQ]       = useState(clienteNombre || '')
  const [cliId,      setCliId]      = useState(clienteId || null)
  const [cliRes,     setCliRes]     = useState([])
  const [nota,       setNota]       = useState('')
  const [items,      setItems]      = useState([newEntregaItem()])
  const [saving,     setSaving]     = useState(false)
  const [esFact,     setEsFact]     = useState(null) // null | true | false
  const timers = useRef({})

  function onCliInput(val) {
    setCliQ(val); setCliId(null)
    clearTimeout(timers.current.c)
    if (!val.trim()) { setCliRes([]); return }
    timers.current.c = setTimeout(async () => {
      const { data } = await supabase.from('contactos').select('id, nombre').ilike('nombre', `%${val.trim()}%`).limit(8)
      setCliRes(data || [])
    }, 250)
  }

  function updateItem(i, val) { setItems(prev => prev.map((it, j) => j === i ? val : it)) }
  function removeItem(i)      { setItems(prev => prev.filter((_, j) => j !== i)) }

  async function save() {
    if (!cliId) { alert('Seleccioná un cliente'); return }
    const rows = []
    for (const it of items) {
      if (!it.producto_id) continue
      for (const [talle, val] of Object.entries(it.cantidades || {})) {
        const cant = parseInt(val) || 0
        if (cant > 0) rows.push({ producto_id: it.producto_id, talle, cantidad: cant, precio_unitario: parseFloat(it.precio_unitario) || 0 })
      }
    }
    if (!rows.length) { alert('Ingresá al menos una cantidad'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mov, error } = await supabase.from('taller_movimientos')
      .insert({ tipo: 'entrega', fecha, contacto_id: cliId, nota: nota.trim() || null, user_id: user?.id, facturado: esFact })
      .select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    await supabase.from('taller_movimientos_items').insert(rows.map(r => ({ movimiento_id: mov.id, producto_id: r.producto_id, talle: r.talle, cantidad: r.cantidad, precio_unit: r.precio_unitario > 0 ? r.precio_unitario : null })))
    // Crear DEBE en cuenta corriente (siempre, con facturado según esFact)
    const total = rows.reduce((s, r) => s + r.cantidad * r.precio_unitario, 0)
    if (total > 0) {
      await supabase.from('cuenta_corriente').insert({
        contacto_id: cliId, tipo: 'debe', fecha,
        monto: total, total_cobrar: total,
        observacion: nota.trim() || 'Entrega de mercadería',
        facturado: esFact,
        movimiento_id: mov.id, user_id: user?.id,
      })
    }
    setSaving(false); onSave()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, width: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...modalH, background:'linear-gradient(to bottom,#3a6a00,#1a4a00)' }}>
          <span>📦 Nueva entrega a cliente</span>
          <button style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', fontSize:14, fontFamily:F }} onClick={onClose}>✕</button>
        </div>
        <div style={modalB}>
          <div style={{ display:'flex', gap:10, marginBottom:10 }}>
            <div style={{ flex:1, position:'relative' }}>
              <span style={lbl}>Cliente</span>
              <input style={{ ...S.inp, width:'100%', boxSizing:'border-box' }} value={cliQ}
                onChange={e => onCliInput(e.target.value)} placeholder="Buscar cliente..." />
              {cliId && <span style={{ fontSize:10, color:'#2a6a2a' }}>✓ {cliQ}</span>}
              {cliRes.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #c0c8d0', zIndex:10, maxHeight:160, overflowY:'auto' }}>
                  {cliRes.map(c => (
                    <div key={c.id} style={{ padding:'5px 10px', cursor:'pointer', fontSize:12, borderBottom:'1px solid #eee' }}
                      onMouseDown={() => { setCliId(c.id); setCliQ(c.nombre); setCliRes([]) }}>{c.nombre}</div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <span style={lbl}>Fecha</span>
              <input style={S.inp} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>
          <span style={lbl}>Productos</span>
          {items.map((it, i) => (
            <EntregaItemProd key={i} item={it} index={i} onChange={updateItem} onRemove={removeItem} timers={timers} clienteId={cliId} />
          ))}
          <button style={{ ...S.btn, fontSize:10, marginBottom:10 }} onClick={() => setItems(prev => [...prev, newEntregaItem()])}>+ producto</button>
          <div>
            <span style={lbl}>Nota (opcional)</span>
            <input style={{ ...S.inp, width:'100%', boxSizing:'border-box' }} value={nota}
              onChange={e => setNota(e.target.value)} placeholder="..." />
          </div>
          <div style={{ marginTop:10, display:'flex', gap:6, alignItems:'center' }}>
            <span style={lbl}>Facturación:</span>
            <button style={esFact === true ? { ...S.btn, background:'#1a3a6b', color:'#fff', border:'1px solid #1a3a6b' } : S.btn}
              onClick={() => setEsFact(esFact === true ? null : true)}>🧾 Facturada</button>
            <button style={esFact === false ? { ...S.btn, background:'#1a3a6b', color:'#fff', border:'1px solid #1a3a6b' } : S.btn}
              onClick={() => setEsFact(esFact === false ? null : false)}>No facturada</button>
            {esFact === true && <span style={{ fontSize:10, color:'#888' }}>Genera DEBE facturado</span>}
          </div>
        </div>
        <div style={{ padding:'8px 12px', borderTop:'1px solid #c0c0b0', display:'flex', justifyContent:'flex-end', gap:6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btn, background:'linear-gradient(to bottom,#3a6a00,#1a4a00)', color:'#fff', border:'1px solid #1a4a00' }}
            onClick={save} disabled={saving}>{saving ? 'Guardando...' : '📦 Registrar entrega'}</button>
        </div>
      </div>
    </div>
  )
}

const TIPOS_CLIENTE = [
  { id: 'entrega',           label: 'Entrega',           icon: '🛍️', color: '#7a3a00' },
  { id: 'devolucion_cliente', label: 'Devolución',        icon: '↩',  color: '#6a006a' },
]

function ModalEditarMonto({ mov, onClose, onSave }) {
  const [monto,  setMonto]  = useState('')
  const [nota,   setNota]   = useState(mov.nota || '')
  const [saving, setSaving] = useState(false)
  const [ccId,   setCcId]   = useState(null)

  useEffect(() => {
    supabase.from('cuenta_corriente')
      .select('id, monto, observacion')
      .eq('movimiento_id', mov.id)
      .single()
      .then(({ data }) => {
        if (data) { setCcId(data.id); setMonto(String(data.monto || '')); setNota(data.observacion || mov.nota || '') }
      })
  }, [mov.id])

  async function save() {
    const m = parseFloat(monto)
    if (!m || m <= 0) { alert('Ingresá un monto válido'); return }
    setSaving(true)
    if (ccId) {
      await supabase.from('cuenta_corriente').update({ monto: m, total_cobrar: m, observacion: nota || null }).eq('id', ccId)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('cuenta_corriente').insert({
        contacto_id: mov.contactos?.id, tipo: 'debe', fecha: mov.fecha,
        monto: m, total_cobrar: m, observacion: nota || null,
        movimiento_id: mov.id, user_id: user?.id,
      })
    }
    if (nota !== mov.nota) await supabase.from('taller_movimientos').update({ nota }).eq('id', mov.id)
    setSaving(false); onSave()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ ...modalH, background: 'linear-gradient(to bottom,#3a6a00,#1a4a00)' }}>
          <span>✏ Editar entrega · {fmtF(mov.fecha)}</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={modalB}>
          <div style={{ marginBottom: 10 }}>
            <span style={lbl}>Monto total *</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700 }}>$</span>
              <input style={{ ...S.inp, width: 140, fontSize: 14, fontWeight: 700 }}
                type="number" min="0" step="0.01" value={monto} autoFocus
                onChange={e => setMonto(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <span style={lbl}>Nota (opcional)</span>
            <input style={{ ...S.inp, width: '100%', boxSizing: 'border-box' }}
              value={nota} onChange={e => setNota(e.target.value)} />
          </div>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btn, background: 'linear-gradient(to bottom,#3a6a00,#1a4a00)', color: '#fff', border: '1px solid #1a4a00' }}
            onClick={save} disabled={saving}>{saving ? 'Guardando...' : '✔ Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

function MovCardCliente({ mov, onDelete, onRefresh }) {
  const [collapsed,  setCollapsed]  = useState(false)
  const [editando,   setEditando]   = useState(false)
  const tipo   = TIPOS_CLIENTE.find(t => t.id === mov.tipo) || { label: mov.tipo, icon: '📋', color: '#666' }
  const items  = mov.taller_movimientos_items || []
  const total  = items.reduce((s, it) => s + (it.cantidad || 0), 0)

  // Total = suma de subtotales de ítems con precio_unit cargado
  const itemsConPrecio = mov.tipo === 'entrega' ? items.filter(it => it.precio_unit != null) : []
  const itemsSinPrecio = mov.tipo === 'entrega' ? items.filter(it => it.precio_unit == null) : []
  const montoMostrar = itemsConPrecio.reduce((s, it) => s + (it.cantidad || 0) * Number(it.precio_unit), 0)
  const tieneSinPrecio = itemsSinPrecio.length > 0

  return (
    <div style={{ ...S.card, borderColor: tipo.color }}>
      <div style={{ ...S.cardHead, background: `linear-gradient(to bottom, ${tipo.color}22, ${tipo.color}11)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }} onClick={() => setCollapsed(c => !c)}>
          <span style={{ fontSize: 14 }}>{collapsed ? '▶' : '▼'}</span>
          <span style={S.tag(tipo.color)}>{tipo.icon} {tipo.label}</span>
          <span style={{ fontWeight: 700, fontSize: 12 }}>{fmtF(mov.fecha)}</span>
          <span style={{ fontSize: 10, color: '#888' }}>{total} prenda{total !== 1 ? 's' : ''}</span>
          {mov.tipo === 'entrega' && (montoMostrar > 0 || tieneSinPrecio) && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#c06060', marginLeft: 4 }}>
              {montoMostrar > 0 ? fmtMoneda(montoMostrar) : ''}
              {tieneSinPrecio && <span style={{ color: '#b06000', marginLeft: montoMostrar > 0 ? 4 : 0 }}>⚠ precio sin cargar</span>}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {mov.tipo === 'entrega' && (
            <button style={{ ...S.btn, fontSize: 10, padding: '1px 7px' }} onClick={e => { e.stopPropagation(); setEditando(true) }}>✏</button>
          )}
          <button style={S.btnD} onClick={() => onDelete(mov.id)}>✕</button>
        </div>
      </div>
      {!collapsed && (
        <div style={{ padding: '6px 10px' }}>
          {mov.nota && <div style={{ fontSize: 10, color: '#555', marginBottom: 6, fontStyle: 'italic' }}>📝 {mov.nota}</div>}
          <table style={S.tbl}>
            <thead>
              <tr>
                <th style={{ ...S.th, textAlign: 'left' }}>Producto</th>
                <th style={S.th}>Talle</th>
                <th style={S.th}>Cant.</th>
                {mov.tipo === 'entrega' && <th style={S.th}>P/U</th>}
                {mov.tipo === 'entrega' && <th style={S.th}>Subtotal</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const pu = it.precio_unit != null ? Number(it.precio_unit) : null
                const subtotal = pu != null ? (it.cantidad || 0) * pu : null
                return (
                  <tr key={it.id}>
                    <td style={{ ...S.td, textAlign: 'left' }}>{it.productos?.nombre || '?'}</td>
                    <td style={S.td}>{it.talle}</td>
                    <td style={S.td}>{it.cantidad}</td>
                    {mov.tipo === 'entrega' && <td style={{ ...S.td, color: '#555' }}>{pu != null ? fmtMoneda(pu) : '—'}</td>}
                    {mov.tipo === 'entrega' && <td style={{ ...S.td, fontWeight: 700, color: '#1a5a1a' }}>{subtotal != null ? fmtMoneda(subtotal) : '—'}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {editando && (
        <ModalEditarMonto mov={mov} onClose={() => setEditando(false)} onSave={() => { setEditando(false); onRefresh() }} />
      )}
    </div>
  )
}

function CuentaCorrienteSection({ clienteId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clienteId) return
    setLoading(true)
    supabase.from('cuenta_corriente').select('*').eq('contacto_id', clienteId)
      .order('fecha', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [clienteId])

  async function setFact(id, val) {
    await supabase.from('cuenta_corriente').update({ facturado: val }).eq('id', id)
    const { data } = await supabase.from('cuenta_corriente').select('*').eq('contacto_id', clienteId).order('fecha', { ascending: false })
    setRows(data || [])
  }

  function netSaldo(list) {
    return list.reduce((s, r) => {
      if (r.tipo === 'debe') return s + Number(r.monto || 0)
      if (r.tipo === 'recibo' || r.tipo === 'haber') return s - Number(r.monto || 0)
      return s
    }, 0)
  }

  const rFact    = rows.filter(r => r.facturado === true)
  const rNoFact  = rows.filter(r => r.facturado === false)
  const rSinAsig = rows.filter(r => r.facturado == null)
  const sFact    = netSaldo(rFact)
  const sNoFact  = netSaldo(rNoFact)
  const sSinAsig = netSaldo(rSinAsig)
  const sTotal   = sFact + sNoFact + sSinAsig

  const colSaldo = v => v > 0 ? '#8a2020' : v < 0 ? '#1a5a1a' : '#888'
  const TIPO_LBL = { debe: 'DEBE', haber: 'HABER', recibo: 'COBRO', factura: 'FACTURA' }
  const btnAct = { ...S.btn, background: '#1a3a6b', color: '#fff', border: '1px solid #1a3a6b' }

  if (loading) return null
  if (rows.length === 0) return null

  return (
    <div style={{ border: '2px solid #a0a8b8', background: '#f4f4f0', marginBottom: 12, boxShadow: '1px 1px 0 #b8b8b8' }}>
      {/* Heading */}
      <div style={{ background: 'linear-gradient(to bottom,#e0e8f4,#d0ddf0)', padding: '6px 10px', borderBottom: '1px solid #a0a8b8', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 11, color: '#1a3a6b' }}>📊 Cuenta corriente</span>
        <span style={{ fontSize: 11 }}>
          {sFact > 0
            ? <>Pendiente de facturar: <strong style={{ color: '#8a2020' }}>{fmtMoneda(sFact)}</strong></>
            : sFact < 0
            ? <>Mercadería a entregar: <strong style={{ color: '#1a5a1a' }}>{fmtMoneda(Math.abs(sFact))}</strong></>
            : <>Facturado: <strong style={{ color: '#888' }}>$0</strong></>
          }
        </span>
        <span style={{ fontSize: 11 }}>No facturado: <strong style={{ color: colSaldo(sNoFact) }}>{fmtMoneda(Math.abs(sNoFact))}{sNoFact > 0 ? ' D' : sNoFact < 0 ? ' H' : ''}</strong></span>
        {sSinAsig !== 0 && <span style={{ fontSize: 11, color: '#888' }}>Sin asignar: <strong>{fmtMoneda(Math.abs(sSinAsig))}{sSinAsig > 0 ? ' D' : ' H'}</strong></span>}
        <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 'auto' }}>Total: <span style={{ color: colSaldo(sTotal) }}>{fmtMoneda(Math.abs(sTotal))}{sTotal > 0 ? ' D' : sTotal < 0 ? ' H' : ''}</span></span>
      </div>
      {/* Filas */}
      <table style={{ ...S.tbl, fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ ...S.th, textAlign: 'left' }}>Fecha</th>
            <th style={S.th}>Tipo</th>
            <th style={{ ...S.th, textAlign: 'left' }}>Observación</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Monto</th>
            <th style={S.th}>Asignar</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const esDebe = r.tipo === 'debe' || r.tipo === 'factura'
            const mColor = esDebe ? '#8a2020' : '#1a5a1a'
            return (
              <tr key={r.id}>
                <td style={{ ...S.td, textAlign: 'left', whiteSpace: 'nowrap' }}>{fmtF(r.fecha)}</td>
                <td style={{ ...S.td, fontWeight: 700, color: mColor }}>{TIPO_LBL[r.tipo] || r.tipo}</td>
                <td style={{ ...S.td, textAlign: 'left', color: '#555', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.observacion || '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: mColor }}>{fmtMoneda(r.monto)}</td>
                <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                    <button style={r.facturado === true ? btnAct : S.btn} onClick={() => setFact(r.id, r.facturado === true ? null : true)}>F</button>
                    <button style={r.facturado === false ? btnAct : S.btn} onClick={() => setFact(r.id, r.facturado === false ? null : false)}>NF</button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ModalFactura({ clienteId, clienteNombre, onClose, onSave }) {
  const [fecha,  setFecha]  = useState(today())
  const [monto,  setMonto]  = useState('')
  const [obs,    setObs]    = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const m = parseFloat(monto)
    if (!m || m <= 0) { alert('Ingresá un monto válido'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('cuenta_corriente').insert({
      contacto_id: clienteId, tipo: 'factura', fecha,
      monto: m, total_cobrar: m,
      observacion: obs.trim() || null,
      facturado: true, user_id: user?.id,
    })
    setSaving(false); onSave()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, width: 380 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...modalH, background: 'linear-gradient(to bottom,#1a3a6b,#0a2050)' }}>
          <span>🧾 Nueva factura — {clienteNombre}</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: F }} onClick={onClose}>✕</button>
        </div>
        <div style={modalB}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div>
              <span style={lbl}>Fecha</span>
              <input style={S.inp} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={lbl}>Monto</span>
              <input style={{ ...S.inp, width: '100%', boxSizing: 'border-box' }} type="number" min="0" step="1"
                value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <span style={lbl}>Observación</span>
            <input style={{ ...S.inp, width: '100%', boxSizing: 'border-box' }} value={obs}
              onChange={e => setObs(e.target.value)} placeholder="Ej: Factura N° 001, producto..." />
          </div>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #c0c0b0', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button style={S.btn} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btn, background: 'linear-gradient(to bottom,#1a3a6b,#0a2050)', color: '#fff', border: '1px solid #0a2050' }}
            onClick={save} disabled={saving}>{saving ? 'Guardando...' : '🧾 Registrar factura'}</button>
        </div>
      </div>
    </div>
  )
}

function ClienteBlock({ nombre, movs, onDelete, onRefresh, filtroTipo, filtroProd }) {
  const filtered = movs.filter(m => {
    if (filtroTipo && m.tipo !== filtroTipo) return false
    if (filtroProd) {
      const q = filtroProd.toLowerCase()
      if (!m.taller_movimientos_items?.some(it => it.productos?.nombre?.toLowerCase().includes(q))) return false
    }
    return true
  })
  const sortedDesc = [...filtered].sort((a, b) => {
    const d = b.fecha.localeCompare(a.fecha)
    return d !== 0 ? d : (b.created_at || '').localeCompare(a.created_at || '')
  })
  return (
    <div>
      {sortedDesc.length === 0
        ? <div style={{ padding: 10, color: '#999', fontStyle: 'italic' }}>Sin movimientos con ese filtro.</div>
        : sortedDesc.map(m => <MovCardCliente key={m.id} mov={m} onDelete={onDelete} onRefresh={onRefresh} />)
      }
    </div>
  )
}

export default function Clientes({ onMenuClick }) {
  const [movimientos,  setMovimientos]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filtroQ,      setFiltroQ]      = useState('')
  const [filtroTipo,   setFiltroTipo]   = useState('')
  const [filtroProd,   setFiltroProd]   = useState('')
  const [selected,     setSelected]     = useState(null)
  const [devolviendo,  setDevolviendo]  = useState(false)
  const [entregando,   setEntregando]   = useState(false)
  const [facturando,   setFacturando]   = useState(false)
  const initialLoad = useRef(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const isRefresh = !initialLoad.current
    const scrollY = window.scrollY
    if (!isRefresh) setLoading(true)
    const { data } = await supabase
      .from('taller_movimientos')
      .select(`id, tipo, fecha, nota, created_at,
        contactos(id, nombre),
        taller_movimientos_items(id, producto_id, talle, cantidad, precio_unit,
          productos(id, nombre, precio_venta))`)
      .in('tipo', ['entrega', 'devolucion_cliente'])
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    setMovimientos(data || [])
    setLoading(false)
    initialLoad.current = false
    if (isRefresh) requestAnimationFrame(() => window.scrollTo(0, scrollY))
  }

  async function deleteMov(id) {
    if (!window.confirm('¿Eliminar este movimiento?')) return
    await supabase.from('taller_movimientos_items').delete().eq('movimiento_id', id)
    await supabase.from('taller_movimientos').delete().eq('id', id)
    fetchAll()
  }

  // Agrupar todos para sidebar
  const todosClientes = {}
  for (const m of movimientos) {
    const cid = m.contactos?.id || '__sin__'
    if (!todosClientes[cid]) todosClientes[cid] = { cid, nombre: m.contactos?.nombre || '(sin cliente)', movs: [], lastFecha: '' }
    todosClientes[cid].movs.push(m)
    if (m.fecha > todosClientes[cid].lastFecha) todosClientes[cid].lastFecha = m.fecha
  }
  const listaSidebar = Object.values(todosClientes)
    .filter(g => !filtroQ || g.nombre.toLowerCase().includes(filtroQ.toLowerCase()))
    .sort((a, b) => b.lastFecha.localeCompare(a.lastFecha))

  const selCid   = selected || listaSidebar[0]?.cid || null
  const selGrupo = selCid ? todosClientes[selCid] : null

  return (
    <div style={{ ...S.wrap, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={S.tbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ ...S.btn, background: 'transparent', border: '1px solid #ffffff88', color: '#fff' }} onClick={onMenuClick}>☰</button>
          <span style={{ fontWeight: 700, fontSize: 13 }}>🛍️ Clientes</span>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button style={{ ...S.btn, background:'linear-gradient(to bottom,#3a6a00,#1a4a00)', color:'#fff', border:'1px solid #1a4a00', fontSize:11 }}
            onClick={() => setEntregando(true)}>
            📦 Entrega
          </button>
          {selGrupo && (
            <button style={{ ...S.btn, background:'linear-gradient(to bottom,#1a3a6b,#0a2050)', color:'#fff', border:'1px solid #0a2050', fontSize:11 }}
              onClick={() => setFacturando(true)}>
              🧾 Factura
            </button>
          )}
          {selGrupo && (
            <button style={{ ...S.btn, background:'linear-gradient(to bottom,#6a006a,#4a004a)', color:'#fff', border:'1px solid #4a004a', fontSize:11 }}
              onClick={() => setDevolviendo(true)}>
              ↩ Devolución
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar izquierdo */}
        <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid #c8cce0', background: '#eef0f8', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #c8cce0' }}>
            <input style={{ ...S.inp, width: '100%', boxSizing: 'border-box' }} value={filtroQ}
              onChange={e => setFiltroQ(e.target.value)} placeholder="Buscar cliente..." />
          </div>
          {loading ? (
            <div style={{ padding: 12, color: '#888', fontSize: 11 }}>Cargando...</div>
          ) : listaSidebar.length === 0 ? (
            <div style={{ padding: 12, color: '#888', fontSize: 11 }}>Sin clientes</div>
          ) : listaSidebar.map(g => {
            const isActive = selCid === g.cid
            const total = g.movs.filter(m => m.tipo === 'entrega')
              .flatMap(m => m.taller_movimientos_items || [])
              .reduce((s, it) => s + (it.cantidad || 0), 0)
            return (
              <div key={g.cid} onClick={() => setSelected(g.cid)}
                style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #d8dce8',
                  background: isActive ? '#1a3a6b' : 'transparent',
                  color: isActive ? '#fff' : '#1a3a6b' }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>🛍️ {g.nombre}</div>
                <div style={{ fontSize: 10, marginTop: 2, color: isActive ? '#c8d8f0' : '#888' }}>
                  {total} prenda{total !== 1 ? 's' : ''} · {g.lastFecha ? g.lastFecha.slice(0, 7) : ''}
                </div>
              </div>
            )
          })}
        </div>

        {/* Panel derecho */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={S.sel} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              {TIPOS_CLIENTE.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
            <input style={{ ...S.inp, width: 150 }} value={filtroProd} onChange={e => setFiltroProd(e.target.value)} placeholder="Producto..." />
            {(filtroTipo || filtroProd) && <button style={S.btn} onClick={() => { setFiltroTipo(''); setFiltroProd('') }}>✕ limpiar</button>}
          </div>

          {loading ? (
            <div style={{ padding: 20, color: '#666' }}>Cargando...</div>
          ) : !selGrupo ? (
            <div style={{ padding: 20, color: '#666', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🛍️</div>
              <div>Sin entregas registradas.</div>
            </div>
          ) : (
            <>
              <CuentaCorrienteSection clienteId={selCid} />
              <ClienteBlock
                nombre={selGrupo.nombre}
                movs={selGrupo.movs}
                onDelete={deleteMov}
                onRefresh={fetchAll}
                filtroTipo={filtroTipo}
                filtroProd={filtroProd}
              />
            </>
          )}
        </div>
      </div>

      {entregando && (
        <ModalEntregaCliente
          clienteId={selGrupo?.cid}
          clienteNombre={selGrupo?.nombre}
          onClose={() => setEntregando(false)}
          onSave={() => { setEntregando(false); fetchAll() }}
        />
      )}
      {facturando && selGrupo && (
        <ModalFactura
          clienteId={selGrupo.cid}
          clienteNombre={selGrupo.nombre}
          onClose={() => setFacturando(false)}
          onSave={() => { setFacturando(false); fetchAll() }}
        />
      )}
      {devolviendo && selGrupo && (
        <ModalDevolucionCliente
          clienteId={selGrupo.cid}
          clienteNombre={selGrupo.nombre}
          onClose={() => setDevolviendo(false)}
          onSave={() => { setDevolviendo(false); fetchAll() }}
        />
      )}
    </div>
  )
}
