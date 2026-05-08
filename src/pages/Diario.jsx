import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ─── constantes ───────────────────────────────────────────────────────────────
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
const ETAPA_ICON = {
  presupuesto: '💬', confirmado: '✅', corte: '✂', taller: '🏭',
  estampado: '🖨', sublimado: '🌡', bordado: '🧵',
}

// ─── estilos ──────────────────────────────────────────────────────────────────
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
    gridTemplateColumns: '200px 1fr 210px',
    gap: '8px',
    alignItems: 'start',
  },
  wp: {
    background: '#fff',
    border: '1px solid #a8a8a8',
    boxShadow: '1px 1px 0 #b8b8b8',
    marginBottom: '8px',
  },
  wph: {
    background: 'linear-gradient(to bottom, #e8eef7 0%, #c8d4e8 100%)',
    borderBottom: '1px solid #6b83a8',
    padding: '4px 8px',
    fontWeight: 'bold',
    fontSize: '11px',
    color: '#1a3a6b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wphDark: {
    background: 'linear-gradient(to bottom, #4a7ac8, #2a5a9a)',
    borderBottom: '1px solid #1a4a80',
    padding: '4px 8px',
    fontWeight: 'bold',
    fontSize: '11px',
    color: '#fff',
  },
  wpb: { padding: '6px 8px' },
  nl: { listStyle: 'none', margin: 0, padding: 0 },
  nlYr: {
    padding: '3px 8px',
    background: '#f0f0e8',
    borderBottom: '1px solid #d8d8c8',
    fontWeight: 'bold',
    fontSize: '10px',
    color: '#333',
    cursor: 'pointer',
  },
  nlMoLink: {
    display: 'block',
    padding: '3px 8px 3px 20px',
    fontSize: '10px',
    color: '#333',
    borderBottom: '1px dotted #d8d8d8',
    cursor: 'pointer',
  },
  nlDyLink: {
    display: 'block',
    padding: '3px 8px 3px 32px',
    fontSize: '10px',
    color: '#0033cc',
    borderBottom: '1px dotted #d8d8d8',
    cursor: 'pointer',
  },
  ehead: {
    background: 'linear-gradient(to bottom, #fff5d4 0%, #f4d98a 100%)',
    borderBottom: '1px solid #c8a040',
    padding: '6px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  efoot: {
    padding: '4px 8px',
    background: '#f4f4ec',
    borderTop: '1px solid #d8d8c8',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10px',
    color: '#333',
  },
  textarea: {
    width: '100%',
    height: '110px',
    fontFamily: 'Tahoma, Verdana, sans-serif',
    fontSize: '11px',
    border: '1px inset #8a8a8a',
    padding: '6px',
    background: '#fffff8',
    outline: 'none',
    lineHeight: '1.7',
    resize: 'vertical',
    color: '#111',
    boxSizing: 'border-box',
  },
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
  selectSm: {
    fontFamily: 'Tahoma, Verdana, sans-serif',
    fontSize: '10px',
    padding: '1px 4px',
    border: '1px solid #8a8a8a',
    background: '#fff',
  },
  label: { display: 'block', marginBottom: '2px', color: '#444', fontSize: '10px' },
  field: { marginBottom: '5px' },
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
    padding: '1px 6px',
    border: '1px solid #8a8a8a',
    fontSize: '10px',
    cursor: 'pointer',
    fontFamily: 'Tahoma, Verdana, sans-serif',
    background: 'linear-gradient(to bottom, #fff, #e0dcd4)',
    color: '#000',
    marginRight: '2px',
    marginBottom: '2px',
  },
  filterBtnActive: { background: '#ffffcc', fontWeight: 'bold' },
  ht: { width: '100%', borderCollapse: 'collapse', fontSize: '10px' },
  th: {
    background: 'linear-gradient(to bottom, #e8eef7, #c8d4e8)',
    border: '1px solid #8098b8',
    padding: '3px 6px',
    textAlign: 'left',
    color: '#1a3a6b',
    fontSize: '10px',
    whiteSpace: 'nowrap',
  },
  td: { borderBottom: '1px solid #e4e4e4', padding: '3px 6px', verticalAlign: 'top' },
  tareaRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    padding: '4px 8px',
    borderBottom: '1px solid #e8e8e8',
  },
  badge: {
    display: 'inline-block',
    padding: '0 4px',
    fontSize: '9px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  chip: {
    display: 'inline-block',
    padding: '0 4px',
    fontSize: '9px',
    border: '1px solid #b0b0b0',
    background: '#f0f0e8',
    color: '#333',
    marginLeft: '2px',
    whiteSpace: 'nowrap',
  },
  si: { padding: '4px 8px', borderBottom: '1px dotted #d8d8d8', fontSize: '10px', lineHeight: '1.6' },
  tagWait: {
    display: 'inline-block', padding: '0 4px', fontSize: '9px', fontWeight: 'bold',
    border: '1px solid #c8a040', background: '#fff3c8', color: '#5a3a00',
  },
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function hoy() { return new Date().toISOString().split('T')[0] }

