import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const F = 'Tahoma, Arial, sans-serif'
const today = () => new Date().toISOString().slice(0, 10)

const S = {
  wrap:     { fontFamily: F, fontSize: 12, background: '#f4f4ec' },
  tbar:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#1a3a6b', color: '#fff', position: 'sticky', top: 0, zIndex: 10 },
  btn:      { fontFamily: F, fontSize: 11, padding: '3px 10px', cursor: 'pointer', border: '1px solid #888', background: '#f0f0e8' },
  btnD:     { fontFamily: F, fontSize: 11, background: 'none', border: 'none', color: '#a00', cursor: 'pointer', padding: '0 4px' },
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

const TIPOS_CLIENTE = [
  { id: 'entrega',           label: 'Entrega',           icon: '🛍️', color: '#7a3a00' },
  { id: 'devolucion_cliente', label: 'Devolución',        icon: '↩',  color: '#6a006a' },
]

function MovCardCliente({ mov, onDelete }) {
  const [collapsed, setCollapsed] = useState(false)
  const tipo  = TIPOS_CLIENTE.find(t => t.id === mov.tipo) || { label: mov.tipo, icon: '📋', color: '#666' }
  const items = mov.taller_movimientos_items || []
  const total = items.reduce((s, it) => s + (it.cantidad || 0), 0)

  return (
    <div style={{ ...S.card, borderColor: tipo.color }}>
      <div style={{ ...S.cardHead, background: `linear-gradient(to bottom, ${tipo.color}22, ${tipo.color}11)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }} onClick={() => setCollapsed(c => !c)}>
          <span style={{ fontSize: 14 }}>{collapsed ? '▶' : '▼'}</span>
          <span style={S.tag(tipo.color)}>{tipo.icon} {tipo.label}</span>
          <span style={{ fontWeight: 700, fontSize: 12 }}>{fmtF(mov.fecha)}</span>
          <span style={{ fontSize: 10, color: '#888' }}>{total} prenda{total !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
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
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id}>
                  <td style={{ ...S.td, textAlign: 'left' }}>{it.productos?.nombre || '?'}</td>
                  <td style={S.td}>{it.talle}</td>
                  <td style={S.td}>{it.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ClienteBlock({ nombre, movs, onDelete, filtroTipo, filtroProd }) {
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
        : sortedDesc.map(m => <MovCardCliente key={m.id} mov={m} onDelete={onDelete} />)
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
        taller_movimientos_items(id, producto_id, talle, cantidad,
          productos(id, nombre))`)
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
        {selGrupo && (
          <button style={{ ...S.btn, background: 'linear-gradient(to bottom,#6a006a,#4a004a)', color: '#fff', border: '1px solid #4a004a', fontSize: 11 }}
            onClick={() => setDevolviendo(true)}>
            ↩ Devolución
          </button>
        )}
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
            <ClienteBlock
              nombre={selGrupo.nombre}
              movs={selGrupo.movs}
              onDelete={deleteMov}
              filtroTipo={filtroTipo}
              filtroProd={filtroProd}
            />
          )}
        </div>
      </div>

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
