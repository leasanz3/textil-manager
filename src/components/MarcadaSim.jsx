import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── Constants ──────────────────────────────────────────────────────────────────

export const TABLAS_TALLES = {
  adulto:   ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  nino:     ['2', '4', '6', '8', '10', '12', '14', '16'],
  malla:    ['40', '42', '44', '46', '48', '50', '52'],
  mallaesp: ['54', '56', '58'],
}
export const ROL_LABELS = { tela1: 'Tela 1', tela2: 'Tela 2', tela3: 'Tela 3', rib: 'RIB' }
const F = 'Tahoma, Arial, sans-serif'

export const S = {
  wrap:     { display:'flex', flexDirection:'column', height:'100vh', fontFamily:F, fontSize:11, color:'#000', background:'#d4d0c8' },
  tbar:     { background:'linear-gradient(to bottom,#e8eef7,#c8d4e8)', borderBottom:'2px solid #808080', padding:'4px 8px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  body:     { display:'flex', flex:1, overflow:'hidden' },
  left:     { width:200, minWidth:200, background:'#d4d0c8', borderRight:'2px solid #808080', display:'flex', flexDirection:'column', overflow:'hidden' },
  leftHead: { background:'linear-gradient(to bottom,#e8eef7,#c8d4e8)', padding:'4px 8px', fontWeight:700, borderBottom:'1px solid #808080' },
  leftBody: { flex:1, overflowY:'auto' },
  sessItem: (a) => ({ padding:'5px 8px', cursor:'pointer', borderBottom:'1px solid #c0c0b8', background: a ? '#ffffcc':'transparent', fontWeight: a ? 700:400 }),
  right:    { flex:1, overflowY:'auto', background:'#c8c8c0' },
  fichaHead:{ background:'linear-gradient(to bottom,#fff5d4,#f4e8a0)', borderBottom:'2px solid #c8a040', padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  secWrap:  { margin:'4px 6px', border:'1px solid #a8a8a8', background:'#fff', boxShadow:'1px 1px 0 #b8b8b8' },
  telaHead: { background:'linear-gradient(to bottom,#f0f4fc,#e0e8f4)', padding:'5px 10px', fontWeight:700, display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #b0bcd8', color:'#1a3a6b', userSelect:'none' },
  marcHead: { background:'linear-gradient(to bottom,#f4f4ec,#eaeae0)', padding:'5px 10px', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', borderBottom:'1px solid #d0d0c8' },
  prodHead: { background:'#f4f4ec', padding:'3px 8px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #d0d0c8', fontWeight:700 },
  secBody:  { padding:'8px' },
  tbl:  { borderCollapse:'collapse', fontSize:11 },
  th:   { background:'linear-gradient(to bottom,#e8eef7,#c8d4e8)', border:'1px solid #8098b8', padding:'3px 10px', fontWeight:700, textAlign:'center', color:'#1a3a6b', whiteSpace:'nowrap' },
  thL:  { background:'linear-gradient(to bottom,#e8eef7,#c8d4e8)', border:'1px solid #8098b8', padding:'3px 8px', fontWeight:700, textAlign:'left', color:'#1a3a6b', whiteSpace:'nowrap' },
  td:   { border:'1px solid #d0d0c8', padding:'3px 8px', textAlign:'center', minWidth:46 },
  tdL:  { border:'1px solid #d0d0c8', padding:'3px 8px', textAlign:'left' },
  tdC:  { border:'1px solid #d0d0c8', padding:'3px 8px', textAlign:'center', background:'#f0f8f0', color:'#2a5a10', fontWeight:700 },
  tdT:  { border:'1px solid #6b83a8', padding:'3px 8px', textAlign:'center', background:'#e8eef7', fontWeight:700, color:'#1a3a6b' },
  tdPz: { border:'1px solid #d0d0c8', padding:'3px 8px', textAlign:'left', fontWeight:700, background:'#f4f4ec' },
  btn:  { fontFamily:F, fontSize:11, padding:'3px 10px', cursor:'pointer', border:'1px solid #8a8a8a', background:'linear-gradient(to bottom,#fff,#e0dcd4)', color:'#000' },
  btnP: { fontFamily:F, fontSize:11, padding:'3px 10px', cursor:'pointer', border:'1px solid #1a4a88', background:'linear-gradient(to bottom,#4a90d9,#2060a8)', color:'#fff', fontWeight:700 },
  btnD: { fontFamily:F, fontSize:11, padding:'1px 6px', cursor:'pointer', border:'1px solid #801010', background:'linear-gradient(to bottom,#e06060,#b04040)', color:'#fff' },
  btnS: { fontFamily:F, fontSize:10, padding:'1px 7px', cursor:'pointer', border:'1px solid #8a8a8a', background:'linear-gradient(to bottom,#fff,#e0dcd4)', color:'#000' },
  inp:  { fontFamily:F, fontSize:11, border:'1px solid #8a8a8a', padding:'3px 6px', background:'#fff', color:'#000', boxSizing:'border-box' },
  sel:  { fontFamily:F, fontSize:11, border:'1px solid #8a8a8a', padding:'2px 4px', background:'#fff', color:'#000' },
  inpC: { width:40, fontFamily:F, fontSize:11, border:'1px solid #8a8a8a', padding:'2px 3px', textAlign:'center', background:'#fff' },
  inpR: { width:64, fontFamily:F, fontSize:11, border:'1px solid #3a8a3a', padding:'2px 3px', textAlign:'center', background:'#f0fff0', color:'#1a5a1a' },
  lbl:  { fontWeight:700, whiteSpace:'nowrap', fontSize:10, color:'#1a3a6b', display:'block', marginBottom:2 },
  chipOk:  { fontSize:11, background:'#dff0c8', color:'#1a5a1a', border:'1px solid #6b9a3a', padding:'2px 8px', fontWeight:700 },
  chipTela:{ fontSize:10, background:'#e8f4e8', color:'#1a5a1a', border:'1px solid #70b070', padding:'1px 6px', fontWeight:700 },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' },
  modal:   { background:'#d4d0c8', border:'2px solid #808080', minWidth:380, maxWidth:460, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'4px 4px 10px rgba(0,0,0,.4)', fontFamily:F, fontSize:11 },
  modalH:  { background:'linear-gradient(to right,#0058d4,#003fa0)', color:'#fff', padding:'4px 10px', fontWeight:700, display:'flex', justifyContent:'space-between', alignItems:'center' },
  modalB:  { padding:12, overflowY:'auto', flex:1 },
  modalF:  { padding:'8px 12px', borderTop:'1px solid #808080', display:'flex', justifyContent:'flex-end', gap:8 },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export const fmtF = s => {
  if (!s) return '—'
  const d = new Date(s.includes('T') ? s : s + 'T00:00:00')
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
export const fmtN = (n, d=2) => (n != null && !isNaN(n)) ? Number(n).toFixed(d) : '—'
export const today = () => new Date().toISOString().split('T')[0]
export const telaLabel = r => `${r.tipo}${r.color ? ` · ${r.color}` : ''}`

function calcPares(m) {
  const tp = parseFloat(m.total_pliegues) || 0
  const pp = parseFloat(m.pliegues) || 1
  return pp > 0 ? tp / pp : 0
}
function calcMetrosTotal(m) {
  return (parseFloat(m.metros) || 0) * (parseFloat(m.total_pliegues) || 0)
}
export function buildResult(piezas, pares, ajustes) {
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
export function calcPrendas(result, talles, piezasReq) {
  const reqMap = {}
  for (const pr of (piezasReq || [])) reqMap[pr.pieza_nombre] = pr.cant_prenda || 1
  const out = {}
  const reqKeys = Object.keys(reqMap)
  for (const t of talles) {
    if (reqKeys.length > 0) {
      const vals = reqKeys.map(pieza => (result[pieza]?.[t] ?? 0) / reqMap[pieza])
      out[t] = Math.min(...vals)
    } else {
      const entries = Object.entries(result)
      if (!entries.length) { out[t] = 0; continue }
      out[t] = Math.min(...entries.map(([, row]) => row[t] ?? 0))
    }
  }
  return out
}

// ── AcList ─────────────────────────────────────────────────────────────────────

export function AcList({ items, onPick, label }) {
  if (!items.length) return null
  return (
    <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:200, background:'#fff', border:'1px solid #808080', maxHeight:180, overflowY:'auto', boxShadow:'2px 2px 4px rgba(0,0,0,.3)' }}>
      {items.map((r, i) => (
        <div key={r.id ?? i}
          style={{ padding:'3px 8px', cursor:'pointer', borderBottom:'1px solid #e8e8e8', fontFamily:F, fontSize:11 }}
          onMouseEnter={e => e.currentTarget.style.background='#ffffcc'}
          onMouseLeave={e => e.currentTarget.style.background=''}
          onClick={() => onPick(r)}
        >{label(r)}</div>
      ))}
    </div>
  )
}

// ── ModificacionesSection ──────────────────────────────────────────────────────

function ModificacionesSection({ marcadaId, productoId, piezas, talles, ajustes, catalogPiezas, onReload }) {
  const [adding, setAdding] = useState(false)
  const [f, setF]           = useState({ de_pieza:'', a_pieza:'', de_talle:'', a_talle:'', cantidad:'' })
  const [saving, setSaving] = useState(false)
  const upd = (k, v) => setF(x => ({ ...x, [k]: v }))

  const piezaNames      = [...new Set(piezas.map(p => p.pieza_nombre))]
  const allPiezaNombres = [...new Set([...piezaNames, ...(catalogPiezas || []).map(p => p.nombre).filter(Boolean)])]
  const mine            = ajustes.filter(a => a.marcada_id === marcadaId && a.producto_id === productoId)

  async function save() {
    if (!f.cantidad || !f.de_talle || !f.a_talle) return
    setSaving(true)
    const { error } = await supabase.from('marcadas_sim_ajustes').insert({
      marcada_id: marcadaId, producto_id: productoId,
      de_pieza: f.de_pieza || null, a_pieza: f.a_pieza || null,
      de_talle: f.de_talle, a_talle: f.a_talle,
      cantidad: parseInt(f.cantidad) || 0,
    })
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    setAdding(false)
    setF({ de_pieza:'', a_pieza:'', de_talle:'', a_talle:'', cantidad:'' })
    onReload()
  }

  async function del(id) { await supabase.from('marcadas_sim_ajustes').delete().eq('id', id); onReload() }

  const fmtHora = ts => {
    if (!ts) return ''
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  return (
    <div style={{ marginTop:8, padding:'6px 10px', background:'#fff8e8', border:'1px solid #c8a040' }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#5a3a00', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span>✏ Modificaciones</span>
        <button style={{ ...S.btnS, fontSize:9 }} onClick={() => setAdding(a => !a)}>{adding ? '✕' : '+ mod.'}</button>
      </div>
      {mine.length > 0 && (
        <div style={{ marginBottom:6 }}>
          {mine.map(a => (
            <div key={a.id} style={{ padding:'2px 0', borderBottom:'1px dotted #e0d0a0', fontSize:10, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ color:'#888', minWidth:34 }}>{fmtHora(a.created_at)}</span>
              <span style={{ color:'#8a6000', fontStyle:'italic', flex:1 }}>
                {a.cantidad} {a.de_pieza} {a.de_talle} → {a.a_pieza} {a.a_talle}
              </span>
              <button style={{ ...S.btnD, padding:'0px 4px', fontSize:9 }} onClick={() => del(a.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
      {adding && (
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'flex-end', background:'#fff3d4', padding:'5px 6px', border:'1px solid #d4a040' }}>
          <div>
            <span style={S.lbl}>De pieza</span>
            <select style={S.sel} value={f.de_pieza} onChange={e => upd('de_pieza', e.target.value)}>
              <option value="">—</option>
              {piezaNames.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <span style={S.lbl}>De talle</span>
            <select style={S.sel} value={f.de_talle} onChange={e => upd('de_talle', e.target.value)}>
              <option value="">—</option>
              {talles.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <span style={S.lbl}>A pieza</span>
            <select style={S.sel} value={f.a_pieza} onChange={e => upd('a_pieza', e.target.value)}>
              <option value="">—</option>
              {allPiezaNombres.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <span style={S.lbl}>A talle</span>
            <select style={S.sel} value={f.a_talle} onChange={e => upd('a_talle', e.target.value)}>
              <option value="">—</option>
              {talles.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <span style={S.lbl}>Cant.</span>
            <input style={{ ...S.inp, width:45 }} type="number" min="0" step="0.5" value={f.cantidad} onChange={e => upd('cantidad', e.target.value)} placeholder="0" />
          </div>
          <div style={{ display:'flex', gap:4, alignItems:'flex-end' }}>
            <button style={{ fontFamily:F, fontSize:11, padding:'3px 10px', cursor:'pointer', border:'1px solid #1a6a1a', background:'linear-gradient(to bottom,#6abf6a,#3a9a3a)', color:'#fff', fontWeight:700 }} onClick={save} disabled={saving}>✓ Registrar</button>
            <button style={S.btn} onClick={() => setAdding(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TablaPorPar ────────────────────────────────────────────────────────────────

function TablaPorPar({ marcadaId, productoId, talles, piezas, pares, ajustes, onReload, catalogPiezas, piezasReq }) {
  const [editing,      setEditing]      = useState(null)
  const [cellVal,      setCellVal]      = useState('')
  const [newPieza,     setNewPieza]     = useState('')
  const [addingCustom, setAddingCustom] = useState(false)
  const [pendingPiezas,setPendingPiezas]= useState([])

  const map = {}
  for (const p of piezas) {
    if (!map[p.pieza_nombre]) map[p.pieza_nombre] = {}
    map[p.pieza_nombre][p.talle] = parseFloat(p.cantidad) || 0
  }
  const dbPiezaNames  = [...new Set(piezas.map(p => p.pieza_nombre))]
  const dbSet         = new Set(dbPiezaNames)
  const pendingShown  = pendingPiezas.filter(n => !dbSet.has(n))
  const piezaNames    = [...new Set([...dbPiezaNames, ...pendingShown])]
  const result        = buildResult(piezas, pares, ajustes)
  const addedNames    = new Set(piezaNames)
  const availableCat  = (catalogPiezas || []).filter(p => !addedNames.has(p.nombre))

  useEffect(() => {
    if (!pendingPiezas.length) return
    const inDB = new Set(piezas.map(p => p.pieza_nombre))
    setPendingPiezas(prev => prev.filter(n => !inDB.has(n)))
  }, [piezas]) // eslint-disable-line

  async function saveCell(pieza, talle, val) {
    const v  = parseFloat(val) || 0
    const ex = piezas.find(p => p.pieza_nombre === pieza && p.talle === talle)
    if (ex) {
      await supabase.from('marcadas_sim_piezas').update({ cantidad: v }).eq('id', ex.id)
    } else {
      await supabase.from('marcadas_sim_piezas').insert({ marcada_id:marcadaId, producto_id:productoId, pieza_nombre:pieza, talle, cantidad:v })
    }
    onReload()
  }

  function addFromCatalog(cp) { setPendingPiezas(prev => [...prev, cp.nombre]) }

  function addCustomPieza() {
    const name = newPieza.trim()
    if (!name) return
    setPendingPiezas(prev => [...prev, name])
    setNewPieza(''); setAddingCustom(false)
  }

  async function deletePieza(pieza) {
    if (pendingShown.includes(pieza)) { setPendingPiezas(prev => prev.filter(n => n !== pieza)); return }
    if (!window.confirm(`¿Eliminar pieza "${pieza}"?`)) return
    await supabase.from('marcadas_sim_piezas').delete().eq('marcada_id', marcadaId).eq('producto_id', productoId).eq('pieza_nombre', pieza)
    onReload()
  }

  return (
    <div style={{ overflowX:'auto', marginBottom:8 }}>
      <div style={{ fontSize:10, color:'#555', fontStyle:'italic', marginBottom:4 }}>
        ¿Qué sale de UN par de pliegues?
      </div>
      <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
        <div>
          <table style={S.tbl}>
            <thead><tr>
              <th style={{ ...S.thL, minWidth:90 }}>Pieza</th>
              {talles.map(t => <th key={t} style={S.th}>{t}</th>)}
              <th style={S.th}></th>
            </tr></thead>
            <tbody>
              {piezaNames.map(pieza => (
                <tr key={pieza}
                  onMouseEnter={e => Array.from(e.currentTarget.cells).slice(1,-1).forEach(c => c.style.background='#ffffcc')}
                  onMouseLeave={e => Array.from(e.currentTarget.cells).slice(1,-1).forEach(c => c.style.background='')}
                >
                  <td style={S.tdPz}>{pieza}</td>
                  {talles.map(talle => {
                    const isEd = editing?.pieza === pieza && editing?.talle === talle
                    const val  = map[pieza]?.[talle] ?? 0
                    return (
                      <td key={talle} style={S.td}>
                        {isEd ? (
                          <input style={S.inpC} value={cellVal} autoFocus
                            onChange={e => setCellVal(e.target.value)}
                            onBlur={() => { saveCell(pieza, talle, cellVal); setEditing(null) }}
                            onKeyDown={e => { if (e.key==='Enter') { saveCell(pieza, talle, cellVal); setEditing(null) } if (e.key==='Escape') setEditing(null) }}
                          />
                        ) : (
                          <span style={{ cursor:'pointer', display:'block', minWidth:32, color: val ? '#000':'#ccc' }}
                            onClick={() => { setEditing({ pieza, talle }); setCellVal(String(val)) }}>
                            {val || '—'}
                          </span>
                        )}
                      </td>
                    )
                  })}
                  <td style={S.td}><button style={S.btnD} onClick={() => deletePieza(pieza)}>✕</button></td>
                </tr>
              ))}
              {availableCat.length > 0 && (
                <tr>
                  <td colSpan={talles.length + 2} style={{ padding:'4px 6px', background:'#f4f8fc', borderTop:'1px solid #c8d8e8' }}>
                    <span style={{ fontSize:10, color:'#1a3a6b', fontWeight:700, marginRight:6 }}>del catálogo:</span>
                    {availableCat.map(cp => (
                      <button key={cp.nombre} style={{ ...S.btnS, marginRight:3, marginBottom:2 }} onClick={() => addFromCatalog(cp)}>
                        + {cp.nombre}{cp.mult > 1 ? ` ×${cp.mult}` : ''}
                      </button>
                    ))}
                  </td>
                </tr>
              )}
              {addingCustom ? (
                <tr>
                  <td style={S.td} colSpan={talles.length + 2}>
                    <input style={{ ...S.inp, width:110 }} placeholder="pieza personalizada" value={newPieza}
                      autoFocus onChange={e => setNewPieza(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter') addCustomPieza(); if (e.key==='Escape') { setAddingCustom(false); setNewPieza('') } }}
                    />
                    <button style={{ ...S.btnS, marginLeft:4 }} onClick={addCustomPieza}>OK</button>
                    <button style={{ ...S.btnS, marginLeft:4 }} onClick={() => { setAddingCustom(false); setNewPieza('') }}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr><td colSpan={talles.length + 2} style={{ padding:'2px 4px' }}>
                  <button style={S.btnS} onClick={() => setAddingCustom(true)}>+ personalizada</button>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {piezaNames.length > 0 && pares > 0 && (() => {
          const resultBase = buildResult(piezas, pares, [])
          const resultMod  = buildResult(piezas, pares, ajustes)
          const hasAjustes = ajustes.length > 0
          const allPiezaNamesInResult = [...new Set([...piezaNames, ...Object.keys(resultMod)])]

          const renderTable = (res, allNames, label, color) => (
            <div>
              <div style={{ fontSize:10, color, fontWeight:700, marginBottom:4 }}>{label}</div>
              <table style={S.tbl}>
                <thead><tr>
                  <th style={{ ...S.thL, minWidth:90 }}>Pieza</th>
                  {talles.map(t => <th key={t} style={S.th}>{t}</th>)}
                </tr></thead>
                <tbody>
                  {allNames.map(pieza => (
                    <tr key={pieza}>
                      <td style={S.tdPz}>{pieza}</td>
                      {talles.map(t => {
                        const v = res[pieza]?.[t]
                        return <td key={t} style={v ? S.tdC : S.td}>{v ? fmtN(v,1) : '·'}</td>
                      })}
                    </tr>
                  ))}
                  {(() => {
                    const prendas = calcPrendas(res, talles, piezasReq)
                    return (
                      <tr>
                        <td style={{ ...S.tdL, fontWeight:700, background:'#e8eef7', color:'#1a3a6b' }}>PRENDAS</td>
                        {talles.map(t => <td key={t} style={S.tdT}>{prendas[t] > 0 ? Math.floor(prendas[t]) : '·'}</td>)}
                      </tr>
                    )
                  })()}
                </tbody>
              </table>
            </div>
          )

          return (
            <>
              {renderTable(resultBase, piezaNames, `× ${fmtN(pares,1)} pares =`, '#1a3a6b')}
              {hasAjustes && renderTable(resultMod, allPiezaNamesInResult, '+ modificaciones =', '#5a3a00')}
            </>
          )
        })()}
      </div>
    </div>
  )
}

// ── PiezasPorPrendaSection ─────────────────────────────────────────────────────

function PiezasPorPrendaSection({ marcadaId, productoId, catalogPiezas, piezasReq, onReload }) {
  const [collapsed, setCollapsed] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editVal,   setEditVal]   = useState('')

  const mine        = piezasReq.filter(p => p.marcada_id === marcadaId && p.producto_id === productoId)
  const mineSet     = new Set(mine.map(p => p.pieza_nombre))
  const disponibles = (catalogPiezas || []).filter(p => !mineSet.has(p.nombre))

  async function addPieza(nombre) {
    await supabase.from('marcadas_sim_piezas_req').insert({ marcada_id: marcadaId, producto_id: productoId, pieza_nombre: nombre, cant_prenda: 1 })
    onReload()
  }
  async function delPieza(id) {
    await supabase.from('marcadas_sim_piezas_req').delete().eq('id', id)
    onReload()
  }
  async function saveCant(id) {
    const v = parseInt(editVal) || 1
    await supabase.from('marcadas_sim_piezas_req').update({ cant_prenda: v }).eq('id', id)
    setEditingId(null); onReload()
  }

  return (
    <div style={{ marginBottom:8, border:'1px solid #b0bcd8', background:'#f4f8fc' }}>
      <div style={{ background:'linear-gradient(to bottom,#e0e8f4,#d0ddf0)', padding:'4px 8px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => setCollapsed(c => !c)}>
        <span style={{ fontWeight:700, fontSize:10, color:'#1a3a6b' }}>{collapsed ? '▶' : '▼'} PIEZAS POR PRENDA</span>
        <span style={{ fontSize:10, color:'#555' }}>{mine.length} piezas definidas</span>
      </div>
      {!collapsed && (
        <div style={{ padding:'6px 8px' }}>
          {mine.length === 0 && <div style={{ fontSize:10, color:'#888', fontStyle:'italic', marginBottom:4 }}>Agregá las piezas que se necesitan para completar una prenda.</div>}
          {mine.length > 0 && (
            <table style={{ ...S.tbl, marginBottom:6 }}>
              <thead><tr>
                <th style={S.thL}>Pieza</th>
                <th style={S.th}>Cant. por prenda</th>
                <th style={S.th}></th>
              </tr></thead>
              <tbody>
                {mine.map(p => (
                  <tr key={p.id}>
                    <td style={S.tdL}><strong>{p.pieza_nombre}</strong></td>
                    <td style={S.td}>
                      {editingId === p.id ? (
                        <input style={{ ...S.inpC, width:36 }} type="number" min="1" value={editVal} autoFocus
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={() => saveCant(p.id)}
                          onKeyDown={e => { if (e.key==='Enter') saveCant(p.id); if (e.key==='Escape') setEditingId(null) }} />
                      ) : (
                        <span>{p.cant_prenda || 1}</span>
                      )}
                    </td>
                    <td style={{ ...S.td, whiteSpace:'nowrap' }}>
                      <button style={{ ...S.btnS, marginRight:3 }} onClick={() => { setEditingId(p.id); setEditVal(String(p.cant_prenda || 1)) }}>✏</button>
                      <button style={S.btnD} onClick={() => delPieza(p.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {disponibles.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
              <span style={{ fontSize:10, color:'#1a3a6b', fontWeight:700, marginRight:4, alignSelf:'center' }}>+ agregar:</span>
              {disponibles.map(p => (
                <button key={p.nombre} style={S.btnS} onClick={() => addPieza(p.nombre)}>
                  {p.nombre}{p.mult > 1 ? ` ×${p.mult}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── PedidoSection ──────────────────────────────────────────────────────────────

function PedidoSection({ marcadaId, productoId, talles, pedido, onReload }) {
  const [collapsed, setCollapsed] = useState(false)
  const saveTimers = useRef({})

  const mine    = pedido.filter(p => p.marcada_id === marcadaId && p.producto_id === productoId)
  const mineMap = {}
  for (const p of mine) mineMap[p.talle] = p

  function onCantChange(talle, val) {
    const key = `${marcadaId}-${productoId}-${talle}`
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(async () => {
      const cantidad = parseInt(val) || 0
      const ex = mineMap[talle]
      if (ex) {
        await supabase.from('marcadas_sim_pedido').update({ cantidad }).eq('id', ex.id)
      } else {
        await supabase.from('marcadas_sim_pedido').insert({ marcada_id: marcadaId, producto_id: productoId, talle, cantidad })
      }
      onReload()
    }, 500)
  }

  const total = mine.reduce((s, p) => s + (p.cantidad || 0), 0)

  return (
    <div style={{ marginBottom:8, border:'1px solid #a0b870', background:'#f4f8ec' }}>
      <div style={{ background:'linear-gradient(to bottom,#e0eecc,#d0e8b0)', padding:'4px 8px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => setCollapsed(c => !c)}>
        <span style={{ fontWeight:700, fontSize:10, color:'#3a5a10' }}>{collapsed ? '▶' : '▼'} PEDIDO</span>
        {total > 0 && <span style={{ fontSize:10, color:'#555' }}>total: <b>{total}</b></span>}
      </div>
      {!collapsed && (
        <div style={{ padding:'6px 8px', overflowX:'auto' }}>
          <table style={S.tbl}>
            <thead><tr>
              <th style={S.thL}>Talle</th>
              <th style={S.th}>Cantidad</th>
            </tr></thead>
            <tbody>
              {talles.map(t => {
                const ped = mineMap[t]?.cantidad || 0
                return (
                  <tr key={t}>
                    <td style={S.tdL}><strong>{t}</strong></td>
                    <td style={S.td}>
                      <input style={{ ...S.inpC, width:44 }} type="number" min="0" defaultValue={ped || ''}
                        placeholder="0" onChange={e => onCantChange(t, e.target.value)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── ResumenCortesSection ───────────────────────────────────────────────────────

function ResumenCortesSection({ entries, allPiezas, allAjustes, allPiezasReq, pedido, talles, productoId, marcadaId }) {
  const [collapsed, setCollapsed] = useState(false)

  const mine      = pedido.filter(p => p.marcada_id === marcadaId && p.producto_id === productoId)
  const pedidoMap = {}
  for (const p of mine) pedidoMap[p.talle] = p.cantidad || 0

  const reqMap = {}
  for (const { marcada, prodEntry } of entries) {
    const reqs = allPiezasReq.filter(p => p.marcada_id === marcada.id && p.producto_id === prodEntry.producto_id)
    for (const r of reqs) if (!reqMap[r.pieza_nombre]) reqMap[r.pieza_nombre] = r.cant_prenda || 1
  }

  const cortadoMap = {}
  for (const { marcada, prodEntry } of entries) {
    const piezas  = allPiezas.filter(p => p.marcada_id === marcada.id && p.producto_id === prodEntry.producto_id)
    const ajustes = allAjustes.filter(a => a.marcada_id === marcada.id && a.producto_id === prodEntry.producto_id)
    const result  = buildResult(piezas, calcPares(marcada), ajustes)
    for (const [pieza, row] of Object.entries(result)) {
      if (!cortadoMap[pieza]) cortadoMap[pieza] = {}
      for (const [talle, qty] of Object.entries(row)) {
        cortadoMap[pieza][talle] = (cortadoMap[pieza][talle] || 0) + qty
      }
    }
  }

  const piezas = Object.keys(reqMap)
  if (!piezas.length) return null

  return (
    <div style={{ marginBottom:8, border:'1px solid #9898c0', background:'#f4f4fc' }}>
      <div style={{ background:'linear-gradient(to bottom,#e4e4f4,#d4d4ec)', padding:'4px 8px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => setCollapsed(c => !c)}>
        <span style={{ fontWeight:700, fontSize:10, color:'#2a2a6b' }}>{collapsed ? '▶' : '▼'} RESUMEN DE CORTES</span>
      </div>
      {!collapsed && (
        <div style={{ padding:'6px 8px', overflowX:'auto' }}>
          <table style={{ ...S.tbl, tableLayout:'auto' }}>
            <thead>
              <tr>
                <th style={{ ...S.thL, minWidth:50 }} rowSpan={2}>Talle</th>
                {piezas.map(pieza => (
                  <th key={pieza} style={{ ...S.th, textAlign:'center' }} colSpan={3}>{pieza}</th>
                ))}
              </tr>
              <tr>
                {piezas.map(pieza => (
                  <React.Fragment key={pieza}>
                    <th style={{ ...S.th, fontSize:9, fontWeight:400, color:'#555', minWidth:30 }}>prec.</th>
                    <th style={{ ...S.th, fontSize:9, fontWeight:400, color:'#555', minWidth:30 }}>cort.</th>
                    <th style={{ ...S.th, fontSize:9, fontWeight:700, minWidth:30 }}>Δ</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {talles.filter(t => piezas.some(pieza => (pedidoMap[t]||0) > 0 || (cortadoMap[pieza]?.[t]||0) > 0)).map((t, ti) => (
                <tr key={t} style={{ background: ti % 2 === 0 ? '#fff' : '#f4f4fc' }}>
                  <td style={{ ...S.tdL, fontWeight:700 }}>{t}</td>
                  {piezas.map(pieza => {
                    const cantPrenda = reqMap[pieza] || 1
                    const precisan   = (pedidoMap[t] || 0) * cantPrenda
                    const cortaron   = cortadoMap[pieza]?.[t] || 0
                    const diff       = cortaron - precisan
                    return (
                      <React.Fragment key={pieza}>
                        <td style={{ ...S.td, color:'#555' }}>{precisan || '·'}</td>
                        <td style={{ ...S.td, fontWeight: cortaron > 0 ? 700:400, color: cortaron > 0 ? '#000':'#aaa' }}>{cortaron || '·'}</td>
                        <td style={S.td}>
                          {precisan === 0 && cortaron === 0
                            ? <span style={{ color:'#ddd' }}>—</span>
                            : diff === 0
                              ? <span style={{ color:'#1a6a1a', fontWeight:700 }}>✓</span>
                              : diff > 0
                                ? <span style={{ color:'#1a6a1a', fontWeight:700 }}>+{fmtN(diff,1)}</span>
                                : <span style={{ color:'#a02020', fontWeight:700 }}>−{fmtN(Math.abs(diff),1)}</span>
                          }
                        </td>
                      </React.Fragment>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── MarcadaSlim ────────────────────────────────────────────────────────────────

function MarcadaSlim({ marcada, num, prodEntry, talles: tallesProp, allPiezas, allAjustes, allPiezasReq, onDeleteMarcada, onReload }) {
  const [collapsed, setCollapsed] = useState(false)
  const saveTimer = useRef(null)
  const [cfg, setCfg] = useState({
    metros: String(marcada.metros || ''), pliegues: String(marcada.pliegues || 1),
    total_pliegues: String(marcada.total_pliegues || ''), metros_reales: String(marcada.metros_reales || ''),
    nota: marcada.nota || '',
  })
  useEffect(() => {
    setCfg({ metros: String(marcada.metros || ''), pliegues: String(marcada.pliegues || 1),
      total_pliegues: String(marcada.total_pliegues || ''), metros_reales: String(marcada.metros_reales || ''),
      nota: marcada.nota || '' })
  }, [marcada.metros, marcada.pliegues, marcada.total_pliegues, marcada.metros_reales, marcada.nota])

  function onCfgChange(k, v) {
    const next = { ...cfg, [k]: v }; setCfg(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await supabase.from('marcadas_sim').update({
        metros: parseFloat(next.metros)||0, pliegues: parseFloat(next.pliegues)||1,
        total_pliegues: parseFloat(next.total_pliegues)||0,
        metros_reales: parseFloat(next.metros_reales)||null, nota: next.nota.trim()||null,
      }).eq('id', marcada.id); onReload()
    }, 700)
  }

  const prod       = prodEntry.productos
  const tabla      = prod?.tabla || 'adulto'
  const tablaExtra = prodEntry.tabla_extra || ''
  const talles     = tallesProp || [...(TABLAS_TALLES[tabla]||TABLAS_TALLES.adulto), ...(tablaExtra ? TABLAS_TALLES[tablaExtra]||[] : [])]
  const pares      = (parseFloat(cfg.total_pliegues)||0) / (parseFloat(cfg.pliegues)||1)
  const metrosT    = (parseFloat(cfg.metros)||0) * (parseFloat(cfg.total_pliegues)||0)
  const piezas     = allPiezas.filter(p => p.marcada_id === marcada.id && p.producto_id === prodEntry.producto_id)
  const ajustes    = allAjustes.filter(a => a.marcada_id === marcada.id && a.producto_id === prodEntry.producto_id)
  const piezasReq  = allPiezasReq.filter(p => p.marcada_id === marcada.id && p.producto_id === prodEntry.producto_id)
  const catalogPiezas = prod?.piezas || []

  return (
    <div style={{ border:'1px solid #d8d8d0', marginBottom:6, background:'#fafafa' }}>
      <div style={S.marcHead}>
        <span style={{ fontWeight:700, cursor:'pointer', color:'#333' }} onClick={() => setCollapsed(c => !c)}>
          {collapsed ? '▶' : '▼'} Marcada {num}
        </span>
        <span style={{ color:'#555', fontSize:11 }}>
          {cfg.metros||'0'}m · {cfg.pliegues||1}pp/par · {cfg.total_pliegues||0} total
          {' = '}<b style={{ color:'#1a3a6b' }}>{isNaN(pares)||!isFinite(pares) ? '—' : fmtN(pares,1)} pares</b>
          {' · '}<b>{fmtN(metrosT)}m</b>
          {cfg.metros_reales && <> · <b style={{ color:'#1a6a1a' }}>{cfg.metros_reales}m reales</b></>}
        </span>
        <button style={S.btnD} onClick={() => onDeleteMarcada(marcada.id)}>✕</button>
      </div>
      {!collapsed && (
        <div style={{ padding:'8px' }}>
          <div style={{ display:'flex', gap:10, alignItems:'flex-end', padding:'6px 8px', background:'#f4f8fc', border:'1px solid #c8d8e8', marginBottom:8, flexWrap:'wrap' }}>
            {[['METROS','metros',70,0.01],['PLIEGUES/PAR','pliegues',60,1],['TOTAL PLIEGUES','total_pliegues',60,1]].map(([label,k,w,step]) => (
              <div key={k}>
                <span style={S.lbl}>{label}</span>
                <input style={{ ...S.inp, width:w }} type="number" step={step} value={cfg[k]} onChange={e => onCfgChange(k, e.target.value)} />
              </div>
            ))}
            <div><span style={S.lbl}>PARES</span><div style={{ fontSize:13, fontWeight:700, color:'#1a3a6b', paddingBottom:2 }}>{isNaN(pares)||!isFinite(pares)?'—':fmtN(pares,1)}</div></div>
            <div><span style={S.lbl}>METROS CALC.</span><div style={{ fontSize:13, fontWeight:700, color:'#1a3a6b', paddingBottom:2 }}>{fmtN(metrosT)} m</div></div>
            <div>
              <span style={{ ...S.lbl, color:'#1a6a1a' }}>METROS REALES 🖥</span>
              <input style={{ ...S.inp, ...S.inpR, width:70 }} type="number" step={0.01} value={cfg.metros_reales} onChange={e => onCfgChange('metros_reales', e.target.value)} placeholder="del programa" />
            </div>
            <div style={{ flex:1, minWidth:100 }}>
              <span style={S.lbl}>NOTA</span>
              <input style={{ ...S.inp, width:'100%' }} value={cfg.nota} onChange={e => onCfgChange('nota', e.target.value)} placeholder="opcional" />
            </div>
          </div>
          <TablaPorPar
            marcadaId={marcada.id} productoId={prodEntry.producto_id}
            talles={talles} piezas={piezas} pares={pares} ajustes={ajustes}
            onReload={onReload} catalogPiezas={catalogPiezas} piezasReq={piezasReq}
          />
          <ModificacionesSection
            marcadaId={marcada.id} productoId={prodEntry.producto_id}
            piezas={piezas} talles={talles} ajustes={allAjustes}
            catalogPiezas={catalogPiezas} onReload={onReload}
          />
        </div>
      )}
    </div>
  )
}

// ── TelaSubSection ─────────────────────────────────────────────────────────────

function TelaSubSection({ tela, items, prod, talles, allPiezas, allAjustes, allPiezasReq, onDeleteMarcada, onReload, sessionId, productoId }) {
  const [adding, setAdding] = useState(false)
  const rol        = items[0]?.marcada.rol || ''
  const label      = rol ? (ROL_LABELS[rol]||rol) : tela ? telaLabel(tela) : 'Tela 1'
  const firstMarcada = items[0]?.marcada

  async function setRol(val) {
    for (const { marcada } of items) {
      await supabase.from('marcadas_sim').update({ rol: val||null }).eq('id', marcada.id)
    }
    onReload()
  }

  async function addMarcada() {
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: nm, error } = await supabase.from('marcadas_sim').insert({
      session_id: sessionId, tela_id: tela?.id||null,
      fecha: firstMarcada?.fecha || today(),
      metros: 0, pliegues: 1, total_pliegues: 0,
      rol: rol||null, user_id: user?.id,
    }).select().single()
    if (!error && nm) {
      const tablaExtra = items.find(i => i.prodEntry.tabla_extra)?.prodEntry.tabla_extra || null
      await supabase.from('marcadas_sim_productos').insert({ marcada_id: nm.id, producto_id: productoId, tabla_extra: tablaExtra })
    }
    setAdding(false); onReload()
  }

  const firstProdEntry = items[0]?.prodEntry

  return (
    <div style={{ ...S.secWrap, margin:'4px 0', border:'1px solid #b0bcd8' }}>
      <div style={{ ...S.telaHead, background:'linear-gradient(to bottom,#eef0f8,#dde2f0)' }}>
        <span style={{ flex:1, fontWeight:700, color:'#1a3a6b' }}>🧵 {label}
          {tela && rol && <span style={{ fontWeight:400, color:'#777', marginLeft:6, fontSize:10 }}>({telaLabel(tela)})</span>}
          <span style={{ fontWeight:400, color:'#666', marginLeft:8, fontSize:10 }}>
            {items.length} marcada{items.length!==1?'s':''}
          </span>
        </span>
        <select style={{ ...S.sel, fontSize:10, marginRight:6 }} value={rol} onClick={e=>e.stopPropagation()} onChange={e=>setRol(e.target.value)}>
          <option value="">— rol —</option>
          {Object.entries(ROL_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
        <button style={S.btnP} onClick={addMarcada} disabled={adding}>{adding?'...':'+ Marcada'}</button>
      </div>
      <div style={{ padding:'6px 8px' }}>
        {firstProdEntry && (
          <PiezasPorPrendaSection
            marcadaId={firstProdEntry.marcada_id||items[0]?.marcada.id} productoId={productoId}
            catalogPiezas={prod?.piezas||[]} piezasReq={allPiezasReq}
            onReload={onReload}
          />
        )}
        {items.map(({ marcada, prodEntry }, i) => (
          <MarcadaSlim key={marcada.id} marcada={marcada} num={i+1} prodEntry={prodEntry} talles={talles}
            allPiezas={allPiezas} allAjustes={allAjustes} allPiezasReq={allPiezasReq}
            onDeleteMarcada={onDeleteMarcada} onReload={onReload}
          />
        ))}
      </div>
    </div>
  )
}

// ── ProductoSection ────────────────────────────────────────────────────────────

function ProductoSection({ prod, entries, allPiezas, allAjustes, allPiezasReq, allPedido, onDeleteMarcada, onReload, sessionId }) {
  const [collapsed, setCollapsed] = useState(false)
  const firstEntry = entries[0]
  const tabla      = prod?.tabla || 'adulto'
  const tablaExtra = entries.find(e => e.prodEntry.tabla_extra)?.prodEntry.tabla_extra || ''
  const talles     = [...(TABLAS_TALLES[tabla]||TABLAS_TALLES.adulto), ...(tablaExtra ? TABLAS_TALLES[tablaExtra]||[] : [])]

  async function setTablaExtra(val) {
    for (const { prodEntry } of entries) {
      await supabase.from('marcadas_sim_productos').update({ tabla_extra: val||null }).eq('id', prodEntry.id)
    }
    onReload()
  }

  const telaMap = {}; const telaList = []
  for (const entry of entries) {
    const tid = entry.marcada.telas?.id || '__none__'
    if (!telaMap[tid]) { telaMap[tid] = { tela: entry.marcada.telas, items: [] }; telaList.push(telaMap[tid]) }
    telaMap[tid].items.push(entry)
  }

  return (
    <div style={{ margin:'4px 6px', border:'2px solid #a0a8c0', background:'#f0f0f8', boxShadow:'1px 1px 0 #b8b8b8', marginBottom:8 }}>
      <div style={{ background:'linear-gradient(to bottom,#e8ecf8,#d8dff0)', padding:'5px 10px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', borderBottom:'1px solid #a0a8c0' }}
        onClick={() => setCollapsed(c => !c)}>
        <span style={{ fontWeight:700, fontSize:12, color:'#1a2a6b' }}>
          {collapsed ? '▶' : '▼'} 📦 {prod?.nombre || '?'}
          <span style={{ marginLeft:6, fontSize:10, color:'#888', fontWeight:400 }}>[{tabla.toUpperCase()}{tablaExtra ? ` + ${tablaExtra.toUpperCase()}` : ''}]</span>
        </span>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ fontSize:10, color:'#666' }}>+ talles:</span>
          <select style={{ ...S.sel, fontSize:10 }} value={tablaExtra} onClick={e=>e.stopPropagation()} onChange={e=>setTablaExtra(e.target.value)}>
            <option value="">—</option>
            {Object.keys(TABLAS_TALLES).filter(k=>k!==tabla).map(k=>(
              <option key={k} value={k}>{k.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>
      {!collapsed && (
        <div style={{ padding:'8px 10px' }}>
          <PedidoSection
            marcadaId={firstEntry.marcada.id} productoId={firstEntry.prodEntry.producto_id}
            talles={talles} pedido={allPedido} onReload={onReload}
          />
          {telaList.map(({ tela, items }) => (
            <TelaSubSection key={tela?.id || '__none__'}
              tela={tela} items={items} prod={prod} talles={talles}
              allPiezas={allPiezas} allAjustes={allAjustes} allPiezasReq={allPiezasReq}
              onDeleteMarcada={onDeleteMarcada} onReload={onReload}
              sessionId={sessionId} productoId={firstEntry.prodEntry.producto_id}
            />
          ))}
          <ResumenCortesSection
            entries={entries} allPiezas={allPiezas} allAjustes={allAjustes}
            allPiezasReq={allPiezasReq} pedido={allPedido} talles={talles}
            productoId={firstEntry.prodEntry.producto_id} marcadaId={firstEntry.marcada.id}
          />
        </div>
      )}
    </div>
  )
}

// ── ResumenMetros ──────────────────────────────────────────────────────────────

function ResumenMetros({ marcadas }) {
  const byTela = {}
  for (const m of marcadas) {
    const key = m.rol ? (ROL_LABELS[m.rol] || m.rol) : m.telas ? telaLabel(m.telas) : 'Tela 1'
    if (!byTela[key]) byTela[key] = { calc: 0, real: 0, hasReal: false }
    byTela[key].calc += calcMetrosTotal(m)
    if (m.metros_reales) { byTela[key].real += parseFloat(m.metros_reales); byTela[key].hasReal = true }
    else byTela[key].real += calcMetrosTotal(m)
  }
  const rows = Object.entries(byTela)
  if (!rows.length) return null
  return (
    <div style={{ margin:'4px 6px', border:'2px solid #3a8a3a', background:'#f0f8f0', boxShadow:'1px 1px 0 #b8b8b8' }}>
      <div style={{ padding:'5px 10px', fontWeight:700, color:'#1a5a1a', fontSize:12, borderBottom:'1px solid #6b9a3a' }}>
        📐 Metros a pedir por tela
      </div>
      <div style={{ padding:'8px 10px' }}>
        <table style={S.tbl}>
          <thead>
            <tr>
              <th style={S.thL}>Tela</th>
              <th style={S.th}>Calculado</th>
              <th style={{ ...S.th, color:'#1a5a1a' }}>Real (programa)</th>
              <th style={{ ...S.th, background:'linear-gradient(to bottom,#dff0c8,#c0e8a0)', color:'#1a5a1a' }}>A PEDIR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([tela, d]) => (
              <tr key={tela}>
                <td style={S.tdL}><strong>{tela}</strong></td>
                <td style={{ ...S.td, textAlign:'right' }}>{fmtN(d.calc)} m</td>
                <td style={{ ...S.td, textAlign:'right', color: d.hasReal ? '#1a5a1a':'#aaa', fontWeight: d.hasReal ? 700:400 }}>
                  {d.hasReal ? `${fmtN(d.real)} m` : '—'}
                </td>
                <td style={{ ...S.td, textAlign:'right', background:'#dff0c8', fontWeight:700, fontSize:13, color:'#1a5a1a' }}>
                  {fmtN(d.hasReal ? d.real : d.calc)} m
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize:10, color:'#555', fontStyle:'italic', marginTop:4 }}>
          Si cargaste metros del programa, se usa ese valor. Si no, se usa el calculado.
        </div>
      </div>
    </div>
  )
}

// ── SinProductosFallback ───────────────────────────────────────────────────────

function SinProductosFallback({ marcadas, sessionId, onReload }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState([])
  const [saving, setSaving] = useState(false)
  const timer = useRef(null)

  function onInput(val) {
    setQ(val)
    if (timer.current) clearTimeout(timer.current)
    if (!val.trim()) { setRes([]); return }
    timer.current = setTimeout(async () => {
      const { data } = await supabase.from('productos').select('id, nombre, tabla').ilike('nombre', `%${val.trim()}%`).limit(8)
      setRes(data || [])
    }, 250)
  }

  async function assignProduct(prod) {
    setSaving(true); setRes([]); setQ(prod.nombre)
    for (const m of marcadas) {
      await supabase.from('marcadas_sim_productos').insert({ marcada_id: m.id, producto_id: prod.id })
    }
    setSaving(false); onReload()
  }

  const telaGroups = []
  const seenTela = {}
  for (const m of marcadas) {
    const tid = m.telas?.id || '__none__'
    if (!seenTela[tid]) { seenTela[tid] = { tela: m.telas, marcadas: [] }; telaGroups.push(seenTela[tid]) }
    seenTela[tid].marcadas.push(m)
  }

  return (
    <div style={{ margin:'4px 6px' }}>
      <div style={{ background:'#fff8e8', border:'2px solid #c8a040', padding:'10px 14px', marginBottom:8 }}>
        <div style={{ fontWeight:700, color:'#7a5000', marginBottom:6, fontSize:12 }}>Asignar producto a la sesión</div>
        <div style={{ position:'relative' }}>
          <input style={{ ...S.inp, width:'100%' }} value={q} onChange={e => onInput(e.target.value)}
            placeholder="Buscar producto..." disabled={saving} />
          <AcList items={res} onPick={assignProduct} label={r => r.nombre} />
        </div>
        {saving && <div style={{ fontSize:10, color:'#7a5000', marginTop:4 }}>Guardando...</div>}
      </div>
      {telaGroups.map(({ tela, marcadas: ms }) => (
        <div key={tela?.id || '__none__'} style={{ border:'1px solid #b0bcd8', marginBottom:6, background:'#f4f6fc' }}>
          <div style={{ padding:'5px 10px', fontWeight:700, color:'#1a3a6b', fontSize:11, borderBottom:'1px solid #b0bcd8' }}>
            🧵 {tela ? telaLabel(tela) : 'Sin tela'} · {ms.length} marcada{ms.length !== 1 ? 's' : ''}
          </div>
          <div style={{ padding:'6px 10px' }}>
            {ms.map((m, i) => (
              <div key={m.id} style={{ fontSize:11, color:'#333', padding:'2px 0', borderBottom:'1px solid #e0e0e0' }}>
                Marcada {i+1} · {m.metros||0}m · {m.total_pliegues||0} pliegues
                {m.nota && <span style={{ color:'#888', marginLeft:6 }}>{m.nota}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── MarcadaSimContent ──────────────────────────────────────────────────────────
// Reusable two-panel: session list (left) + ficha (right).
// Can be embedded inside any page.

export default function MarcadaSimContent({ style }) {
  const [sessions,     setSessions]     = useState([])
  const [selectedSid,  setSelectedSid]  = useState(null)
  const [fichaData,    setFichaData]    = useState(null)
  const [loadingList,  setLoadingList]  = useState(true)
  const [loadingFicha, setLoadingFicha] = useState(false)
  const [modalNew,     setModalNew]     = useState(false)
  const [modalTela,    setModalTela]    = useState(false)
  const [saving,       setSaving]       = useState(false)

  const [nFecha,  setNFecha]  = useState(today)
  const [nNota,   setNNota]   = useState('')
  const [nProvId, setNProvId] = useState(null)
  const [nProvQ,  setNProvQ]  = useState('')
  const [nProvRes,setNProvRes]= useState([])
  const [nTelaId, setNTelaId] = useState(null)
  const [nTelaQ,  setNTelaQ]  = useState('')
  const [nTelaRes,setNTelaRes]= useState([])
  const nProvTimer = useRef(null)
  const nTelaTimer = useRef(null)

  const [aNota,   setANota]   = useState('')
  const [aTelaId, setATelaId] = useState(null)
  const [aTelaQ,  setATelaQ]  = useState('')
  const [aTelaRes,setATelaRes]= useState([])
  const aTelaTimer = useRef(null)

  useEffect(() => { fetchSessions() }, [])

  async function fetchSessions() {
    setLoadingList(true)
    const { data } = await supabase
      .from('marcadas_sim')
      .select(`id, session_id, fecha, created_at, metros, pliegues, total_pliegues, metros_reales, nota, rol,
        telas(id, tipo, color),
        marcadas_sim_productos!marcada_id(id, producto_id, tabla_extra, productos(id, nombre, tabla))`)
      .order('created_at', { ascending:false })
    const bySession = {}
    for (const m of (data || [])) {
      const sid = m.session_id || m.id
      if (!bySession[sid]) bySession[sid] = { session_id:sid, fecha:m.fecha||m.created_at, created_at:m.created_at, marcadas:[] }
      bySession[sid].marcadas.push(m)
    }
    const list = Object.values(bySession).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setSessions(list); setLoadingList(false)
  }

  async function fetchFicha(sid, silent = false) {
    if (!silent) { setLoadingFicha(true); setFichaData(null) }
    let { data:marcadas } = await supabase
      .from('marcadas_sim')
      .select(`id, session_id, fecha, created_at, metros, pliegues, total_pliegues, metros_reales, nota, rol,
        telas(id, tipo, color),
        marcadas_sim_productos!marcada_id(id, producto_id, tabla_extra,
          productos(id, nombre, tabla, cara_uso, piezas))`)
      .eq('session_id', sid).order('created_at')
    if (!marcadas || marcadas.length === 0) {
      const { data:single } = await supabase
        .from('marcadas_sim')
        .select(`id, session_id, fecha, created_at, metros, pliegues, total_pliegues, metros_reales, nota, rol,
          telas(id, tipo, color),
          marcadas_sim_productos!marcada_id(id, producto_id, tabla_extra,
            productos(id, nombre, tabla, cara_uso, piezas))`)
        .eq('id', sid)
      marcadas = single || []
    }
    if (!marcadas.length) { if (!silent) setLoadingFicha(false); return }
    const ids = marcadas.map(m => m.id)
    const [{ data: piezas }, { data: ajustes }, { data: piezasReq }, { data: pedido }] = await Promise.all([
      supabase.from('marcadas_sim_piezas').select('*').in('marcada_id', ids),
      supabase.from('marcadas_sim_ajustes').select('*').in('marcada_id', ids).order('created_at'),
      supabase.from('marcadas_sim_piezas_req').select('*').in('marcada_id', ids),
      supabase.from('marcadas_sim_pedido').select('*').in('marcada_id', ids),
    ])
    setFichaData({ session_id:sid, marcadas, piezas: piezas||[], ajustes: ajustes||[], piezasReq: piezasReq||[], pedido: pedido||[] })
    if (!silent) setLoadingFicha(false)
  }

  function selectSession(sid) { setSelectedSid(sid); fetchFicha(sid) }
  async function reloadFicha(withSessions = false) {
    if (!selectedSid) return
    await fetchFicha(selectedSid, true)
    if (withSessions) await fetchSessions()
  }

  async function createSession() {
    setSaving(true)
    const sid = crypto.randomUUID()
    const { data:{ user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('marcadas_sim')
      .insert({ session_id:sid, tela_id:nTelaId||null, fecha:nFecha, metros:0, pliegues:1, total_pliegues:0, nota:nNota.trim()||null, user_id:user?.id })
    if (error) { alert('Error: '+error.message); setSaving(false); return }
    setSaving(false); setModalNew(false); resetNew()
    await fetchSessions(); selectSession(sid)
  }

  function resetNew() {
    setNFecha(today()); setNNota('')
    setNProvId(null); setNProvQ(''); setNProvRes([])
    setNTelaId(null); setNTelaQ(''); setNTelaRes([])
  }

  async function addTelaToSession() {
    setSaving(true)
    const { data:{ user } } = await supabase.auth.getUser()
    const refFecha = fichaData?.marcadas?.[0]?.fecha || today()
    const { error } = await supabase.from('marcadas_sim')
      .insert({ session_id:selectedSid, tela_id:aTelaId||null, fecha:refFecha, metros:0, pliegues:1, total_pliegues:0, nota:aNota.trim()||null, user_id:user?.id })
    if (error) { alert('Error: '+error.message); setSaving(false); return }
    setSaving(false); setModalTela(false)
    setANota(''); setATelaId(null); setATelaQ(''); setATelaRes([])
    reloadFicha(true)
  }

  async function deleteMarcada(mid) {
    if (!window.confirm('¿Eliminar esta marcada y todos sus datos?')) return
    await supabase.from('marcadas_sim_piezas').delete().eq('marcada_id', mid)
    await supabase.from('marcadas_sim_ajustes').delete().eq('marcada_id', mid)
    await supabase.from('marcadas_sim_piezas_req').delete().eq('marcada_id', mid)
    await supabase.from('marcadas_sim_pedido').delete().eq('marcada_id', mid)
    await supabase.from('marcadas_sim_productos').delete().eq('marcada_id', mid)
    await supabase.from('marcadas_sim').delete().eq('id', mid)
    reloadFicha(true)
  }

  function onNProvInput(val) {
    setNProvQ(val); setNProvId(null)
    if (nProvTimer.current) clearTimeout(nProvTimer.current)
    if (!val.trim()) { setNProvRes([]); return }
    nProvTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('proveedores').select('id, nombre').ilike('nombre', `%${val.trim()}%`).limit(6)
      setNProvRes(data || [])
    }, 250)
  }
  function onNTelaInput(val) {
    setNTelaQ(val); setNTelaId(null)
    if (nTelaTimer.current) clearTimeout(nTelaTimer.current)
    if (!val.trim()) { setNTelaRes([]); return }
    nTelaTimer.current = setTimeout(async () => {
      let q = supabase.from('telas').select('id, tipo, color, proveedor_id').or(`tipo.ilike.%${val.trim()}%,color.ilike.%${val.trim()}%`)
      if (nProvId) q = q.eq('proveedor_id', nProvId)
      const { data } = await q.limit(8)
      setNTelaRes(data || [])
    }, 250)
  }
  function onATelaInput(val) {
    setATelaQ(val); setATelaId(null)
    if (aTelaTimer.current) clearTimeout(aTelaTimer.current)
    if (!val.trim()) { setATelaRes([]); return }
    aTelaTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('telas').select('id, tipo, color').or(`tipo.ilike.%${val.trim()}%,color.ilike.%${val.trim()}%`).limit(8)
      setATelaRes(data || [])
    }, 250)
  }

  const productGroups = []
  if (fichaData) {
    const seenProd = {}
    for (const m of fichaData.marcadas) {
      for (const pe of (m.marcadas_sim_productos || [])) {
        const pid = pe.producto_id
        if (!seenProd[pid]) { seenProd[pid] = { prod: pe.productos, entries: [] }; productGroups.push(seenProd[pid]) }
        seenProd[pid].entries.push({ marcada: m, prodEntry: pe })
      }
    }
  }

  function sessLabel(s) {
    const telas = [...new Set(s.marcadas.map(m => m.telas ? telaLabel(m.telas) : null).filter(Boolean))]
    const prods = [...new Set(s.marcadas.flatMap(m => (m.marcadas_sim_productos||[]).map(p => p.productos?.nombre)).filter(Boolean))]
    return {
      fecha: fmtF(s.fecha || s.created_at),
      telas: telas.slice(0,2).join(', ') + (telas.length > 2 ? '…' : ''),
      prods: prods.slice(0,2).join(', ') + (prods.length > 2 ? '…' : ''),
    }
  }

  return (
    <div style={{ display:'flex', flex:1, overflow:'hidden', fontFamily:F, fontSize:11, color:'#000', ...style }}>
      {/* Session list */}
      <div style={S.left}>
        <div style={{ ...S.leftHead, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>Sesiones</span>
          <button style={{ ...S.btnP, padding:'1px 7px', fontSize:10 }} onClick={() => { resetNew(); setModalNew(true) }}>+</button>
        </div>
        <div style={S.leftBody}>
          {loadingList ? (
            <div style={{ padding:8, color:'#666' }}>Cargando...</div>
          ) : sessions.length === 0 ? (
            <div style={{ padding:8, color:'#666' }}>Sin sesiones.</div>
          ) : sessions.map(s => {
            const { fecha, telas, prods } = sessLabel(s)
            const active = s.session_id === selectedSid
            return (
              <div key={s.session_id} style={S.sessItem(active)} onClick={() => selectSession(s.session_id)}>
                <div style={{ fontWeight:700 }}>{fecha}</div>
                {telas && <div style={{ fontSize:10, color:'#444', marginTop:1 }}>🧵 {telas}</div>}
                {prods && <div style={{ fontSize:10, color:'#444' }}>📦 {prods}</div>}
                <div style={{ fontSize:10, color:'#888' }}>{s.marcadas.length} marcada{s.marcadas.length !== 1 ? 's' : ''}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Ficha content */}
      <div style={S.right}>
        {!selectedSid ? (
          <div style={{ padding:40, textAlign:'center', color:'#666' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📐</div>
            <div style={{ fontWeight:700, fontSize:13 }}>Seleccioná una sesión</div>
            <div style={{ fontSize:11, marginTop:4 }}>o creá una nueva con el botón +</div>
          </div>
        ) : loadingFicha ? (
          <div style={{ padding:20, color:'#666' }}>Cargando...</div>
        ) : fichaData ? (
          <>
            <div style={S.fichaHead}>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'#5a3a00', fontFamily:'Trebuchet MS, Tahoma' }}>
                  📐 Sesión {fmtF(fichaData.marcadas?.[0]?.fecha)}
                </div>
                <div style={{ fontSize:10, color:'#6a4a10', marginTop:2 }}>
                  {fichaData.marcadas?.length} marcada{fichaData.marcadas?.length !== 1 ? 's' : ''} · {productGroups.length} producto{productGroups.length !== 1 ? 's' : ''}
                </div>
              </div>
              <button style={S.btn} onClick={() => setModalTela(true)}>+ tela</button>
            </div>
            <ResumenMetros marcadas={fichaData.marcadas} />
            {productGroups.length === 0 ? (
              <SinProductosFallback marcadas={fichaData.marcadas} sessionId={fichaData.session_id} onReload={reloadFicha} />
            ) : productGroups.map(pg => (
              <ProductoSection key={pg.prod?.id || 'noprod'}
                prod={pg.prod} entries={pg.entries}
                allPiezas={fichaData.piezas} allAjustes={fichaData.ajustes}
                allPiezasReq={fichaData.piezasReq} allPedido={fichaData.pedido}
                onDeleteMarcada={deleteMarcada} onReload={reloadFicha}
                sessionId={fichaData.session_id}
              />
            ))}
            <div style={{ height:16 }} />
          </>
        ) : (
          <div style={{ padding:20, color:'#a00000' }}>Error cargando sesión</div>
        )}
      </div>

      {/* Modal: Nueva sesión */}
      {modalNew && (
        <div style={S.overlay} onClick={() => setModalNew(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalH}>
              <span>📐 Nueva sesión de marcada</span>
              <button style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', fontSize:14, fontFamily:F }} onClick={() => setModalNew(false)}>✕</button>
            </div>
            <div style={S.modalB}>
              <div style={{ marginBottom:10 }}>
                <span style={S.lbl}>Fecha</span>
                <input style={S.inp} type="date" value={nFecha} onChange={e => setNFecha(e.target.value)} />
              </div>
              <div style={{ position:'relative', marginBottom:10 }}>
                <span style={S.lbl}>Proveedor <span style={{ fontWeight:400, color:'#666' }}>(filtra telas)</span></span>
                <input style={{ ...S.inp, width:'100%' }} value={nProvQ} onChange={e => onNProvInput(e.target.value)} placeholder="Buscar proveedor..." />
                {nProvId && <span style={{ fontSize:10, color:'#2a6a2a' }}>✓ {nProvQ}</span>}
                <AcList items={nProvRes} onPick={r => { setNProvId(r.id); setNProvQ(r.nombre); setNProvRes([]); setNTelaQ(''); setNTelaId(null) }} label={r => r.nombre} />
              </div>
              <div style={{ position:'relative', marginBottom:10 }}>
                <span style={S.lbl}>Tela</span>
                <input style={{ ...S.inp, width:'100%' }} value={nTelaQ} onChange={e => onNTelaInput(e.target.value)} placeholder={nProvId ? `Telas de ${nProvQ}...` : 'Buscar tela...'} />
                {nTelaId && <span style={{ fontSize:10, color:'#2a6a2a' }}>✓ {nTelaQ}</span>}
                <AcList items={nTelaRes} onPick={r => { setNTelaId(r.id); setNTelaQ(telaLabel(r)); setNTelaRes([]) }} label={telaLabel} />
              </div>
              <div>
                <span style={S.lbl}>Nota</span>
                <input style={{ ...S.inp, width:'100%' }} value={nNota} onChange={e => setNNota(e.target.value)} placeholder="opcional" />
              </div>
            </div>
            <div style={S.modalF}>
              <button style={S.btn} onClick={() => setModalNew(false)}>Cancelar</button>
              <button style={S.btnP} onClick={createSession} disabled={saving}>{saving ? 'Creando…' : '📐 Crear sesión'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar tela */}
      {modalTela && (
        <div style={S.overlay} onClick={() => setModalTela(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalH}>
              <span>🧵 Agregar tela a sesión</span>
              <button style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', fontSize:14, fontFamily:F }} onClick={() => setModalTela(false)}>✕</button>
            </div>
            <div style={S.modalB}>
              <div style={{ position:'relative', marginBottom:10 }}>
                <span style={S.lbl}>Tela</span>
                <input style={{ ...S.inp, width:'100%' }} value={aTelaQ} onChange={e => onATelaInput(e.target.value)} placeholder="Buscar tela..." />
                {aTelaId && <span style={{ fontSize:10, color:'#2a6a2a' }}>✓ {aTelaQ}</span>}
                <AcList items={aTelaRes} onPick={r => { setATelaId(r.id); setATelaQ(telaLabel(r)); setATelaRes([]) }} label={telaLabel} />
              </div>
              <div>
                <span style={S.lbl}>Nota</span>
                <input style={{ ...S.inp, width:'100%' }} value={aNota} onChange={e => setANota(e.target.value)} placeholder="opcional" />
              </div>
            </div>
            <div style={S.modalF}>
              <button style={S.btn} onClick={() => setModalTela(false)}>Cancelar</button>
              <button style={S.btnP} onClick={addTelaToSession} disabled={saving}>{saving ? 'Agregando…' : '+ Agregar tela'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
