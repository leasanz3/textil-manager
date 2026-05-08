import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── estilos ─────────────────────────────────────────────────────────────────
const S = {
  page: {
    fontFamily: 'Tahoma, Verdana, "MS Sans Serif", Geneva, sans-serif',
    fontSize: '11px',
    color: '#000',
    background: '#d4d0c8',
    minHeight: '100vh',
    padding: '10px',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    gap: '10px',
    alignItems: 'start',
  },
  wp: {
    background: '#fff',
    border: '1px solid #a8a8a8',
    boxShadow: '1px 1px 0 #b8b8b8',
    marginBottom: '10px',
  },
  wph: {
    background: 'linear-gradient(to bottom, #e8eef7 0%, #c8d4e8 100%)',
    borderBottom: '1px solid #6b83a8',
    padding: '4px 8px',
    fontWeight: 'bold',
    fontSize: '11px',
    color: '#1a3a6b',
  },
  wpb: { padding: '6px 8px' },
  input: {
    width: '100%',
    fontFamily: 'Tahoma, Verdana, sans-serif',
    fontSize: '11px',
    border: '1px solid #8a8a8a',
    padding: '2px 4px',
    boxSizing: 'border-box',
    background: '#fff',
    outline: 'none',
  },
  select: {
    width: '100%',
    fontFamily: 'Tahoma, Verdana, sans-serif',
    fontSize: '11px',
    border: '1px solid #8a8a8a',
    padding: '2px 4px',
    boxSizing: 'border-box',
    background: '#fff',
    outline: 'none',
  },
  label: { display: 'block', marginBottom: '2px', color: '#333' },
  field: { marginBottom: '6px' },
  btn: {
    display: 'inline-block',
    padding: '2px 10px',
    background: 'linear-gradient(to bottom, #fff, #e0dcd4)',
    border: '1px solid #8a8a8a',
    fontSize: '11px',
    cursor: 'pointer',
    color: '#000',
    fontFamily: 'Tahoma, Verdana, sans-serif',
  },
  btnp: {
    background: 'linear-gradient(to bottom, #4a90d9, #2060a8)',
    color: '#fff',
    borderColor: '#1a4a88',
    fontWeight: 'bold',
  },
  filterBtn: {
    display: 'inline-block',
    padding: '2px 7px',
    border: '1px solid #8a8a8a',
    fontSize: '10px',
    cursor: 'pointer',
    fontFamily: 'Tahoma, Verdana, sans-serif',
    background: 'linear-gradient(to bottom, #fff, #e0dcd4)',
    color: '#000',
    marginRight: '3px',
    marginBottom: '3px',
  },
  filterBtnActive: {
    background: '#ffffcc',
    fontWeight: 'bold',
  },
  tareaRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    padding: '5px 8px',
    borderBottom: '1px solid #e8e8e8',
  },
  badge: {
    display: 'inline-block',
    padding: '0 5px',
    fontSize: '9px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  chip: {
    display: 'inline-block',
    padding: '0 5px',
    fontSize: '9px',
    border: '1px solid #b0b0b0',
    background: '#f0f0e8',
    color: '#333',
    marginLeft: '3px',
    whiteSpace: 'nowrap',
  },
}

const PRIORIDAD_STYLE = {
  alta:  { background: '#ffd4d4', border: '1px solid #c06060', color: '#700' },
  media: { background: '#fff3c8', border: '1px solid #c8a040', color: '#543000' },
  baja:  { background: '#dff0c8', border: '1px solid #6b9a3a', color: '#2a5000' },
}
const PRIORIDAD_LABEL = { alta: '🔴 Alta', media: '🟡 Media', baja: '🟢 Baja' }

const CONTEXTO_STYLE = {
  taller: { background: '#e8f0ff', border: '1px solid #6080c0', color: '#1a3a6b' },
  pc:     { background: '#f0e8ff', border: '1px solid #8060c0', color: '#3a1a6b' },
}
const CONTEXTO_LABEL = { taller: '🏭 Taller', pc: '💻 PC' }

const ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2 }

function sortTareas(lista) {
  return [...lista].sort((a, b) => {
    const dp = ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]
    if (dp !== 0) return dp
    return new Date(a.created_at) - new Date(b.created_at)
  })
}

