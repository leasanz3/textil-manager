import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─── Constantes ───────────────────────────────────────────────────────────────

const ETAPAS = [
  { id: 'recibido',      label: 'Pedido recibido', icon: '📋', tipo: [],                 color: '#888888' },
  { id: 'presupuestado', label: 'Presupuestado',   icon: '💬', tipo: [],                 color: '#8060c0' },
  { id: 'confirmado',    label: 'Confirmado',      icon: '✅', tipo: [],                 color: '#2060a8' },
  { id: 'compra_tela',   label: 'Compra de tela',  icon: '🧶', tipo: [],                 color: '#c8a040' },
  { id: 'corte',         label: 'Corte',           icon: '✂',  tipo: ['otro', 'taller'], color: '#d48a00' },
  { id: 'taller',        label: 'Taller',          icon: '🧵', tipo: ['taller'],         color: '#2a7a2a' },
  { id: 'entrega',       label: 'Entrega',         icon: '📦', tipo: [],                 color: '#1a5a1a' },
]

const ETAPA_BY_ID = Object.fromEntries(ETAPAS.map(e => [e.id, e]))

// ─── Colores por cliente ──────────────────────────────────────────────────────
// Editá acá: border = franja izquierda, bg = fondo del header, text = texto header
const COLORES_CLIENTE = {
  _default: { border: '#a8a8a8', bg: '#f4f4ec', text: '#333333' },
}

const COLORES_NOMBRE = {
  'Santiago Y Lorena': { border: '#1a5aa8', bg: '#fff8d0', text: '#002855' },
  'Casa Sanz':         { border: '#222222', bg: '#f8f8f8', text: '#111111' },
  'Maju':              { border: '#2a7a2a', bg: '#fffad0', text: '#1a4a1a' },
}

function getColorCliente(nombre, id) {
  if (id && COLORES_CLIENTE[id]) return COLORES_CLIENTE[id]
  const key = Object.keys(COLORES_NOMBRE).find(k =>
    nombre?.toLowerCase().includes(k.toLowerCase())
  )
  return key ? COLORES_NOMBRE[key] : COLORES_CLIENTE._default
}

const ORDEN_TALLES = ['XS','S','M','L','XL','XXL','2','4','6','8','10','12','14','16','40','42','44','46','48','50','52','54','56','58']

function tallesOrdenados(tallesObj) {
  return ORDEN_TALLES
    .filter(t => (tallesObj || {})[t] > 0)
    .map(t => [t, tallesObj[t]])
}
const FLUJO_DEFAULT = ['recibido', 'presupuestado', 'confirmado', 'compra_tela', 'corte', 'taller', 'entrega']

