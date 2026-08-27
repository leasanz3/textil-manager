import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const F = 'Tahoma, Trebuchet MS, sans-serif'
const today = () => new Date().toISOString().slice(0, 10)
const fmtF  = (f) => { if (!f) return '—'; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}` }
const fmtMoneda = (m) => m != null ? '$ ' + Number(m).toLocaleString('es-AR', { minimumFractionDigits: 0 }) : '—'
const TIPOS_TALLER = ['Taller', 'Estampador', 'Bordador']

const S = {
  wrap:     { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: F, fontSize: 11, color: '#000', background: '#d4d0c8' },
  tbar:     { background: 'linear-gradient(to bottom,#e8eef7,#c8d4e8)', borderBottom: '2px solid #808080', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
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
  tbl:      { borderCollapse: 'collapse', width: '100%', fontSize: 11 },
  th:       { border: '1px solid #c0c0c0', padding: '2px 6px', background: '#e8e8e0', fontWeight: 700, textAlign: 'center' },
  thL:      { border: '1px solid #c0c0c0', padding: '2px 6px', background: '#e8e8e0', fontWeight: 700, textAlign: 'left' },
  td:       { border: '1px solid #d0d0c8', padding: '2px 6px', textAlign: 'center' },
  tdL:      { border: '1px solid #d0d0c8', padding: '2px 6px', textAlign: 'left' },
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

function ModalAccionMiTaller({ producto, filas, onClose, onSave }) {
  const [accion,     setAccion]    = useState('entregar')
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
  const [nota,        setNota]       = useState('')
  const [saving,      setSaving]     = useState(false)
  const [filas,       setFilas]      = useState(() => miStockItems.map(it => ({ ...it, cantidad: '' })))
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
            onClick={save} disabled={saving}>{saving ? 'Guardando...' : '✔ Entregar'}</button>
        </div>
      </div>
    </div>
  )
}

export default function MiTaller({ onMenuClick }) {
  const [movimientos,  setMovimientos]  = useState([])
  const [controlMap,   setControlMap]   = useState({})
  const [loading,      setLoading]      = useState(true)
  const [entregando,   setEntregando]   = useState(false)
  const [enviandoFallaStock,    setEnviandoFallaStock]    = useState(null)
  const [enviandoTodasFallas,   setEnviandoTodasFallas]   = useState(null)
  const initialLoad = useRef(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const isRefresh = !initialLoad.current
    const scrollY = window.scrollY
    if (!isRefresh) setLoading(true)

    const [{ data: movs }, { data: ctrl }] = await Promise.all([
      supabase.from('taller_movimientos')
        .select(`id, tipo, fecha, nota, monto, created_at,
          contactos(id, nombre, tipo),
          taller_movimientos_items(id, producto_id, talle, cantidad,
            productos(id, nombre))`)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('taller_control_items')
        .select(`id, movimiento_id, producto_id, talle, cant_ok, cant_falla, observacion, enviado_taller, enviado_fecha, enviado_contacto_id, devuelto_taller, devuelto_fecha, devuelto_recepcion_id,
          productos(id, nombre)`),
    ])

    const map = {}
    for (const c of (ctrl || [])) {
      if (!map[c.movimiento_id]) map[c.movimiento_id] = []
      map[c.movimiento_id].push(c)
    }
    setMovimientos(movs || [])
    setControlMap(map)
    setLoading(false)
    initialLoad.current = false
    if (isRefresh) requestAnimationFrame(() => window.scrollTo(0, scrollY))
  }

  // Computar stock (mismo algoritmo que StockEnMiTaller en Talleres)
  const movFechaMap = {}
  for (const m of movimientos) movFechaMap[m.id] = m.fecha

  const fallasPendientes = {}
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

  const oldestRecepcion = {}
  for (const mov of movimientos) {
    if (mov.tipo !== 'recepcion') continue
    for (const it of (mov.taller_movimientos_items || [])) {
      const k = `${it.producto_id}__${it.talle}`
      if (!oldestRecepcion[k] || mov.fecha < oldestRecepcion[k]) oldestRecepcion[k] = mov.fecha
    }
  }

  const stock = {}
  const movsParaMiTaller = [...movimientos]
    .filter(m => m.tipo !== 'pago')
    .sort((a, b) => {
      const d = a.fecha.localeCompare(b.fecha)
      return d !== 0 ? d : (a.created_at || '').localeCompare(b.created_at || '')
    })
  for (const mov of movsParaMiTaller) {
    const sign = (mov.tipo === 'recepcion' || mov.tipo === 'devolucion_cliente') ? 1 : -1
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

  const miStockItems = prodList
    .sort((a, b) => a.oldestProd.localeCompare(b.oldestProd))
    .flatMap(p => p.filas.sort((a, b) => a.oldest.localeCompare(b.oldest)))

  const todasFallas = prodList.flatMap(p =>
    p.filas.filter(f => f.falla > 0).map(f => {
      const fg = fallasPendientes[`${f.producto_id}__${f.talle}`]
      return { prodNombre: f.prodNombre, talle: f.talle, totalCant: f.falla, controlItems: fg?.items || [], producto_id: f.producto_id }
    })
  )
  const tieneFallas = todasFallas.length > 0

  const [accionProd, setAccionProd] = useState(null)

  return (
    <div style={S.wrap}>
      <div style={S.tbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button style={{ ...S.btn, background: 'transparent', border: '1px solid #80808088', color: '#333' }} onClick={onMenuClick}>☰</button>
          <span style={{ fontWeight: 700, fontSize: 12 }}>🏭 Mi Taller</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {tieneFallas && (
            <button style={{ ...S.btn, color: '#8a2000', fontWeight: 700 }}
              onClick={() => setEnviandoTodasFallas(todasFallas)}>
              ⚠️ Enviar todas las fallas
            </button>
          )}
          {prodList.length > 0 && (
            <button style={S.btnP} onClick={() => setEntregando(true)}>
              📤 Entregar / Enviar
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {loading ? (
          <div style={{ padding: 20, color: '#666' }}>Cargando...</div>
        ) : prodList.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏭</div>
            <div style={{ fontSize: 13 }}>No hay prendas en mi taller.</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>
                {totalPrendas} prenda{totalPrendas !== 1 ? 's' : ''} en total
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {prodList.map(p => {
                const tieneFalla = p.filas.some(f => f.falla > 0)
                const tieneOk    = p.filas.some(f => f.ok > 0)
                return (
                  <div key={p.prodNombre} style={{ border: tieneFalla ? '2px solid #c88080' : '2px solid #a0a8b8', background: '#fff', padding: '8px 12px', minWidth: 220, flex: '1 1 220px', boxShadow: '1px 1px 0 #b8b8b8' }}>
                    <div style={{ marginBottom: 6, borderBottom: '1px solid #e8d8c8', paddingBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        style={{ fontFamily: F, fontWeight: 700, fontSize: 13, color: tieneFalla ? '#8a2000' : '#1a3a6b', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted', textAlign: 'left' }}
                        onClick={() => setAccionProd({ nombre: p.prodNombre, filas: p.filas.filter(f => f.ok > 0).map(f => ({ ...f, n: f.ok, producto_id: f.producto_id })) })}
                      >{tieneFalla ? '⚠️ ' : ''}{p.prodNombre}</button>
                      <span style={{ fontSize: 10, color: '#888' }}>{p.total} u.</span>
                    </div>
                    {tieneOk && (
                      <div style={{ marginBottom: tieneFalla ? 6 : 0 }}>
                        <div style={{ fontSize: 10, color: '#555', marginBottom: 3 }}>OK:</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {p.filas.filter(f => f.ok > 0).map(f => (
                            <span key={f.talle} style={{ fontSize: 11, background: '#e8f0e8', padding: '2px 8px', border: '1px solid #a8c8a8', color: '#1a4a1a' }}>
                              {f.talle} × {f.ok}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {tieneFalla && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <button
                            style={{ fontSize: 10, color: '#8a2000', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, padding: 0, textDecoration: 'underline dotted' }}
                            onClick={() => {
                              const grupos = p.filas.filter(f => f.falla > 0).map(f => {
                                const fg = fallasPendientes[`${f.producto_id}__${f.talle}`]
                                return { prodNombre: f.prodNombre, talle: f.talle, totalCant: f.falla, controlItems: fg?.items || [], producto_id: f.producto_id }
                              })
                              setEnviandoTodasFallas(grupos)
                            }}
                          >⚠️ Con falla — enviar al taller</button>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {p.filas.filter(f => f.falla > 0).map(f => {
                            const fg = fallasPendientes[`${f.producto_id}__${f.talle}`]
                            return (
                              <button key={f.talle}
                                style={{ fontSize: 11, background: 'none', border: 'none', padding: 0, color: '#8a2000', fontWeight: 700, cursor: 'pointer', fontFamily: F, textDecoration: 'underline dotted' }}
                                onClick={() => setEnviandoFallaStock({ prodNombre: f.prodNombre, talle: f.talle, totalCant: f.falla, controlItems: fg?.items || [], producto_id: f.producto_id })}
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
          </>
        )}
      </div>

      {accionProd && (
        <ModalAccionMiTaller
          producto={accionProd.nombre}
          filas={accionProd.filas}
          onClose={() => setAccionProd(null)}
          onSave={() => { setAccionProd(null); fetchAll() }}
        />
      )}
      {entregando && (
        <ModalEntregarCliente
          miStockItems={miStockItems}
          onClose={() => setEntregando(false)}
          onSave={() => { setEntregando(false); fetchAll() }}
          titulo="📤 Entregar / Enviar desde mi taller"
          contactoLabel="Cliente o Taller"
        />
      )}
      {enviandoFallaStock && (
        <ModalEnviarFallasDesdeStock
          fallaGroup={enviandoFallaStock}
          onClose={() => setEnviandoFallaStock(null)}
          onSave={() => { setEnviandoFallaStock(null); fetchAll() }}
        />
      )}
      {enviandoTodasFallas && (
        <ModalEnviarTodasFallas
          fallaGroups={enviandoTodasFallas}
          onClose={() => setEnviandoTodasFallas(null)}
          onSave={() => { setEnviandoTodasFallas(null); fetchAll() }}
        />
      )}
    </div>
  )
}
