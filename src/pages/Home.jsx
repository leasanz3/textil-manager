import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const today = new Date().toISOString().split('T')[0]

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']
const DIAS_ES  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

const EVENTO_STYLE = {
  tela:    { background: '#d4e8ff', border: '1px solid #4a80c0', color: '#1a3a6b' },
  taller:  { background: '#fff3c8', border: '1px solid #c8a040', color: '#5a3a00' },
  cliente: { background: '#d4f0d4', border: '1px solid #4a9a4a', color: '#1a5a1a' },
  bloqueo: { background: '#ffd4d4', border: '1px solid #c06060', color: '#8a0000' },
}

const PRIORIDAD_STYLE = {
  alta:  { background: '#ffd4d4', color: '#8a0000', border: '1px solid #c06060' },
  media: { background: '#fff3c8', color: '#5a3a00', border: '1px solid #c8a040' },
  baja:  { background: '#d4f0d4', color: '#1a5a1a', border: '1px solid #4a9a4a' },
}

const CONTEXTO_STYLE = {
  taller:   { background: '#e8d4ff', color: '#4a1a8a', border: '1px solid #8a60c0' },
  cliente:  { background: '#d4f0d4', color: '#1a5a1a', border: '1px solid #4a9a4a' },
  oficina:  { background: '#d4e8ff', color: '#1a3a6b', border: '1px solid #4a80c0' },
  personal: { background: '#f4f4f4', color: '#555',    border: '1px solid #aaa'    },
}

const PANEL_BASE = { background: '#fff', border: '1px solid #a8a8a8', boxShadow: '1px 1px 0 #b8b8b8' }
const HDR_BLUE   = { background: 'linear-gradient(to bottom, #e8eef7, #c8d4e8)', borderBottom: '1px solid #6b83a8', color: '#1a3a6b' }

function PanelHdr({ label, hdrStyle }) {
  return (
    <div style={{ padding: '5px 10px', fontWeight: 700, fontSize: 12, ...HDR_BLUE, ...hdrStyle }}>
      {label}
    </div>
  )
}

function Badge({ s, children }) {
  return (
    <span style={{ display: 'inline-block', padding: '1px 5px', fontSize: 10, fontWeight: 700, ...s }}>
      {children}
    </span>
  )
}

function resumirItems(items) {
  if (!Array.isArray(items) || items.length === 0) return '—'
  return items.map(it => it.producto || it.nombre || '').filter(Boolean).join(', ')
}

function buildCalendario(mes) {
  const y = mes.getFullYear()
  const m = mes.getMonth()
  let startDow = new Date(y, m, 1).getDay() - 1
  if (startDow < 0) startDow = 6

  const celdas = []
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(y, m, -i)
    celdas.push({ fecha: d.toISOString().split('T')[0], dia: d.getDate(), otroMes: true })
  }
  const fin = new Date(y, m + 1, 0).getDate()
  for (let d = 1; d <= fin; d++) {
    celdas.push({ fecha: new Date(y, m, d).toISOString().split('T')[0], dia: d, otroMes: false })
  }
  while (celdas.length < 42) {
    const d = celdas.length - startDow - fin + 1
    celdas.push({ fecha: new Date(y, m + 1, d).toISOString().split('T')[0], dia: d, otroMes: true })
  }
  return celdas
}

