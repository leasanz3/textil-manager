import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ─── estilos scoped ──────────────────────────────────────────────────────────
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
    gridTemplateColumns: '200px 1fr 220px',
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wpb: { padding: '6px 8px' },
  nl: { listStyle: 'none', margin: 0, padding: 0 },
  nlYr: {
    padding: '4px 10px',
    background: '#f0f0e8',
    borderBottom: '1px solid #d8d8c8',
    fontWeight: 'bold',
    fontSize: '10px',
    color: '#333',
  },
  nlMoLink: {
    display: 'block',
    padding: '4px 10px 4px 26px',
    fontSize: '10px',
    color: '#333',
    textDecoration: 'none',
    borderBottom: '1px dotted #d8d8d8',
    cursor: 'pointer',
  },
  nlDyLink: {
    display: 'block',
    padding: '4px 10px 4px 40px',
    fontSize: '10px',
    color: '#0033cc',
    textDecoration: 'none',
    borderBottom: '1px dotted #d8d8d8',
    cursor: 'pointer',
  },
  ehead: {
    background: 'linear-gradient(to bottom, #fff5d4 0%, #f4d98a 100%)',
    borderBottom: '1px solid #c8a040',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  fecha: {
    fontFamily: '"Trebuchet MS", Tahoma',
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#5a3a00',
    textShadow: '1px 1px 0 rgba(255,255,255,0.5)',
  },
  dia: { fontSize: '10px', color: '#6a4a10', fontStyle: 'italic', marginTop: '2px' },
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
  textarea: {
    width: '100%',
    height: '180px',
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
  efoot: {
    padding: '5px 8px',
    background: '#f4f4ec',
    borderTop: '1px solid #d8d8c8',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '10px',
    color: '#333',
  },
  select: {
    fontFamily: 'Tahoma, Verdana, sans-serif',
    fontSize: '10px',
    padding: '1px 4px',
    border: '1px solid #8a8a8a',
    background: '#fff',
  },
  ht: { width: '100%', borderCollapse: 'collapse', fontSize: '10px' },
  th: {
    background: 'linear-gradient(to bottom, #e8eef7, #c8d4e8)',
    border: '1px solid #8098b8',
    padding: '4px 7px',
    textAlign: 'left',
    color: '#1a3a6b',
    fontSize: '10px',
    whiteSpace: 'nowrap',
  },
  td: { borderBottom: '1px solid #e4e4e4', padding: '4px 7px', verticalAlign: 'top' },
  si: { padding: '5px 8px', borderBottom: '1px dotted #d8d8d8', fontSize: '10px', lineHeight: '1.6' },
  tagWait: {
    display: 'inline-block', padding: '0 5px', fontSize: '9px', fontWeight: 'bold',
    border: '1px solid #c8a040', background: '#fff3c8', color: '#5a3a00',
  },
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function hoy() {
  return new Date().toISOString().split('T')[0]
}

function fechaLarga(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('es-UY', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function semanaDelAnio(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const iniAnio = new Date(y, 0, 1)
  return Math.ceil(((dt - iniAnio) / 86400000 + iniAnio.getDay() + 1) / 7)
}

function diaDelAnio(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const iniAnio = new Date(y, 0, 1)
  return Math.ceil((dt - iniAnio) / 86400000) + 1
}

function fechaAnterior(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return new Date(y, m - 1, d - 1).toISOString().split('T')[0]
}

function fechaSiguiente(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return new Date(y, m - 1, d + 1).toISOString().split('T')[0]
}

function mesNombre(num) {
  return ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
          'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][num - 1]
}

function formatFechaCorta(fechaStr) {
  const [, m, d] = fechaStr.split('-')
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

// ─── componente principal ─────────────────────────────────────────────────────
export default function Bitacora({ onMenuClick }) {
  const navigate = useNavigate()
  const [fechaActiva, setFechaActiva] = useState(hoy())
  const [texto, setTexto] = useState('')
  const [pedidoId, setPedidoId] = useState('')
  const [entradas, setEntradas] = useState([])      // todas — para árbol y racha
  const [entradasDia, setEntradasDia] = useState([]) // del día activo — para historial
  const [pedidos, setPedidos] = useState([])
  const [guardado, setGuardado] = useState(null)    // null | 'saving' | 'HH:MM'
  const [mesesAbiertos, setMesesAbiertos] = useState({})
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null)
    })
  }, [])

  // todas las entradas (árbol + racha + estadísticas)
  const cargarEntradas = useCallback(async () => {
    const { data } = await supabase
      .from('bitacora')
      .select('id, fecha, texto, pedido_id')
      .order('fecha', { ascending: false })
    if (data) setEntradas(data)
  }, [])

  // entradas del día activo (historial)
  const cargarEntradasDia = useCallback(async (fecha) => {
    const { data } = await supabase
      .from('bitacora')
      .select('id, fecha, texto, pedido_id, created_at')
      .eq('fecha', fecha)
      .order('created_at', { ascending: true })
    if (data) setEntradasDia(data)
  }, [])

  // pedidos — query simplificada
  const cargarPedidos = useCallback(async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('id, cliente')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setPedidos(data)
  }, [])

  useEffect(() => {
    cargarEntradas()
    cargarPedidos()
  }, [cargarEntradas, cargarPedidos])

  useEffect(() => {
    cargarEntradasDia(fechaActiva)
  }, [fechaActiva, cargarEntradasDia])

  // abrir el mes/año de la fecha activa por defecto
  useEffect(() => {
    const [y, m] = fechaActiva.split('-').map(Number)
    setMesesAbiertos(prev => ({ ...prev, [`${y}-${m}`]: true }))
  }, [fechaActiva])

  const guardar = async () => {
    if (!userId || !texto.trim()) return
    setGuardado('saving')
    await supabase.from('bitacora').insert({
      fecha: fechaActiva,
      texto: texto.trim(),
      pedido_id: pedidoId || null,
      user_id: userId,
    })
    const now = new Date()
    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    setGuardado(hhmm)
    setTexto('')
    setPedidoId('')
    await Promise.all([cargarEntradas(), cargarEntradasDia(fechaActiva)])
    setTimeout(() => setGuardado(null), 3000)
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
  const totalAnio = entradas.filter(e => e.fecha.startsWith(String(anioActivo))).length
  const pedidosActivos = pedidos.slice(0, 5)

  return (
    <div style={S.page}>
      <div style={S.layout}>

        {/* ── COLUMNA IZQUIERDA — solo árbol ── */}
        <div>
          <div style={S.wp}>
            <div style={S.wph}>📓 Bitácora</div>
            <div style={{ padding: 0 }}>
              <ul style={S.nl}>
                {anios.map(y => {
                  const mesIds = Object.keys(arbol[y]).sort((a, b) => b - a)
                  const anioAbierto = mesIds.some(m => mesesAbiertos[`${y}-${m}`])
                  return (
                    <React.Fragment key={y}>
                      <li
                        style={{ ...S.nlYr, cursor: 'pointer' }}
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
                                    style={{
                                      ...S.nlDyLink,
                                      ...(esActiva ? { background: '#ffffcc', fontWeight: 'bold', color: '#000' } : {}),
                                    }}
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
                  <li style={{ padding: '8px', fontSize: '10px', color: '#888' }}>
                    Sin entradas aún
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* ── COLUMNA CENTRAL ── */}
        <div>
          {/* Editor */}
          <div style={S.wp}>
            <div style={S.ehead}>
              <div>
                <div style={S.fecha}>{fechaLarga(fechaActiva)}</div>
                <div style={S.dia}>
                  Semana {semanaDelAnio(fechaActiva)}
                  &nbsp;·&nbsp;
                  día {diaDelAnio(fechaActiva)} del año
                  {rachaActual > 1 && ` · ${rachaActual} días seguidos ✓`}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                <HoverBtn style={S.btn} onClick={() => irA(fechaAnterior(fechaActiva))}>
                  ◀ {formatFechaCorta(fechaAnterior(fechaActiva))}
                </HoverBtn>
                <HoverBtn style={S.btn} onClick={() => irA(fechaSiguiente(fechaActiva))}>
                  {formatFechaCorta(fechaSiguiente(fechaActiva))} ▶
                </HoverBtn>
              </div>
            </div>

            <div style={{ padding: '8px' }}>
              <textarea
                style={S.textarea}
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Escribí tu entrada…"
                onFocus={e => { e.target.style.borderColor = '#0058b8'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = ''; e.target.style.background = '#fffff8' }}
              />
            </div>

            <div style={S.efoot}>
              <span>Pedido vinculado:</span>
              <select
                style={S.select}
                value={pedidoId}
                onChange={e => setPedidoId(e.target.value)}
              >
                <option value="">— ninguno —</option>
                {pedidos.map(p => (
                  <option key={p.id} value={p.id}>
                    #{String(p.id).slice(0, 8)} — {p.cliente}
                  </option>
                ))}
              </select>
              {guardado && guardado !== 'saving' && (
                <span style={{ color: '#2a5a10', fontStyle: 'italic', marginLeft: 'auto' }}>
                  ✓ Guardado {guardado}
                </span>
              )}
              {guardado === 'saving' && (
                <span style={{ color: '#888', fontStyle: 'italic', marginLeft: 'auto' }}>
                  Guardando…
                </span>
              )}
              <HoverBtn
                style={{ ...S.btn, ...S.btnp, marginLeft: guardado ? '0' : 'auto' }}
                onClick={guardar}
              >
                Guardar ▸
              </HoverBtn>
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
                    <th style={{ ...S.th, width: '48px' }}>Hora</th>
                    <th style={S.th}>Extracto</th>
                    <th style={{ ...S.th, width: '90px' }}>Pedido</th>
                  </tr>
                </thead>
                <tbody>
                  {entradasDia.map((e, i) => {
                    const pedVin = pedidos.find(p => p.id === e.pedido_id)
                    return (
                      <HoverRow key={e.id} style={i % 2 === 0 ? { background: '#fafafa' } : {}}>
                        <td style={{ ...S.td, whiteSpace: 'nowrap', color: '#555' }}>
                          {formatHora(e.created_at)}
                        </td>
                        <td style={S.td}>
                          {(e.texto || '').slice(0, 100)}{(e.texto || '').length > 100 ? '…' : ''}
                        </td>
                        <td style={S.td}>
                          {pedVin ? (
                            <span style={S.tagWait}>{pedVin.cliente}</span>
                          ) : '—'}
                        </td>
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
                <HoverLink>Exportar día</HoverLink>
                &nbsp;|&nbsp;
                <HoverLink>Ver archivo completo</HoverLink>
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUMNA DERECHA ── */}
        <div>
          {/* Pedidos activos */}
          <div style={S.wp}>
            <div style={S.wph}>📦 Pedidos activos</div>
            <div style={{ padding: 0 }}>
              {pedidosActivos.map(p => (
                <div key={p.id} style={S.si}>
                  <HoverLink onClick={() => navigate('/pedidos')}>
                    {p.cliente}
                  </HoverLink>
                </div>
              ))}
              {pedidosActivos.length === 0 && (
                <div style={{ ...S.si, color: '#888' }}>Sin pedidos activos</div>
              )}
              <div style={{ padding: '4px 8px', background: '#ece9d8', borderTop: '1px solid #d8d8c8', textAlign: 'right', fontSize: '10px' }}>
                <HoverLink onClick={() => navigate('/pedidos')}>Ver todos →</HoverLink>
              </div>
            </div>
          </div>

          {/* Racha */}
          <div style={S.wp}>
            <div style={S.wph}>🔥 Racha de escritura</div>
            <div style={{ ...S.wpb, textAlign: 'center', padding: '10px' }}>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: '34px', fontWeight: 'bold', color: '#2a5a10', lineHeight: 1 }}>
                {rachaActual}
              </div>
              <div style={{ fontSize: '10px', color: '#555', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                días seguidos
              </div>
              <div style={{ fontSize: '10px', marginTop: '6px' }}>
                <b>Mejor racha:</b> {rachaMejor} días
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div style={S.wp}>
            <div style={S.wph}>📊 Este mes</div>
            <div style={{ ...S.wpb, fontSize: '10px', lineHeight: 2 }}>
              <b>{entradasMes.length}</b> entradas en {mesNombre(mesActivo)}<br />
              <b>{entradasMesAnterior.length}</b> entradas en {mesNombre(mesAnteriorNum)}<br />
              <b>{totalAnio}</b> entradas en total ({anioActivo})
            </div>
          </div>

          {/* Acciones */}
          <div style={S.wp}>
            <div style={S.wph}>🔧 Acciones</div>
            <div style={{ ...S.wpb, fontSize: '11px', lineHeight: 2.1 }}>
              <HoverLink onClick={() => irA(hoy())}>📝 Ir a hoy</HoverLink><br />
              <HoverLink>🔍 Buscar en bitácora</HoverLink><br />
              <HoverLink>📤 Exportar mes a texto</HoverLink><br />
              <HoverLink>📋 Ver archivo completo</HoverLink>
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

function HoverBtn({ style, onClick, children }) {
  const [hov, setHov] = useState(false)
  const isBlue = style?.background?.includes('4a90d9')
  return (
    <button
      style={{
        ...style,
        ...(hov && !isBlue ? { background: '#ffffcc', color: '#000' } : {}),
        ...(hov && isBlue ? { background: 'linear-gradient(to bottom, #5aa0e9, #3070b8)' } : {}),
        fontFamily: 'Tahoma, Verdana, sans-serif',
        fontSize: '11px',
      }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  )
}

function HoverRow({ style, children }) {
  const [hov, setHov] = useState(false)
  return (
    <tr
      style={{ ...(hov ? { background: '#ffffcc' } : style) }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </tr>
  )
}
