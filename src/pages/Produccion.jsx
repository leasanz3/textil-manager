import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

// ─── Constantes ───────────────────────────────────────────────────────────────

const ETAPAS = [
  { id: 'corte',      label: 'Corte',        icon: '✂',  tipo: ['otro', 'taller'] },
  { id: 'taller',     label: 'Taller',       icon: '🧵', tipo: ['taller'] },
  { id: 'estampado',  label: 'Estampado',    icon: '🎨', tipo: ['estampador'] },
  { id: 'bordado',    label: 'Bordado',      icon: '🪡', tipo: ['bordador'] },
  { id: 'sublimado',  label: 'Sublimado',    icon: '✨', tipo: ['sublimador'] },
  { id: 'planchado',  label: 'Planchado',    icon: '🔥', tipo: ['otro', 'taller'] },
  { id: 'ojal_boton', label: 'Ojal y botón', icon: '🪢', tipo: ['otro', 'taller'] },
  { id: 'entrega',    label: 'Entrega',      icon: '📦', tipo: [] },
]

const ETAPA_BY_ID   = Object.fromEntries(ETAPAS.map(e => [e.id, e]))

const ORDEN_TALLES = ['XS','S','M','L','XL','XXL','2','4','6','8','10','12','14','16','40','42','44','46','48','50','52','54','56','58']

function tallesOrdenados(tallesObj) {
  return ORDEN_TALLES
    .filter(t => (tallesObj || {})[t] > 0)
    .map(t => [t, tallesObj[t]])
}
const FLUJO_DEFAULT = ['corte', 'taller', 'estampado', 'bordado', 'sublimado', 'planchado', 'ojal_boton', 'entrega']

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

  const [etapaSel, setEtapaSel]   = useState(null)
  const [pedidoOpen, setPedidoOpen] = useState(null)

  useEffect(() => { fetchBase() }, [])
  useEffect(() => { if (etapaSel) fetchLotesEtapa(etapaSel) }, [etapaSel])

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
    if (!etapaSel) return []
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

  // ═══════════════════ Render: Hub ══════════════════════════════════════════
  if (!etapaSel) {
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
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>
                  Asistente de trabajo por etapa.
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  Elegí una etapa para ver los pedidos en cola y registrar el avance.
                </div>
              </div>

              <div className="prod-stage-grid">
                {ETAPAS.map(e => (
                  <div
                    key={e.id}
                    className={`prod-stage-card ${counts[e.id] === 0 ? 'empty' : ''}`}
                    onClick={() => setEtapaSel(e.id)}
                  >
                    <div className="prod-stage-icon">{e.icon}</div>
                    <div className="prod-stage-label">{e.label}</div>
                    <div className={`prod-stage-count ${counts[e.id] === 0 ? '' : 'has'}`}>
                      {counts[e.id]}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                      {counts[e.id] === 1 ? 'pedido' : 'pedidos'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="stat-grid" style={{ marginTop: 20 }}>
                <div className="stat-card">
                  <div className="stat-value">
                    {pedidos.filter(p => !['entrega', 'cancelado'].includes(p.etapa_actual)).length}
                  </div>
                  <div className="stat-label">En producción</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--success)' }}>
                    {pedidos.filter(p => p.etapa_actual === 'entrega').length}
                  </div>
                  <div className="stat-label">Entregados</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--warning)' }}>
                    {pedidos.filter(p =>
                      p.fecha &&
                      p.fecha < new Date().toISOString().split('T')[0] &&
                      !['entrega', 'cancelado'].includes(p.etapa_actual)
                    ).length}
                  </div>
                  <div className="stat-label">Vencidos</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--accent)' }}>
                    {pedidos
                      .filter(p => !['entrega', 'cancelado'].includes(p.etapa_actual))
                      .reduce((a, p) => a + pedidoTotal(p), 0)}
                  </div>
                  <div className="stat-label">Unidades en curso</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════ Render: Cola de etapa ════════════════════════════════
  const eInfo = ETAPA_BY_ID[etapaSel]
  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>{eInfo.icon} {eInfo.label}</h2>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => { setEtapaSel(null); setPedidoOpen(null) }}>
            ← Producción
          </button>
        </div>
      </div>

      <div className="content">
        <div className="prod-tabs">
          {ETAPAS.map(e => (
            <button
              key={e.id}
              className={`prod-tab ${etapaSel === e.id ? 'active' : ''}`}
              onClick={() => { setEtapaSel(e.id); setPedidoOpen(null) }}
            >
              <span>{e.icon}</span>
              <span>{e.label}</span>
              <span className="prod-tab-count">{counts[e.id]}</span>
            </button>
          ))}
        </div>

        {pedidosEtapa.length === 0 ? (
          <div className="empty-state">
            <div className="icon">{eInfo.icon}</div>
            <h3>No hay pedidos en {eInfo.label.toLowerCase()}</h3>
            <p>Cuando un pedido entre en esta etapa lo vas a ver acá.</p>
          </div>
        ) : (
          <div className="prod-list">
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
  const dias   = diasDesde(abierto?.iniciado_at || pedido.created_at)

  return (
    <div className="prod-card" onClick={onOpen}>
      <div className="prod-card-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="prod-card-cliente">{pedido.cliente || '—'}</div>
          <div className="prod-card-prod">
            {items.map((it, i) => (
              <span key={i}>
                {i > 0 && ' · '}
                <strong>{it.producto || '—'}</strong>
                <span style={{ color: 'var(--text2)' }}> × {totalTalles(it.talles)}</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {pedidoItems(pedido).map((it, idx) => {
              const talles = tallesOrdenados(it.talles)
              if (!talles.length) return null
              return (
                <div key={idx} style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  {pedidoItems(pedido).length > 1 && (
                    <span style={{ fontSize: 11, color: 'var(--text2)', marginRight: 2 }}>{it.producto}:</span>
                  )}
                  {talles.map(([t, c]) => (
                    <span key={t} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                      {t} <span style={{ color: 'var(--accent)' }}>{c}</span>
                    </span>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
        <div className="prod-card-meta">
          <div className="prod-card-total">{total} <span>u.</span></div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
            {pedido.fecha_pedido && <span>📋 {fmtFecha(pedido.fecha_pedido)}</span>}
            {pedido.fecha_pedido && pedido.fecha && <span style={{ margin: '0 4px' }}>·</span>}
            {pedido.fecha && (
              <span style={{ color: venc ? 'var(--danger)' : 'var(--text2)' }}>
                🏁 {fmtFecha(pedido.fecha)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="prod-card-foot">
        <div className="prod-card-foot-left">
          <span className="prod-card-pill">
            {abierto?.iniciado_at
              ? `📅 ${fmtFecha(abierto.iniciado_at.split('T')[0])}`
              : `⏱ ${dias} ${dias === 1 ? 'día' : 'días'}`}
          </span>
          {abierto?.responsable_nombre && (
            <span className="prod-card-pill">👤 {abierto.responsable_nombre}</span>
          )}
          <span className="prod-card-pill">
            <span className="prod-bar"><span className="prod-bar-fill" style={{ width: `${avance}%` }} /></span>
            {hechas}/{total} ({avance}%)
          </span>
        </div>
        <div className="prod-card-foot-right" onClick={e => e.stopPropagation()}>
          <button className="btn btn-secondary btn-sm" onClick={onOpen}>📝 Asistente</button>
          <select
            value={pedido.etapa_actual || ''}
            onChange={e => onCambiarEtapa(e.target.value)}
            style={{ fontSize: 12, padding: '5px 8px' }}
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
