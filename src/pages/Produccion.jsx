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
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const { data: mps } = await supabase
        .from('cortes_marcadas_productos')
        .select('marcada_id, producto_id, cortes_marcadas!marcada_id(id, pliegues, total_pliegues)')

      const marcadaIds = [...new Set((mps || []).map(mp => mp.marcada_id))]

      const [{ data: todasPiezas }, { data: todosAjustes }, { data: pedidosData }] = await Promise.all([
        marcadaIds.length ? supabase.from('cortes_piezas').select('*').in('marcada_id', marcadaIds) : Promise.resolve({ data: [] }),
        marcadaIds.length ? supabase.from('cortes_ajustes').select('*').in('marcada_id', marcadaIds) : Promise.resolve({ data: [] }),
        supabase.from('pedidos').select('id, items, talles, producto_id, cliente')
          .eq('etapa_actual', 'corte'),
      ])

      // ya_cortado[producto_id][pieza_nombre][talle] = cantidad total
      const yaCortado = {}
      for (const mp of (mps || [])) {
        const marcada = mp.cortes_marcadas
        if (!marcada) continue
        const tp = parseFloat(marcada.total_pliegues) || 0
        const pp = parseFloat(marcada.pliegues) || 1
        const pares = pp > 0 ? tp / pp : 0
        const piezas = (todasPiezas || []).filter(p => p.marcada_id === mp.marcada_id && p.producto_id === mp.producto_id)
        const ajustes = (todosAjustes || []).filter(a => a.marcada_id === mp.marcada_id && a.producto_id === mp.producto_id)
        const result = buildResultFC(piezas, pares, ajustes)
        if (!yaCortado[mp.producto_id]) yaCortado[mp.producto_id] = {}
        for (const [pieza, tallesObj] of Object.entries(result)) {
          if (!yaCortado[mp.producto_id][pieza]) yaCortado[mp.producto_id][pieza] = {}
          for (const [t, qty] of Object.entries(tallesObj)) {
            yaCortado[mp.producto_id][pieza][t] = (yaCortado[mp.producto_id][pieza][t] || 0) + qty
          }
        }
      }

      // necesario[producto_id][talle] = unidades de pedido
      const necesario = {}
      for (const ped of (pedidosData || [])) {
        const items = ped.items?.length ? ped.items : [{ producto_id: ped.producto_id, talles: ped.talles }]
        for (const item of items) {
          if (!item.producto_id) continue
          if (!necesario[item.producto_id]) necesario[item.producto_id] = {}
          for (const [t, qty] of Object.entries(item.talles || {})) {
            necesario[item.producto_id][t] = (necesario[item.producto_id][t] || 0) + (Number(qty) || 0)
          }
        }
      }

      setData({ yaCortado, necesario })
    } catch (e) {
      console.error('FaltaCortar error', e)
    } finally { setLoading(false) }
  }

  if (loading) return <div className="loading"><div className="spinner" /> Calculando balance…</div>
  if (!data) return null

  const { yaCortado, necesario } = data
  const prodIds = [...new Set([...Object.keys(yaCortado), ...Object.keys(necesario)])]
  const prods = prodIds.map(id => prodsMap[id]).filter(Boolean).filter(p => (p.piezas || []).length > 0)

  if (prods.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🔍</div>
        <h3>Sin datos de corte</h3>
        <p>Cargá al menos una sesión de corte y un pedido activo para ver el balance.</p>
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
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Balance piezas cortadas vs. necesarias. Solo incluye pedidos en etapa <strong>Corte</strong>.</span>
        <button className="btn btn-secondary btn-sm" onClick={cargar}>↺ Actualizar</button>
      </div>
      {prods.map(prod => {
        const nec  = necesario[prod.id] || {}
        const cort = yaCortado[prod.id] || {}
        const todosLosTalles = [...new Set([
          ...Object.keys(nec),
          ...Object.values(cort).flatMap(t => Object.keys(t)),
        ])].sort((a, b) => ORDEN_TALLES.indexOf(a) - ORDEN_TALLES.indexOf(b))

        if (todosLosTalles.length === 0) return null

        const rolesMap = {}
        for (const pieza of (prod.piezas || [])) {
          const rol = pieza.tela_rol || 'otro'
          if (!rolesMap[rol]) rolesMap[rol] = []
          rolesMap[rol].push(pieza)
        }

        const totalNecProd = Object.values(nec).reduce((a, b) => a + b, 0)

        return (
          <div key={prod.id} style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 13, padding: '5px 10px', background: 'linear-gradient(to bottom, #e8eef7, #c8d4e8)', border: '1px solid #c8d4e8', color: '#1a3a6b', fontFamily: 'Tahoma, Arial, sans-serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{prod.nombre}</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: '#555' }}>
                Pedidos activos: {totalNecProd} u.
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'Tahoma, Arial, sans-serif' }}>
              <thead>
                <tr>
                  <th style={{ padding: '3px 8px', background: '#f0f4f8', border: '1px solid #dde4ee', textAlign: 'left', width: '30%' }}>Pieza</th>
                  {todosLosTalles.map(t => (
                    <th key={t} style={{ padding: '3px 6px', background: '#f0f4f8', border: '1px solid #dde4ee', textAlign: 'center', minWidth: 46 }}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(rolesMap).map(([rol, piezasDeRol]) => (
                  <React.Fragment key={rol}>
                    <tr>
                      <td colSpan={todosLosTalles.length + 1} style={{ padding: '3px 8px', background: '#f4f4ec', fontWeight: 700, color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, border: '1px solid #e0e8f0' }}>
                        {ROL_LABEL[rol] || `🧶 ${rol}`}
                      </td>
                    </tr>
                    <tr style={{ background: '#fafafa' }}>
                      <td style={{ padding: '3px 8px', border: '1px solid #eee', color: '#777', fontStyle: 'italic' }}>Pedidos (necesario)</td>
                      {todosLosTalles.map(t => (
                        <td key={t} style={{ padding: '3px 6px', border: '1px solid #eee', textAlign: 'center', color: '#555' }}>
                          {nec[t] || '—'}
                        </td>
                      ))}
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
                                  ? <span style={chipStyle(diff)}>{diff > 0 ? `+${diff}` : diff}</span>
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

  async function guardar(avanzarDespues = false) {
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

    let err = null
    if (loteAbierto) {
      const { error } = await supabase
        .from('produccion_etapas')
        .update(payload)
        .eq('id', loteAbierto.id)
      err = error
    } else {
      const { error } = await supabase
        .from('produccion_etapas')
        .insert({ ...payload, iniciado_at: new Date().toISOString() })
      err = error
    }

    if (err) { alert('Error al guardar: ' + err.message); setSaving(false); return }

    setSaving(false)
    if (avanzarDespues) onAvanzar()
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

          {lotesCerrados.length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
                📜 Historial de lotes cerrados ({lotesCerrados.length})
              </summary>
              <div style={{ marginTop: 8 }}>
                {lotesCerrados.map(l => (
                  <div key={l.id} style={{ fontSize: 11, padding: '6px 10px', background: 'var(--bg3)', borderRadius: 'var(--radius)', marginBottom: 4 }}>
                    <strong>{fmtFecha(l.iniciado_at?.split('T')[0])}</strong>
                    {l.completado_at && <span style={{ color: 'var(--text2)' }}> → {fmtFecha(l.completado_at.split('T')[0])}</span>}
                    {l.responsable_nombre && <> · 👤 {l.responsable_nombre}</>}
                    <> · {sumarHechas([l])} u.</>
                    {l.nota && <div style={{ color: 'var(--text2)', marginTop: 2 }}>{l.nota}</div>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-secondary" onClick={() => guardar(false)} disabled={saving}>
            {saving ? 'Guardando…' : '💾 Guardar progreso'}
          </button>
          <button className="btn btn-primary" onClick={() => guardar(true)} disabled={saving}>
            ✔ Cerrar lote y avanzar etapa
          </button>
        </div>
      </div>
    </div>
  )
}