const TABLAS = {
  adulto:   { label: 'Adulto',         talles: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  nino:     { label: 'Niño',           talles: ['2', '4', '6', '8', '10', '12', '14', '16'] },
  malla:    { label: 'Malla',          talles: ['40', '42', '44', '46', '48', '50', '52'] },
  mallaesp: { label: 'Malla Especial', talles: ['54', '56', '58'] },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const totalTalles = (t) => Object.values(t || {}).reduce((a, b) => a + (Number(b) || 0), 0)
const fmtFecha    = (f) => { if (!f) return '—'; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}` }

function pedidoItems(p) {
  if (p.items?.length) return p.items
  return [{ producto: p.producto, producto_id: p.producto_id, talles: p.talles || {}, tabla: 'adulto' }]
}

function pedidoTotal(p) {
  return pedidoItems(p).reduce((a, it) => a + totalTalles(it.talles), 0)
}

function inferirTabla(talles) {
  if (!talles) return 'adulto'
  const keys = Object.keys(talles)
  if (keys.some(k => ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(k))) return 'adulto'
  if (keys.some(k => ['2', '4', '6', '8', '10'].includes(k))) return 'nino'
  if (keys.some(k => ['54', '56', '58'].includes(k))) return 'mallaesp'
  if (keys.some(k => ['40', '42', '44'].includes(k))) return 'malla'
  return 'adulto'
}

function siguienteEtapa(productoProcesos, etapaActual) {
  const flujo = productoProcesos?.length ? productoProcesos.map(x => x.id) : FLUJO_DEFAULT
  const idx = flujo.indexOf(etapaActual)
  if (idx === -1)              return flujo[0] || 'entrega'
  if (idx >= flujo.length - 1) return etapaActual
  return flujo[idx + 1]
}

function diasDesde(iso) {
  if (!iso) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
}

function sumarHechas(lotes) {
  let total = 0
  for (const l of lotes || []) {
    for (const item of l.hechas || []) {
      total += totalTalles(item.talles)
    }
  }
  return total
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Componente principal ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function Produccion({ onMenuClick }) {
  const [pedidos, setPedidos]       = useState([])
  const [productos, setProductos]   = useState({})
  const [contactos, setContactos]   = useState([])
  const [lotesEtapa, setLotesEtapa] = useState([])
  const [loading, setLoading]       = useState(true)

  const [pedidoOpen, setPedidoOpen] = useState(null)
  const [sortCol, setSortCol]       = useState('fecha')
  const [sortDir, setSortDir]       = useState('asc')
  const [filterEtapa, setFilterEtapa] = useState('')
  const [searchQ, setSearchQ]       = useState('')
  // etapaSel: solo para fetch de lotes (se mantiene sincronizado con filterEtapa o carga todo)
  const [etapaSel, setEtapaSel]     = useState(null)

  // ── Producción libre ──────────────────────────────────────────────────────
  const [showFaltaCortar, setShowFaltaCortar] = useState(false)
  const [libreOpen, setLibreOpen]             = useState(null)  // lote objeto
  const [modalLibre, setModalLibre]           = useState(false)
  const [libreEtapa, setLibreEtapa]           = useState('corte')
  const [libreNota, setLibreNota]             = useState('')
  const [libreProdId, setLibreProdId]         = useState('')
  const [libreProdNombre, setLibreProdNombre] = useState('')
  const [libreProdQ, setLibreProdQ]           = useState('')
  const [libreProdRes, setLibreProdRes]       = useState([])
  const [libresVinculados, setLibresVinculados] = useState([])
  const [pedQ, setPedQ]                       = useState('')
  const [pedRes, setPedRes]                   = useState([])
  const [savingLibre, setSavingLibre]         = useState(false)
  const pedTimer  = useRef(null)
  const prodTimer = useRef(null)

  useEffect(() => { fetchBase() }, [])

  async function fetchBase() {
    setLoading(true)
    const [ped, prods, cont, lotes] = await Promise.all([
      supabase.from('pedidos').select('*').order('created_at', { ascending: false }),
      supabase.from('productos').select('id, nombre, procesos, piezas, codigo'),
      supabase.from('contactos').select('*').order('nombre'),
      supabase.from('produccion_etapas').select('*'),
    ])
    setPedidos(ped.data || [])
    setProductos(Object.fromEntries((prods.data || []).map(p => [p.id, p])))
    setContactos(cont.data || [])
    setLotesEtapa(lotes.data || [])
    setLoading(false)
  }

  async function fetchLotesEtapa() {
    const { data } = await supabase.from('produccion_etapas').select('*')
    setLotesEtapa(data || [])
  }

  async function refetch() {
    await fetchBase()
  }

  // ── Contadores por etapa ───────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = Object.fromEntries(ETAPAS.map(e => [e.id, 0]))
    for (const p of pedidos) {
      if (p.etapa_actual === 'cancelado') continue
      if (c[p.etapa_actual] !== undefined) c[p.etapa_actual]++
    }
    return c
  }, [pedidos])

  // ── Lotes libres (sin pedido) y mapa pedido_id → lotes ───────────────────
  const libresLotes = useMemo(() => lotesEtapa.filter(l => !l.pedido_id), [lotesEtapa])

  const lotesPorPedido = useMemo(() => {
    const m = {}
    for (const l of lotesEtapa) {
      if (!l.pedido_id) continue
      if (!m[l.pedido_id]) m[l.pedido_id] = []
      m[l.pedido_id].push(l)
    }
    return m
  }, [lotesEtapa])

  // ── Lista filtrada y ordenada ─────────────────────────────────────────────
  const pedidosActivos = useMemo(() => {
    return pedidos.filter(p => p.etapa_actual !== 'cancelado')
  }, [pedidos])

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const listaSorted = useMemo(() => {
    let base = pedidosActivos
    if (filterEtapa) base = base.filter(p => p.etapa_actual === filterEtapa)
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase()
      base = base.filter(p =>
        p.cliente?.toLowerCase().includes(q) ||
        pedidoItems(p).some(it => it.producto?.toLowerCase().includes(q))
      )
    }
    return [...base].sort((a, b) => {
      let va, vb
      if (sortCol === 'cliente')   { va = (a.cliente || '').toLowerCase(); vb = (b.cliente || '').toLowerCase() }
      if (sortCol === 'producto')  { va = (pedidoItems(a)[0]?.producto || '').toLowerCase(); vb = (pedidoItems(b)[0]?.producto || '').toLowerCase() }
      if (sortCol === 'etapa')     { va = a.etapa_actual || ''; vb = b.etapa_actual || '' }
      if (sortCol === 'total')     { va = pedidoTotal(a); vb = pedidoTotal(b) }
      if (sortCol === 'fecha')     { va = a.fecha || '9999'; vb = b.fecha || '9999' }
      if (sortCol === 'progreso')  { va = pedidoTotal(a) > 0 ? sumarHechas(lotesPorPedido[a.id] || []) / pedidoTotal(a) : 0; vb = pedidoTotal(b) > 0 ? sumarHechas(lotesPorPedido[b.id] || []) / pedidoTotal(b) : 0 }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ?  1 : -1
      return 0
    })
  }, [pedidosActivos, filterEtapa, searchQ, sortCol, sortDir, lotesPorPedido])

  // ── Cambiar etapa directamente ────────────────────────────────────────────
  async function cambiarEtapa(pedidoId, nuevaEtapa) {
    await supabase.from('pedidos').update({ etapa_actual: nuevaEtapa }).eq('id', pedidoId)
    await refetch()
  }

  // ── Avanzar etapa ──────────────────────────────────────────────────────────
  async function avanzarEtapa(pedidoId, etapaActual) {
    const p = pedidos.find(x => x.id === pedidoId)
    if (!p) return

    const items = pedidoItems(p)
    const prodConProcesos = items.map(it => productos[it.producto_id]).find(pr => pr?.procesos?.length)
    const next = siguienteEtapa(prodConProcesos?.procesos, etapaActual)
    if (next === etapaActual) { alert('Ya está en la última etapa.'); return }

    await supabase
      .from('produccion_etapas')
      .update({ completado_at: new Date().toISOString() })
      .eq('pedido_id', pedidoId)
      .eq('etapa', etapaActual)
      .is('completado_at', null)

    await supabase.from('pedidos').update({ etapa_actual: next }).eq('id', pedidoId)

    setPedidoOpen(null)
    await refetch()
  }

  // ── Búsqueda de pedidos para modal libre ─────────────────────────────────
  function onPedSearch(val) {
    setPedQ(val)
    if (pedTimer.current) clearTimeout(pedTimer.current)
    if (!val.trim()) { setPedRes([]); return }
    pedTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('pedidos')
        .select('id, cliente, items, talles, etapa_actual')
        .ilike('cliente', `%${val.trim()}%`)
        .limit(6)
      setPedRes(data || [])
    }, 300)
  }

  function vincularPedido(ped) {
    if (libresVinculados.find(x => x.id === ped.id)) return
    setLibresVinculados(v => [...v, ped])
    setPedQ(''); setPedRes([])
  }

  function onLibreProdSearch(val) {
    setLibreProdQ(val); setLibreProdId(''); setLibreProdNombre('')
    if (prodTimer.current) clearTimeout(prodTimer.current)
    if (!val.trim()) { setLibreProdRes([]); return }
    prodTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('productos')
        .select('id, nombre, codigo')
        .ilike('nombre', `%${val.trim()}%`)
        .limit(8)
      setLibreProdRes(data || [])
    }, 250)
  }

  async function guardarLibre() {
    setSavingLibre(true)
    const { data: { user } } = await supabase.auth.getUser()
    const hechasInit = libreProdId
      ? [{ item_idx: 0, producto_id: libreProdId, producto: libreProdNombre, talles: {} }]
      : []

    const { data: loteNuevo, error } = await supabase
      .from('produccion_etapas')
      .insert({ etapa: libreEtapa, nota: libreNota || null, hechas: hechasInit, iniciado_at: new Date().toISOString() })
      .select().single()

    if (error) { alert('Error: ' + error.message); setSavingLibre(false); return }

    if (libresVinculados.length > 0 && loteNuevo) {
      await supabase.from('produccion_pedidos').insert(
        libresVinculados.map(p => ({ produccion_etapa_id: loteNuevo.id, pedido_id: p.id, user_id: user?.id }))
      )
      // Avanzar etapa del pedido si está antes de la etapa seleccionada
      const etapaIdx = ETAPAS.findIndex(e => e.id === libreEtapa)
      for (const ped of libresVinculados) {
        const pedIdx = ETAPAS.findIndex(e => e.id === ped.etapa_actual)
        if (pedIdx < etapaIdx) {
          await supabase.from('pedidos').update({ etapa_actual: libreEtapa }).eq('id', ped.id)
        }
      }
    }
    setSavingLibre(false); setModalLibre(false)
    setLibreEtapa('corte'); setLibreNota('')
    setLibreProdId(''); setLibreProdNombre(''); setLibreProdQ(''); setLibreProdRes([])
    setLibresVinculados([]); setPedQ(''); setPedRes([])
    await refetch()
  }

  async function avanzarLibre(lote) {
    const idx  = ETAPAS.findIndex(e => e.id === lote.etapa)
    const next = ETAPAS[idx + 1]
    await supabase.from('produccion_etapas')
      .update({ completado_at: new Date().toISOString() })
      .eq('id', lote.id)
    if (next) {
      await supabase.from('produccion_etapas').insert({
        etapa: next.id, hechas: lote.hechas || [], iniciado_at: new Date().toISOString(),
      })
      setEtapaSel(next.id)
    }
    setLibreOpen(null)
    await refetch()
  }

  const thStyle = (col) => ({
    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    background: sortCol === col ? '#dde4f0' : undefined,
  })
  const sortInd = (col) => sortCol === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'

  // ═══════════════════ Render ═══════════════════════════════════════════════
  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>🏭 Producción</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowFaltaCortar(v => !v)}>
            {showFaltaCortar ? '← Volver' : '🔍 Falta cortar'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setModalLibre(true)}>+ Agregar producción</button>
        </div>
      </div>

      <div className="content">
        {loading ? (
          <div className="loading"><div className="spinner" /> Cargando…</div>
        ) : showFaltaCortar ? (
          <FaltaCortar productos={productos} />
        ) : (
          <>
            {/* Barra de filtros */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Buscar cliente o producto…"
                style={{ width: 220, fontSize: 12 }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn btn-sm"
                  onClick={() => setFilterEtapa('')}
                  style={{ fontWeight: !filterEtapa ? 700 : 400, background: !filterEtapa ? '#d8e4f4' : undefined }}
                >
                  Todos <span style={{ fontSize: 10, color: '#555' }}>({pedidosActivos.length})</span>
                </button>
                {ETAPAS.map(e => (
                  <button
                    key={e.id}
                    className="btn btn-sm"
                    onClick={() => setFilterEtapa(f => f === e.id ? '' : e.id)}
                    style={{ fontWeight: filterEtapa === e.id ? 700 : 400, background: filterEtapa === e.id ? '#d8e4f4' : undefined }}
                  >
                    {e.icon} {e.label} <span style={{ fontSize: 10, color: '#555' }}>({counts[e.id] || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla principal */}
            {listaSorted.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🏭</div>
                <h3>Sin resultados</h3>
                <p>No hay pedidos en producción que coincidan con el filtro.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => toggleSort('cliente')} style={thStyle('cliente')}>Cliente{sortInd('cliente')}</th>
                      <th onClick={() => toggleSort('producto')} style={thStyle('producto')}>Producto{sortInd('producto')}</th>
                      <th onClick={() => toggleSort('etapa')} style={thStyle('etapa')}>Etapa{sortInd('etapa')}</th>
                      <th onClick={() => toggleSort('total')} style={thStyle('total')}>Total{sortInd('total')}</th>
                      <th onClick={() => toggleSort('progreso')} style={thStyle('progreso')}>Progreso{sortInd('progreso')}</th>
                      <th onClick={() => toggleSort('fecha')} style={thStyle('fecha')}>Entrega{sortInd('fecha')}</th>
                      <th>Talles</th>
                      <th style={{ width: 120 }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaSorted.map(p => {
                      const items    = pedidoItems(p)
                      const total    = pedidoTotal(p)
                      const lotes    = lotesPorPedido[p.id] || []
                      const hechas   = sumarHechas(lotes)
                      const avance   = total > 0 ? Math.min(100, Math.round((hechas / total) * 100)) : 0
                      const venc     = p.fecha && p.fecha < new Date().toISOString().split('T')[0]
                      const ei       = ETAPA_BY_ID[p.etapa_actual] || { label: p.etapa_actual, icon: '' }
                      const abierto  = lotes.find(l => !l.completado_at)
                      return (
                        <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setPedidoOpen(p.id)}>
                          <td style={{ fontWeight: 600 }}>{p.cliente || '—'}</td>
                          <td>
                            {items[0]?.producto || '—'}
                            {items.length > 1 && <span style={{ fontSize: 10, color: 'var(--text2)', marginLeft: 4 }}>+{items.length - 1}</span>}
                          </td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', display: 'inline-block', background: (ei.color || '#888') + '22', color: ei.color || '#555', border: `1px solid ${(ei.color || '#888')}88` }}>
                              {ei.icon} {ei.label}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}><strong>{total} u.</strong></td>
                          <td style={{ minWidth: 110 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div style={{ flex: 1, height: 6, background: '#e0ddd4', border: '1px solid #c8c4b8' }}>
                                <div style={{ width: `${avance}%`, height: '100%', background: avance >= 100 ? 'var(--success)' : '#1a5aa8' }} />
                              </div>
                              <span style={{ fontSize: 10, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{hechas}/{total}</span>
                            </div>
                            {abierto?.responsable_nombre && (
                              <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>👤 {abierto.responsable_nombre}</div>
                            )}
                          </td>
                          <td style={{ color: venc ? 'var(--danger)' : undefined, fontWeight: venc ? 700 : undefined }}>
                            {fmtFecha(p.fecha)}
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text2)' }}>
                            {items.map((it, i) => (
                              <div key={i}>
                                {items.length > 1 && <span style={{ fontWeight: 600 }}>{it.producto}: </span>}
                                {tallesOrdenados(it.talles).map(([t, c]) => `${t}:${c}`).join(' ')}
                              </div>
                            ))}
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => setPedidoOpen(p.id)}>📝 Asistente</button>
                              <select
                                value={p.etapa_actual || ''}
                                onChange={e => cambiarEtapa(p.id, e.target.value)}
                                style={{ fontSize: 11, padding: '2px 4px' }}
                                title="Cambiar etapa"
                              >
                                {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
                                <option value="cancelado">✕ Cancelado</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Lotes libres */}
            {libresLotes.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 0 6px' }}>
                  Producción libre / stock
                </div>
                {libresLotes.map(l => (
                  <LibreLoteRow key={l.id} lote={l} onOpen={() => setLibreOpen(l)} />
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              <div className="stat-card">
                <div className="stat-value">{pedidosActivos.length}</div>
                <div className="stat-label">En producción</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--success)' }}>{pedidos.filter(p => p.etapa_actual === 'entrega').length}</div>
                <div className="stat-label">Entregados</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--warning)' }}>
                  {pedidosActivos.filter(p => p.fecha && p.fecha < new Date().toISOString().split('T')[0]).length}
                </div>
                <div className="stat-label">Vencidos</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--accent)' }}>
                  {pedidosActivos.reduce((a, p) => a + pedidoTotal(p), 0)}
                </div>
                <div className="stat-label">Unidades en curso</div>
              </div>
            </div>
          </>
        )}
      </div>

      {pedidoOpen !== null && (() => {
        const p = pedidos.find(x => x.id === pedidoOpen)
        if (!p) return null
        return (
          <Asistente
            pedido={p}
            etapaId={p.etapa_actual}
            contactos={contactos}
            lotes={lotesPorPedido[pedidoOpen] || []}
            onClose={() => setPedidoOpen(null)}
            onSaved={refetch}
            onAvanzar={() => avanzarEtapa(pedidoOpen, p.etapa_actual)}
          />
        )
      })()}

      {libreOpen && (() => {
        const tabla = inferirTabla(libreOpen.hechas?.[0]?.talles) || 'adulto'
        const allTalles = Object.fromEntries((TABLAS[tabla]?.talles || TABLAS.adulto.talles).map(t => [t, 0]))
        const synth = {
          id: '__libre__',
          cliente: 'Producción libre',
          fecha: null,
          items: libreOpen.hechas?.length
            ? libreOpen.hechas.map(h => ({ producto: h.producto, producto_id: h.producto_id, tabla, talles: allTalles }))
            : [{ producto: '', producto_id: null, tabla, talles: allTalles }],
        }
        return (
          <Asistente
            pedido={synth}
            etapaId={libreOpen.etapa}
            contactos={contactos}
            lotes={[libreOpen]}
            libreMode
            onClose={() => setLibreOpen(null)}
            onSaved={async () => { await refetch(); setLibreOpen(null) }}
            onAvanzar={() => avanzarLibre(libreOpen)}
          />
        )
      })()}

      {modalLibre && (
        <div className="modal-overlay" onClick={() => setModalLibre(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏭 Nueva producción</h3>
              <button className="close-btn" onClick={() => setModalLibre(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Etapa inicial</label>
                  <select value={libreEtapa} onChange={e => setLibreEtapa(e.target.value)}>
                    {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nota <span style={{ fontWeight: 400, color: 'var(--text2)' }}>(opcional)</span></label>
                  <input value={libreNota} onChange={e => setLibreNota(e.target.value)} placeholder="Ej: stock camperas, próxima temporada…" />
                </div>
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label>Producto <span style={{ fontWeight: 400, color: 'var(--text2)' }}>(opcional)</span></label>
                <input
                  value={libreProdQ}
                  onChange={e => onLibreProdSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setLibreProdRes([]), 150)}
                  placeholder="Buscar producto…"
                  autoComplete="off"
                />
                {libreProdId && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 2 }}>✔ {libreProdNombre}</div>}
                {libreProdRes.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', maxHeight: 180, overflowY: 'auto' }}>
                    {libreProdRes.map(p => (
                      <div
                        key={p.id}
                        onMouseDown={() => { setLibreProdId(p.id); setLibreProdNombre(p.nombre); setLibreProdQ(p.nombre); setLibreProdRes([]) }}
                        style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#ffffcc'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <span>{p.nombre}</span>
                        {p.codigo && <span style={{ fontSize: 11, color: 'var(--text2)' }}>{p.codigo}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Pedidos vinculados <span style={{ fontWeight: 400, color: 'var(--text2)' }}>(opcional — 0, 1 o varios)</span></label>
                {libresVinculados.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: '#f4f4ec', border: '1px solid #d0d0c8', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{p.cliente}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => setLibresVinculados(v => v.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
                <div style={{ position: 'relative' }}>
                  <input
                    value={pedQ}
                    onChange={e => onPedSearch(e.target.value)}
                    onBlur={() => setTimeout(() => setPedRes([]), 150)}
                    placeholder="Buscar pedido por cliente…"
                    autoComplete="off"
                  />
                  {pedRes.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', maxHeight: 180, overflowY: 'auto' }}>
                      {pedRes.map(p => (
                        <div
                          key={p.id}
                          onMouseDown={() => vincularPedido(p)}
                          style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#ffffcc'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                          {p.cliente}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalLibre(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarLibre} disabled={savingLibre}>
                {savingLibre ? 'Guardando…' : '✔ Crear producción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PedidoRow ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function PedidoRow({ pedido, lotes, onOpen, onCambiarEtapa }) {
  const items  = pedidoItems(pedido)
  const total  = pedidoTotal(pedido)
  const hechas = sumarHechas(lotes)
  const avance = total > 0 ? Math.min(100, Math.round((hechas / total) * 100)) : 0
  const venc   = pedido.fecha && pedido.fecha < new Date().toISOString().split('T')[0]
  const abierto = lotes.find(l => !l.completado_at)
  const col    = getColorCliente(pedido.cliente, pedido.cliente_id)

  return (
    <div style={{ border: '1px solid #a8a8a8', borderLeft: `5px solid ${col.border}`, boxShadow: '1px 1px 0 #b8b8b8', marginBottom: 8, background: '#fff' }}>

      {/* Header cliente */}
      <div style={{ background: col.bg, borderBottom: `1px solid ${col.border}`, padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={onOpen}>
        <span style={{ fontWeight: 'bold', color: col.text, fontSize: 12 }}>{pedido.cliente || '—'}</span>
        <span style={{ fontSize: 10, color: '#555', display: 'flex', gap: 8, alignItems: 'center' }}>
          {pedido.fecha_pedido && <span>📋 {fmtFecha(pedido.fecha_pedido)}</span>}
          {pedido.fecha && <span style={{ color: venc ? 'var(--danger)' : '#555' }}>🏁 {fmtFecha(pedido.fecha)}</span>}
          <strong style={{ color: col.text }}>{total} u.</strong>
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 10px' }}>
        {items.map((it, idx) => {
          const talles = tallesOrdenados(it.talles)
          return (
            <div key={idx} style={{ marginBottom: idx < items.length - 1 ? 6 : 0 }}>
              <span style={{ fontWeight: 'bold', fontSize: 11 }}>{it.producto || '—'}</span>
              <span style={{ color: '#555', fontSize: 11 }}> × {totalTalles(it.talles)}</span>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 3 }}>
                {talles.map(([t, c]) => (
                  <span key={t} style={{ border: '1px solid #a8a8a8', padding: '1px 5px', fontSize: 10, fontWeight: 'bold', background: '#f4f4ec' }}>
                    {t} <span style={{ color: col.border }}>{c}</span>
                  </span>
                ))}
              </div>
            </div>
          )
        })}

        {/* Progreso + acciones */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }} onClick={e => e.stopPropagation()}>
          {abierto?.responsable_nombre && (
            <span style={{ fontSize: 10, color: '#555' }}>👤 {abierto.responsable_nombre}</span>
          )}
          <span style={{ fontSize: 10, color: '#555' }}>{hechas}/{total} u.</span>
          <div style={{ flex: 1, height: 6, background: '#e0ddd4', border: '1px solid #c8c4b8' }}>
            <div style={{ width: `${avance}%`, height: '100%', background: col.border }} />
          </div>
          <span style={{ fontSize: 10, color: '#555' }}>{avance}%</span>
          <button className="btn btn-secondary btn-sm" onClick={onOpen}>📝 Asistente</button>
          <select
            value={pedido.etapa_actual || ''}
            onChange={e => onCambiarEtapa(e.target.value)}
            style={{ fontSize: 11, padding: '2px 4px' }}
          >
            {ETAPAS.map(e => (
              <option key={e.id} value={e.id}>{e.icon} {e.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── LibreLoteRow ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function LibreLoteRow({ lote, onOpen }) {
  const hechas = sumarHechas([lote])
  const prod   = lote.hechas?.[0]?.producto

  return (
    <div style={{ border: '1px solid #a8a8a8', borderLeft: '5px solid #888888', boxShadow: '1px 1px 0 #b8b8b8', marginBottom: 8, background: '#fff' }}>
      <div style={{ background: '#f4f0e8', borderBottom: '1px solid #c8c0a8', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', color: '#555', fontSize: 12 }}>🏭 {prod || 'Producción libre'}</span>
        <span style={{ fontSize: 10, color: '#777' }}>{fmtFecha(lote.iniciado_at?.split('T')[0])}</span>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {lote.responsable_nombre && <span style={{ fontSize: 10, color: '#555' }}>👤 {lote.responsable_nombre}</span>}
        <span style={{ fontSize: 10, color: '#555' }}>{hechas} u. hechas</span>
        {lote.nota && <span style={{ fontSize: 10, color: '#888', fontStyle: 'italic' }}>{lote.nota}</span>}
        <button className="btn btn-secondary btn-sm" onClick={onOpen} style={{ marginLeft: 'auto' }}>📝 Asistente</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Asistente ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// ─── FaltaCortar ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function buildResultFC(piezas, pares, ajustes) {
  const r = {}
  for (const p of piezas) {
    if (!r[p.pieza_nombre]) r[p.pieza_nombre] = {}
    r[p.pieza_nombre][p.talle] = (parseFloat(p.cantidad) || 0) * pares
  }
  for (const a of (ajustes || [])) {
    if (a.de_pieza && a.a_pieza) {
      const qty = parseFloat(a.cantidad) || 0
      if (!r[a.de_pieza]) r[a.de_pieza] = {}
      if (!r[a.a_pieza])  r[a.a_pieza]  = {}
      r[a.de_pieza][a.de_talle] = (r[a.de_pieza][a.de_talle] || 0) - qty
      r[a.a_pieza][a.a_talle]   = (r[a.a_pieza][a.a_talle]   || 0) + qty
    }
  }
  return r
}

function FaltaCortar({ productos: prodsMap }) {
  const [filas, setFilas]     = useState([])   // [{ pedido, cortesVinc, yaCortado }]
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      // 1. Pedidos en etapa corte
      const { data: pedidosCorte } = await supabase
        .from('pedidos').select('id, cliente, items, talles, producto_id').eq('etapa_actual', 'corte')

      if (!pedidosCorte?.length) { setFilas([]); return }

      const pedidoIds = pedidosCorte.map(p => p.id)

      // 2. Links cortes_pedidos
      const { data: cpRows } = await supabase
        .from('cortes_pedidos').select('pedido_id, corte_id').in('pedido_id', pedidoIds)

      const allMarcadaIds = [...new Set((cpRows || []).map(cp => cp.corte_id).filter(Boolean))]

      // 3. Fetch todo en paralelo (sin joins, más robusto)
      const [{ data: marcadasData }, { data: todasPiezas }, { data: todosAjustes }, { data: mps }] = await Promise.all([
        allMarcadaIds.length
          ? supabase.from('cortes_marcadas').select('id, pliegues, total_pliegues, fecha, nota').in('id', allMarcadaIds)
          : Promise.resolve({ data: [] }),
        allMarcadaIds.length
          ? supabase.from('cortes_piezas').select('marcada_id, producto_id, pieza_nombre, talle, cantidad').in('marcada_id', allMarcadaIds)
          : Promise.resolve({ data: [] }),
        allMarcadaIds.length
          ? supabase.from('cortes_ajustes').select('marcada_id, producto_id, de_pieza, a_pieza, de_talle, a_talle, cantidad').in('marcada_id', allMarcadaIds)
          : Promise.resolve({ data: [] }),
        allMarcadaIds.length
          ? supabase.from('cortes_marcadas_productos').select('marcada_id, producto_id').in('marcada_id', allMarcadaIds)
          : Promise.resolve({ data: [] }),
      ])

      const marcadaById = Object.fromEntries((marcadasData || []).map(m => [m.id, m]))

      // Agrupar cortes por pedido (usando marcadaById para los datos de la marcada)
      const cortesPorPedido = {}
      for (const cp of (cpRows || [])) {
        if (!cortesPorPedido[cp.pedido_id]) cortesPorPedido[cp.pedido_id] = []
        const m = marcadaById[cp.corte_id]
        if (m) cortesPorPedido[cp.pedido_id].push(m)
      }

      // 4. Calcular ya_cortado por pedido
      const result = pedidosCorte.map(ped => {
        const marcadas  = cortesPorPedido[ped.id] || []
        const yaCortado = {}

        for (const marcada of marcadas) {
          const tp    = parseFloat(marcada.total_pliegues) || 0
          const pp    = parseFloat(marcada.pliegues) || 1
          const pares = pp > 0 ? tp / pp : 0

          // Productos en esta marcada
          const prodsEnMarcada = (mps || []).filter(mp => String(mp.marcada_id) === String(marcada.id))

          // Si no hay entradas en cortes_marcadas_productos, usar las piezas directamente por marcada
          const productosIds = prodsEnMarcada.length
            ? prodsEnMarcada.map(mp => mp.producto_id)
            : [...new Set((todasPiezas || []).filter(p => String(p.marcada_id) === String(marcada.id)).map(p => p.producto_id))]

          for (const prodId of productosIds) {
            const piezas  = (todasPiezas || []).filter(p => String(p.marcada_id) === String(marcada.id) && String(p.producto_id) === String(prodId))
            const ajustes = (todosAjustes || []).filter(a => String(a.marcada_id) === String(marcada.id) && String(a.producto_id) === String(prodId))
            const res     = buildResultFC(piezas, pares, ajustes)
            if (!yaCortado[prodId]) yaCortado[prodId] = {}
            for (const [pieza, tallesObj] of Object.entries(res)) {
              if (!yaCortado[prodId][pieza]) yaCortado[prodId][pieza] = {}
              for (const [t, qty] of Object.entries(tallesObj)) {
                yaCortado[prodId][pieza][t] = (yaCortado[prodId][pieza][t] || 0) + qty
              }
            }
          }
        }

        return { pedido: ped, marcadas, yaCortado }
      })

      setFilas(result)
    } catch (e) {
      console.error('FaltaCortar error', e)
    } finally { setLoading(false) }
  }

  if (loading) return <div className="loading"><div className="spinner" /> Calculando balance…</div>

  if (!filas.length) {
    return (
      <div className="empty-state">
        <div className="icon">🔍</div>
        <h3>Sin pedidos en Corte</h3>
        <p>No hay pedidos en etapa Corte. Vinculá cortes desde el Asistente de cada pedido.</p>
      </div>
    )
  }

  const chipStyle = diff => ({
    display: 'inline-block', padding: '1px 6px', fontWeight: 700, fontSize: 11,
    fontFamily: 'Tahoma, Arial, sans-serif',
    background: diff > 0 ? '#d4edda' : diff < 0 ? '#f8d7da' : '#e8e8e8',
    color:      diff > 0 ? '#155724' : diff < 0 ? '#721c24' : '#555',
    border:     `1px solid ${diff > 0 ? '#c3e6cb' : diff < 0 ? '#f5c6cb' : '#c8c8c8'}`,
  })

  const ROL_LABEL = { tela1: '🧶 Tela 1', tela2: '🧶 Tela 2', rib: '🧶 RIB', entretela: '🧶 Entretela' }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
        <span>Balance por pedido usando los cortes vinculados. Pedidos en etapa <strong>Corte</strong>.</span>
        <button className="btn btn-secondary btn-sm" onClick={cargar}>↺ Actualizar</button>
      </div>

      {filas.map(({ pedido, marcadas, yaCortado }) => {
        const items = pedidoItems(pedido)

        return (
          <div key={pedido.id} style={{ marginBottom: 28 }}>
            {/* Header pedido */}
            <div style={{ fontWeight: 700, fontSize: 13, padding: '5px 10px', background: 'linear-gradient(to bottom, #e8eef7, #c8d4e8)', border: '1px solid #c8d4e8', color: '#1a3a6b', fontFamily: 'Tahoma, Arial, sans-serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>👤 {pedido.cliente}</span>
              {marcadas.length === 0
                ? <span style={{ fontSize: 11, fontWeight: 400, color: '#c04040' }}>⚠ Sin cortes vinculados — vinculá desde el Asistente</span>
                : <span style={{ fontSize: 11, fontWeight: 400, color: '#555' }}>{marcadas.length} sesión{marcadas.length > 1 ? 'es' : ''} de corte vinculada{marcadas.length > 1 ? 's' : ''}</span>
              }
            </div>

            {/* Sesiones vinculadas */}
            {marcadas.length > 0 && (
              <div style={{ display: 'flex', gap: 6, padding: '5px 10px', background: '#f8f8f4', border: '1px solid #ddd', borderTop: 'none', flexWrap: 'wrap' }}>
                {marcadas.map(m => (
                  <span key={m.id} style={{ fontSize: 10, border: '1px solid #c8c0a8', padding: '1px 6px', background: '#fff' }}>
                    ✂ {m.fecha || '—'}{m.nota ? ` · ${m.nota}` : ''} · {m.total_pliegues} pliegos
                  </span>
                ))}
              </div>
            )}

            {/* Tabla por ítem del pedido */}
            {items.map((item, iIdx) => {
              if (!item.producto_id) return null
              const prod = prodsMap[item.producto_id]
              if (!prod || !(prod.piezas || []).length) return null

              const nec  = item.talles || {}
              const cort = yaCortado[item.producto_id] || {}
              const todosLosTalles = [...new Set([
                ...Object.keys(nec).filter(t => (nec[t] || 0) > 0),
                ...Object.values(cort).flatMap(t => Object.keys(t)),
              ])].sort((a, b) => ORDEN_TALLES.indexOf(a) - ORDEN_TALLES.indexOf(b))

              if (todosLosTalles.length === 0) return null

              const rolesMap = {}
              for (const pieza of prod.piezas) {
                const rol = pieza.tela_rol || 'otro'
                if (!rolesMap[rol]) rolesMap[rol] = []
                rolesMap[rol].push(pieza)
              }

              return (
                <div key={iIdx}>
                  {items.length > 1 && (
                    <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', background: '#f0f4f8', border: '1px solid #dde4ee', borderTop: 'none', color: '#333' }}>
                      {prod.nombre}
                    </div>
                  )}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'Tahoma, Arial, sans-serif' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '3px 8px', background: '#f0f4f8', border: '1px solid #dde4ee', textAlign: 'left', width: '28%' }}>Pieza</th>
                        {todosLosTalles.map(t => (
                          <th key={t} style={{ padding: '3px 6px', background: '#f0f4f8', border: '1px solid #dde4ee', textAlign: 'center', minWidth: 46 }}>{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Fila necesario */}
                      <tr style={{ background: '#fafafa' }}>
                        <td style={{ padding: '3px 8px', border: '1px solid #eee', color: '#777', fontStyle: 'italic' }}>Pedido (necesario)</td>
                        {todosLosTalles.map(t => (
                          <td key={t} style={{ padding: '3px 6px', border: '1px solid #eee', textAlign: 'center', color: '#555' }}>
                            {nec[t] || '—'}
                          </td>
                        ))}
                      </tr>
                      {Object.entries(rolesMap).map(([rol, piezasDeRol]) => (
                        <React.Fragment key={rol}>
                          <tr>
                            <td colSpan={todosLosTalles.length + 1} style={{ padding: '2px 8px', background: '#f4f4ec', fontWeight: 700, color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, border: '1px solid #e0e8f0' }}>
                              {ROL_LABEL[rol] || `🧶 ${rol}`}
                            </td>
                          </tr>
                          {piezasDeRol.map(pieza => {
                            const cortPieza = cort[pieza.nombre] || {}
                            return (
                              <tr key={pieza.nombre}
                                onMouseEnter={e => e.currentTarget.style.background = '#ffffcc'}
                                onMouseLeave={e => e.currentTarget.style.background = ''}
                              >
                                <td style={{ padding: '3px 8px', border: '1px solid #eee', fontWeight: 600 }}>
                                  {pieza.nombre}
                                  {pieza.mult > 1 && <span style={{ fontSize: 10, color: '#888', marginLeft: 4 }}>×{pieza.mult}</span>}
                                </td>
                                {todosLosTalles.map(t => {
                                  const cut   = cortPieza[t] || 0
                                  const neces = (nec[t] || 0) * (pieza.mult || 1)
                                  const diff  = Math.round((cut - neces) * 100) / 100
                                  return (
                                    <td key={t} style={{ padding: '3px 6px', border: '1px solid #eee', textAlign: 'center' }}>
                                      {cut > 0 || neces > 0
                                        ? <span style={chipStyle(diff)}>{diff > 0 ? `+${diff}` : `${diff}`}</span>
                                        : <span style={{ color: '#ccc' }}>—</span>
                                      }
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Asistente ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function Asistente({ pedido, etapaId, contactos, lotes, onClose, onSaved, onAvanzar, libreMode = false }) {
  const eInfo = ETAPA_BY_ID[etapaId]
  const items = pedidoItems(pedido)

  const loteAbierto   = lotes.find(l => !l.completado_at) || null
  const lotesCerrados = lotes.filter(l => l.completado_at)

  const [hechasState, setHechasState] = useState(() =>
    items.map((it, idx) => {
      const guardado = (loteAbierto?.hechas || []).find(h => h.item_idx === idx)
      return {
        item_idx:    idx,
        producto_id: it.producto_id || null,
        producto:    it.producto || '',
        talles:      guardado?.talles || {},
      }
    })
  )
  const [fechaIngreso, setFechaIngreso] = useState(
    loteAbierto?.iniciado_at
      ? loteAbierto.iniciado_at.split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [responsableId, setResponsableId] = useState(loteAbierto?.responsable_id || null)
  const [nota, setNota]                   = useState(loteAbierto?.nota || '')
  const [saving, setSaving]               = useState(false)

  // ── Edición inline de lotes cerrados ──────────────────────────────────────
  const [editLoteId, setEditLoteId]     = useState(null)
  const [editFecha, setEditFecha]       = useState('')
  const [editNota, setEditNota]         = useState('')
  const [savingEdit, setSavingEdit]     = useState(false)

  function startEditLote(l) {
    setEditLoteId(l.id)
    setEditFecha(l.iniciado_at ? l.iniciado_at.split('T')[0] : '')
    setEditNota(l.nota || '')
  }

  async function saveEditLote(loteId) {
    setSavingEdit(true)
    await supabase.from('produccion_etapas').update({
      iniciado_at: editFecha ? new Date(editFecha).toISOString() : null,
      nota: editNota || null,
    }).eq('id', loteId)
    setSavingEdit(false)
    setEditLoteId(null)
    await onSaved()
  }

  async function borrarLote(loteId) {
    if (!window.confirm('¿Borrar este lote? Esta acción no se puede deshacer.')) return
    await supabase.from('produccion_etapas').delete().eq('id', loteId)
    await onSaved()
  }

  // ── Cortes vinculados (solo en etapa corte) ────────────────────────────────
  const [cortesVinc, setCortesVinc]       = useState([])
  const [cortesSugeridos, setCortesSugeridos] = useState([])

  useEffect(() => {
    if (etapaId === 'corte' && pedido.id && pedido.id !== '__libre__') {
      cargarCortesVinc()
      cargarCortesSugeridos()
    }
  }, [etapaId, pedido.id])

  async function cargarCortesVinc() {
    const { data: cp } = await supabase
      .from('cortes_pedidos').select('id, corte_id').eq('pedido_id', pedido.id)
    if (!cp?.length) { setCortesVinc([]); return }
    const ids = cp.map(r => r.corte_id)
    const { data: marcadas } = await supabase
      .from('cortes_marcadas').select('id, fecha, nota, total_pliegues, pliegues').in('id', ids)
    const { data: cmp } = await supabase
      .from('cortes_marcadas_productos').select('marcada_id, producto_id, productos!producto_id(nombre)').in('marcada_id', ids)
    setCortesVinc(cp.map(r => ({
      id: r.id,
      corte_id: r.corte_id,
      cortes_marcadas: {
        ...(marcadas || []).find(m => m.id === r.corte_id),
        cortes_marcadas_productos: (cmp || []).filter(c => c.marcada_id === r.corte_id),
      },
    })))
  }

  async function cargarCortesSugeridos() {
    const prodIds = pedidoItems(pedido).map(it => it.producto_id).filter(Boolean)
    if (!prodIds.length) return
    const { data } = await supabase
      .from('cortes_marcadas_productos')
      .select('marcada_id, productos!producto_id(nombre), cortes_marcadas!marcada_id(id, fecha, nota, total_pliegues, pliegues)')
      .in('producto_id', prodIds)
    // Deduplicar por marcada_id
    const vistos = new Set()
    const uniq = []
    for (const row of (data || [])) {
      const m = row.cortes_marcadas
      if (!m || vistos.has(m.id)) continue
      vistos.add(m.id)
      uniq.push({ ...m, _producto: row.productos?.nombre })
    }
    setCortesSugeridos(uniq.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')))
  }

  async function vincularCorte(marcada) {
    const { error } = await supabase.from('cortes_pedidos').insert({
      corte_id: marcada.id,
      pedido_id: pedido.id,
    })
    if (error) { alert('Error al vincular: ' + error.message); return }
    await cargarCortesVinc()
    await cargarCortesSugeridos()
  }

  async function desvincularCorte(cp) {
    if (!window.confirm('¿Desvincular este corte del pedido?')) return
    await supabase.from('cortes_pedidos').delete().eq('id', cp.id)
    await cargarCortesVinc()
    await cargarCortesSugeridos()
  }

  const contactosFiltrados = useMemo(() => {
    const tipos = eInfo.tipo
    if (!tipos.length) return contactos
    const filt = contactos.filter(c => tipos.includes((c.tipo || '').toLowerCase()))
    return filt.length ? filt : contactos
  }, [contactos, eInfo])

  function setTalle(idx, talle, val) {
    setHechasState(s => s.map((h, i) => {
      if (i !== idx) return h
      const newT = { ...h.talles }
      const n = parseInt(val) || 0
      if (n > 0) newT[talle] = n
      else delete newT[talle]
      return { ...h, talles: newT }
    }))
  }

  const historico = useMemo(() => {
    const acc = items.map(() => ({}))
    for (const l of lotesCerrados) {
      for (const h of l.hechas || []) {
        if (acc[h.item_idx]) {
          for (const [t, c] of Object.entries(h.talles || {})) {
            acc[h.item_idx][t] = (acc[h.item_idx][t] || 0) + c
          }
        }
      }
    }
    return acc
  }, [lotesCerrados, items])

  // modo: 'progreso' | 'parcial' | 'avanzar'
  async function guardar(modo = 'progreso') {
    setSaving(true)
    const responsable = contactos.find(c => c.id === responsableId)

    const payload = {
      ...(libreMode ? {} : { pedido_id: pedido.id }),
      etapa:              etapaId,
      responsable_id:     responsableId,
      responsable_nombre: responsable?.nombre || null,
      hechas:             hechasState,
      nota:               nota || null,
      iniciado_at:        fechaIngreso ? new Date(fechaIngreso).toISOString() : new Date().toISOString(),
    }

    // Para 'parcial' y 'avanzar' cerramos el lote actual
    const payloadFinal = (modo === 'parcial' || modo === 'avanzar')
      ? { ...payload, completado_at: new Date().toISOString() }
      : payload

    let err = null
    if (loteAbierto) {
      const { error } = await supabase.from('produccion_etapas').update(payloadFinal).eq('id', loteAbierto.id)
      err = error
    } else {
      const { error } = await supabase.from('produccion_etapas').insert({ ...payloadFinal, iniciado_at: new Date().toISOString() })
      err = error
    }

    if (err) { alert('Error al guardar: ' + err.message); setSaving(false); return }

    if (modo === 'parcial') {
      // Abrir nuevo lote vacío en la misma etapa
      await supabase.from('produccion_etapas').insert({
        ...(libreMode ? {} : { pedido_id: pedido.id }),
        etapa:       etapaId,
        hechas:      items.map((it, idx) => ({ item_idx: idx, producto_id: it.producto_id || null, producto: it.producto || '', talles: {} })),
        iniciado_at: new Date().toISOString(),
      })
    }

    setSaving(false)
    if (modo === 'avanzar') onAvanzar()
    else { await onSaved(); onClose() }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>{eInfo.icon} {eInfo.label} — {pedido.cliente}</h3>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              {pedidoTotal(pedido)} unidades · entrega {fmtFecha(pedido.fecha)}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label>📅 Fecha de ingreso</label>
              <input
                type="date"
                value={fechaIngreso}
                onChange={e => setFechaIngreso(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>👤 Responsable</label>
              <select
                value={responsableId || ''}
                onChange={e => setResponsableId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— Sin asignar —</option>
                {contactosFiltrados.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}{c.tipo ? ` (${c.tipo})` : ''}
                  </option>
                ))}
              </select>
              {eInfo.tipo.length > 0 && (
                <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                  Sugerencia: contactos tipo {eInfo.tipo.join(' / ')}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>📝 Nota</label>
              <input
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Observaciones, pendientes, etc."
              />
            </div>
          </div>

          {items.map((item, idx) => {
            const tabla         = item.tabla || inferirTabla(item.talles)
            const tallesPedido  = libreMode
              ? (TABLAS[tabla]?.talles || TABLAS.adulto.talles)
              : (TABLAS[tabla]?.talles || []).filter(t => (item.talles || {})[t] > 0)
            const totalNec      = totalTalles(item.talles)
            const totalEsteLote = totalTalles(hechasState[idx]?.talles)
            const totalHist     = totalTalles(historico[idx])
            const totalAcum     = totalEsteLote + totalHist

            return (
              <div key={idx} className="groupbox" style={{ marginBottom: 14 }}>
                <div className="groupbox-title">
                  📦 Ítem {idx + 1} — {item.producto}
                </div>

                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10 }}>
                  {!libreMode && (
                    <>Pedido: <strong style={{ color: 'var(--text)' }}>{totalNec} u.</strong>{' · '}</>
                  )}
                  {totalHist > 0 && (
                    <>Anteriores: <strong style={{ color: 'var(--success)' }}>{totalHist} u.</strong>{' · '}</>
                  )}
                  Este lote: <strong style={{ color: 'var(--accent)' }}>{totalEsteLote} u.</strong>
                  {!libreMode && <> · Total: <strong>{totalAcum}/{totalNec}</strong></>}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {tallesPedido.map(t => {
                    const ped  = item.talles[t]
                    const hist = historico[idx]?.[t] || 0
                    const val  = hechasState[idx]?.talles[t] || ''
                    const ok   = (Number(val) + hist) >= ped
                    return (
                      <div key={t} style={{ textAlign: 'center', minWidth: 64 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 2 }}>{t}</div>
                        <input
                          type="number"
                          min="0"
                          value={val}
                          placeholder="0"
                          onChange={e => setTalle(idx, t, e.target.value)}
                          style={{ width: 64, textAlign: 'center', borderColor: ok ? 'var(--success)' : undefined }}
                        />
                        <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                          {hist > 0 ? `+${hist} / ${ped}` : `de ${ped}`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Cortes vinculados — solo en etapa corte */}
          {etapaId === 'corte' && !libreMode && (
            <div className="groupbox" style={{ marginTop: 14 }}>
              <div className="groupbox-title">✂ Cortes vinculados</div>

              {cortesVinc.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {cortesVinc.map(cp => {
                    const m = cp.cortes_marcadas
                    if (!m) return null
                    const prods = m.cortes_marcadas_productos?.map(p => p.productos?.nombre).filter(Boolean).join(', ')
                    return (
                      <div key={cp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: '#f4f4ec', border: '1px solid #d0ccc0', marginBottom: 4, fontSize: 12 }}>
                        <div>
                          <strong>{m.fecha || '—'}</strong>
                          {prods && <span style={{ color: 'var(--text2)', marginLeft: 6 }}>{prods}</span>}
                          {m.nota && <span style={{ color: '#888', marginLeft: 6, fontStyle: 'italic' }}>{m.nota}</span>}
                          <span style={{ color: 'var(--text2)', marginLeft: 6 }}>· {m.total_pliegues} pliegues</span>
                        </div>
                        <button className="btn btn-danger btn-sm" onClick={() => desvincularCorte(cp)}>✕</button>
                      </div>
                    )
                  })}
                </div>
              )}

              {(() => {
                const yaVinc = new Set(cortesVinc.map(v => v.corte_id))
                const disponibles = cortesSugeridos.filter(m => !yaVinc.has(m.id))
                if (disponibles.length === 0) {
                  return <div style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic' }}>No hay sesiones de corte con productos que coincidan.</div>
                }
                return (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                      Sesiones disponibles para vincular
                    </div>
                    {disponibles.map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: '#f8f8f4', border: '1px solid #d8d4c8', marginBottom: 3, fontSize: 12 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#ffffcc'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f8f8f4'}
                      >
                        <div>
                          <strong>{m.fecha || '—'}</strong>
                          <span style={{ color: 'var(--text2)', marginLeft: 8 }}>{m._producto}</span>
                          {m.nota && <span style={{ color: '#888', marginLeft: 8, fontStyle: 'italic' }}>{m.nota}</span>}
                          <span style={{ color: 'var(--text2)', marginLeft: 8 }}>· {m.total_pliegues} pliegues</span>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => vincularCorte(m)}>+ Vincular</button>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {lotesCerrados.length > 0 && (
            <details style={{ marginTop: 12 }} open>
              <summary style={{ fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontWeight: 700 }}>
                📜 Historial de entregas ({lotesCerrados.length})
              </summary>
              <div style={{ marginTop: 8 }}>
                {lotesCerrados.map(l => {
                  const isEditing = editLoteId === l.id
                  const totalLote = sumarHechas([l])
                  return (
                    <div key={l.id} style={{ fontSize: 11, border: '1px solid #d8d4c8', marginBottom: 6, background: '#fafaf4' }}>
                      {/* Header lote */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: '#f0f0e8', borderBottom: '1px solid #d8d4c8' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1 }}>
                            <input
                              type="date"
                              value={editFecha}
                              onChange={e => setEditFecha(e.target.value)}
                              style={{ fontSize: 11, padding: '1px 4px', width: 130 }}
                            />
                            <input
                              value={editNota}
                              onChange={e => setEditNota(e.target.value)}
                              placeholder="Nota…"
                              style={{ fontSize: 11, padding: '1px 4px', flex: 1 }}
                            />
                            <button className="btn btn-primary btn-sm" onClick={() => saveEditLote(l.id)} disabled={savingEdit}>
                              {savingEdit ? '…' : '✔'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditLoteId(null)}>✕</button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                              <strong>{fmtFecha(l.iniciado_at?.split('T')[0])}</strong>
                              {l.responsable_nombre && <span style={{ color: 'var(--text2)' }}>👤 {l.responsable_nombre}</span>}
                              <span style={{ color: 'var(--text2)' }}>{totalLote} u.</span>
                              {l.nota && <span style={{ color: '#888', fontStyle: 'italic' }}>{l.nota}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => startEditLote(l)} title="Editar fecha / nota">✏</button>
                              <button className="btn btn-danger btn-sm" onClick={() => borrarLote(l.id)} title="Borrar lote">🗑</button>
                            </div>
                          </>
                        )}
                      </div>
                      {/* Detalle talles */}
                      {!isEditing && (l.hechas || []).map((h, hIdx) => {
                        const pairs = tallesOrdenados(h.talles)
                        if (!pairs.length) return null
                        return (
                          <div key={hIdx} style={{ padding: '5px 10px', borderTop: hIdx > 0 ? '1px solid #e8e4dc' : undefined }}>
                            {items.length > 1 && <div style={{ fontWeight: 700, color: '#555', marginBottom: 3 }}>{h.producto}</div>}
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {pairs.map(([t, c]) => (
                                <span key={t} style={{ border: '1px solid #c8c4b8', padding: '1px 6px', fontSize: 10, background: '#fff', fontWeight: 700 }}>
                                  {t} <span style={{ color: '#1a5aa8' }}>{c}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </details>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-secondary" onClick={() => guardar('progreso')} disabled={saving}>
            {saving ? 'Guardando…' : '💾 Guardar progreso'}
          </button>
          <button className="btn btn-secondary" onClick={() => guardar('parcial')} disabled={saving} title="Cerrar esta entrega y abrir un nuevo lote en la misma etapa">
            📦 Registrar entrega parcial
          </button>
          <button className="btn btn-primary" onClick={() => guardar('avanzar')} disabled={saving}>
            ✔ Cerrar lote y avanzar etapa
          </button>
        </div>
      </div>
    </div>
  )
}
