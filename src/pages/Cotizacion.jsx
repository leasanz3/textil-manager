import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const F = 'Tahoma, Trebuchet MS, sans-serif'
const today = () => new Date().toISOString().slice(0, 10)
const fmtF  = f => { if (!f) return '—'; const s = f.includes('T') ? f.split('T')[0] : f; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}` }
const fmtM  = n => { const v = parseFloat(n); if (!v) return '$ 0'; return '$ ' + v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

const COSTO_FIELDS = [
  { key: 'costo_confeccion', label: '✂ Confección' },
  { key: 'costo_corte',      label: 'Corte' },
]

const ESTADO_BG = { pendiente: '#fff3c8', aceptada: '#d4f0d4', no_aceptada: '#ffd4d4', cancelada: '#e8e8e8' }
const ESTADO_LABEL = { pendiente: 'Pendiente', aceptada: 'Aceptada', no_aceptada: 'No aceptada', cancelada: 'Cancelada' }

function costoTotalPrenda(p) {
  const ct = (p.telas || []).length > 0
    ? (p.telas || []).reduce((a, t) => a + (parseFloat(t.costo) || 0), 0)
    : (parseFloat(p.costo_telas) || 0)
  const ce = (p.estampados || []).length > 0
    ? (p.estampados || []).reduce((a, e) => a + (parseFloat(e.costo) || 0), 0)
    : (parseFloat(p.costo_otros) || 0)
  const ca = (p.avios || []).reduce((a, av) => a + (parseFloat(av.costo) || 0), 0)
  const cf = COSTO_FIELDS.reduce((a, f) => {
    if (f.key === 'costo_elasticos' && (p.avios || []).length > 0) return a
    return a + (parseFloat(p[f.key]) || 0)
  }, 0)
  return ct + ce + ca + cf
}

const emptyPrenda = () => ({
  _key: Math.random(), id: null, nombre: '',
  telas: [], estampados: [],
  costo_telas: '', costo_otros: '',
  costo_confeccion: '', costo_corte: '', costo_elasticos: '',
  avios: [],
  margen_pct: '', precio_venta: '', precio_cotizado: '', notas: '', open: true,
})

const emptyPrecio = () => ({
  _key: Math.random(), id: null,
  proveedor: '', tela: '', precio_metro: '', ancho: '', fecha: today(), notas: '',
})

const S = {
  panel: { background: '#fff', border: '1px solid #a8a8a8', marginBottom: 8 },
  hdr:   { padding: '5px 10px', fontWeight: 700, fontSize: 11, background: 'linear-gradient(to bottom,#e8eef7,#c8d4e8)', borderBottom: '1px solid #6b83a8', color: '#1a3a6b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  body:  { padding: 10 },
  inp:   { fontFamily: F, fontSize: 11, border: '1px solid #a8a8a8', padding: '2px 6px', width: '100%', boxSizing: 'border-box' },
  btn:   { fontFamily: F, fontSize: 11, background: 'linear-gradient(to bottom,#f0f0e8,#d8d4c8)', border: '1px solid #808080', padding: '2px 10px', cursor: 'pointer' },
  lbl:   { display: 'block', fontWeight: 700, fontSize: 10, color: '#555', marginBottom: 2 },
  th:    { padding: '4px 6px', background: 'linear-gradient(to bottom,#e8eef7,#c8d4e8)', color: '#1a3a6b', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #6b83a8', textAlign: 'left', whiteSpace: 'nowrap' },
  td:    { padding: '3px 4px', borderBottom: '1px solid #eee', verticalAlign: 'middle' },
}

export default function Cotizacion({ onMenuClick }) {
  const [cotizaciones, setCotizaciones] = useState([])
  const [contactos,    setContactos]    = useState([])
  const [productos,    setProductos]    = useState([])
  const [aviosCat,     setAviosCat]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [savedOk,      setSavedOk]      = useState(false)
  const [cot,          setCot]          = useState(null) // null = lista
  const [nuevoPrecio,  setNuevoPrecio]  = useState(emptyPrecio())

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: cots }, { data: conts }, { data: prods }, { data: avs }] = await Promise.all([
      supabase.from('cotizaciones').select('id, nombre, cliente, estado, created_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('contactos').select('id, nombre, tipo').order('nombre'),
      supabase.from('productos').select('id, nombre, costo_confeccion, costo_corte, costo_elasticos, costo_otros, tela1_id, tela1_consumo, tela2_id, tela2_consumo, rib_id, rib_consumo, telas_extra, tipo_cambio, estampados, avios_ids').order('nombre'),
      supabase.from('avios').select('id, nombre, tipo, unidad, precio').order('nombre'),
    ])
    setCotizaciones(cots || [])
    setContactos(conts || [])
    setProductos(prods || [])
    setAviosCat(avs || [])
    setLoading(false)
  }

  async function openCot(id) {
    const [{ data: c }, { data: precios }, { data: prendas }] = await Promise.all([
      supabase.from('cotizaciones').select('*').eq('id', id).single(),
      supabase.from('cotizacion_precios_tela').select('*').eq('cotizacion_id', id).order('fecha'),
      supabase.from('cotizacion_prendas').select('*').eq('cotizacion_id', id).order('orden'),
    ])
    setCot({
      ...c,
      tipo_cambio: c.tipo_cambio ?? '',
      precios: precios?.length
        ? precios.map(p => ({ ...p, _key: Math.random(), precio_metro: p.precio_metro ?? '', ancho: p.ancho ?? '', proveedor: p.proveedor ?? '', notas: p.notas ?? '' }))
        : [emptyPrecio()],
      prendas: prendas?.length
        ? prendas.map(p => ({ ...p, _key: Math.random(), open: false,
            telas: (p.telas_detalle || []).map(t => ({ ...t, _key: Math.random() })),
            estampados: (p.estampados_detalle || []).map(e => ({ ...e, _key: Math.random() })),
            avios: (p.avios_detalle || []).map(a => ({ ...a, _key: Math.random() })),
            costo_telas: p.costo_telas ?? '', costo_confeccion: p.costo_confeccion ?? '',
            costo_corte: p.costo_corte ?? '', costo_elasticos: p.costo_elasticos ?? '',
            costo_otros: p.costo_otros ?? '', margen_pct: p.margen_pct ?? '', precio_venta: p.precio_venta ?? '', precio_cotizado: p.precio_cotizado ?? '', notas: p.notas ?? '',
          }))
        : [emptyPrenda()],
    })
  }

  function nuevaCot() {
    setCot({ id: null, nombre: '', cliente: '', notas: '', estado: 'pendiente', tipo_cambio: '', precios: [emptyPrecio()], prendas: [emptyPrenda()] })
  }

  const updCot = (field, val) => setCot(c => {
    if (field !== 'tipo_cambio') return { ...c, [field]: val }
    const tc = parseFloat(val) || 0
    const prendas = c.prendas.map(p => {
      const telas = p.telas.map(t => {
        if (t.moneda !== 'USD' || !tc) return t
        const precioMetro = t.precioBase * tc
        return { ...t, precioMetro, costo: (parseFloat(t.consumo) || 0) * precioMetro }
      })
      const updP = { ...p, telas }
      if (updP.margen_pct !== '') {
        const ct = costoTotalPrenda(updP)
        if (ct > 0) updP.precio_venta = (ct * (1 + parseFloat(updP.margen_pct) / 100)).toFixed(2)
      }
      return updP
    })
    return { ...c, tipo_cambio: val, prendas }
  })

  const updPrecio = (key, field, val) =>
    setCot(c => ({ ...c, precios: c.precios.map(p => p._key === key ? { ...p, [field]: val } : p) }))
  const addPrecio = () => setCot(c => ({ ...c, precios: [...c.precios, emptyPrecio()] }))
  const delPrecio = key => setCot(c => ({ ...c, precios: c.precios.filter(p => p._key !== key) }))

  async function pickProductoEnPrenda(key, prod) {
    const consumoMap = {}
    if (prod.tela1_id) consumoMap[Number(prod.tela1_id)] = parseFloat(prod.tela1_consumo) || 0
    if (prod.tela2_id) consumoMap[Number(prod.tela2_id)] = parseFloat(prod.tela2_consumo) || 0
    if (prod.rib_id)   consumoMap[Number(prod.rib_id)]   = parseFloat(prod.rib_consumo)   || 0
    ;(prod.telas_extra || []).forEach(te => {
      if (te.tela_id) consumoMap[Number(te.tela_id)] = parseFloat(te.consumo) || 0
    })
    const ids = Object.keys(consumoMap).map(Number).filter(Boolean)
    const tc = parseFloat(cot.tipo_cambio) || parseFloat(prod.tipo_cambio) || 1

    let telasArr = []
    if (ids.length > 0) {
      const { data: telas } = await supabase.from('telas').select('id, tipo, precio, rendimiento, unidad, moneda').in('id', ids)
      telasArr = (telas || []).map(t => {
        const consumo = consumoMap[t.id]
        const precioBase = t.unidad === 'kg'
          ? (t.rendimiento ? (parseFloat(t.precio) || 0) / parseFloat(t.rendimiento) : 0)
          : (parseFloat(t.precio) || 0)
        const precioMetro = t.moneda === 'USD' ? precioBase * tc : precioBase
        const costo = consumo * precioMetro
        return { _key: Math.random(), tela_id: t.id, nombre: t.tipo, consumo, precioBase, precioMetro, moneda: t.moneda, costo }
      })
    }

    const estampadosArr = (prod.estampados || []).map(e => ({
      _key: Math.random(),
      nombre: e.nombre || e.descripcion || 'Estampado',
      costo: parseFloat(e.precio) || parseFloat(e.costo) || 0,
    }))

    const aviosArr = (prod.avios_ids || []).map(item => {
      const cat = aviosCat.find(x => x.id === (item.avio_id || item))
      const precio = parseFloat(cat?.precio) || 0
      const cantidad = parseFloat(item.cantidad) || 1
      return {
        _key: Math.random(),
        avio_id: item.avio_id || null,
        nombre: item.nombre || cat?.nombre || '',
        unidad: item.unidad || cat?.unidad || 'u',
        cantidad: String(cantidad),
        precio,
        costo: cantidad * precio,
      }
    }).filter(a => a.nombre)

    setCot(c => ({ ...c, prendas: c.prendas.map(p => {
      if (p._key !== key) return p
      return {
        ...p,
        nombre:           prod.nombre,
        telas:            telasArr,
        estampados:       estampadosArr,
        avios:            aviosArr,
        costo_confeccion: prod.costo_confeccion != null ? String(prod.costo_confeccion) : p.costo_confeccion,
        costo_corte:      prod.costo_corte      != null ? String(prod.costo_corte)      : p.costo_corte,
        costo_elasticos:  prod.costo_elasticos  != null ? String(prod.costo_elasticos)  : p.costo_elasticos,
      }
    }) }))
  }

  function updTela(pKey, tKey, field, val) {
    setCot(c => ({ ...c, prendas: c.prendas.map(p => {
      if (p._key !== pKey) return p
      const telas = p.telas.map(t => {
        if (t._key !== tKey) return t
        const upd = { ...t, [field]: val }
        if (field === 'precioMetro') upd.precioBase = parseFloat(val) || 0
        upd.costo = (parseFloat(upd.consumo) || 0) * (parseFloat(upd.precioMetro) || 0)
        return upd
      })
      const updP = { ...p, telas }
      if (updP.margen_pct !== '') {
        const ct = costoTotalPrenda(updP)
        if (ct > 0) updP.precio_venta = (ct * (1 + parseFloat(updP.margen_pct) / 100)).toFixed(2)
      }
      return updP
    }) }))
  }

  function addTela(pKey) {
    setCot(c => ({ ...c, prendas: c.prendas.map(p => p._key !== pKey ? p :
      { ...p, telas: [...p.telas, { _key: Math.random(), tela_id: null, nombre: '', consumo: '', precioMetro: '', moneda: 'ARS', costo: 0 }] }
    ) }))
  }

  function delTela(pKey, tKey) {
    setCot(c => ({ ...c, prendas: c.prendas.map(p => p._key !== pKey ? p :
      { ...p, telas: p.telas.filter(t => t._key !== tKey) }
    ) }))
  }

  function updEstampado(pKey, eKey, field, val) {
    setCot(c => ({ ...c, prendas: c.prendas.map(p => {
      if (p._key !== pKey) return p
      const estampados = p.estampados.map(e => e._key !== eKey ? e : { ...e, [field]: val })
      const updP = { ...p, estampados }
      if (updP.margen_pct !== '') {
        const ct = costoTotalPrenda(updP)
        if (ct > 0) updP.precio_venta = (ct * (1 + parseFloat(updP.margen_pct) / 100)).toFixed(2)
      }
      return updP
    }) }))
  }

  function addEstampado(pKey) {
    setCot(c => ({ ...c, prendas: c.prendas.map(p => p._key !== pKey ? p :
      { ...p, estampados: [...p.estampados, { _key: Math.random(), nombre: '', costo: '' }] }
    ) }))
  }

  function delEstampado(pKey, eKey) {
    setCot(c => ({ ...c, prendas: c.prendas.map(p => p._key !== pKey ? p :
      { ...p, estampados: p.estampados.filter(e => e._key !== eKey) }
    ) }))
  }

  function updAvio(pKey, aKey, field, val) {
    setCot(c => ({ ...c, prendas: c.prendas.map(p => {
      if (p._key !== pKey) return p
      const avios = p.avios.map(a => {
        if (a._key !== aKey) return a
        const upd = { ...a, [field]: val }
        if (field === 'nombre') {
          const match = aviosCat.find(x => x.nombre === val)
          if (match) { upd.avio_id = match.id; upd.precio = parseFloat(match.precio) || 0; upd.unidad = match.unidad || 'u' }
        }
        upd.costo = (parseFloat(upd.cantidad) || 0) * (parseFloat(upd.precio) || 0)
        return upd
      })
      const updP = { ...p, avios }
      if (updP.margen_pct !== '') {
        const ct = costoTotalPrenda(updP)
        if (ct > 0) updP.precio_venta = (ct * (1 + parseFloat(updP.margen_pct) / 100)).toFixed(2)
      }
      return updP
    }) }))
  }

  function addAvio(pKey) {
    setCot(c => ({ ...c, prendas: c.prendas.map(p => p._key !== pKey ? p :
      { ...p, avios: [...(p.avios || []), { _key: Math.random(), avio_id: null, nombre: '', unidad: 'u', cantidad: '', precio: '', costo: 0 }] }
    ) }))
  }

  function delAvio(pKey, aKey) {
    setCot(c => ({ ...c, prendas: c.prendas.map(p => p._key !== pKey ? p :
      { ...p, avios: p.avios.filter(a => a._key !== aKey) }
    ) }))
  }

  function updPrenda(key, field, val) {
    setCot(c => ({ ...c, prendas: c.prendas.map(p => {
      if (p._key !== key) return p
      const upd = { ...p, [field]: val }
      const ct  = costoTotalPrenda(upd)
      if (field === 'margen_pct' && val !== '' && ct > 0)
        upd.precio_venta = (ct * (1 + parseFloat(val) / 100)).toFixed(2)
      if (field === 'precio_venta' && val !== '' && ct > 0)
        upd.margen_pct = ((parseFloat(val) - ct) / ct * 100).toFixed(1)
      if (!['precio_venta','margen_pct','nombre','notas','open'].includes(field) && upd.margen_pct !== '') {
        const ct2 = costoTotalPrenda(upd)
        if (ct2 > 0) upd.precio_venta = (ct2 * (1 + parseFloat(upd.margen_pct) / 100)).toFixed(2)
      }
      return upd
    }) }))
  }
  const addPrenda    = () => setCot(c => ({ ...c, prendas: [...c.prendas, emptyPrenda()] }))
  const delPrenda    = key => setCot(c => ({ ...c, prendas: c.prendas.filter(p => p._key !== key) }))
  const togglePrenda = key => updPrenda(key, 'open', !cot.prendas.find(p => p._key === key)?.open)

  async function handleGuardar() {
    if (!cot.nombre.trim()) { alert('Poné un nombre a la cotización'); return }
    setSaving(true)
    let cotId = cot.id
    const cotData = { nombre: cot.nombre, cliente: cot.cliente || null, notas: cot.notas || null, estado: cot.estado }
    if (!cotId) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('cotizaciones').insert({ ...cotData, producto_id: null, user_id: user?.id }).select('id').single()
      if (error) { alert('Error al guardar: ' + error.message); setSaving(false); return }
      cotId = data.id
    } else {
      await supabase.from('cotizaciones').update(cotData).eq('id', cotId)
    }
    // precios — delete + insert
    await supabase.from('cotizacion_precios_tela').delete().eq('cotizacion_id', cotId)
    const precIns = cot.precios.filter(p => p.tela?.trim()).map(p => ({
      cotizacion_id: cotId, proveedor: p.proveedor || null, tela: p.tela,
      precio_metro: parseFloat(p.precio_metro) || null, ancho: parseFloat(p.ancho) || null,
      fecha: p.fecha || null, notas: p.notas || null,
    }))
    if (precIns.length) await supabase.from('cotizacion_precios_tela').insert(precIns)
    // prendas — delete + insert
    await supabase.from('cotizacion_prendas').delete().eq('cotizacion_id', cotId)
    const prenIns = cot.prendas.filter(p => p.nombre?.trim()).map((p, i) => {
      const costo_telas = (p.telas || []).length > 0
        ? (p.telas || []).reduce((a, t) => a + (parseFloat(t.costo) || 0), 0)
        : (parseFloat(p.costo_telas) || 0)
      const costo_otros = (p.estampados || []).length > 0
        ? (p.estampados || []).reduce((a, e) => a + (parseFloat(e.costo) || 0), 0)
        : (parseFloat(p.costo_otros) || 0)
      return {
        cotizacion_id: cotId, nombre: p.nombre, orden: i,
        costo_telas,
        costo_confeccion:        parseFloat(p.costo_confeccion)        || 0,
        costo_corte:             parseFloat(p.costo_corte)             || 0,
        costo_elasticos: (p.avios || []).length > 0
          ? (p.avios || []).reduce((a, av) => a + (parseFloat(av.costo) || 0), 0)
          : (parseFloat(p.costo_elasticos) || 0),
        costo_estampado_frente:  0,
        costo_estampado_espalda: 0,
        costo_otros,
        costo_total:             costoTotalPrenda(p),
        margen_pct:              parseFloat(p.margen_pct)     || null,
        precio_venta:            parseFloat(p.precio_venta)   || null,
        precio_cotizado:         parseFloat(p.precio_cotizado) || null,
        notas:                   p.notas || null,
        telas_detalle:           p.telas || [],
        estampados_detalle:      p.estampados || [],
        avios_detalle:           p.avios || [],
      }
    })
    if (prenIns.length) {
      const { error: prenError } = await supabase.from('cotizacion_prendas').insert(prenIns)
      if (prenError) { alert('Error al guardar prendas: ' + prenError.message); setSaving(false); return }
    }
    setSaving(false)
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2500)
    await fetchAll()
    await openCot(cotId)
  }

  async function handleEliminar() {
    if (!cot.id) { setCot(null); return }
    if (!window.confirm('¿Eliminar esta cotización?')) return
    await supabase.from('cotizaciones').delete().eq('id', cot.id)
    setCot(null)
    fetchAll()
  }

  const totalCosto = cot ? cot.prendas.reduce((a, p) => a + costoTotalPrenda(p), 0) : 0
  const totalVenta = cot ? cot.prendas.reduce((a, p) => a + (parseFloat(p.precio_venta) || 0), 0) : 0

  // ── LISTA ─────────────────────────────────────────────────────────────────────
  if (!cot) {
    return (
      <div>
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
            <h2>💰 Cotización</h2>
          </div>
          <button className="btn btn-primary btn-sm" onClick={nuevaCot}>+ Nueva cotización</button>
        </div>
        <div className="content" style={{ fontFamily: F, fontSize: 11 }}>
          {loading ? <div className="loading"><div className="spinner" /></div> : (
            <div style={S.panel}>
              <div style={S.hdr}><span>Cotizaciones guardadas</span></div>
              {cotizaciones.length === 0 ? (
                <div style={{ ...S.body, color: '#888', fontStyle: 'italic' }}>Sin cotizaciones aún — creá una nueva</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={S.th}>Fecha</th>
                      <th style={S.th}>Trabajo / cliente</th>
                      <th style={S.th}>Cliente</th>
                      <th style={S.th}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cotizaciones.map(c => (
                      <tr key={c.id} style={{ cursor: 'pointer' }}
                        onClick={() => openCot(c.id)}
                        onMouseEnter={e => e.currentTarget.style.background = '#ffffcc'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={{ ...S.td, whiteSpace: 'nowrap' }}>{fmtF(c.created_at)}</td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{c.nombre || '—'}</td>
                        <td style={S.td}>{c.cliente || '—'}</td>
                        <td style={S.td}>
                          <span style={{ padding: '1px 6px', fontSize: 10, fontWeight: 700, background: ESTADO_BG[c.estado] || '#eee' }}>
                            {ESTADO_LABEL[c.estado] || c.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── EDICIÓN ───────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <button style={{ ...S.btn, fontSize: 10 }} onClick={() => setCot(null)}>← Volver</button>
          <h2 style={{ margin: 0, fontSize: 13 }}>
            💰 {cot.id ? (cot.nombre || 'Cotización') : 'Nueva cotización'}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ ...S.btn, color: '#a00', fontSize: 10 }} onClick={handleEliminar}>🗑 Eliminar</button>
          <button className="btn btn-primary btn-sm" onClick={handleGuardar} disabled={saving}>
            {saving ? 'Guardando…' : savedOk ? '✓ Guardado!' : '✓ Guardar'}
          </button>
        </div>
      </div>

      <div className="content" style={{ fontFamily: F, fontSize: 11 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 8, alignItems: 'start' }}>

          {/* ── Columna principal ──────────────────────────────────────────────── */}
          <div>

            {/* Datos generales */}
            <div style={S.panel}>
              <div style={S.hdr}><span>📋 Datos generales</span></div>
              <div style={{ ...S.body, display: 'grid', gridTemplateColumns: '2fr 1fr 130px', gap: 8 }}>
                <div>
                  <label style={S.lbl}>Nombre del trabajo *</label>
                  <input style={S.inp} value={cot.nombre} onChange={e => updCot('nombre', e.target.value)} placeholder="Ej: Colegio San Martín 2026" />
                </div>
                <div>
                  <label style={S.lbl}>Cliente</label>
                  <input style={S.inp} value={cot.cliente || ''} onChange={e => updCot('cliente', e.target.value)} placeholder="Nombre del cliente" list="cot-contactos" />
                  <datalist id="cot-contactos">
                    {contactos.map(c => <option key={c.id} value={c.nombre} />)}
                  </datalist>
                  <datalist id="cot-proveedores">
                    {contactos.filter(c => c.tipo === 'Proveedor').map(c => <option key={c.id} value={c.nombre} />)}
                  </datalist>
                </div>
                <div>
                  <label style={S.lbl}>Estado</label>
                  <select style={{ ...S.inp, padding: '2px 4px' }} value={cot.estado} onChange={e => updCot('estado', e.target.value)}>
                    <option value="pendiente">Pendiente</option>
                    <option value="aceptada">Aceptada</option>
                    <option value="no_aceptada">No aceptada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
                <div>
                  <label style={S.lbl}>Tipo de cambio $ / USD</label>
                  <input
                    type="number"
                    style={{ ...S.inp, width: 110, textAlign: 'right' }}
                    value={cot.tipo_cambio}
                    onChange={e => updCot('tipo_cambio', e.target.value)}
                    placeholder="$ por USD"
                  />
                </div>
              </div>
              <div style={{ ...S.body, paddingTop: 0 }}>
                <label style={S.lbl}>Observaciones</label>
                <textarea style={{ ...S.inp, resize: 'vertical' }} rows={2} value={cot.notas || ''} onChange={e => updCot('notas', e.target.value)} placeholder="Notas generales de la cotización…" />
              </div>
            </div>

            {/* Precios de tela recibidos */}
            <div style={S.panel}>
              <div style={S.hdr}><span>🧶 Precios de tela recibidos</span></div>

              {/* Formulario de ingreso */}
              <div style={{ ...S.body, borderBottom: '2px solid #c8d4e8' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '115px 1fr 1fr 90px 80px', gap: 6, marginBottom: 6 }}>
                  <div>
                    <label style={S.lbl}>Fecha</label>
                    <input type="date" style={S.inp} value={nuevoPrecio.fecha} onChange={e => setNuevoPrecio(p => ({ ...p, fecha: e.target.value }))} />
                  </div>
                  <div>
                    <label style={S.lbl}>Proveedor</label>
                    <input style={S.inp} value={nuevoPrecio.proveedor} onChange={e => setNuevoPrecio(p => ({ ...p, proveedor: e.target.value }))} placeholder="Proveedor" list="cot-proveedores" />
                  </div>
                  <div>
                    <label style={S.lbl}>Tela</label>
                    <input style={S.inp} value={nuevoPrecio.tela} onChange={e => setNuevoPrecio(p => ({ ...p, tela: e.target.value }))} placeholder="Tipo de tela" />
                  </div>
                  <div>
                    <label style={S.lbl}>$ / metro</label>
                    <input type="number" style={{ ...S.inp, textAlign: 'right' }} value={nuevoPrecio.precio_metro} onChange={e => setNuevoPrecio(p => ({ ...p, precio_metro: e.target.value }))} placeholder="0" />
                  </div>
                  <div>
                    <label style={S.lbl}>Ancho (m)</label>
                    <input type="number" style={{ ...S.inp, textAlign: 'right' }} value={nuevoPrecio.ancho} onChange={e => setNuevoPrecio(p => ({ ...p, ancho: e.target.value }))} placeholder="1.50" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'end' }}>
                  <div>
                    <label style={S.lbl}>Notas</label>
                    <input style={S.inp} value={nuevoPrecio.notas} onChange={e => setNuevoPrecio(p => ({ ...p, notas: e.target.value }))} placeholder="Observaciones…" />
                  </div>
                  <button style={{ ...S.btn, background: 'linear-gradient(to bottom,#d4e8d4,#a8c8a8)', borderColor: '#4a8a4a', fontWeight: 700, padding: '3px 14px' }}
                    onClick={() => {
                      if (!nuevoPrecio.tela.trim()) return
                      setCot(c => ({ ...c, precios: [...c.precios, { ...nuevoPrecio, _key: Math.random() }] }))
                      setNuevoPrecio(emptyPrecio())
                    }}>
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Lista de precios ingresados */}
              {cot.precios.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={S.th}>Fecha</th>
                        <th style={S.th}>Proveedor</th>
                        <th style={S.th}>Tela</th>
                        <th style={{ ...S.th, textAlign: 'right' }}>$ / metro</th>
                        <th style={{ ...S.th, textAlign: 'right' }}>Ancho</th>
                        <th style={S.th}>Notas</th>
                        <th style={S.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cot.precios.map(p => (
                        <tr key={p._key}>
                          <td style={{ ...S.td, whiteSpace: 'nowrap' }}>{fmtF(p.fecha)}</td>
                          <td style={S.td}>{p.proveedor || '—'}</td>
                          <td style={{ ...S.td, fontWeight: 700 }}>{p.tela}</td>
                          <td style={{ ...S.td, textAlign: 'right' }}>{p.precio_metro ? fmtM(p.precio_metro) : '—'}</td>
                          <td style={{ ...S.td, textAlign: 'right' }}>{p.ancho ? p.ancho + ' m' : '—'}</td>
                          <td style={{ ...S.td, color: '#666' }}>{p.notas || '—'}</td>
                          <td style={S.td}>
                            <button style={{ ...S.btn, padding: '1px 6px', color: '#a00' }} onClick={() => delPrecio(p._key)}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Prendas */}
            <div style={S.panel}>
              <div style={S.hdr}>
                <span>👕 Prendas</span>
                <button style={{ ...S.btn, fontSize: 10 }} onClick={addPrenda}>+ Agregar prenda</button>
              </div>
              <div>
                {cot.prendas.map(p => {
                  const ct = costoTotalPrenda(p)
                  return (
                    <div key={p._key} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      {/* Header prenda */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: p.open ? '#eef2f8' : '#fff', cursor: 'pointer' }}
                        onClick={() => togglePrenda(p._key)}
                      >
                        <span style={{ fontSize: 10, color: '#888', width: 12, flexShrink: 0 }}>{p.open ? '▼' : '▶'}</span>
                        <input
                          style={{ ...S.inp, fontWeight: 700, flex: 1, maxWidth: 220 }}
                          value={p.nombre}
                          onChange={e => {
                            e.stopPropagation()
                            const val = e.target.value
                            updPrenda(p._key, 'nombre', val)
                            const prod = productos.find(pr => pr.nombre === val)
                            if (prod) pickProductoEnPrenda(p._key, prod)
                          }}
                          onClick={e => e.stopPropagation()}
                          placeholder="Nombre de la prenda o elegí de la lista"
                          list={`prods-${p._key}`}
                        />
                        <datalist id={`prods-${p._key}`}>
                          {productos.map(pr => <option key={pr.id} value={pr.nombre} />)}
                        </datalist>
                        <span style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap' }}>
                          Costo: {fmtM(ct)}
                        </span>
                        {parseFloat(p.precio_cotizado) > 0
                          ? <span style={{ fontSize: 14, fontWeight: 700, color: '#1a5a1a', whiteSpace: 'nowrap' }}>{fmtM(parseFloat(p.precio_cotizado))} <span style={{ fontWeight: 400, fontSize: 10 }}>IVA inc.</span></span>
                          : parseFloat(p.precio_venta) > 0
                            ? <span style={{ fontSize: 12, fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>{fmtM(parseFloat(p.precio_venta) * 1.22)} <span style={{ fontWeight: 400, fontSize: 10 }}>IVA inc.</span></span>
                            : null
                        }
                        <button
                          style={{ ...S.btn, padding: '1px 6px', color: '#a00', marginLeft: 'auto', flexShrink: 0 }}
                          onClick={e => { e.stopPropagation(); delPrenda(p._key) }}
                        >✕</button>
                      </div>
                      {/* Body prenda */}
                      {p.open && (
                        <div style={{ padding: '8px 10px 10px', background: '#fafbfd' }}>

                          {/* ── Telas ── */}
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 10, color: '#1a3a6b', marginBottom: 4 }}>🧶 TELAS</div>
                            {p.telas.length === 0 && (
                              <div style={{ fontSize: 10, color: '#888', marginBottom: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                  type="number"
                                  style={{ ...S.inp, width: 90, textAlign: 'right' }}
                                  value={p.costo_telas}
                                  onChange={e => updPrenda(p._key, 'costo_telas', e.target.value)}
                                  placeholder="0"
                                />
                                <span style={{ color: '#aaa' }}>— o elegí un producto arriba para ver el desglose</span>
                              </div>
                            )}
                            {p.telas.map(t => {
                              const preciosSug = (cot.precios || []).filter(pr => pr.precio_metro)
                              return (
                                <div key={t._key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11 }}>
                                  <input
                                    style={{ ...S.inp, flex: 2 }}
                                    value={t.nombre}
                                    list={`nombres-tela-${t._key}`}
                                    onChange={e => {
                                      const val = e.target.value
                                      updTela(p._key, t._key, 'nombre', val)
                                      const match = preciosSug.find(pr => pr.tela === val)
                                      if (match?.precio_metro) updTela(p._key, t._key, 'precioMetro', String(match.precio_metro))
                                    }}
                                    placeholder="Nombre tela"
                                  />
                                  <datalist id={`nombres-tela-${t._key}`}>
                                    {preciosSug.filter(pr => pr.tela).map(pr => (
                                      <option key={pr._key} value={pr.tela} label={`$${pr.precio_metro}/m — ${pr.proveedor || ''}`} />
                                    ))}
                                  </datalist>
                                  <input
                                    type="number"
                                    style={{ ...S.inp, width: 60, textAlign: 'right' }}
                                    value={t.consumo}
                                    onChange={e => updTela(p._key, t._key, 'consumo', e.target.value)}
                                    placeholder="m"
                                    title="Consumo en metros"
                                  />
                                  <span style={{ color: '#888', fontSize: 10 }}>m ×</span>
                                  <input
                                    type="number"
                                    style={{ ...S.inp, width: 80, textAlign: 'right' }}
                                    value={t.precioMetro}
                                    onChange={e => updTela(p._key, t._key, 'precioMetro', e.target.value)}
                                    placeholder="$/m"
                                    title="Precio por metro (ARS)"
                                  />
                                  {t.moneda === 'USD' && t.precioBase > 0 && (
                                    <span style={{ color: '#1a5a1a', fontSize: 10, whiteSpace: 'nowrap' }}>
                                      U$D {parseFloat(t.precioBase).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  )}
                                  <span style={{ color: '#888', fontSize: 10 }}>/m =</span>
                                  <span style={{ fontWeight: 700, minWidth: 70, textAlign: 'right', fontSize: 11 }}>{fmtM(t.costo)}</span>
                                  <button style={{ ...S.btn, padding: '1px 5px', color: '#a00' }} onClick={() => delTela(p._key, t._key)}>✕</button>
                                </div>
                              )
                            })}
                            <button style={{ ...S.btn, fontSize: 10, marginTop: 2 }} onClick={() => addTela(p._key)}>+ Agregar tela</button>
                          </div>

                          {/* ── Estampados ── */}
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 10, color: '#6a3a00', marginBottom: 4 }}>🖨 ESTAMPADOS Y BORDADOS</div>
                            {p.estampados.length === 0 && (
                              <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>
                                <input
                                  type="number"
                                  style={{ ...S.inp, width: 90, textAlign: 'right' }}
                                  value={p.costo_otros}
                                  onChange={e => updPrenda(p._key, 'costo_otros', e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                            )}
                            {p.estampados.map(e => (
                              <div key={e._key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11 }}>
                                <input
                                  style={{ ...S.inp, flex: 2 }}
                                  value={e.nombre}
                                  onChange={ev => updEstampado(p._key, e._key, 'nombre', ev.target.value)}
                                  placeholder="Descripción"
                                />
                                <input
                                  type="number"
                                  style={{ ...S.inp, width: 90, textAlign: 'right' }}
                                  value={e.costo}
                                  onChange={ev => updEstampado(p._key, e._key, 'costo', ev.target.value)}
                                  placeholder="$"
                                />
                                <button style={{ ...S.btn, padding: '1px 5px', color: '#a00' }} onClick={() => delEstampado(p._key, e._key)}>✕</button>
                              </div>
                            ))}
                            <button style={{ ...S.btn, fontSize: 10, marginTop: 2 }} onClick={() => addEstampado(p._key)}>+ Agregar estampado</button>
                          </div>

                          {/* ── Avíos ── */}
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 10, color: '#4a2a6b', marginBottom: 4 }}>🧵 AVÍOS Y ELÁSTICOS</div>
                            {(p.avios || []).length === 0 && (
                              <div style={{ fontSize: 10, color: '#888', marginBottom: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                  type="number"
                                  style={{ ...S.inp, width: 90, textAlign: 'right' }}
                                  value={p.costo_elasticos}
                                  onChange={e => updPrenda(p._key, 'costo_elasticos', e.target.value)}
                                  placeholder="0"
                                />
                                <span style={{ color: '#aaa' }}>— o agregá avíos del catálogo</span>
                              </div>
                            )}
                            {(p.avios || []).map(a => (
                              <div key={a._key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11 }}>
                                <input
                                  style={{ ...S.inp, flex: 2 }}
                                  value={a.nombre}
                                  list={`avios-cat-${a._key}`}
                                  onChange={e => updAvio(p._key, a._key, 'nombre', e.target.value)}
                                  placeholder="Nombre avío"
                                />
                                <datalist id={`avios-cat-${a._key}`}>
                                  {aviosCat.map(av => (
                                    <option key={av.id} value={av.nombre} label={`$${av.precio} / ${av.unidad || 'u'}`} />
                                  ))}
                                </datalist>
                                <input
                                  type="number"
                                  style={{ ...S.inp, width: 60, textAlign: 'right' }}
                                  value={a.cantidad}
                                  onChange={e => updAvio(p._key, a._key, 'cantidad', e.target.value)}
                                  placeholder="cant."
                                />
                                <span style={{ color: '#888', fontSize: 10 }}>{a.unidad || 'u'} ×</span>
                                <input
                                  type="number"
                                  style={{ ...S.inp, width: 80, textAlign: 'right' }}
                                  value={a.precio}
                                  onChange={e => updAvio(p._key, a._key, 'precio', e.target.value)}
                                  placeholder="$"
                                />
                                <span style={{ color: '#888', fontSize: 10 }}>/u =</span>
                                <span style={{ fontWeight: 700, minWidth: 60, textAlign: 'right', fontSize: 11 }}>{fmtM(a.costo)}</span>
                                <button style={{ ...S.btn, padding: '1px 5px', color: '#a00' }} onClick={() => delAvio(p._key, a._key)}>✕</button>
                              </div>
                            ))}
                            <button style={{ ...S.btn, fontSize: 10, marginTop: 2 }} onClick={() => addAvio(p._key)}>+ Agregar avío</button>
                          </div>

                          {/* ── Otros costos ── */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 20px', marginBottom: 8 }}>
                            {COSTO_FIELDS.map(f => (
                              <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <label style={{ ...S.lbl, margin: 0, width: 140, flexShrink: 0 }}>{f.label}</label>
                                <input
                                  type="number"
                                  style={{ ...S.inp, width: 90, textAlign: 'right' }}
                                  value={p[f.key]}
                                  onChange={e => updPrenda(p._key, f.key, e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                            ))}
                          </div>

                          <div style={{ borderTop: '1px solid #d0d8e8', paddingTop: 8, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#1a3a6b' }}>Costo total: {fmtM(ct)}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <label style={{ ...S.lbl, margin: 0, whiteSpace: 'nowrap' }}>Margen %</label>
                              <input type="number" style={{ ...S.inp, width: 65, textAlign: 'right' }}
                                value={p.margen_pct} onChange={e => updPrenda(p._key, 'margen_pct', e.target.value)} placeholder="0" />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <label style={{ ...S.lbl, margin: 0, whiteSpace: 'nowrap' }}>Precio venta (sin IVA)</label>
                              <input type="number" style={{ ...S.inp, width: 90, textAlign: 'right' }}
                                value={p.precio_venta} onChange={e => updPrenda(p._key, 'precio_venta', e.target.value)} placeholder="0" />
                            </div>
                            {parseFloat(p.precio_venta) > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <label style={{ ...S.lbl, margin: 0, whiteSpace: 'nowrap', color: '#1a5a1a' }}>IVA inc. (22%)</label>
                                <span style={{ fontWeight: 700, color: '#1a5a1a', fontSize: 12 }}>{fmtM(parseFloat(p.precio_venta) * 1.22)}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <label style={{ ...S.lbl, margin: 0, whiteSpace: 'nowrap' }}>Precio cotizado (IVA inc.)</label>
                              <input type="number" style={{ ...S.inp, width: 100, textAlign: 'right' }}
                                value={p.precio_cotizado} onChange={e => updPrenda(p._key, 'precio_cotizado', e.target.value)} placeholder="0" />
                            </div>
                            {parseFloat(p.precio_cotizado) > 0 && (() => {
                              const sinIva = parseFloat(p.precio_cotizado) / 1.22
                              const ganancia = sinIva - ct
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <label style={{ ...S.lbl, margin: 0, whiteSpace: 'nowrap', color: ganancia >= 0 ? '#1a5a1a' : '#a00' }}>Ganancia</label>
                                  <span style={{ fontWeight: 700, color: ganancia >= 0 ? '#1a5a1a' : '#a00', fontSize: 12 }}>{fmtM(ganancia)}</span>
                                  <span style={{ fontSize: 10, color: '#888' }}>({ct > 0 ? ((ganancia / ct) * 100).toFixed(1) : 0}%)</span>
                                </div>
                              )
                            })()}
                          </div>
                          <div style={{ marginTop: 6 }}>
                            <label style={S.lbl}>Notas</label>
                            <input style={S.inp} value={p.notas} onChange={e => updPrenda(p._key, 'notas', e.target.value)} placeholder="Observaciones de esta prenda…" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* ── Columna derecha ────────────────────────────────────────────────── */}
          <div>
            <div style={S.panel}>
              <div style={S.hdr}><span>💰 Resumen</span></div>
              <div style={S.body}>
                {cot.prendas.filter(p => p.nombre?.trim()).length === 0 && (
                  <div style={{ color: '#888', fontStyle: 'italic', fontSize: 10 }}>Agregá prendas para ver el resumen</div>
                )}
                {cot.prendas.filter(p => p.nombre?.trim()).map(p => {
                  const ct = costoTotalPrenda(p)
                  return (
                    <div key={p._key} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #eee' }}>
                      <div style={{ fontWeight: 700, marginBottom: 3 }}>{p.nombre}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555' }}>
                        <span>Costo</span><span>{fmtM(ct)}</span>
                      </div>
                      {parseFloat(p.precio_venta) > 0 && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#1a5a1a' }}>
                            <span>Precio venta (sin IVA)</span><span>{fmtM(p.precio_venta)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#1a5a1a', fontWeight: 700 }}>
                            <span>IVA inc. (22%)</span><span>{fmtM(parseFloat(p.precio_venta) * 1.22)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
                {cot.prendas.some(p => p.nombre?.trim()) && (
                  <div style={{ borderTop: '2px solid #6b83a8', paddingTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 4 }}>
                      <span>Total costo</span><span>{fmtM(totalCosto)}</span>
                    </div>
                    {totalVenta > 0 && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1a5a1a' }}>
                          <span>Total venta (sin IVA)</span><span>{fmtM(totalVenta)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1a5a1a' }}>
                          <span>Total IVA inc. (22%)</span><span>{fmtM(totalVenta * 1.22)}</span>
                        </div>
                      </>
                    )}
                    {totalVenta > 0 && totalCosto > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555', marginTop: 4 }}>
                        <span>Ganancia</span>
                        <span style={{ color: totalVenta - totalCosto >= 0 ? '#1a5a1a' : '#a00', fontWeight: 700 }}>
                          {fmtM(totalVenta - totalCosto)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