export default function Tareas({ onMenuClick }) {
  const [userId, setUserId] = useState(null)
  const [tareas, setTareas] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [contactos, setContactos] = useState([])

  // filtros
  const [filtroContexto, setFiltroContexto] = useState('todas')
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas')
  const [verCompletadas, setVerCompletadas] = useState(false)

  // nueva tarea
  const [texto, setTexto] = useState('')
  const [prioridad, setPrioridad] = useState('media')
  const [contexto, setContexto] = useState('pc')
  const [pedidoId, setPedidoId] = useState('')
  const [contactoId, setContactoId] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null)
    })
  }, [])

  const cargarTareas = useCallback(async () => {
    const { data } = await supabase
      .from('tareas')
      .select('id, texto, prioridad, contexto, pedido_id, contacto_id, hecha, fecha_hecha, created_at')
      .order('created_at', { ascending: true })
    if (data) setTareas(data)
  }, [])

  const cargarPedidos = useCallback(async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('id, cliente')
      .not('etapa', 'in', '("entrega","cancelado")')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setPedidos(data)
  }, [])

  const cargarContactos = useCallback(async () => {
    const { data } = await supabase
      .from('contactos')
      .select('id, nombre')
      .order('nombre')
    if (data) setContactos(data)
  }, [])

  useEffect(() => {
    cargarTareas()
    cargarPedidos()
    cargarContactos()
  }, [cargarTareas, cargarPedidos, cargarContactos])

  const agregar = async () => {
    if (!userId || !texto.trim()) return
    setGuardando(true)
    await supabase.from('tareas').insert({
      texto: texto.trim(),
      prioridad,
      contexto,
      pedido_id: pedidoId ? Number(pedidoId) : null,
      contacto_id: contactoId ? Number(contactoId) : null,
      user_id: userId,
    })
    setTexto('')
    setPrioridad('media')
    setContexto('pc')
    setPedidoId('')
    setContactoId('')
    setGuardando(false)
    await cargarTareas()
  }

  const marcarHecha = async (t) => {
    await supabase.from('tareas').update({ hecha: true, fecha_hecha: new Date().toISOString() }).eq('id', t.id)
    await cargarTareas()
  }

  const eliminar = async (t) => {
    if (!window.confirm(`¿Eliminar la tarea "${t.texto}"?`)) return
    await supabase.from('tareas').delete().eq('id', t.id)
    await cargarTareas()
  }

  // ── derivados ──
  const pendientes = tareas.filter(t => !t.hecha)
  const hechasHoy = tareas.filter(t => {
    if (!t.hecha || !t.fecha_hecha) return false
    return t.fecha_hecha.startsWith(new Date().toISOString().split('T')[0])
  })

  const listaMostrada = sortTareas(tareas.filter(t => {
    if (!verCompletadas && t.hecha) return false
    if (filtroContexto !== 'todas' && t.contexto !== filtroContexto) return false
    if (filtroPrioridad !== 'todas' && t.prioridad !== filtroPrioridad) return false
    return true
  }))

  const headerContexto = {
    todas: '📋 Todas las tareas',
    taller: '🏭 Tareas para el taller',
    pc: '💻 Tareas para la PC',
  }[filtroContexto] + (verCompletadas ? '' : ' pendientes')

  return (
    <div style={S.page}>
      {/* header de página */}
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button style={S.btn} onClick={onMenuClick}>☰</button>
        <span style={{ fontWeight: 'bold', color: '#1a3a6b', fontSize: '13px' }}>✅ Tareas</span>
      </div>

      <div style={S.layout}>

        {/* ── COLUMNA IZQUIERDA ── */}
        <div>

          {/* Nueva tarea */}
          <div style={S.wp}>
            <div style={S.wph}>➕ Nueva tarea</div>
            <div style={S.wpb}>
              <div style={S.field}>
                <label style={S.label}>¿Qué tenés que hacer?</label>
                <input
                  style={S.input}
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  placeholder="¿Qué tenés que hacer?"
                  onKeyDown={e => { if (e.key === 'Enter') agregar() }}
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Prioridad</label>
                <select style={S.select} value={prioridad} onChange={e => setPrioridad(e.target.value)}>
                  <option value="alta">🔴 Alta</option>
                  <option value="media">🟡 Media</option>
                  <option value="baja">🟢 Baja</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Contexto</label>
                <select style={S.select} value={contexto} onChange={e => setContexto(e.target.value)}>
                  <option value="taller">🏭 Taller</option>
                  <option value="pc">💻 PC</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Pedido vinculado (opcional)</label>
                <select style={S.select} value={pedidoId} onChange={e => setPedidoId(e.target.value)}>
                  <option value="">— ninguno —</option>
                  {pedidos.map(p => (
                    <option key={p.id} value={p.id}>#{p.id} — {p.cliente}</option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Contacto vinculado (opcional)</label>
                <select style={S.select} value={contactoId} onChange={e => setContactoId(e.target.value)}>
                  <option value="">— ninguno —</option>
                  {contactos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <HoverBtn
                style={{ ...S.btn, ...S.btnp, width: '100%', textAlign: 'center' }}
                onClick={agregar}
                disabled={guardando || !texto.trim()}
              >
                {guardando ? 'Agregando…' : 'Agregar tarea ▸'}
              </HoverBtn>
            </div>
          </div>

          {/* Filtros */}
          <div style={S.wp}>
            <div style={S.wph}>🔍 Filtrar</div>
            <div style={S.wpb}>
              <div style={{ marginBottom: '6px' }}>
                <div style={{ marginBottom: '3px', color: '#555' }}>Contexto:</div>
                {[['todas', 'Todas'], ['taller', '🏭 Taller'], ['pc', '💻 PC']].map(([val, lbl]) => (
                  <button
                    key={val}
                    style={{
                      ...S.filterBtn,
                      ...(filtroContexto === val ? S.filterBtnActive : {}),
                    }}
                    onClick={() => setFiltroContexto(val)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: '6px' }}>
                <div style={{ marginBottom: '3px', color: '#555' }}>Prioridad:</div>
                {[['todas', 'Todas'], ['alta', '🔴 Alta'], ['media', '🟡 Media'], ['baja', '🟢 Baja']].map(([val, lbl]) => (
                  <button
                    key={val}
                    style={{
                      ...S.filterBtn,
                      ...(filtroPrioridad === val ? S.filterBtnActive : {}),
                    }}
                    onClick={() => setFiltroPrioridad(val)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={verCompletadas}
                  onChange={e => setVerCompletadas(e.target.checked)}
                />
                Ver tareas completadas
              </label>
            </div>
          </div>

          {/* Resumen */}
          <div style={S.wp}>
            <div style={S.wph}>📊 Resumen</div>
            <div style={{ ...S.wpb, lineHeight: '1.9' }}>
              <b>{pendientes.length}</b> pendientes / <b>{hechasHoy.length}</b> hechas hoy<br />
              <b>{pendientes.filter(t => t.contexto === 'taller').length}</b> en taller / <b>{pendientes.filter(t => t.contexto === 'pc').length}</b> en PC
            </div>
          </div>

        </div>

        {/* ── COLUMNA DERECHA ── */}
        <div>
          <div style={S.wp}>
            <div style={S.wph}>{headerContexto}</div>
            <div style={{ padding: 0 }}>
              {listaMostrada.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#2a5a10' }}>
                  ✓ No hay tareas pendientes para este filtro
                </div>
              ) : (
                listaMostrada.map((t, i) => {
                  const pedVin = pedidos.find(p => p.id === t.pedido_id)
                  const conVin = contactos.find(c => c.id === t.contacto_id)
                  return (
                    <TareaRow
                      key={t.id}
                      style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}
                      onCheck={() => marcarHecha(t)}
                      onDelete={() => eliminar(t)}
                      hecha={t.hecha}
                    >
                      <span style={{
                        flex: 1,
                        textDecoration: t.hecha ? 'line-through' : 'none',
                        color: t.hecha ? '#888' : '#000',
                      }}>
                        {t.texto}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
                        <span style={{ ...S.badge, ...PRIORIDAD_STYLE[t.prioridad] }}>
                          {PRIORIDAD_LABEL[t.prioridad]}
                        </span>
                        <span style={{ ...S.badge, ...CONTEXTO_STYLE[t.contexto] }}>
                          {CONTEXTO_LABEL[t.contexto]}
                        </span>
                        {pedVin && (
                          <span style={S.chip}>#{pedVin.id} — {pedVin.cliente}</span>
                        )}
                        {conVin && (
                          <span style={S.chip}>{conVin.nombre}</span>
                        )}
                      </span>
                    </TareaRow>
                  )
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── micro-componentes ────────────────────────────────────────────────────────
function HoverBtn({ style, onClick, disabled, children }) {
  const [hov, setHov] = useState(false)
  const isBlue = style?.background?.includes('4a90d9')
  return (
    <button
      style={{
        ...style,
        ...(hov && !isBlue && !disabled ? { background: '#ffffcc', color: '#000' } : {}),
        ...(hov && isBlue && !disabled ? { background: 'linear-gradient(to bottom, #5aa0e9, #3070b8)' } : {}),
        ...(disabled ? { opacity: 0.6, cursor: 'default' } : {}),
        fontFamily: 'Tahoma, Verdana, sans-serif',
        fontSize: '11px',
      }}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  )
}

function TareaRow({ style, onCheck, onDelete, hecha, children }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      style={{
        ...S.tareaRow,
        ...(hov ? { background: '#ffffcc' } : style),
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <input
        type="checkbox"
        checked={hecha}
        onChange={onCheck}
        style={{ marginTop: '2px', cursor: 'pointer' }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {children}
      </div>
      <button
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#a00',
          fontSize: '11px',
          padding: '0 2px',
          fontFamily: 'Tahoma, Verdana, sans-serif',
          lineHeight: 1,
        }}
        onClick={onDelete}
        title="Eliminar tarea"
      >
        ✕
      </button>
    </div>
  )
}
