import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const fmtUYU = n => n != null && n !== ''
  ? '$' + Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : '$0,00'
const fmtFecha = f => {
  if (!f) return '—'
  const s = f.includes('T') ? f.split('T')[0] : f
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

const PANEL = { background: '#fff', border: '1px solid #a8a8a8', boxShadow: '1px 1px 0 #b8b8b8', marginBottom: 8 }
const HDR   = { padding: '5px 10px', fontWeight: 700, fontSize: 12, background: 'linear-gradient(to bottom, #e8eef7, #c8d4e8)', borderBottom: '1px solid #6b83a8', color: '#1a3a6b' }
const BODY  = { padding: 10 }

const ESTADO_STYLE = {
  pendiente:   { background: '#fff3c8', color: '#5a3a00', border: '1px solid #c8a040' },
  aceptada:    { background: '#d4f0d4', color: '#1a5a1a', border: '1px solid #4a9a4a' },
  no_aceptada: { background: '#ffd4d4', color: '#8a0000', border: '1px solid #c06060' },
}
const ESTADO_LABEL = { pendiente: 'Pendiente', aceptada: 'Aceptada', no_aceptada: 'No aceptada' }

const SECCION = { padding: '4px 8px', background: '#f0f4f8', fontWeight: 700, color: '#1a3a6b', fontSize: 11, border: '1px solid #e0e8f0' }
const TD      = { padding: '5px 8px', border: '1px solid #eee' }
const TD_IN   = { padding: '3px 6px', border: '1px solid #eee' }

// Recoge los IDs de tela de un producto (tela1, tela2, rib, extras)
function telaIdsDeProducto(prod) {
  const ids = []
  if (prod.tela1_id) ids.push(parseInt(prod.tela1_id))
  if (prod.tela2_id) ids.push(parseInt(prod.tela2_id))
  if (prod.rib_id)   ids.push(parseInt(prod.rib_id))
  ;(prod.telas_extra || []).forEach(te => { if (te.tela_id) ids.push(parseInt(te.tela_id)) })
  return [...new Set(ids.filter(Boolean))]
}

const COSTO_KEYS = ['confeccion','corte','elasticos','estampado_frente','estampado_espalda','otros']
const COSTO_LABELS = {
  confeccion:        'Confección',
  corte:             'Corte',
  elasticos:         'Elásticos y avíos',
  estampado_frente:  'Estampado frente',
  estampado_espalda: 'Estampado espalda',
  otros:             'Otros costos',
}
const COSTO_SECCIONES = [
  { label: '✂ Confección y corte',   keys: ['confeccion','corte'] },
  { label: '🧵 Elásticos y avíos',    keys: ['elasticos'] },
  { label: '🖨 Estampado',            keys: ['estampado_frente','estampado_espalda'] },
  { label: 'Otros',                   keys: ['otros'] },
]

const emptyCostos = () => Object.fromEntries(COSTO_KEYS.map(k => [k, '']))

export default function Cotizacion({ onMenuClick }) {
  const navigate = useNavigate()

  const [productos,    setProductos]    = useState([])
  const [contactos,    setContactos]    = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)

  // Formulario
  const [productoId,   setProductoId]   = useState('')
  const [productoInfo, setProductoInfo] = useState(null) // datos completos del producto
  const [telasData,    setTelasData]    = useState([])   // [{ id, tipo, precio, rendimiento, costo }]
  const [cliente,      setCliente]      = useState('')
  const [costos,       setCostos]       = useState(emptyCostos())
  const [margenPct,    setMargenPct]    = useState('')
  const [precioVenta,  setPrecioVenta]  = useState('')
  const [notas,        setNotas]        = useState('')
  const [estado,       setEstado]       = useState('pendiente')

  // Derivados
  const costoTelas = telasData.reduce((a, t) => a + (t.costo || 0), 0)
  const costoOtros = COSTO_KEYS.reduce((a, k) => a + (parseFloat(costos[k]) || 0), 0)
  const costoTotal = costoTelas + costoOtros
  const ganancia   = precioVenta !== '' && costoTotal > 0 ? parseFloat(precioVenta) - costoTotal : null

  useEffect(() => { fetchInit() }, [])

  // Recalcular precio cuando cambia costoTotal (si hay margen fijado)
  useEffect(() => {
    if (margenPct !== '' && costoTotal > 0) {
      setPrecioVenta((costoTotal * (1 + parseFloat(margenPct) / 100)).toFixed(2))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costoTotal])

  async function fetchInit() {
    setLoading(true)
    const [{ data: prods }, { data: conts }, { data: cots }] = await Promise.all([
      supabase.from('productos').select('id, nombre, cliente_id, molde, tela1_id, tela2_id, rib_id, telas_extra').order('nombre'),
      supabase.from('contactos').select('id, nombre'),
      supabase.from('cotizaciones').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    setProductos(prods || [])
    setContactos(conts || [])
    setCotizaciones(cots || [])
    setLoading(false)
  }

  async function cargarProducto(id) {
    setProductoId(id)
    setTelasData([])
    setProductoInfo(null)
    if (!id) return

    const prod = productos.find(p => p.id === parseInt(id))
    if (!prod) return
    setProductoInfo(prod)

    // Autocompletar cliente
    if (prod.cliente_id) {
      const cont = contactos.find(c => c.id === prod.cliente_id)
      if (cont) setCliente(cont.nombre)
    }

    // Cargar telas del producto
    const ids = telaIdsDeProducto(prod)
    if (ids.length > 0) {
      const { data: telas } = await supabase
        .from('telas').select('id, tipo, precio, rendimiento').in('id', ids)
      setTelasData((telas || []).map(t => ({
        ...t,
        costo: (parseFloat(t.precio) || 0) * (parseFloat(t.rendimiento) || 0),
      })))
    }
  }

  function onMargenChange(val) {
    setMargenPct(val)
    if (val !== '' && costoTotal > 0)
      setPrecioVenta((costoTotal * (1 + parseFloat(val) / 100)).toFixed(2))
    else if (val === '')
      setPrecioVenta('')
  }

  function onPrecioChange(val) {
    setPrecioVenta(val)
    if (val !== '' && costoTotal > 0)
      setMargenPct(((parseFloat(val) - costoTotal) / costoTotal * 100).toFixed(2))
    else if (val === '')
      setMargenPct('')
  }

  async function handleGuardar() {
    if (!productoId) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('cotizaciones').insert({
      producto_id:              parseInt(productoId),
      cliente:                  cliente || null,
      costo_telas:              costoTelas,
      costo_confeccion:         parseFloat(costos.confeccion)        || 0,
      costo_corte:              parseFloat(costos.corte)             || 0,
      costo_elasticos:          parseFloat(costos.elasticos)         || 0,
      costo_estampado_frente:   parseFloat(costos.estampado_frente)  || 0,
      costo_estampado_espalda:  parseFloat(costos.estampado_espalda) || 0,
      costo_otros:              parseFloat(costos.otros)             || 0,
      costo_total:              costoTotal,
      margen_pct:               parseFloat(margenPct)    || null,
      precio_venta:             parseFloat(precioVenta)  || null,
      notas:                    notas || null,
      estado,
      user_id:                  user?.id,
    })
    setSaving(false)
    fetchInit()
  }

  function loadCotizacion(cot) {
    setProductoId(cot.producto_id ? String(cot.producto_id) : '')
    setCliente(cot.cliente || '')
    setCostos({
      confeccion:        String(cot.costo_confeccion        || ''),
      corte:             String(cot.costo_corte             || ''),
      elasticos:         String(cot.costo_elasticos         || ''),
      estampado_frente:  String(cot.costo_estampado_frente  || ''),
      estampado_espalda: String(cot.costo_estampado_espalda || ''),
      otros:             String(cot.costo_otros             || ''),
    })
    setMargenPct(cot.margen_pct   != null ? String(cot.margen_pct)   : '')
    setPrecioVenta(cot.precio_venta != null ? String(cot.precio_venta) : '')
    setNotas(cot.notas  || '')
    setEstado(cot.estado || 'pendiente')
    if (cot.producto_id) cargarProducto(String(cot.producto_id))
  }

  function resetForm() {
    setProductoId(''); setProductoInfo(null); setTelasData([])
    setCliente(''); setCostos(emptyCostos())
    setMargenPct(''); setPrecioVenta(''); setNotas(''); setEstado('pendiente')
  }

  const nombreProducto = id => productos.find(p => p.id === parseInt(id))?.nombre || '—'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>💰 Cotización</h2>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={resetForm}>+ Nueva</button>
      </div>

      <div className="content" style={{ fontFamily: 'Tahoma, Arial, sans-serif', fontSize: 11 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 8 }}>

          {/* ── Columna principal ── */}
          <div>

            {/* Producto a cotizar */}
            <div style={PANEL}>
              <div style={HDR}>🔍 Producto a cotizar</div>
              <div style={{ ...BODY, display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Producto</label>
                  <select value={productoId} onChange={e => cargarProducto(e.target.value)} style={{ width: '100%' }}>
                    <option value="">— Seleccionar producto —</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Cliente</label>
                  <input
                    value={cliente}
                    onChange={e => setCliente(e.target.value)}
                    placeholder="nombre del cliente"
                    style={{ width: '100%' }}
                  />
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => productoId && cargarProducto(productoId)}
                  disabled={!productoId}
                  style={{ height: 28 }}
                >
                  Calcular costos ▸
                </button>
              </div>
            </div>

            {/* Desglose de costos */}
            <div style={PANEL}>
              <div style={HDR}>📊 Desglose de costos</div>
              <div style={BODY}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(to bottom, #e8eef7, #c8d4e8)' }}>
                      <th style={{ ...TD, color: '#1a3a6b', textAlign: 'left' }}>Concepto</th>
                      <th style={{ ...TD, color: '#1a3a6b', textAlign: 'right', width: 140 }}>Costo ($UY)</th>
                    </tr>
                  </thead>
                  <tbody>

                    {/* — Telas — */}
                    <tr><td colSpan={2} style={SECCION}>🧶 Telas</td></tr>

                    {telasData.length === 0 ? (
                      <tr>
                        <td colSpan={2} style={{ ...TD, color: '#888', fontStyle: 'italic' }}>
                          {productoId ? 'Sin telas asignadas al producto' : 'Seleccioná un producto para calcular'}
                        </td>
                      </tr>
                    ) : telasData.map(t => (
                      <tr key={t.id}>
                        <td style={TD}>
                          {t.tipo}
                          <span style={{ color: '#999', marginLeft: 8, fontSize: 10 }}>
                            ${Number(t.precio || 0).toFixed(2)} × {Number(t.rendimiento || 0).toFixed(2)} m/kg
                          </span>
                        </td>
                        <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>
                          {fmtUYU(t.costo)}
                        </td>
                      </tr>
                    ))}

                    <tr style={{ background: '#f8f8f4' }}>
                      <td style={{ ...TD, fontWeight: 700 }}>Subtotal telas</td>
                      <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{fmtUYU(costoTelas)}</td>
                    </tr>

                    {/* — Secciones editables — */}
                    {COSTO_SECCIONES.map(sec => (
                      <React.Fragment key={sec.label}>
                        <tr><td colSpan={2} style={SECCION}>{sec.label}</td></tr>
                        {sec.keys.map(key => (
                          <tr key={key}>
                            <td style={TD}>{COSTO_LABELS[key]}</td>
                            <td style={TD_IN}>
                              <input
                                type="number"
                                value={costos[key]}
                                onChange={e => setCostos(c => ({ ...c, [key]: e.target.value }))}
                                placeholder="0"
                                style={{ width: '100%', textAlign: 'right' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}

                    {/* — Total — */}
                    <tr style={{ background: 'linear-gradient(to bottom, #e8eef7, #c8d4e8)' }}>
                      <td style={{ padding: 8, fontWeight: 700, fontSize: 13, color: '#1a3a6b', border: '1px solid #6b83a8' }}>
                        COSTO TOTAL
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, fontSize: 15, color: '#1a3a6b', border: '1px solid #6b83a8' }}>
                        {fmtUYU(costoTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Historial */}
            <div style={PANEL}>
              <div style={HDR}>📋 Historial de cotizaciones</div>
              {loading ? (
                <div className="loading"><div className="spinner" /></div>
              ) : cotizaciones.length === 0 ? (
                <div style={{ ...BODY, color: '#888', fontStyle: 'italic' }}>Sin cotizaciones guardadas aún</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(to bottom, #e8eef7, #c8d4e8)' }}>
                        {['Fecha','Producto','Cliente','Costo','Precio','%','Estado'].map(h => (
                          <th key={h} style={{ padding: '4px 8px', color: '#1a3a6b', textAlign: h === 'Costo' || h === 'Precio' || h === '%' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cotizaciones.map(cot => (
                        <tr
                          key={cot.id}
                          onClick={() => loadCotizacion(cot)}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#ffffcc' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '' }}
                        >
                          <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>{fmtFecha(cot.created_at)}</td>
                          <td style={{ padding: '4px 8px' }}>{nombreProducto(cot.producto_id)}</td>
                          <td style={{ padding: '4px 8px' }}>{cot.cliente || '—'}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmtUYU(cot.costo_total)}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right' }}>{cot.precio_venta != null ? fmtUYU(cot.precio_venta) : '—'}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {cot.margen_pct != null ? Number(cot.margen_pct).toFixed(1) + '%' : '—'}
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <span style={{ padding: '1px 6px', fontSize: 10, fontWeight: 700, ...ESTADO_STYLE[cot.estado] }}>
                              {ESTADO_LABEL[cot.estado] || cot.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Columna derecha ── */}
          <div>

            {/* Calculadora de precio */}
            <div style={PANEL}>
              <div style={HDR}>💰 Precio de venta</div>
              <div style={BODY}>

                {/* Costo total display */}
                <div style={{ marginBottom: 10, padding: 8, background: '#f0f4f8', border: '1px solid #c8d4e8' }}>
                  <div style={{ fontSize: 10, color: '#6b83a8', marginBottom: 2 }}>Costo total calculado</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#1a3a6b' }}>{fmtUYU(costoTotal)}</div>
                </div>

                {/* Margen % */}
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label>Margen %</label>
                  <input
                    type="number"
                    value={margenPct}
                    onChange={e => onMargenChange(e.target.value)}
                    placeholder="ej: 30"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Precio de venta */}
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label>Precio de venta $</label>
                  <input
                    type="number"
                    value={precioVenta}
                    onChange={e => onPrecioChange(e.target.value)}
                    placeholder="ej: 1500"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Ganancia */}
                {ganancia != null && (
                  <div style={{
                    background: ganancia >= 0 ? '#d4f0d4' : '#ffd4d4',
                    border: `1px solid ${ganancia >= 0 ? '#4a9a4a' : '#c06060'}`,
                    padding: 8, marginBottom: 10,
                  }}>
                    <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>Ganancia estimada</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: ganancia >= 0 ? '#1a5a1a' : '#8a0000' }}>
                      {fmtUYU(ganancia)}
                    </div>
                  </div>
                )}

                {/* Precio final grande */}
                {precioVenta !== '' && (
                  <div style={{ background: '#1a3a6b', padding: 10, textAlign: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: '#a8c0e0', marginBottom: 2 }}>Precio final</div>
                    <div style={{ fontWeight: 700, fontSize: 22, color: '#fff', letterSpacing: 1 }}>
                      {fmtUYU(parseFloat(precioVenta))}
                    </div>
                  </div>
                )}

                {/* Estado */}
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Estado</label>
                  <select value={estado} onChange={e => setEstado(e.target.value)} style={{ width: '100%' }}>
                    <option value="pendiente">Pendiente</option>
                    <option value="aceptada">Aceptada</option>
                    <option value="no_aceptada">No aceptada</option>
                  </select>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleGuardar}
                    disabled={saving || !productoId}
                    style={{ width: '100%' }}
                  >
                    {saving ? 'Guardando…' : '✓ Guardar cotización'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/pedidos', { state: { clienteNombre: cliente, productoId: parseInt(productoId) } })}
                    disabled={!productoId}
                    style={{ width: '100%', textAlign: 'left' }}
                  >
                    Convertir en pedido ▸
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => window.print()}
                    style={{ width: '100%', textAlign: 'left' }}
                  >
                    🖨 Imprimir
                  </button>
                </div>
              </div>
            </div>

            {/* Info del producto */}
            {productoInfo && (
              <div style={PANEL}>
                <div style={HDR}>📦 Info del producto</div>
                <div style={BODY}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{productoInfo.nombre}</div>
                  {cliente && (
                    <div style={{ color: '#555', marginBottom: 4 }}>
                      <span style={{ color: '#888' }}>Cliente:</span> {cliente}
                    </div>
                  )}
                  {telasData.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ color: '#888', marginBottom: 2 }}>Telas:</div>
                      {telasData.map(t => (
                        <div key={t.id} style={{ paddingLeft: 8, color: '#333' }}>· {t.tipo}</div>
                      ))}
                    </div>
                  )}
                  {productoInfo.molde && (
                    <div style={{ color: '#555', marginBottom: 6 }}>
                      <span style={{ color: '#888' }}>Molde:</span> {productoInfo.molde}
                    </div>
                  )}
                  <span
                    onClick={() => navigate(`/productos`)}
                    style={{ color: '#1a3a6b', cursor: 'pointer', textDecoration: 'underline', fontSize: 11 }}
                  >
                    Ver ficha completa →
                  </span>
                </div>
              </div>
            )}

            {/* Notas */}
            <div style={PANEL}>
              <div style={HDR}>📝 Notas</div>
              <div style={BODY}>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Observaciones de la cotización…"
                  rows={5}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical',
                    fontFamily: 'Tahoma, Arial, sans-serif', fontSize: 11,
                    border: '1px solid #a8a8a8', padding: 6,
                  }}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