function fechaLarga(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-UY', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function semanaDelAnio(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const ini = new Date(y, 0, 1)
  return Math.ceil(((dt - ini) / 86400000 + ini.getDay() + 1) / 7)
}

function diaDelAnio(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const ini = new Date(y, 0, 1)
  return Math.ceil((dt - ini) / 86400000) + 1
}

function fechaAnterior(f) {
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d - 1).toISOString().split('T')[0]
}

function fechaSiguiente(f) {
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d + 1).toISOString().split('T')[0]
}

function mesNombre(num) {
  return ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
          'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][num - 1]
}

function formatFechaCorta(f) {
  const [, m, d] = f.split('-')
  return `${d}/${m}`
}

function formatHora(isoStr) {
  if (!isoStr) return '—'
  const dt = new Date(isoStr)
  return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
}

function calcularRacha(entradas) {
  if (!entradas.length) return { actual: 0, mejor: 0 }
  const fechas = new Set(entradas.map(e => e.fecha))
  let cursor = hoy(), corriente = 0
  while (fechas.has(cursor)) { corriente++; cursor = fechaAnterior(cursor) }
  let maxRun = 0, run = 0
  const sorted = [...fechas].sort()
  for (let i = 0; i < sorted.length; i++) {
    run = (i > 0 && fechaSiguiente(sorted[i - 1]) === sorted[i]) ? run + 1 : 1
    if (run > maxRun) maxRun = run
  }
  return { actual: corriente, mejor: maxRun }
}

function buildArbol(entradas) {
  const arbol = {}
  for (const e of entradas) {
    const [y, m, d] = e.fecha.split('-').map(Number)
    if (!arbol[y]) arbol[y] = {}
    if (!arbol[y][m]) arbol[y][m] = []
    if (!arbol[y][m].includes(d)) arbol[y][m].push(d)
  }
  for (const y of Object.keys(arbol))
    for (const m of Object.keys(arbol[y]))
      arbol[y][m].sort((a, b) => b - a)
  return arbol
}

function resumirPedido(p) {
  if (!p) return ''
  const partes = [p.cliente]
  if (p.items && p.items.length > 0) {
    const prods = p.items.map(it => {
      const ts = Object.entries(it.talles || {}).filter(([, c]) => Number(c) > 0).map(([t, c]) => `${t}:${c}`).join(' ')
      return ts ? `${it.producto} — ${ts}` : it.producto
    }).join(', ')
    partes.push(prods)
  } else if (p.producto) {
    const ts = Object.entries(p.talles || {}).filter(([, c]) => Number(c) > 0).map(([t, c]) => `${t}:${c}`).join(' ')
    partes.push(ts ? `${p.producto} — ${ts}` : p.producto)
  }
  return partes.join(' — ')
}

function sortTareas(lista) {
  return [...lista].sort((a, b) => {
    const dp = ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]
    if (dp !== 0) return dp
    return new Date(a.created_at) - new Date(b.created_at)
  })
}