export default function Home({ onMenuClick }) {
  const navigate = useNavigate()

  const [bloqueados,   setBloqueados]   = useState([])
  const [listosCortar, setListosCortar] = useState([])
  const [entregasHoy,  setEntregasHoy]  = useState([])

  const [mesActual,       setMesActual]       = useState(new Date())
  const [eventos,         setEventos]         = useState([])
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)

  const [bitacoraHoy,    setBitacoraHoy]    = useState(0)
  const [tarPendientes,  setTarPendientes]  = useState(0)
  const [tarUrgentes,    setTarUrgentes]    = useState([])
  const [resumen,        setResumen]        = useState({})
  const [racha,          setRacha]          = useState(0)

  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { fetchCalendario(mesActual) }, [mesActual])

  async function fetchAll() {
    setLoading(true)
    const [
      { data: bloq },
      { data: corte },
      { data: entregas },
      { data: bitHoy },
      { data: tarPend },
      { data: tarUrg },
      { data: allPed },
    ] = await Promise.all([
      supabase.from('pedidos').select('id, cliente, items, etapa_actual, motivo_bloqueo')
        .eq('bloqueado', true).order('created_at', { ascending: false }),
      supabase.from('pedidos').select('id, cliente, items, etapa_actual')
        .in('etapa_actual', ['corte', 'listo_para_cortar']).eq('bloqueado', false),
      supabase.from('pedidos').select('id, cliente, items, fecha_entrega')
        .eq('fecha_entrega', today),
      supabase.from('bitacora').select('id').eq('fecha', today),
      supabase.from('tareas').select('id').eq('hecha', false),
      supabase.from('tareas').select('*').eq('hecha', false).eq('prioridad', 'alta')
        .order('created_at').limit(5),
      supabase.from('pedidos').select('id, etapa_actual, bloqueado')
        .not('etapa_actual', 'in', '("entrega","cancelado")'),
    ])

    setBloqueados(bloq || [])
    setListosCortar(corte || [])
    setEntregasHoy(entregas || [])
    setBitacoraHoy((bitHoy || []).length)
    setTarPendientes((tarPend || []).length)
    setTarUrgentes(tarUrg || [])

    const todos = allPed || []
    setResumen({
      activos:     todos.length,
      bloqueados:  todos.filter(p => p.bloqueado).length,
      corte:       todos.filter(p => ['corte','listo_para_cortar'].includes(p.etapa_actual)).length,
      taller:      todos.filter(p => ['taller','confeccion'].includes(p.etapa_actual)).length,
      entregasHoy: (entregas || []).length,
    })

    // racha de días seguidos con bitácora
    const { data: fechasBit } = await supabase
      .from('bitacora').select('fecha').order('fecha', { ascending: false }).limit(90)
    if (fechasBit && fechasBit.length > 0) {
      const fechas = [...new Set(fechasBit.map(d => d.fecha))].sort().reverse()
      let r = 0
      let curr = new Date(today)
      for (const f of fechas) {
        const diff = Math.round((curr - new Date(f)) / 86400000)
        if (diff <= 1) { r++; curr = new Date(f) } else break
      }
      setRacha(r)
    }

    setLoading(false)
  }

  async function fetchCalendario(mes) {
    const y = mes.getFullYear()
    const m = mes.getMonth()
    const p = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const u = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`

    const [{ data: compras }, { data: etapas }, { data: entregas }, { data: bloqueos }] = await Promise.all([
      supabase.from('compras').select('fecha, proveedor').gte('fecha', p).lte('fecha', u),
      supabase.from('produccion_etapas').select('fecha_ingreso, responsable').gte('fecha_ingreso', p).lte('fecha_ingreso', u),
      supabase.from('pedidos').select('fecha_entrega, cliente').gte('fecha_entrega', p).lte('fecha_entrega', u).not('fecha_entrega', 'is', null),
      supabase.from('pedidos').select('fecha_pedido, cliente').eq('bloqueado', true).not('fecha_pedido', 'is', null).gte('fecha_pedido', p).lte('fecha_pedido', u),
    ])

    const evs = []
    ;(compras  || []).forEach(c => evs.push({ fecha: c.fecha,          tipo: 'tela',    label: '🔵 ' + (c.proveedor   || 'Tela')   }))
    ;(etapas   || []).forEach(e => evs.push({ fecha: e.fecha_ingreso,  tipo: 'taller',  label: '🟡 ' + (e.responsable || 'Taller') }))
    ;(entregas || []).forEach(e => evs.push({ fecha: e.fecha_entrega,  tipo: 'cliente', label: '🟢 ' + (e.cliente     || '')       }))
    ;(bloqueos || []).forEach(b => evs.push({ fecha: b.fecha_pedido,   tipo: 'bloqueo', label: '🔴 ' + (b.cliente     || '') + ' bloq.' }))
    setEventos(evs)
  }

  const celdas      = buildCalendario(mesActual)
  const eventosDia  = diaSeleccionado ? eventos.filter(e => e.fecha === diaSeleccionado) : []
  const fmtDia      = f => f ? f.split('-').reverse().join('/') : ''

  const mesAnterior  = () => setMesActual(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const mesSiguiente = () => setMesActual(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>📦 Home</h2>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)' }}>
          {new Date().toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="content" style={{ fontFamily: 'Tahoma, Arial, sans-serif', fontSize: 11 }}>

        {/* ── Tres carriles superiores ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>

          {/* 🔒 Bloqueados */}
          <div style={PANEL_BASE}>
            <PanelHdr label="🔒 Pedidos bloqueados" hdrStyle={{ background: 'linear-gradient(to bottom, #f4d4d4, #e8c0c0)', borderBottom: '1px solid #c06060', color: '#8a0000' }} />
            <div style={{ padding: 8 }}>
              {loading ? <div style={{ color: '#888' }}>Cargando…</div>
              : bloqueados.length === 0
                ? <div style={{ color: 'var(--success)', fontWeight: 700 }}>✓ Sin pedidos bloqueados</div>
                : bloqueados.map(p => (
                  <div key={p.id} style={{ padding: '4px 0', borderBottom: '1px solid #f0e0e0' }}>
                    <div style={{ fontWeight: 700 }}>{p.cliente}</div>
                    <div style={{ color: '#555' }}>{resumirItems(p.items)}</div>
                    {p.motivo_bloqueo && <div style={{ color: '#c00' }}>⚠ {p.motivo_bloqueo}</div>}
                  </div>
                ))
              }
            </div>
          </div>

          {/* ✂ Listos para cortar */}
          <div style={PANEL_BASE}>
            <PanelHdr label="✂ Listos para cortar" hdrStyle={{ background: 'linear-gradient(to bottom, #d4f0d4, #c0e0c0)', borderBottom: '1px solid #4a9a4a', color: '#1a5a1a' }} />
            <div style={{ padding: 8 }}>
              {loading ? <div style={{ color: '#888' }}>Cargando…</div>
              : listosCortar.length === 0
                ? <div style={{ color: '#888' }}>Sin pedidos listos para cortar</div>
                : listosCortar.map(p => (
                  <div key={p.id} style={{ padding: '4px 0', borderBottom: '1px solid #e0f0e0' }}>
                    <div style={{ fontWeight: 700 }}>{p.cliente}</div>
                    <div style={{ color: '#555' }}>{resumirItems(p.items)}</div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* 📦 Entregas hoy */}
          <div style={PANEL_BASE}>
            <PanelHdr label="📦 Entregas de hoy" hdrStyle={{ background: 'linear-gradient(to bottom, #fff3c8, #f4e0a8)', borderBottom: '1px solid #c8a040', color: '#5a3a00' }} />
            <div style={{ padding: 8 }}>
              {loading ? <div style={{ color: '#888' }}>Cargando…</div>
              : entregasHoy.length === 0
                ? <div style={{ color: '#888' }}>Sin entregas programadas para hoy</div>
                : entregasHoy.map(p => (
                  <div key={p.id} style={{ padding: '4px 0', borderBottom: '1px solid #f0e8c0' }}>
                    <div style={{ fontWeight: 700 }}>{p.cliente}</div>
                    <div style={{ color: '#555' }}>{resumirItems(p.items)}</div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* ── Fila inferior: calendario + sidebar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 8 }}>

          {/* Calendario */}
          <div style={PANEL_BASE}>
            {/* Nav mes */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', ...HDR_BLUE }}>
              <button onClick={mesAnterior} style={{ background: 'none', border: '1px solid #6b83a8', cursor: 'pointer', padding: '2px 8px', fontSize: 11, color: '#1a3a6b' }}>◀</button>
              <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 13 }}>
                {MESES_ES[mesActual.getMonth()]} {mesActual.getFullYear()}
              </span>
              <button onClick={mesSiguiente} style={{ background: 'none', border: '1px solid #6b83a8', cursor: 'pointer', padding: '2px 8px', fontSize: 11, color: '#1a3a6b' }}>▶</button>
            </div>

            {/* Grilla */}
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(to bottom, #e8eef7, #c8d4e8)' }}>
                  {DIAS_ES.map(d => (
                    <th key={d} style={{ padding: '4px 0', textAlign: 'center', fontSize: 11, color: '#1a3a6b', fontWeight: 700, border: '1px solid #c8d4e8' }}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, row) => (
                  <tr key={row}>
                    {celdas.slice(row * 7, row * 7 + 7).map((celda, col) => {
                      const esHoy      = celda.fecha === today
                      const selec      = celda.fecha === diaSeleccionado
                      const evsDia     = eventos.filter(e => e.fecha === celda.fecha)
                      return (
                        <td
                          key={col}
                          onClick={() => setDiaSeleccionado(celda.fecha === diaSeleccionado ? null : celda.fecha)}
                          style={{
                            height: 72, verticalAlign: 'top', padding: '2px 3px',
                            border: esHoy ? '2px solid #c8a040' : '1px solid #c8c8c0',
                            background: selec ? '#e8eeff' : esHoy ? '#ffffc8' : celda.otroMes ? '#f4f4ec' : '#fff',
                            cursor: 'pointer', fontSize: 11, overflow: 'hidden',
                          }}
                        >
                          <div style={{ fontWeight: esHoy ? 700 : 400, color: celda.otroMes ? '#aaa' : esHoy ? '#8a6000' : '#333', marginBottom: 1 }}>
                            {celda.dia}
                          </div>
                          {evsDia.slice(0, 3).map((ev, i) => (
                            <div key={i} style={{
                              fontSize: 10, padding: '1px 3px', marginBottom: 1,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              ...EVENTO_STYLE[ev.tipo],
                            }}>
                              {ev.label}
                            </div>
                          ))}
                          {evsDia.length > 3 && <div style={{ fontSize: 10, color: '#888' }}>+{evsDia.length - 3} más</div>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Detalle día seleccionado */}
            {diaSeleccionado && (
              <div style={{ borderTop: '1px solid #c8d4e8', padding: 8 }}>
                <div style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: 6, fontSize: 12 }}>
                  Eventos del {fmtDia(diaSeleccionado)}
                </div>
                {eventosDia.length === 0
                  ? <div style={{ color: '#888' }}>Sin eventos este día</div>
                  : eventosDia.map((ev, i) => (
                    <span key={i} style={{ display: 'inline-block', padding: '2px 8px', marginRight: 4, marginBottom: 4, fontSize: 11, ...EVENTO_STYLE[ev.tipo] }}>
                      {ev.label}
                    </span>
                  ))
                }
              </div>
            )}

            {/* Leyenda */}
            <div style={{ borderTop: '1px solid #e8e8e0', padding: '6px 10px', background: '#f8f8f4', fontSize: 10, color: '#555', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                ['tela',    '🔵 Levantada de tela'],
                ['taller',  '🟡 Entrega/retiro taller'],
                ['cliente', '🟢 Entrega al cliente'],
                ['bloqueo', '🔴 Pedido bloqueado'],
              ].map(([tipo, label]) => (
                <span key={tipo} style={{ padding: '1px 5px', ...EVENTO_STYLE[tipo] }}>{label}</span>
              ))}
            </div>
          </div>

          {/* ── Sidebar derecho ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* 📓 Diario de hoy */}
            <div style={PANEL_BASE}>
              <PanelHdr label="📓 Diario de hoy" />
              <div style={{ padding: 8 }}>
                {[
                  ['Entradas hoy',     bitacoraHoy,   undefined],
                  ['Tareas pendientes', tarPendientes, tarPendientes > 0 ? '#c00' : undefined],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#555' }}>{label}</span>
                    <strong style={{ color }}>{val}</strong>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#555' }}>Racha</span>
                  <strong style={{ color: racha >= 7 ? 'var(--success)' : undefined }}>
                    {racha} {racha === 1 ? 'día' : 'días'} 🔥
                  </strong>
                </div>
                <span onClick={() => navigate('/diario')} style={{ color: '#1a3a6b', cursor: 'pointer', textDecoration: 'underline' }}>
                  → Ir al Diario
                </span>
              </div>
            </div>

            {/* ✅ Tareas urgentes */}
            <div style={PANEL_BASE}>
              <PanelHdr label="✅ Tareas urgentes" hdrStyle={{ background: 'linear-gradient(to bottom, #f4d4d4, #e8c0c0)', borderBottom: '1px solid #c06060', color: '#8a0000' }} />
              <div style={{ padding: 8 }}>
                {tarUrgentes.length === 0
                  ? <div style={{ color: 'var(--success)', fontWeight: 700 }}>✓ Sin tareas urgentes</div>
                  : tarUrgentes.map(t => (
                    <div key={t.id} style={{ padding: '3px 0', borderBottom: '1px solid #f4f0f0' }}>
                      <div style={{ marginBottom: 2 }}>{t.texto}</div>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {t.prioridad && <Badge s={PRIORIDAD_STYLE[t.prioridad] || {}}>{t.prioridad}</Badge>}
                        {t.contexto  && <Badge s={CONTEXTO_STYLE[t.contexto]   || {}}>{t.contexto}</Badge>}
                      </div>
                    </div>
                  ))
                }
                <div style={{ marginTop: 6 }}>
                  <span onClick={() => navigate('/diario')} style={{ color: '#1a3a6b', cursor: 'pointer', textDecoration: 'underline' }}>
                    ver todas →
                  </span>
                </div>
              </div>
            </div>

            {/* 📊 Resumen */}
            <div style={PANEL_BASE}>
              <PanelHdr label="📊 Resumen" />
              <div style={{ padding: 8 }}>
                {[
                  ['Pedidos activos',    resumen.activos,     undefined],
                  ['Bloqueados',         resumen.bloqueados,  resumen.bloqueados > 0 ? '#c00' : undefined],
                  ['Listos para cortar', resumen.corte,       undefined],
                  ['En taller',          resumen.taller,      undefined],
                  ['Entregas hoy',       resumen.entregasHoy, resumen.entregasHoy > 0 ? 'var(--success)' : undefined],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: '#555' }}>{label}</span>
                    <strong style={{ color }}>{val ?? '—'}</strong>
                  </div>
                ))}
                <div style={{ marginTop: 6 }}>
                  <span onClick={() => navigate('/pedidos')} style={{ color: '#1a3a6b', cursor: 'pointer', textDecoration: 'underline' }}>
                    → Ver todos los pedidos
                  </span>
                </div>
              </div>
            </div>

            {/* 🔧 Acceso rápido */}
            <div style={PANEL_BASE}>
              <PanelHdr label="🔧 Acceso rápido" />
              <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  ['📋 Nuevo pedido',       '/pedidos'],
                  ['📓 Escribir en diario', '/diario'],
                  ['✅ Nueva tarea',         '/diario'],
                  ['🧾 Registrar compra',   '/compras'],
                ].map(([label, path]) => (
                  <button
                    key={label}
                    className="btn btn-secondary btn-sm"
                    style={{ textAlign: 'left', width: '100%' }}
                    onClick={() => navigate(path)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
