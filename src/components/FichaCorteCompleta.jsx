import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import TablaCorte from './TablaCorte'
import { TABLAS_TALLES, TALLES_ADULTO } from '../constants/talles'

const fmtFecha = f => {
  if (!f) return '—'
  const [y, m, d] = f.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

const labelS = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  color: 'var(--text2)', letterSpacing: 0.5, marginBottom: 3,
}

/**
 * Props:
 *   corte: cortes_marcadas row (with .productos and .telas joined)
 *   onClose: () => void
 *   onDeleted: () => void
 */
export default function FichaCorteCompleta({ corte, onClose, onDeleted }) {
  const [piezasMap, setPiezasMap] = useState({}) // { pieza_nombre: { talle: cantidad } }
  const [ajustes,   setAjustes]   = useState([])
  const [pedidos,   setPedidos]   = useState([]) // cortes_pedidos joined
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)

  // Achicar modal
  const [modalAchicar, setModalAchicar] = useState(null) // talle string
  const [achCantidad,  setAchCantidad]  = useState('1')
  const [achATalle,    setAchATalle]    = useState('')
  const [savingAch,    setSavingAch]    = useState(false)

  // Agregar pieza
  const [newPieza,      setNewPieza]     = useState('')
  const [showAddPieza,  setShowAddPieza] = useState(false)

  // Vinc pedido
  const [modalPedido,   setModalPedido]   = useState(false)
  const [pedidoQuery,   setPedidoQuery]   = useState('')
  const [pedidoResults, setPedidoResults] = useState([])
  const searchTimeout = useRef(null)

  // Nota inline
  const [nota, setNota]         = useState(corte.nota || '')
  const [editNota, setEditNota] = useState(false)

  const producto = corte.productos
  const tela     = corte.telas
  const talles   = TABLAS_TALLES[producto?.tabla] || TALLES_ADULTO

  useEffect(() => { loadData() }, [corte.id])

  async function loadData() {
    setLoading(true)
    const [{ data: piezas }, { data: ajts }, { data: peds }] = await Promise.all([
      supabase.from('cortes_piezas').select('*').eq('marcada_id', corte.id),
      supabase.from('cortes_ajustes').select('*').eq('marcada_id', corte.id).order('created_at'),
      supabase.from('cortes_pedidos').select('*, pedidos(cliente, producto, items)').eq('corte_id', corte.id),
    ])

    // Build piezasMap
    const map = {}
    ;(piezas || []).forEach(({ pieza_nombre, talle, cantidad }) => {
      if (!map[pieza_nombre]) map[pieza_nombre] = {}
      map[pieza_nombre][talle] = cantidad
    })
    // Default piezas if empty
    if (Object.keys(map).length === 0) {
      map['Delantera'] = {}
      map['Trasera']   = {}
    }
    setPiezasMap(map)
    setAjustes(ajts || [])
    setPedidos(peds || [])
    setLoading(false)
  }

  // ── Guardar piezas completas ───────────────────────────────────────────────

  async function savePiezas(map) {
    setSaving(true)
    const rows = []
    Object.entries(map).forEach(([pieza_nombre, tallesObj]) => {
      Object.entries(tallesObj).forEach(([talle, cantidad]) => {
        if (cantidad > 0) rows.push({ marcada_id: corte.id, pieza_nombre, talle, cantidad })
      })
    })
    await supabase.from('cortes_piezas').delete().eq('marcada_id', corte.id)
    if (rows.length > 0) await supabase.from('cortes_piezas').insert(rows)
    setSaving(false)
  }

  function handleCellChange(pieza, talle, value) {
    const updated = {
      ...piezasMap,
      [pieza]: { ...(piezasMap[pieza] || {}), [talle]: value },
    }
    setPiezasMap(updated)
    savePiezas(updated)
  }

  // ── Achicar ───────────────────────────────────────────────────────────────

  function abrirAchicar(talle) {
    setModalAchicar(talle)
    setAchCantidad('1')
    // Default a_talle: el siguiente talle más pequeño
    const idx = talles.indexOf(talle)
    setAchATalle(idx > 0 ? talles[idx - 1] : talles[0])
  }

  async function confirmarAchicar() {
    const cant = parseInt(achCantidad) || 0
    if (cant <= 0 || !achATalle || achATalle === modalAchicar) return
    setSavingAch(true)

    // Actualizar piezas: reducir modalAchicar, aumentar achATalle en cada pieza
    const updated = { ...piezasMap }
    Object.keys(updated).forEach(pieza => {
      const curDe = updated[pieza][modalAchicar] || 0
      const curA  = updated[pieza][achATalle]    || 0
      updated[pieza] = {
        ...updated[pieza],
        [modalAchicar]: Math.max(0, curDe - cant),
        [achATalle]:    curA + cant,
      }
    })
    setPiezasMap(updated)
    await savePiezas(updated)

    // Log en cortes_ajustes
    await supabase.from('cortes_ajustes').insert({
      marcada_id: corte.id,
      de_talle:   modalAchicar,
      cantidad:   cant,
      a_talle:    achATalle,
    })

    setSavingAch(false)
    setModalAchicar(null)
    loadData()
  }

  // ── Agregar pieza ─────────────────────────────────────────────────────────

  function addPieza() {
    const nombre = newPieza.trim()
    if (!nombre || piezasMap[nombre]) return
    const updated = { ...piezasMap, [nombre]: {} }
    setPiezasMap(updated)
    savePiezas(updated)
    setNewPieza('')
    setShowAddPieza(false)
  }

  function removePieza(nombre) {
    if (!window.confirm(`¿Quitar la pieza "${nombre}"?`)) return
    const updated = { ...piezasMap }
    delete updated[nombre]
    setPiezasMap(updated)
    savePiezas(updated)
  }

  // ── Vincular pedido ───────────────────────────────────────────────────────

  function onPedidoSearch(val) {
    setPedidoQuery(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!val.trim()) { setPedidoResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('id, cliente, producto, etapa_actual')
        .or(`cliente.ilike.%${val}%,producto.ilike.%${val}%`)
        .limit(8)
      setPedidoResults(data || [])
    }, 250)
  }

  async function vincularPedido(pedido) {
    await supabase.from('cortes_pedidos').insert({ corte_id: corte.id, pedido_id: pedido.id, piezas_asignadas: {} })
    setPedidoQuery('')
    setPedidoResults([])
    setModalPedido(false)
    loadData()
  }

  async function desvincularPedido(cpId) {
    if (!window.confirm('¿Desvincular este pedido?')) return
    await supabase.from('cortes_pedidos').delete().eq('id', cpId)
    loadData()
  }

  // ── Guardar nota ──────────────────────────────────────────────────────────

  async function saveNota() {
    await supabase.from('cortes_marcadas').update({ nota }).eq('id', corte.id)
    setEditNota(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const totalMetros = corte.total_metros ?? (corte.metros * corte.pliegues)
  const promedio    = corte.promedio_pieza

  // Total prendas por talle (MIN de todas las piezas)
  const minPerTalle = {}
  talles.forEach(t => {
    const piezasArr = Object.values(piezasMap)
    if (piezasArr.length === 0) { minPerTalle[t] = 0; return }
    minPerTalle[t] = Math.min(...piezasArr.map(p => p[t] || 0))
  })

  if (loading) {
    return (
      <div className="loading" style={{ margin: '40px auto' }}>
        <div className="spinner" /> Cargando ficha...
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px' }}>

      {/* ── Cabecera ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingTop: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{producto?.nombre || '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {tela ? `${tela.tipo}${tela.color ? ` · ${tela.color}` : ''}` : '—'}
            {' · '}{fmtFecha(corte.created_at)}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>✕ Cerrar</button>
      </div>

      {/* ── Info rápida ── */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <div style={labelS}>Metros</div>
          <strong>{corte.metros}</strong>
        </div>
        <div>
          <div style={labelS}>Pliegues</div>
          <strong>{corte.pliegues}</strong>
        </div>
        <div>
          <div style={labelS}>Total metros</div>
          <strong>{totalMetros ? Number(totalMetros).toFixed(2) : '—'}</strong>
        </div>
        {promedio != null && (
          <div>
            <div style={labelS}>Promedio / pieza</div>
            <strong>{Number(promedio).toFixed(3)} m</strong>
          </div>
        )}
        {producto?.cara_uso && (
          <div>
            <div style={labelS}>Cara de uso</div>
            <span style={{
              background: '#8060c022', color: '#8060c0',
              border: '1px solid #8060c088',
              padding: '1px 8px', fontSize: 11, fontWeight: 700, borderRadius: 2,
            }}>
              {producto.cara_uso}
            </span>
          </div>
        )}
        <div>
          <div style={labelS}>Estado guardado</div>
          <span style={{ fontSize: 12, color: saving ? '#c8a040' : '#1a7a1a' }}>
            {saving ? '⏳ Guardando…' : '✓ Guardado'}
          </span>
        </div>
      </div>

      {/* ── Pedidos vinculados ── */}
      <div className="table-wrap" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>📋 Pedidos vinculados</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setModalPedido(true)}>+ Vincular</button>
        </div>
        {pedidos.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic' }}>Sin pedidos asociados — corte de stock libre</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {pedidos.map(cp => {
              const p = cp.pedidos
              const label = p?.items?.length > 0 ? p.items[0].producto : p?.producto
              return (
                <div key={cp.id} style={{
                  border: '1px solid var(--border)', borderRadius: 4,
                  padding: '6px 10px', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <span><strong>{p?.cliente}</strong> — {label}</span>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c06060', fontSize: 13 }}
                    onClick={() => desvincularPedido(cp.id)}
                  >✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Tabla de corte ── */}
      <div className="table-wrap" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>✂ Tabla de corte</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {showAddPieza ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  placeholder="Nombre pieza"
                  value={newPieza}
                  onChange={e => setNewPieza(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addPieza(); if (e.key === 'Escape') setShowAddPieza(false) }}
                  style={{ padding: '3px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4 }}
                  autoFocus
                />
                <button className="btn btn-primary btn-sm" onClick={addPieza}>+ Agregar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddPieza(false)}>✕</button>
              </div>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddPieza(true)}>+ Pieza</button>
            )}
          </div>
        </div>

        {/* Botones para quitar piezas */}
        {Object.keys(piezasMap).length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {Object.keys(piezasMap).map(pieza => (
              <span key={pieza} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '2px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {pieza}
                <span
                  style={{ cursor: 'pointer', color: '#c06060', fontWeight: 700 }}
                  onClick={() => removePieza(pieza)}
                >✕</span>
              </span>
            ))}
          </div>
        )}

        <TablaCorte
          piezasMap={piezasMap}
          talles={talles}
          onCellChange={handleCellChange}
          onAchicar={abrirAchicar}
        />
      </div>

      {/* ── Ajustes (bitácora de achicados) ── */}
      {ajustes.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 16, padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📝 Ajustes registrados</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ajustes.map(a => (
              <div key={a.id} style={{ fontSize: 12, color: 'var(--text2)' }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                  {fmtFecha(a.created_at)}
                </span>
                {' — Achicado '}
                <strong style={{ color: '#c8a040' }}>{a.cantidad} × {a.de_talle}</strong>
                {' → '}
                <strong style={{ color: '#2a7a2a' }}>{a.a_talle}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Nota ── */}
      <div className="table-wrap" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>🗒 Nota</div>
          {!editNota && <button className="btn btn-secondary btn-sm" onClick={() => setEditNota(true)}>✏ Editar</button>}
        </div>
        {editNota ? (
          <div>
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              style={{ width: '100%', height: 70, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="btn btn-primary btn-sm" onClick={saveNota}>✔ Guardar</button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setNota(corte.nota || ''); setEditNota(false) }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: nota ? 'var(--text)' : 'var(--text2)', fontStyle: nota ? 'normal' : 'italic' }}>
            {nota || 'Sin nota'}
          </div>
        )}
      </div>

      {/* ── Modal achicar ── */}
      {modalAchicar && (
        <div className="modal-overlay" onClick={() => setModalAchicar(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3>Achicar talle {modalAchicar}</h3>
              <button className="close-btn" onClick={() => setModalAchicar(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
                Reducir prendas de <strong>{modalAchicar}</strong> y sumarlas a otro talle.
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Cuántas prendas</label>
                  <input
                    type="number" min="1"
                    value={achCantidad}
                    onChange={e => setAchCantidad(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>A talle</label>
                  <select value={achATalle} onChange={e => setAchATalle(e.target.value)}>
                    {talles.filter(t => t !== modalAchicar).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalAchicar(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarAchicar} disabled={savingAch}>
                {savingAch ? 'Guardando…' : '✔ Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal vincular pedido ── */}
      {modalPedido && (
        <div className="modal-overlay" onClick={() => setModalPedido(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>📋 Vincular pedido</h3>
              <button className="close-btn" onClick={() => setModalPedido(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Buscar pedido (cliente o producto)</label>
                <input
                  value={pedidoQuery}
                  onChange={e => onPedidoSearch(e.target.value)}
                  placeholder="ej: María, Camiseta..."
                  autoFocus
                />
              </div>
              {pedidoResults.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  {pedidoResults.map(p => (
                    <div
                      key={p.id}
                      onClick={() => vincularPedido(p)}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                        fontSize: 13,
                      }}
                    >
                      <strong>{p.cliente}</strong> — {p.producto}
                      <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>{p.etapa_actual}</span>
                    </div>
                  ))}
                </div>
              )}
              {pedidoQuery && pedidoResults.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic' }}>Sin resultados</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalPedido(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
