import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

// ─── Constantes ───────────────────────────────────────────────────────────────

const ETAPAS = [
  { id: 'corte',   label: 'Corte',   icon: '✂',  tipo: ['otro', 'taller'], color: '' },
  { id: 'taller',  label: 'Taller',  icon: '🧵', tipo: ['taller'],         color: '' },
  { id: 'entrega', label: 'Entrega', icon: '📦', tipo: [],                  color: 'green' },
]

const ETAPA_BY_ID   = Object.fromEntries(ETAPAS.map(e => [e.id, e]))

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

  const [etapaSel, setEtapaSel]   = useState('corte')
  const [pedidoOpen, setPedidoOpen] = useState(null)

  useEffect(() => { fetchBase() }, [])
  useEffect(() => { fetchLotesEtapa(etapaSel) }, [etapaSel])

  async function fetchBase() {
    setLoading(true)
    const [ped, prods, cont] = await Promise.all([
      supabase.from('pedidos').select('*').order('created_at', { ascending: false }),
      supabase.from('productos').select('id, nombre, procesos'),
      supabase.from('contactos').select('*').order('nombre'),
    ])
    setPedidos(ped.data || [])
    setProductos(Object.fromEntries((prods.data || []).map(p => [p.id, p])))
    setContactos(cont.data || [])
    setLoading(false)
  }

  async function fetchLotesEtapa(etapa) {
    const { data } = await supabase
      .from('produccion_etapas')
      .select('*')
      .eq('etapa', etapa)
    setLotesEtapa(data || [])
  }

  async function refetch() {
    await fetchBase()
    if (etapaSel) await fetchLotesEtapa(etapaSel)
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

  // ── Pedidos en la etapa seleccionada ──────────────────────────────────────
  const pedidosEtapa = useMemo(() => {
    return pedidos
      .filter(p => p.etapa_actual === etapaSel)
      .sort((a, b) => {
        if (a.fecha && b.fecha) return a.fecha.localeCompare(b.fecha)
        if (a.fecha) return -1
        if (b.fecha) return 1
        return 0
      })
  }, [pedidos, etapaSel])

  // ── Mapa pedido_id → lotes ─────────────────────────────────────────────────
  const lotesPorPedido = useMemo(() => {
    const m = {}
    for (const l of lotesEtapa) {
      if (!m[l.pedido_id]) m[l.pedido_id] = []
      m[l.pedido_id].push(l)
    }
    return m
  }, [lotesEtapa])

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

  // ═══════════════════ Render ═══════════════════════════════════════════════
  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>🏭 Producción</h2>
        </div>
      </div>

      <div className="content">
        {loading ? (
          <div className="loading"><div className="spinner" /> Cargando…</div>
        ) : (
          <>
            {/* Tabs de etapas */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #003d7a', marginBottom: 12, flexWrap: 'wrap' }}>
              {ETAPAS.map(e => {
                const activa = etapaSel === e.id
                return (
                  <button
                    key={e.id}
                    onClick={() => { setEtapaSel(e.id); setPedidoOpen(null) }}
                    style={{
                      padding: '5px 14px',
                      fontFamily: 'Tahoma, sans-serif',
                      fontSize: 11,
                      fontWeight: 'bold',
                      border: '1px solid #a8a8a8',
                      borderBottom: activa ? '2px solid #ece9d8' : '1px solid #a8a8a8',
                      background: activa ? '#ece9d8' : 'linear-gradient(to bottom, #f4f4ec, #d8d4c8)',
                      color: activa ? '#003d7a' : '#555',
                      cursor: 'pointer',
                      marginBottom: activa ? -2 : 0,
                      display: 'flex', gap: 6, alignItems: 'center',
                    }}
                  >
                    {e.icon} {e.label}
                    <span style={{
                      background: counts[e.id] > 0 ? '#003d7a' : '#d8d4c8',
                      color: counts[e.id] > 0 ? '#fff' : '#888',
                      padding: '0 5px',
                      fontSize: 10,
                      fontWeight: 'bold',
                      minWidth: 18,
                      textAlign: 'center',
                    }}>
                      {counts[e.id] || 0}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Lista de pedidos */}
            {pedidosEtapa.length === 0 ? (
              <div className="empty-state">
                <div className="icon">{ETAPA_BY_ID[etapaSel]?.icon}</div>
                <h3>No hay pedidos en {ETAPA_BY_ID[etapaSel]?.label?.toLowerCase()}</h3>
                <p>Cuando un pedido entre en esta etapa lo vas a ver acá.</p>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                {pedidosEtapa.map(p => (
                  <PedidoRow
                    key={p.id}
                    pedido={p}
                    lotes={lotesPorPedido[p.id] || []}
                    onOpen={() => setPedidoOpen(p.id)}
                    onCambiarEtapa={(nuevaEtapa) => cambiarEtapa(p.id, nuevaEtapa)}
                  />
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              <div className="stat-card">
                <div className="stat-value">{pedidos.filter(p => !['entrega', 'cancelado'].includes(p.etapa_actual)).length}</div>
                <div className="stat-label">En producción</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--success)' }}>{pedidos.filter(p => p.etapa_actual === 'entrega').length}</div>
                <div className="stat-label">Entregados</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--warning)' }}>
                  {pedidos.filter(p => p.fecha && p.fecha < new Date().toISOString().split('T')[0] && !['entrega', 'cancelado'].includes(p.etapa_actual)).length}
                </div>
                <div className="stat-label">Vencidos</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--accent)' }}>
                  {pedidos.filter(p => !['entrega', 'cancelado'].includes(p.etapa_actual)).reduce((a, p) => a + pedidoTotal(p), 0)}
                </div>
                <div className="stat-label">Unidades en curso</div>
              </div>
            </div>
          </>
        )}
      </div>

      {pedidoOpen !== null && (
        <Asistente
          pedido={pedidos.find(p => p.id === pedidoOpen)}
          etapaId={etapaSel}
          contactos={contactos}
          lotes={lotesPorPedido[pedidoOpen] || []}
          onClose={() => setPedidoOpen(null)}
          onSaved={refetch}
          onAvanzar={() => avanzarEtapa(pedidoOpen, etapaSel)}
        />
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
// ─── Asistente ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function Asistente({ pedido, etapaId, contactos, lotes, onClose, onSaved, onAvanzar }) {
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
      pedido_id:          pedido.id,
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
            const tallesPedido  = (TABLAS[tabla]?.talles || []).filter(t => (item.talles || {})[t] > 0)
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
                  Pedido: <strong style={{ color: 'var(--text)' }}>{totalNec} u.</strong>
                  {totalHist > 0 && (
                    <> · Anteriores: <strong style={{ color: 'var(--success)' }}>{totalHist} u.</strong></>
                  )}
                  {' '}· Este lote: <strong style={{ color: 'var(--accent)' }}>{totalEsteLote} u.</strong>
                  {' '}· Total: <strong>{totalAcum}/{totalNec}</strong>
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