// ─── componente principal ─────────────────────────────────────────────────────
export default function Diario({ onMenuClick }) {
  const navigate = useNavigate()
  const textareaRef = useRef(null)
  const ntInputRef = useRef(null)

  const [userId, setUserId] = useState(null)
  const [pedidos, setPedidos] = useState([])

  // bitácora
  const [fechaActiva, setFechaActiva] = useState(hoy())
  const [texto, setTexto] = useState('')
  const [pedidoBitacoraId, setPedidoBitacoraId] = useState('')
  const [entradas, setEntradas] = useState([])
  const [entradasDia, setEntradasDia] = useState([])
  const [guardado, setGuardado] = useState(null)
  const [mesesAbiertos, setMesesAbiertos] = useState({})

  // tareas
  const [tareas, setTareas] = useState([])
  const [filtroContexto, setFiltroContexto] = useState('todas')
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas')
  const [verCompletadas, setVerCompletadas] = useState(false)
  const [ntTexto, setNtTexto] = useState('')
  const [ntPrioridad, setNtPrioridad] = useState('media')
  const [ntContexto, setNtContexto] = useState('pc')
  const [ntPedidoId, setNtPedidoId] = useState('')
  const [guardandoTarea, setGuardandoTarea] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null))
  }, [])

  const cargarEntradas = useCallback(async () => {
    const { data } = await supabase
      .from('bitacora')
      .select('id, fecha, texto, pedido_id')
      .order('fecha', { ascending: false })
    if (data) setEntradas(data)
  }, [])

  const cargarEntradasDia = useCallback(async (fecha) => {
    const { data } = await supabase
      .from('bitacora')
      .select('id, fecha, texto, pedido_id, created_at')
      .eq('fecha', fecha)
      .order('created_at', { ascending: true })
    if (data) setEntradasDia(data)
  }, [])

  const cargarPedidos = useCallback(async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('id, cliente, producto, talles, items, etapa_actual')
      .not('etapa_actual', 'in', '("entrega","cancelado")')
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setPedidos(data)
  }, [])

  const cargarTareas = useCallback(async () => {
    const { data } = await supabase
      .from('tareas')
      .select('id, texto, prioridad, contexto, pedido_id, hecha, fecha_hecha, created_at')
      .order('created_at', { ascending: true })
    if (data) setTareas(data)
  }, [])

  useEffect(() => {
    cargarEntradas(); cargarPedidos(); cargarTareas()
  }, [cargarEntradas, cargarPedidos, cargarTareas])

  useEffect(() => { cargarEntradasDia(fechaActiva) }, [fechaActiva, cargarEntradasDia])

  useEffect(() => {
    const [y, m] = fechaActiva.split('-').map(Number)
    setMesesAbiertos(prev => ({ ...prev, [`${y}-${m}`]: true }))
  }, [fechaActiva])

  const guardarEntrada = async () => {
    if (!userId || !texto.trim()) return
    setGuardado('saving')
    await supabase.from('bitacora').insert({
      fecha: fechaActiva,
      texto: texto.trim(),
      pedido_id: pedidoBitacoraId || null,
      user_id: userId,
    })
    const now = new Date()
    setGuardado(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`)
    setTexto(''); setPedidoBitacoraId('')
    await Promise.all([cargarEntradas(), cargarEntradasDia(fechaActiva)])
    setTimeout(() => setGuardado(null), 3000)
  }

  const agregarTarea = async () => {
    if (!userId || !ntTexto.trim()) return
    setGuardandoTarea(true)
    await supabase.from('tareas').insert({
      texto: ntTexto.trim(),
      prioridad: ntPrioridad,
      contexto: ntContexto,
      pedido_id: ntPedidoId ? Number(ntPedidoId) : null,
      user_id: userId,
    })
    setNtTexto(''); setNtPrioridad('media'); setNtContexto('pc'); setNtPedidoId('')
    setGuardandoTarea(false)
    await cargarTareas()
  }

  const marcarTareaHecha = async (t) => {
    await supabase.from('tareas').update({ hecha: true, fecha_hecha: new Date().toISOString() }).eq('id', t.id)
    await cargarTareas()
  }

  const eliminarTarea = async (t) => {
    if (!window.confirm(`¿Eliminar "${t.texto}"?`)) return
    await supabase.from('tareas').delete().eq('id', t.id)
    await cargarTareas()
  }

  const irA = (fecha) => setFechaActiva(fecha)

  // ── derivados ──
  const arbol = buildArbol(entradas)
  const anios = Object.keys(arbol).sort((a, b) => b - a)
  const { actual: rachaActual, mejor: rachaMejor } = calcularRacha(entradas)
  const mesActivo = parseInt(fechaActiva.split('-')[1])
  const anioActivo = parseInt(fechaActiva.split('-')[0])
  const mesAnteriorNum = mesActivo === 1 ? 12 : mesActivo - 1
  const anioAnteriorNum = mesActivo === 1 ? anioActivo - 1 : anioActivo
  const entradasMes = entradas.filter(e => {
    const [y, m] = e.fecha.split('-').map(Number)
    return y === anioActivo && m === mesActivo
  })
  const entradasMesAnterior = entradas.filter(e => {
    const [y, m] = e.fecha.split('-').map(Number)
    return y === anioAnteriorNum && m === mesAnteriorNum
  })
  const pendientes = tareas.filter(t => !t.hecha)
  const hechasHoy = tareas.filter(t => t.hecha && t.fecha_hecha?.startsWith(hoy()))
  const tareasFiltradas = sortTareas(tareas.filter(t => {
    if (!verCompletadas && t.hecha) return false
    if (filtroContexto !== 'todas' && t.contexto !== filtroContexto) return false
    if (filtroPrioridad !== 'todas' && t.prioridad !== filtroPrioridad) return false
    return true
  }))
  const tareasPendientesFiltradas = tareasFiltradas.filter(t => !t.hecha)
  const tareasCompletadasFiltradas = tareasFiltradas.filter(t => t.hecha)

  return (
    <div style={S.page}>
      <div style={S.layout}>

        {/* ── COL IZQUIERDA ── */}
        <div>

          {/* Árbol */}
          <div style={S.wp}>
            <div style={S.wph}>📓 Diario</div>
            <div style={{ padding: 0 }}>
              <ul style={S.nl}>
                {anios.map(y => {
                  const mesIds = Object.keys(arbol[y]).sort((a, b) => b - a)
                  const anioAbierto = mesIds.some(m => mesesAbiertos[`${y}-${m}`])
                  return (
                    <React.Fragment key={y}>
                      <li
                        style={S.nlYr}
                        onClick={() => {
                          const updates = {}
                          mesIds.forEach(m => { updates[`${y}-${m}`] = !anioAbierto })
                          setMesesAbiertos(prev => ({ ...prev, ...updates }))
                        }}
                      >
                        {anioAbierto ? '▼' : '▶'} {y}
                      </li>
                      {anioAbierto && mesIds.map(m => {
                        const key = `${y}-${m}`
                        const open = !!mesesAbiertos[key]
                        const dias = arbol[y][m]
                        return (
                          <React.Fragment key={key}>
                            <li>
                              <span
                                style={S.nlMoLink}
                                onClick={() => setMesesAbiertos(prev => ({ ...prev, [key]: !open }))}
                                onMouseEnter={e => { e.currentTarget.style.background = '#ffffcc' }}
                                onMouseLeave={e => { e.currentTarget.style.background = '' }}
                              >
                                {open ? '▼' : '▶'} {mesNombre(Number(m))} ({dias.length})
                              </span>
                            </li>
                            {open && dias.map(d => {
                              const f = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                              const esHoy = f === hoy()
                              const esActiva = f === fechaActiva
                              return (
                                <li key={f}>
                                  <span
                                    style={{ ...S.nlDyLink, ...(esActiva ? { background: '#ffffcc', fontWeight: 'bold', color: '#000' } : {}) }}
                                    onClick={() => irA(f)}
                                    onMouseEnter={e => { if (!esActiva) e.currentTarget.style.background = '#ffffcc' }}
                                    onMouseLeave={e => { if (!esActiva) e.currentTarget.style.background = '' }}
                                  >
                                    {formatFechaCorta(f)}{esHoy ? ' — hoy' : ''}
                                  </span>
                                </li>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
                {anios.length === 0 && (
                  <li style={{ padding: '8px', fontSize: '10px', color: '#888' }}>Sin entradas aún</li>
                )}
              </ul>
            </div>
          </div>

          {/* Nueva tarea */}
          <div style={S.wp}>
            <div style={S.wph}>➕ Nueva tarea</div>
            <div style={S.wpb}>
              <div style={S.field}>
                <input
                  ref={ntInputRef}
                  style={S.input}
                  value={ntTexto}
                  onChange={e => setNtTexto(e.target.value)}
                  placeholder="¿Qué tenés que hacer?"
                  onKeyDown={e => { if (e.key === 'Enter') agregarTarea() }}
                />
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Prioridad</label>
                  <select style={S.select} value={ntPrioridad} onChange={e => setNtPrioridad(e.target.value)}>
                    <option value="alta">🔴 Alta</option>
                    <option value="media">🟡 Media</option>
                    <option value="baja">🟢 Baja</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Contexto</label>
                  <select style={S.select} value={ntContexto} onChange={e => setNtContexto(e.target.value)}>
                    <option value="taller">🏭 Taller</option>
                    <option value="pc">💻 PC</option>
                  </select>
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Pedido (opcional)</label>
                <select style={S.select} value={ntPedidoId} onChange={e => setNtPedidoId(e.target.value)}>
                  <option value="">— ninguno —</option>
                  {pedidos.map(p => (
                    <option key={p.id} value={p.id}>{resumirPedido(p)}</option>
                  ))}
                </select>
              </div>
              <HoverBtn
                style={{ ...S.btn, ...S.btnp, width: '100%', textAlign: 'center' }}
                onClick={agregarTarea}
                disabled={guardandoTarea || !ntTexto.trim()}
              >
                {guardandoTarea ? 'Agregando…' : 'Agregar tarea ▸'}
              </HoverBtn>
            </div>
          </div>

          {/* Filtros */}
          <div style={S.wp}>
            <div style={S.wph}>🔍 Filtrar tareas</div>
            <div style={S.wpb}>
              <div style={{ marginBottom: '5px' }}>
                <div style={{ marginBottom: '2px', color: '#555', fontSize: '10px' }}>Contexto:</div>
                {[['todas', 'Todas'], ['taller', '🏭 Taller'], ['pc', '💻 PC']].map(([val, lbl]) => (
                  <button key={val} style={{ ...S.filterBtn, ...(filtroContexto === val ? S.filterBtnActive : {}) }} onClick={() => setFiltroContexto(val)}>{lbl}</button>
                ))}
              </div>
              <div style={{ marginBottom: '5px' }}>
                <div style={{ marginBottom: '2px', color: '#555', fontSize: '10px' }}>Prioridad:</div>
                {[['todas', 'Todas'], ['alta', '🔴 Alta'], ['media', '🟡 Media'], ['baja', '🟢 Baja']].map(([val, lbl]) => (
                  <button key={val} style={{ ...S.filterBtn, ...(filtroPrioridad === val ? S.filterBtnActive : {}) }} onClick={() => setFiltroPrioridad(val)}>{lbl}</button>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10px' }}>
                <input type="checkbox" checked={verCompletadas} onChange={e => setVerCompletadas(e.target.checked)} />
                Ver completadas
              </label>
            </div>
          </div>

          {/* Resumen */}
          <div style={S.wp}>
            <div style={S.wph}>📊 Resumen</div>
            <div style={{ ...S.wpb, fontSize: '10px', lineHeight: '1.9' }}>
              <b>{pendientes.length}</b> pendientes / <b>{hechasHoy.length}</b> hechas hoy<br />
              <b>{pendientes.filter(t => t.contexto === 'taller').length}</b> en taller / <b>{pendientes.filter(t => t.contexto === 'pc').length}</b> en PC
            </div>
          </div>

        </div>

        {/* ── COL CENTRAL ── */}
        <div>

          {/* Editor bitácora */}
          <div style={S.wp}>
            <div style={S.ehead}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: '"Trebuchet MS", Tahoma', fontSize: '13px', fontWeight: 'bold', color: '#5a3a00', textShadow: '1px 1px 0 rgba(255,255,255,0.5)' }}>
                  {fechaLarga(fechaActiva)}
                </div>
                <div style={{ fontSize: '10px', color: '#6a4a10', fontStyle: 'italic', marginTop: '1px' }}>
                  Semana {semanaDelAnio(fechaActiva)} · día {diaDelAnio(fechaActiva)} del año
                  {rachaActual > 1 && ` · ${rachaActual} días seguidos ✓`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '3px' }}>
                <HoverBtn style={S.btn} onClick={() => irA(fechaAnterior(fechaActiva))}>
                  ◀ {formatFechaCorta(fechaAnterior(fechaActiva))}
                </HoverBtn>
                <HoverBtn style={S.btn} onClick={() => irA(fechaSiguiente(fechaActiva))}>
                  {formatFechaCorta(fechaSiguiente(fechaActiva))} ▶
                </HoverBtn>
              </div>
            </div>
            <div style={{ padding: '6px 8px' }}>
              <textarea
                ref={textareaRef}
                style={S.textarea}
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Escribí tu entrada…"
                onFocus={e => { e.target.style.borderColor = '#0058b8'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = ''; e.target.style.background = '#fffff8' }}
              />
            </div>
            <div style={S.efoot}>
              <span>Pedido:</span>
              <select style={S.selectSm} value={pedidoBitacoraId} onChange={e => setPedidoBitacoraId(e.target.value)}>
                <option value="">— ninguno —</option>
                {pedidos.map(p => (
                  <option key={p.id} value={p.id}>{resumirPedido(p)}</option>
                ))}
              </select>
              {guardado && guardado !== 'saving' && (
                <span style={{ color: '#2a5a10', fontStyle: 'italic', marginLeft: 'auto' }}>✓ Guardado {guardado}</span>
              )}
              {guardado === 'saving' && (
                <span style={{ color: '#888', fontStyle: 'italic', marginLeft: 'auto' }}>Guardando…</span>
              )}
              <HoverBtn style={{ ...S.btn, ...S.btnp, marginLeft: guardado ? '0' : 'auto' }} onClick={guardarEntrada}>
                Guardar ▸
              </HoverBtn>
            </div>
          </div>

          {/* Tareas pendientes */}
          <div style={S.wp}>
            <div style={S.wphDark}>✅ Tareas pendientes</div>
            <div style={{ padding: 0 }}>
              {tareasPendientesFiltradas.length === 0 ? (
                <div style={{ padding: '10px', textAlign: 'center', color: '#2a5a10', fontSize: '11px' }}>
                  ✓ No hay tareas pendientes para este filtro
                </div>
              ) : (
                tareasPendientesFiltradas.map((t, i) => {
                  const pedVin = pedidos.find(p => p.id === t.pedido_id)
                  return (
                    <TareaRow
                      key={t.id}
                      style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}
                      onCheck={() => marcarTareaHecha(t)}
                      onDelete={() => eliminarTarea(t)}
                    >
                      <span style={{ flex: 1 }}>{t.texto}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap' }}>
                        <span style={{ ...S.badge, ...PRIORIDAD_STYLE[t.prioridad] }}>{PRIORIDAD_LABEL[t.prioridad]}</span>
                        <span style={{ ...S.badge, ...CONTEXTO_STYLE[t.contexto] }}>{CONTEXTO_LABEL[t.contexto]}</span>
                        {pedVin && <span style={S.chip}>{pedVin.cliente}</span>}
                      </span>
                    </TareaRow>
                  )
                })
              )}
              {verCompletadas && tareasCompletadasFiltradas.length > 0 && (
                <>
                  <div style={{ padding: '2px 8px', background: '#f0f0e8', borderTop: '1px solid #d8d8c8', fontSize: '10px', color: '#888' }}>
                    Completadas
                  </div>
                  {tareasCompletadasFiltradas.map((t, i) => (
                    <TareaRow
                      key={t.id}
                      hecha
                      style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}
                      onCheck={() => {}}
                      onDelete={() => eliminarTarea(t)}
                    >
                      <span style={{ flex: 1, textDecoration: 'line-through', color: '#888' }}>{t.texto}</span>
                    </TareaRow>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Historial del día */}
          <div style={S.wp}>
            <div style={S.wph}>
              <span>📋 {formatFechaCorta(fechaActiva)} — {entradasDia.length} {entradasDia.length === 1 ? 'entrada' : 'entradas'}</span>
            </div>
            <div style={{ padding: 0 }}>
              <table style={S.ht}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, width: '44px' }}>Hora</th>
                    <th style={S.th}>Extracto</th>
                    <th style={{ ...S.th, width: '80px' }}>Pedido</th>
                  </tr>
                </thead>
                <tbody>
                  {entradasDia.map((e, i) => {
                    const pedVin = pedidos.find(p => p.id === e.pedido_id)
                    return (
                      <HoverRow
                        key={e.id}
                        style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}
                        onClick={() => { setTexto(e.texto || ''); setPedidoBitacoraId(e.pedido_id ? String(e.pedido_id) : '') }}
                      >
                        <td style={{ ...S.td, whiteSpace: 'nowrap', color: '#555' }}>{formatHora(e.created_at)}</td>
                        <td style={S.td}>{(e.texto || '').slice(0, 100)}{(e.texto || '').length > 100 ? '…' : ''}</td>
                        <td style={S.td}>{pedVin ? <span style={S.tagWait}>{pedVin.cliente}</span> : '—'}</td>
                      </HoverRow>
                    )
                  })}
                  {entradasDia.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ ...S.td, color: '#888', textAlign: 'center', padding: '10px' }}>
                        Sin entradas este día
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div style={{ background: '#ece9d8', padding: '3px 8px', fontSize: '10px', borderTop: '1px solid #d8d8c8' }}>
                <HoverLink onClick={() => {
                  const sorted = [...entradasDia].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
                  const contenido = `=== ${fechaLarga(fechaActiva)} ===\n\n` + sorted.map(e => `${formatHora(e.created_at)} — ${e.texto}`).join('\n')
                  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = `diario-${fechaActiva}.txt`; a.click(); URL.revokeObjectURL(url)
                }}>Exportar día</HoverLink>
                &nbsp;|&nbsp;
                <HoverLink onClick={() => {
                  if (anios.length === 0) return
                  const primerAnio = anios[anios.length - 1]
                  const meses = Object.keys(arbol[primerAnio]).sort((a, b) => Number(a) - Number(b))
                  const dias = [...arbol[primerAnio][meses[0]]].sort((a, b) => Number(a) - Number(b))
                  irA(`${primerAnio}-${String(meses[0]).padStart(2,'0')}-${String(dias[0]).padStart(2,'0')}`)
                }}>Ver primer entrada</HoverLink>
              </div>
            </div>
          </div>

        </div>

        {/* ── COL DERECHA ── */}
        <div>

          {/* Pedidos activos */}
          <div style={S.wp}>
            <div style={S.wph}>📦 Pedidos activos</div>
            <div style={{ padding: 0 }}>
              {pedidos.map(p => (
                <div key={p.id} style={S.si}>
                  <div>
                    <HoverLink onClick={() => navigate('/pedidos')}>
                      <strong>{p.cliente}</strong>
                    </HoverLink>
                    {p.etapa_actual && (
                      <span style={{ marginLeft: 5, fontSize: '10px', color: '#555' }}>
                        {ETAPA_ICON[p.etapa_actual] || '·'} {p.etapa_actual}
                      </span>
                    )}
                  </div>
                  {p.items && p.items.length > 0
                    ? p.items.map((it, i) => {
                        const ts = Object.entries(it.talles || {}).filter(([, c]) => Number(c) > 0).map(([t, c]) => `${t}:${c}`).join(' ')
                        return <div key={i} style={{ color: '#555', fontSize: '10px' }}>{it.producto}{ts ? ` — ${ts}` : ''}</div>
                      })
                    : p.producto
                      ? <div style={{ color: '#555', fontSize: '10px' }}>{p.producto}</div>
                      : null
                  }
                </div>
              ))}
              {pedidos.length === 0 && <div style={{ ...S.si, color: '#888' }}>Sin pedidos activos</div>}
              <div style={{ padding: '3px 8px', background: '#ece9d8', borderTop: '1px solid #d8d8c8', textAlign: 'right', fontSize: '10px' }}>
                <HoverLink onClick={() => navigate('/pedidos')}>Ver todos →</HoverLink>
              </div>
            </div>
          </div>

          {/* Racha */}
          <div style={S.wp}>
            <div style={S.wph}>🔥 Racha de escritura</div>
            <div style={{ ...S.wpb, textAlign: 'center', padding: '8px' }}>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: '32px', fontWeight: 'bold', color: '#2a5a10', lineHeight: 1 }}>
                {rachaActual}
              </div>
              <div style={{ fontSize: '10px', color: '#555', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                días seguidos
              </div>
              <div style={{ fontSize: '10px', marginTop: '5px' }}>
                <b>Mejor racha:</b> {rachaMejor} días
              </div>
            </div>
          </div>

          {/* Este mes */}
          <div style={S.wp}>
            <div style={S.wph}>📊 Este mes</div>
            <div style={{ ...S.wpb, fontSize: '10px', lineHeight: 1.9 }}>
              <b>{entradasMes.length}</b> entradas en {mesNombre(mesActivo)}<br />
              <b>{entradasMesAnterior.length}</b> entradas en {mesNombre(mesAnteriorNum)}<br />
              <b>{pendientes.length}</b> tareas pendientes<br />
              <b>{hechasHoy.length}</b> completadas hoy
            </div>
          </div>

          {/* Acciones */}
          <div style={S.wp}>
            <div style={S.wph}>🔧 Acciones</div>
            <div style={{ ...S.wpb, fontSize: '11px', lineHeight: 2.1 }}>
              <HoverLink onClick={() => {
                setTexto(''); setPedidoBitacoraId(''); irA(hoy())
                setTimeout(() => textareaRef.current?.focus(), 50)
              }}>📝 Nueva entrada hoy</HoverLink><br />
              <HoverLink onClick={() => setTimeout(() => ntInputRef.current?.focus(), 50)}>
                ✅ Nueva tarea rápida
              </HoverLink><br />
              <HoverLink onClick={() => alert('Próximamente')}>🔍 Buscar en diario</HoverLink><br />
              <HoverLink onClick={() => {
                const mesStr = String(mesActivo).padStart(2,'0')
                const sorted = [...entradas]
                  .filter(e => e.fecha.startsWith(`${anioActivo}-${mesStr}`))
                  .sort((a, b) => a.fecha.localeCompare(b.fecha))
                const contenido = sorted.map(e => `=== ${fechaLarga(e.fecha)} ===\n${e.texto}`).join('\n\n')
                const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = `diario-${anioActivo}-${mesStr}.txt`; a.click(); URL.revokeObjectURL(url)
              }}>📤 Exportar mes</HoverLink>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

// ─── micro-componentes ────────────────────────────────────────────────────────
function HoverLink({ onClick, children }) {
  const [hov, setHov] = useState(false)
  return (
    <span
      style={{ color: '#0033cc', textDecoration: hov ? 'underline' : 'none', cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </span>
  )
}

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
      style={{ ...S.tareaRow, ...(hov ? { background: '#ffffcc' } : style) }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <input type="checkbox" checked={!!hecha} onChange={onCheck} style={{ marginTop: '2px', cursor: 'pointer' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>{children}</div>
      <button
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a00', fontSize: '11px', padding: '0 2px', fontFamily: 'Tahoma, Verdana, sans-serif', lineHeight: 1 }}
        onClick={onDelete}
        title="Eliminar"
      >✕</button>
    </div>
  )
}

function HoverRow({ style, onClick, children }) {
  const [hov, setHov] = useState(false)
  return (
    <tr
      style={{ ...(hov ? { background: '#ffffcc' } : style), ...(onClick ? { cursor: 'pointer' } : {}) }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}
