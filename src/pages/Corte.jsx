import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────

const TABLAS_TALLES = {
  adulto:   ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  nino:     ['2', '4', '6', '8', '10', '12', '14', '16'],
  malla:    ['40', '42', '44', '46', '48', '50', '52'],
  mallaesp: ['54', '56', '58'],
}

// Etiquetas de rol de tela para el selector
const ROL_LABELS = { tela1: 'Tela 1', tela2: 'Tela 2', tela3: 'Tela 3', rib: 'RIB' }

const F = 'Tahoma, Arial, sans-serif'

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  wrap:  { display:'flex', flexDirection:'column', height:'100vh', fontFamily:F, fontSize:11, color:'#000', background:'#d4d0c8' },
  tbar:  { background:'linear-gradient(to bottom,#e8eef7,#c8d4e8)', borderBottom:'2px solid #808080', padding:'4px 8px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  body:  { display:'flex', flex:1, overflow:'hidden' },

  left:      { width:200, minWidth:200, background:'#d4d0c8', borderRight:'2px solid #808080', display:'flex', flexDirection:'column', overflow:'hidden' },
  leftHead:  { background:'linear-gradient(to bottom,#e8eef7,#c8d4e8)', padding:'4px 8px', fontWeight:700, borderBottom:'1px solid #808080' },
  leftBody:  { flex:1, overflowY:'auto' },
  sessItem:  (a) => ({ padding:'5px 8px', cursor:'pointer', borderBottom:'1px solid #c0c0b8', background: a ? '#ffffcc':'transparent', fontWeight: a ? 700:400 }),

  right:     { flex:1, overflowY:'auto', background:'#c8c8c0' },

  fichaHead: { background:'linear-gradient(to bottom,#fff5d4,#f4e8a0)', borderBottom:'2px solid #808080', padding:'6px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' },

  secWrap:   { margin:'4px 6px', border:'1px solid #808080', background:'#d4d0c8' },
  telaHead:  { background:'linear-gradient(to bottom,#f0f4fc,#e0e8f4)', padding:'3px 8px', fontWeight:700, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #808080', userSelect:'none' },
  marcHead:  { background:'linear-gradient(to bottom,#f4f4ec,#eaeae0)', padding:'3px 8px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', borderBottom:'1px solid #c0c0b0' },
  prodHead:  { background:'#e0e0d8', padding:'2px 8px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #c0c0b0', fontWeight:700 },
  secBody:   { padding:'6px 8px' },

  tbl:  { borderCollapse:'collapse', fontSize:11 },
  th:   { background:'linear-gradient(to bottom,#e0e8f4,#d0d8ec)', border:'1px solid #808080', padding:'2px 5px', fontWeight:700, textAlign:'center', whiteSpace:'nowrap' },
  thL:  { background:'linear-gradient(to bottom,#e0e8f4,#d0d8ec)', border:'1px solid #808080', padding:'2px 6px', fontWeight:700, textAlign:'left', whiteSpace:'nowrap' },
  td:   { border:'1px solid #b0b0a0', padding:'1px 4px', textAlign:'center' },
  tdL:  { border:'1px solid #b0b0a0', padding:'1px 6px', textAlign:'left' },
  tdC:  { border:'1px solid #b0b0a0', padding:'1px 4px', textAlign:'center', background:'#e8f4e8', color:'#2a6a2a' },
  tdT:  { border:'1px solid #808080', padding:'1px 4px', textAlign:'center', background:'#d0e8d0', fontWeight:700, color:'#1a5a1a' },
  tdP:  { border:'1px solid #808080', padding:'1px 4px', textAlign:'center', background:'#fffad4', fontWeight:700, color:'#806010' },
  tdPz: { border:'1px solid #b0b0a0', padding:'1px 6px', textAlign:'left', fontWeight:700, background:'#eaeae0' },

  btn:  { fontFamily:F, fontSize:11, padding:'2px 8px', cursor:'pointer', border:'1px solid #808080', background:'linear-gradient(to bottom,#f0f0e8,#d8d8d0)', color:'#000' },
  btnP: { fontFamily:F, fontSize:11, padding:'2px 10px', cursor:'pointer', border:'1px solid #0040a0', background:'linear-gradient(to bottom,#4080c0,#2060a0)', color:'#fff', fontWeight:700 },
  btnD: { fontFamily:F, fontSize:11, padding:'1px 5px', cursor:'pointer', border:'1px solid #a00000', background:'linear-gradient(to bottom,#e06060,#c04040)', color:'#fff' },
  btnS: { fontFamily:F, fontSize:10, padding:'1px 6px', cursor:'pointer', border:'1px solid #808080', background:'linear-gradient(to bottom,#f0f0e8,#d8d8d0)', color:'#000' },
  btnRol: (active) => ({ fontFamily:F, fontSize:11, padding:'3px 10px', cursor:'pointer',
    border: active ? '2px solid #404000' : '1px solid #808080',
    background: active ? '#ffffcc' : 'linear-gradient(to bottom,#f0f0e8,#d8d8d0)',
    fontWeight: active ? 700 : 400, color:'#000' }),

  inp:  { fontFamily:F, fontSize:11, border:'1px solid #808080', padding:'2px 4px', background:'#fff', color:'#000', boxSizing:'border-box' },
  sel:  { fontFamily:F, fontSize:11, border:'1px solid #808080', padding:'2px 2px', background:'#fff', color:'#000' },
  lbl:  { fontWeight:700, whiteSpace:'nowrap', fontSize:11 },
  inpC: { width:38, fontFamily:F, fontSize:11, border:'1px solid #888', padding:'1px 2px', textAlign:'center', background:'#fff' },

  chipOk:  { fontSize:10, background:'#dff0c8', color:'#4a7a1a', border:'1px solid #90b860', padding:'1px 6px', fontWeight:700 },
  chipW:   { fontSize:10, background:'#fff3c8', color:'#907020', border:'1px solid #c8a040', padding:'1px 6px', fontWeight:700 },
  chipPed: { fontSize:10, background:'#d4e8ff', color:'#204080', border:'1px solid #6090d0', padding:'1px 6px', fontWeight:700, display:'inline-flex', alignItems:'center', gap:3 },
  chipTela:{ fontSize:10, background:'#e8f4e8', color:'#1a5a1a', border:'1px solid #70b070', padding:'1px 6px', fontWeight:700 },

  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' },
  modal:   { background:'#d4d0c8', border:'2px solid #808080', minWidth:380, maxWidth:480, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'4px 4px 10px rgba(0,0,0,.4)', fontFamily:F, fontSize:11 },
  modalH:  { background:'linear-gradient(to right,#0058d4,#003fa0)', color:'#fff', padding:'4px 10px', fontWeight:700, display:'flex', justifyContent:'space-between', alignItems:'center' },
  modalB:  { padding:12, overflowY:'auto', flex:1 },
  modalF:  { padding:'8px 12px', borderTop:'1px solid #808080', display:'flex', justifyContent:'flex-end', gap:8 },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtF = s => {
  if (!s) return '—'
  const d = new Date(s.includes('T') ? s : s + 'T00:00:00')
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
const fmtN = (n, d=2) => (n != null && !isNaN(n)) ? Number(n).toFixed(d) : '—'
const today = () => new Date().toISOString().split('T')[0]

function calcPares(m) {
  const tp = parseFloat(m.total_pliegues) || 0
  const pp = parseFloat(m.pliegues) || 1
  return pp > 0 ? tp / pp : 0
}
function calcMetrosTotal(m) {
  return (parseFloat(m.metros) || 0) * (parseFloat(m.pliegues) || 1)
}
function buildResult(piezas, pares, ajustes) {
  const r = {}
  for (const p of piezas) {
    if (!r[p.pieza]) r[p.pieza] = {}
    r[p.pieza][p.talle] = (parseFloat(p.por_par) || 0) * pares
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
function calcPrendas(result, talles) {
  const out = {}
  for (const t of talles) {
    const vals = Object.values(result).map(row => row[t] ?? 0)
    out[t] = vals.length ? Math.min(...vals) : 0
  }
  return out
}

const telaLabel = r => `${r.tipo}${r.color ? ` · ${r.color}` : ''}`

// ── AcList ────────────────────────────────────────────────────────────────────

function AcList({ items, onPick, label }) {
  if (!items.length) return null
  return (
    <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:200, background:'#fff', border:'1px solid #808080', maxHeight:180, overflowY:'auto', boxShadow:'2px 2px 4px rgba(0,0,0,.3)' }}>
      {items.map((r, i) => (
        <div key={r.id ?? i}
          style={{ padding:'3px 8px', cursor:'pointer', borderBottom:'1px solid #e0e0e0', fontFamily:F, fontSize:11 }}
          onMouseEnter={e => e.currentTarget.style.background='#ffffcc'}
          onMouseLeave={e => e.currentTarget.style.background=''}
          onClick={() => onPick(r)}
        >{label(r)}</div>
      ))}
    </div>
  )
}

// ── TablaPorPar ───────────────────────────────────────────────────────────────
// catalogPiezas: array de { nombre, mult, tela_rol } del producto, ya filtradas por rol

function TablaPorPar({ marcadaId, productoId, talles, piezas, pares, ajustes, onReload, catalogPiezas }) {
  const [editing, setEditing] = useState(null)
  const [cellVal, setCellVal] = useState('')
  const [newPieza, setNewPieza] = useState('')
  const [addingCustom, setAddingCustom] = useState(false)

  const map = {}
  for (const p of piezas) {
    if (!map[p.pieza]) map[p.pieza] = {}
    map[p.pieza][p.talle] = parseFloat(p.por_par) || 0
  }
  const piezaNames = [...new Set(piezas.map(p => p.pieza))]
  const result = buildResult(piezas, pares, ajustes)

  // Piezas del catálogo que todavía no están en la tabla
  const addedNames = new Set(piezaNames)
  const availableCatalog = (catalogPiezas || []).filter(p => !addedNames.has(p.nombre))

  async function saveCell(pieza, talle, val) {
    const v = parseFloat(val) || 0
    const ex = piezas.find(p => p.pieza === pieza && p.talle === talle)
    if (ex) {
      await supabase.from('cortes_piezas').update({ por_par: v }).eq('id', ex.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('cortes_piezas').insert({ marcada_id: marcadaId, producto_id: productoId, pieza, talle, por_par: v, user_id: user?.id })
    }
    onReload()
  }

  // Agregar pieza desde catálogo: pre-llena con mult como punto de partida
  async function addFromCatalog(cp) {
    const { data: { user } } = await supabase.auth.getUser()
    const rows = talles.map(t => ({
      marcada_id: marcadaId, producto_id: productoId,
      pieza: cp.nombre, talle: t,
      por_par: cp.mult || 1,
      user_id: user?.id
    }))
    await supabase.from('cortes_piezas').insert(rows)
    onReload()
  }

  // Agregar pieza personalizada (nombre libre)
  async function addCustomPieza() {
    if (!newPieza.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const rows = talles.map(t => ({ marcada_id: marcadaId, producto_id: productoId, pieza: newPieza.trim(), talle: t, por_par: 0, user_id: user?.id }))
    await supabase.from('cortes_piezas').insert(rows)
    setNewPieza(''); setAddingCustom(false); onReload()
  }

  async function deletePieza(pieza) {
    if (!window.confirm(`¿Eliminar pieza "${pieza}"?`)) return
    await supabase.from('cortes_piezas').delete().eq('marcada_id', marcadaId).eq('producto_id', productoId).eq('pieza', pieza)
    onReload()
  }

  return (
    <div style={{ overflowX:'auto', marginBottom:6 }}>
      <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>

        {/* Por UN par — editable */}
        <div>
          <div style={{ fontSize:10, color:'#555', marginBottom:2, fontWeight:700 }}>▼ POR UN PAR (editable)</div>
          <table style={S.tbl}>
            <thead><tr>
              <th style={{ ...S.thL, minWidth:90 }}>Pieza</th>
              {talles.map(t => <th key={t} style={S.th}>{t}</th>)}
              <th style={S.th}></th>
            </tr></thead>
            <tbody>
              {piezaNames.map(pieza => (
                <tr key={pieza}>
                  <td style={S.tdPz}>{pieza}</td>
                  {talles.map(talle => {
                    const isEd = editing?.pieza === pieza && editing?.talle === talle
                    const val = map[pieza]?.[talle] ?? 0
                    return (
                      <td key={talle} style={S.td}>
                        {isEd ? (
                          <input style={S.inpC} value={cellVal} autoFocus
                            onChange={e => setCellVal(e.target.value)}
                            onBlur={() => { saveCell(pieza, talle, cellVal); setEditing(null) }}
                            onKeyDown={e => {
                              if (e.key==='Enter')  { saveCell(pieza, talle, cellVal); setEditing(null) }
                              if (e.key==='Escape') setEditing(null)
                            }}
                          />
                        ) : (
                          <span style={{ cursor:'pointer', display:'block', minWidth:28, color: val ? '#000':'#c0c0c0' }}
                            onClick={() => { setEditing({ pieza, talle }); setCellVal(String(val)) }}>
                            {val || '·'}
                          </span>
                        )}
                      </td>
                    )
                  })}
                  <td style={S.td}>
                    <button style={S.btnD} onClick={() => deletePieza(pieza)}>✕</button>
                  </td>
                </tr>
              ))}

              {/* Piezas del catálogo disponibles para agregar */}
              {availableCatalog.length > 0 && (
                <tr>
                  <td colSpan={talles.length + 2} style={{ padding:'4px 6px', background:'#ece9d8', borderTop:'1px solid #c0c0b0' }}>
                    <span style={{ fontSize:10, color:'#666', marginRight:6, fontWeight:700 }}>del catálogo:</span>
                    {availableCatalog.map(cp => (
                      <button key={cp.nombre} style={{ ...S.btnS, marginRight:3, marginBottom:2 }}
                        onClick={() => addFromCatalog(cp)}>
                        + {cp.nombre}{cp.mult > 1 ? ` ×${cp.mult}` : ''}
                      </button>
                    ))}
                  </td>
                </tr>
              )}

              {/* Pieza personalizada */}
              {addingCustom ? (
                <tr>
                  <td style={S.td} colSpan={talles.length + 2}>
                    <input style={{ ...S.inp, width:110 }} placeholder="pieza personalizada" value={newPieza}
                      onChange={e => setNewPieza(e.target.value)} autoFocus
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

        {/* Resultado × pares */}
        {piezaNames.length > 0 && pares > 0 && (
          <div>
            <div style={{ fontSize:10, color:'#2a6a2a', marginBottom:2, fontWeight:700 }}>
              ▼ RESULTADO ({fmtN(pares,1)} pares)
            </div>
            <table style={S.tbl}>
              <thead><tr>
                <th style={{ ...S.thL, minWidth:90 }}>Pieza</th>
                {talles.map(t => <th key={t} style={S.th}>{t}</th>)}
              </tr></thead>
              <tbody>
                {piezaNames.map(pieza => (
                  <tr key={pieza}>
                    <td style={S.tdPz}>{pieza}</td>
                    {talles.map(t => {
                      const v = result[pieza]?.[t]
                      return <td key={t} style={v ? S.tdC : S.td}>{v ? fmtN(v,1) : '·'}</td>
                    })}
                  </tr>
                ))}
                {(() => {
                  const prendas = calcPrendas(result, talles)
                  return (
                    <tr>
                      <td style={{ ...S.tdL, fontWeight:700, background:'#f8f0c8', color:'#806010' }}>🎽 Prendas</td>
                      {talles.map(t => <td key={t} style={S.tdP}>{prendas[t] > 0 ? Math.floor(prendas[t]) : '·'}</td>)}
                    </tr>
                  )
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ModificacionesSection ─────────────────────────────────────────────────────

function ModificacionesSection({ marcadaId, productoId, piezas, talles, ajustes, onReload }) {
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ de_pieza:'', a_pieza:'', de_talle:'', a_talle:'', cantidad:'', nota:'' })
  const [saving, setSaving] = useState(false)
  const upd = (k, v) => setF(x => ({ ...x, [k]: v }))

  const piezaNames = [...new Set(piezas.map(p => p.pieza))]
  const mine = ajustes.filter(a => a.marcada_id === marcadaId && a.producto_id === productoId)

  async function save() {
    if (!f.cantidad) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('cortes_ajustes').insert({
      marcada_id: marcadaId, producto_id: productoId,
      de_pieza: f.de_pieza || null, a_pieza: f.a_pieza || null,
      de_talle: f.de_talle || null, a_talle: f.a_talle || null,
      cantidad: parseFloat(f.cantidad) || 0,
      nota: f.nota.trim() || null,
      user_id: user?.id,
    })
    setSaving(false); setAdding(false)
    setF({ de_pieza:'', a_pieza:'', de_talle:'', a_talle:'', cantidad:'', nota:'' })
    onReload()
  }

  async function del(id) {
    await supabase.from('cortes_ajustes').delete().eq('id', id)
    onReload()
  }

  return (
    <div style={{ marginTop:6 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#555', marginBottom:3 }}>
        MODIFICACIONES {mine.length > 0 && <span style={S.chipW}>{mine.length}</span>}
        <button style={{ ...S.btnS, marginLeft:8 }} onClick={() => setAdding(a => !a)}>{adding ? '✕':'+ mod.'}</button>
      </div>

      {mine.length > 0 && (
        <table style={{ ...S.tbl, marginBottom:4 }}>
          <thead><tr>
            <th style={S.thL}>De pieza</th><th style={S.th}>De talle</th>
            <th style={S.thL}>A pieza</th><th style={S.th}>A talle</th>
            <th style={S.th}>Cant.</th><th style={S.thL}>Nota</th><th style={S.th}></th>
          </tr></thead>
          <tbody>
            {mine.map(a => (
              <tr key={a.id}>
                <td style={S.tdL}>{a.de_pieza||'—'}</td><td style={S.td}>{a.de_talle||'—'}</td>
                <td style={S.tdL}>{a.a_pieza||'—'}</td><td style={S.td}>{a.a_talle||'—'}</td>
                <td style={S.td}>{a.cantidad}</td><td style={S.tdL}>{a.nota||''}</td>
                <td style={S.td}><button style={S.btnD} onClick={() => del(a.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {adding && (
        <div style={{ background:'#e8e8d8', border:'1px solid #a0a090', padding:6, display:'flex', gap:6, flexWrap:'wrap', alignItems:'flex-end' }}>
          {[['de_pieza','De pieza','pieza'],['de_talle','De talle','talle'],['a_pieza','A pieza','pieza'],['a_talle','A talle','talle']].map(([k,label,type]) => (
            <div key={k}>
              <div style={S.lbl}>{label}</div>
              <select style={S.sel} value={f[k]} onChange={e => upd(k, e.target.value)}>
                <option value="">—</option>
                {(type==='pieza' ? piezaNames : talles).map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          ))}
          <div>
            <div style={S.lbl}>Cant.</div>
            <input style={{ ...S.inp, width:50 }} type="number" min="0" step="0.5" value={f.cantidad} onChange={e => upd('cantidad', e.target.value)} placeholder="0" />
          </div>
          <div style={{ flex:1, minWidth:100 }}>
            <div style={S.lbl}>Nota</div>
            <input style={{ ...S.inp, width:'100%' }} value={f.nota} onChange={e => upd('nota', e.target.value)} placeholder="opcional" />
          </div>
          <div style={{ display:'flex', gap:4, alignSelf:'flex-end' }}>
            <button style={S.btnP} onClick={save} disabled={saving}>✔</button>
            <button style={S.btn} onClick={() => setAdding(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ProductoBlock ─────────────────────────────────────────────────────────────

function ProductoBlock({ marcada, prodEntry, allPiezas, allAjustes, onDeleteProd, onReload }) {
  const [collapsed, setCollapsed] = useState(false)
  const prod    = prodEntry.productos
  const tabla   = prod?.tabla || 'adulto'
  const talles  = TABLAS_TALLES[tabla] || TABLAS_TALLES.adulto
  const pares   = calcPares(marcada)
  const piezas  = allPiezas.filter(p => p.marcada_id === marcada.id && p.producto_id === prodEntry.producto_id)
  const ajustes = allAjustes.filter(a => a.marcada_id === marcada.id && a.producto_id === prodEntry.producto_id)

  // Piezas del catálogo del producto, filtradas por el tela_rol elegido al agregar
  const telaRol = prodEntry.tela_rol
  const catalogPiezas = (prod?.piezas || []).filter(p => !telaRol || p.tela_rol === telaRol)

  const rolLabel = telaRol ? (ROL_LABELS[telaRol] || telaRol) : null

  return (
    <div style={{ border:'1px solid #b0b0a0', marginBottom:4, background:'#d4d0c8' }}>
      <div style={S.prodHead}>
        <span style={{ cursor:'pointer' }} onClick={() => setCollapsed(c => !c)}>
          {collapsed ? '▶' : '▼'} 📦 {prod?.nombre || '?'}
          {rolLabel && <span style={{ ...S.chipTela, marginLeft:6 }}>{rolLabel}</span>}
          {prod?.cara_uso && <span style={{ ...S.chipPed, marginLeft:4 }}>Cara: {prod.cara_uso}</span>}
          <span style={{ marginLeft:6, fontSize:10, color:'#666', fontWeight:400 }}>[{tabla.toUpperCase()}]</span>
        </span>
        <button style={S.btnD} onClick={() => onDeleteProd(prodEntry.id)}>✕</button>
      </div>
      {!collapsed && (
        <div style={S.secBody}>
          <TablaPorPar
            marcadaId={marcada.id} productoId={prodEntry.producto_id}
            talles={talles} piezas={piezas} pares={pares} ajustes={ajustes}
            onReload={onReload} catalogPiezas={catalogPiezas}
          />
          <ModificacionesSection
            marcadaId={marcada.id} productoId={prodEntry.producto_id}
            piezas={piezas} talles={talles} ajustes={allAjustes}
            onReload={onReload}
          />
        </div>
      )}
    </div>
  )
}

// ── MarcadaBlock ──────────────────────────────────────────────────────────────

function MarcadaBlock({ marcada, num, allPiezas, allAjustes, onDeleteMarcada, onReload }) {
  const [collapsed, setCollapsed]     = useState(false)
  const [editCfg, setEditCfg]         = useState(false)
  const [cfg, setCfg]                 = useState({ metros: String(marcada.metros||''), pliegues: String(marcada.pliegues||1), total_pliegues: String(marcada.total_pliegues||''), nota: marcada.nota||'' })
  const [addingProd, setAddingProd]   = useState(false)
  const [prodQ, setProdQ]             = useState('')
  const [prodRes, setProdRes]         = useState([])
  // Estado para el selector de rol de tela
  const [pendingProd, setPendingProd] = useState(null)   // producto elegido esperando confirmación de rol
  const [rolOptions, setRolOptions]   = useState([])     // opciones de rol disponibles
  const [chosenRol, setChosenRol]     = useState('')     // rol elegido
  const prodTimer = useRef(null)

  const telaId = marcada.telas?.id
  const pares  = calcPares(marcada)
  const metrosT = calcMetrosTotal(marcada)
  const prods  = marcada.cortes_marcadas_productos || []

  useEffect(() => {
    setCfg({ metros: String(marcada.metros||''), pliegues: String(marcada.pliegues||1), total_pliegues: String(marcada.total_pliegues||''), nota: marcada.nota||'' })
  }, [marcada.metros, marcada.pliegues, marcada.total_pliegues, marcada.nota])

  async function saveCfg() {
    await supabase.from('cortes_marcadas').update({
      metros: parseFloat(cfg.metros)||0, pliegues: parseFloat(cfg.pliegues)||1,
      total_pliegues: parseFloat(cfg.total_pliegues)||0, nota: cfg.nota.trim()||null,
    }).eq('id', marcada.id)
    setEditCfg(false); onReload()
  }

  // Buscar productos — los que usan esta tela aparecen primero
  function onProdInput(val) {
    setProdQ(val)
    if (pendingProd) { setPendingProd(null); setRolOptions([]); setChosenRol('') }
    if (prodTimer.current) clearTimeout(prodTimer.current)
    if (!val.trim()) { setProdRes([]); return }
    prodTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('productos')
        .select('id, nombre, tabla, cara_uso, tela1_id, tela2_id, rib_id, piezas')
        .ilike('nombre', `%${val.trim()}%`)
        .limit(20)

      // Ordenar: primero los que usan esta tela
      const sorted = (data || []).sort((a, b) => {
        const aM = telaId && [a.tela1_id, a.tela2_id, a.rib_id].includes(telaId) ? 1 : 0
        const bM = telaId && [b.tela1_id, b.tela2_id, b.rib_id].includes(telaId) ? 1 : 0
        return bM - aM
      }).slice(0, 10)

      setProdRes(sorted)
    }, 250)
  }

  // Al elegir un producto: determinar si hay que seleccionar el rol de tela
  function pickProd(p) {
    setProdRes([])

    // Roles que tienen piezas definidas en el catálogo
    const piezasArr = p.piezas || []
    const rolesConPiezas = [...new Set(piezasArr.map(x => x.tela_rol).filter(Boolean))]

    // Mapeo rol → tela_id del producto
    const rolTelaMap = {}
    if (p.tela1_id) rolTelaMap.tela1 = p.tela1_id
    if (p.tela2_id) rolTelaMap.tela2 = p.tela2_id
    if (p.rib_id)   rolTelaMap.rib   = p.rib_id

    // Solo roles que tienen piezas Y están mapeados
    const rolesValidos = rolesConPiezas.filter(r => rolTelaMap[r])

    if (rolesValidos.length <= 1) {
      // 0 o 1 opción → confirmar directo
      confirmAddProd(p, rolesValidos[0] || null)
      return
    }

    // Cuáles coinciden con la tela de esta marcada
    const matching = rolesValidos.filter(r => telaId && rolTelaMap[r] === telaId)

    if (matching.length === 1) {
      // Coincidencia única → auto-confirmar
      confirmAddProd(p, matching[0])
      return
    }

    // Más de una opción → mostrar selector
    const opciones = rolesValidos.map(r => ({
      value: r,
      label: ROL_LABELS[r] || r,
      match: telaId && rolTelaMap[r] === telaId,
    }))
    setPendingProd(p)
    setRolOptions(opciones)
    setChosenRol(matching[0] || rolesValidos[0])
    setProdQ(p.nombre)
  }

  async function confirmAddProd(p, tela_rol) {
    const exists = prods.some(x => x.producto_id === p.id)
    if (exists) { alert('Producto ya agregado'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('cortes_marcadas_productos').insert({
      marcada_id: marcada.id, producto_id: p.id,
      tela_rol: tela_rol || null,
      user_id: user?.id
    })
    setProdQ(''); setProdRes([]); setAddingProd(false)
    setPendingProd(null); setRolOptions([]); setChosenRol('')
    onReload()
  }

  async function delProd(id) {
    if (!window.confirm('¿Quitar este producto?')) return
    await supabase.from('cortes_marcadas_productos').delete().eq('id', id)
    onReload()
  }

  function cancelAddProd() {
    setAddingProd(false); setProdQ(''); setProdRes([])
    setPendingProd(null); setRolOptions([]); setChosenRol('')
  }

  const cfgAutoCalc = {
    pares:  fmtN((parseFloat(cfg.total_pliegues)||0) / (parseFloat(cfg.pliegues)||1), 1),
    metros: fmtN((parseFloat(cfg.metros)||0) * (parseFloat(cfg.pliegues)||1)),
  }

  // Etiqueta del producto en el autocomplete — marca con 🧶 los que usan esta tela
  function prodLabel(r) {
    const rols = []
    if (telaId && r.tela1_id === telaId) rols.push(ROL_LABELS.tela1)
    if (telaId && r.tela2_id === telaId) rols.push(ROL_LABELS.tela2)
    if (telaId && r.rib_id   === telaId) rols.push(ROL_LABELS.rib)
    const rolStr = rols.length ? ` ← ${rols.join('/')}` : ''
    return `${rols.length ? '🧶 ' : ''}${r.nombre}${r.cara_uso ? ` · Cara: ${r.cara_uso}` : ''} [${r.tabla}]${rolStr}`
  }

  return (
    <div style={{ border:'1px solid #909088', marginBottom:6, background:'#ccc8c0' }}>
      <div style={{ ...S.marcHead, cursor:'pointer' }} onClick={() => setCollapsed(c => !c)}>
        <span style={{ fontWeight:700 }}>{collapsed ? '▶' : '▼'} Marcada {num}</span>
        <span>
          <b>{fmtN(marcada.metros)}m</b> × <b>{marcada.pliegues}</b>pp/par × <b>{marcada.total_pliegues}</b> total
          {' = '}<b style={{ color:'#1a6a1a' }}>{fmtN(pares,1)} pares</b>
          {' · '}<b>{fmtN(metrosT)}m</b> tela
        </span>
        {marcada.nota && <span style={{ color:'#666', fontStyle:'italic', fontSize:10 }}>{marcada.nota}</span>}
        <div style={{ marginLeft:'auto', display:'flex', gap:4 }} onClick={e => e.stopPropagation()}>
          <button style={S.btnS} onClick={() => setEditCfg(c => !c)}>⚙ config</button>
          <button style={S.btnD} onClick={() => onDeleteMarcada(marcada.id)}>✕</button>
        </div>
      </div>

      {editCfg && (
        <div style={{ padding:'6px 10px', background:'#dcdcd4', borderBottom:'1px solid #a0a090', display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
          {[['metros','Metros',0.01],['pliegues','Pliegues/par',1],['total_pliegues','Total pliegues',1]].map(([k,label,step]) => (
            <div key={k}>
              <div style={S.lbl}>{label}</div>
              <input style={{ ...S.inp, width:60 }} type="number" step={step} value={cfg[k]} onChange={e => setCfg(c => ({ ...c, [k]: e.target.value }))} />
            </div>
          ))}
          <div style={{ flex:1, minWidth:120 }}>
            <div style={S.lbl}>Nota</div>
            <input style={{ ...S.inp, width:'100%' }} value={cfg.nota} onChange={e => setCfg(c => ({ ...c, nota: e.target.value }))} />
          </div>
          <div style={{ display:'flex', gap:4 }}>
            <button style={S.btnP} onClick={saveCfg}>✔ OK</button>
            <button style={S.btn} onClick={() => setEditCfg(false)}>✕</button>
          </div>
          {cfg.metros && cfg.pliegues && cfg.total_pliegues && (
            <div style={{ fontSize:10, color:'#2a6a2a', alignSelf:'center' }}>
              → {cfgAutoCalc.pares} pares · {cfgAutoCalc.metros} m tela
            </div>
          )}
        </div>
      )}

      {!collapsed && (
        <div style={{ padding:'4px 6px' }}>
          {prods.map(pe => (
            <ProductoBlock
              key={pe.id} marcada={marcada} prodEntry={pe}
              allPiezas={allPiezas} allAjustes={allAjustes}
              onDeleteProd={delProd} onReload={onReload}
            />
          ))}

          {/* Agregar producto con selector de rol de tela */}
          {addingProd ? (
            <div style={{ padding:'4px 0' }}>
              <div style={{ position:'relative', display:'flex', gap:6, alignItems:'center' }}>
                <input
                  style={{ ...S.inp, flex:1 }}
                  placeholder="Buscar producto..."
                  value={prodQ}
                  onChange={e => onProdInput(e.target.value)}
                  autoFocus={!pendingProd}
                />
                <button style={S.btn} onClick={cancelAddProd}>✕</button>
                <AcList items={prodRes} onPick={pickProd} label={prodLabel} />
              </div>

              {/* Selector de rol de tela — aparece solo cuando hay ambigüedad */}
              {pendingProd && rolOptions.length > 1 && (
                <div style={{ background:'#eae8d4', border:'1px solid #a0a080', padding:'8px 10px', marginTop:4 }}>
                  <div style={{ fontWeight:700, marginBottom:6 }}>
                    ¿Qué tela es ésta para <em>{pendingProd.nombre}</em>?
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                    {rolOptions.map(opt => (
                      <button key={opt.value}
                        style={S.btnRol(chosenRol === opt.value)}
                        onClick={() => setChosenRol(opt.value)}>
                        {opt.label}
                        {opt.match && <span style={{ marginLeft:4, color:'#1a6a1a', fontSize:10 }}>← esta</span>}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button style={S.btnP} onClick={() => confirmAddProd(pendingProd, chosenRol)}>
                      ✔ Confirmar como {ROL_LABELS[chosenRol] || chosenRol}
                    </button>
                    <button style={S.btn} onClick={cancelAddProd}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button style={{ ...S.btnS, margin:'2px 0' }} onClick={() => setAddingProd(true)}>+ producto</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── TelaSection ───────────────────────────────────────────────────────────────

function TelaSection({ tela, marcadas, allPiezas, allAjustes, onDeleteMarcada, onReload }) {
  const [collapsed, setCollapsed] = useState(false)
  const label  = tela ? telaLabel(tela) : 'Sin tela'
  const totalM = marcadas.reduce((s, m) => s + calcMetrosTotal(m), 0)
  return (
    <div style={S.secWrap}>
      <div style={S.telaHead} onClick={() => setCollapsed(c => !c)}>
        <span>🧶 {label} — {marcadas.length} marcada{marcadas.length !== 1 ? 's' : ''} · {fmtN(totalM)} m</span>
        <span>{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && (
        <div style={{ padding:'4px 6px' }}>
          {marcadas.map((m, i) => (
            <MarcadaBlock key={m.id} marcada={m} num={i+1}
              allPiezas={allPiezas} allAjustes={allAjustes}
              onDeleteMarcada={onDeleteMarcada} onReload={onReload}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── ResultadoGlobal ───────────────────────────────────────────────────────────

function ResultadoGlobal({ marcadas, allPiezas, allAjustes }) {
  const byProd = {}
  for (const m of marcadas) {
    const pares = calcPares(m)
    for (const pe of (m.cortes_marcadas_productos || [])) {
      const prod = pe.productos
      if (!prod) continue
      const talles  = TABLAS_TALLES[prod.tabla] || TABLAS_TALLES.adulto
      const piezas  = allPiezas.filter(p => p.marcada_id === m.id && p.producto_id === pe.producto_id)
      const ajustes = allAjustes.filter(a => a.marcada_id === m.id && a.producto_id === pe.producto_id)
      const result  = buildResult(piezas, pares, ajustes)
      const prendas = calcPrendas(result, talles)
      if (!byProd[prod.id]) byProd[prod.id] = { nombre: prod.nombre, talles, totals: {} }
      for (const t of talles) byProd[prod.id].totals[t] = (byProd[prod.id].totals[t] || 0) + (prendas[t] || 0)
    }
  }
  const prods = Object.values(byProd)
  if (!prods.length) return null
  return (
    <div style={S.secWrap}>
      <div style={{ ...S.telaHead, cursor:'default' }}>🎽 Resultado global</div>
      <div style={{ padding:'6px 8px' }}>
        {prods.map(p => {
          const total = p.talles.reduce((s, t) => s + Math.floor(p.totals[t] || 0), 0)
          return (
            <div key={p.nombre} style={{ marginBottom:8 }}>
              <div style={{ fontWeight:700, marginBottom:3 }}>{p.nombre}</div>
              <table style={S.tbl}>
                <thead><tr>
                  {p.talles.map(t => <th key={t} style={S.th}>{t}</th>)}
                  <th style={S.th}>Total</th>
                </tr></thead>
                <tbody><tr>
                  {p.talles.map(t => <td key={t} style={S.tdT}>{Math.floor(p.totals[t]||0)||'·'}</td>)}
                  <td style={S.tdT}>{total}</td>
                </tr></tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Corte ────────────────────────────────────────────────────────────────

export default function Corte({ onMenuClick }) {
  const [sessions,     setSessions]     = useState([])
  const [selectedSid,  setSelectedSid]  = useState(null)
  const [fichaData,    setFichaData]    = useState(null)
  const [loadingList,  setLoadingList]  = useState(true)
  const [loadingFicha, setLoadingFicha] = useState(false)
  const [modalNew,     setModalNew]     = useState(false)
  const [modalTela,    setModalTela]    = useState(false)
  const [saving,       setSaving]       = useState(false)

  // ── Formulario nueva sesión (Fecha / Proveedor / Tela / Nota) ─────────────
  const [nFecha,  setNFecha]  = useState(today)
  const [nNota,   setNNota]   = useState('')
  // Proveedor (solo filtra la búsqueda de tela, no se guarda por separado)
  const [nProvId, setNProvId] = useState(null)
  const [nProvQ,  setNProvQ]  = useState('')
  const [nProvRes,setNProvRes]= useState([])
  // Tela
  const [nTelaId, setNTelaId] = useState(null)
  const [nTelaQ,  setNTelaQ]  = useState('')
  const [nTelaRes,setNTelaRes]= useState([])
  const nProvTimer = useRef(null)
  const nTelaTimer = useRef(null)

  // ── Formulario agregar tela a sesión existente (Tela / Nota) ──────────────
  const [aNota,   setANota]   = useState('')
  const [aTelaId, setATelaId] = useState(null)
  const [aTelaQ,  setATelaQ]  = useState('')
  const [aTelaRes,setATelaRes]= useState([])
  const aTelaTimer = useRef(null)

  // ── Búsqueda de pedidos para vincular ─────────────────────────────────────
  const [pedQ,   setPedQ]   = useState('')
  const [pedRes, setPedRes] = useState([])
  const pedTimer = useRef(null)

  useEffect(() => { fetchSessions() }, [])

  // ── Data ──────────────────────────────────────────────────────────────────

  async function fetchSessions() {
    setLoadingList(true)
    const { data } = await supabase
      .from('cortes_marcadas')
      .select(`id, session_id, fecha, created_at, metros, pliegues, total_pliegues, nota,
        telas(id, tipo, color),
        cortes_marcadas_productos(id, producto_id, tela_rol, productos(id, nombre, tabla, cara_uso))`)
      .order('created_at', { ascending: false })

    const bySession = {}
    for (const m of (data || [])) {
      const sid = m.session_id || m.id
      if (!bySession[sid]) bySession[sid] = { session_id: sid, fecha: m.fecha || m.created_at, created_at: m.created_at, marcadas: [] }
      bySession[sid].marcadas.push(m)
    }
    const list = Object.values(bySession).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setSessions(list)
    setLoadingList(false)
  }

  async function fetchFicha(sid) {
    setLoadingFicha(true); setFichaData(null)

    let { data: marcadas } = await supabase
      .from('cortes_marcadas')
      .select(`id, session_id, fecha, created_at, metros, pliegues, total_pliegues, nota,
        telas(id, tipo, color),
        cortes_marcadas_productos(id, producto_id, tela_rol,
          productos(id, nombre, tabla, cara_uso, piezas, tela1_id, tela2_id, rib_id))`)
      .eq('session_id', sid)
      .order('created_at')

    // Fallback para registros sin session_id
    if (!marcadas || marcadas.length === 0) {
      const { data: single } = await supabase
        .from('cortes_marcadas')
        .select(`id, session_id, fecha, created_at, metros, pliegues, total_pliegues, nota,
          telas(id, tipo, color),
          cortes_marcadas_productos(id, producto_id, tela_rol,
            productos(id, nombre, tabla, cara_uso, piezas, tela1_id, tela2_id, rib_id))`)
        .eq('id', sid)
      marcadas = single || []
    }

    if (!marcadas.length) { setLoadingFicha(false); return }

    const ids = marcadas.map(m => m.id)
    const [pr, ar, ped] = await Promise.all([
      supabase.from('cortes_piezas').select('*').in('marcada_id', ids),
      supabase.from('cortes_ajustes').select('*').in('marcada_id', ids).order('created_at'),
      supabase.from('cortes_pedidos').select('*, pedidos(id, numero, contactos(nombre))').in('marcada_id', ids),
    ])
    setFichaData({ session_id: sid, marcadas, piezas: pr.data||[], ajustes: ar.data||[], pedidos: ped.data||[] })
    setLoadingFicha(false)
  }

  function selectSession(sid) { setSelectedSid(sid); fetchFicha(sid) }

  async function reloadFicha() {
    if (selectedSid) { await fetchFicha(selectedSid); await fetchSessions() }
  }

  // ── Nueva sesión ──────────────────────────────────────────────────────────

  async function createSession() {
    if (!nTelaId && !window.confirm('No seleccionaste tela. ¿Continuar igual?')) return
    setSaving(true)
    const sid = crypto.randomUUID()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: m, error } = await supabase
      .from('cortes_marcadas')
      .insert({
        session_id: sid,
        tela_id: nTelaId || null,
        fecha: nFecha,
        metros: 0, pliegues: 1, total_pliegues: 0,
        nota: nNota.trim() || null,
        user_id: user?.id
      })
      .select('id').single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setSaving(false); setModalNew(false); resetNew()
    await fetchSessions()
    selectSession(sid)
  }

  function resetNew() {
    setNFecha(today()); setNNota('')
    setNProvId(null); setNProvQ(''); setNProvRes([])
    setNTelaId(null); setNTelaQ(''); setNTelaRes([])
  }

  // ── Agregar tela a sesión existente ───────────────────────────────────────

  async function addTelaToSession() {
    if (!selectedSid) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const refFecha = fichaData?.marcadas?.[0]?.fecha || today()
    const { data: m, error } = await supabase
      .from('cortes_marcadas')
      .insert({
        session_id: selectedSid,
        tela_id: aTelaId || null,
        fecha: refFecha,
        metros: 0, pliegues: 1, total_pliegues: 0,
        nota: aNota.trim() || null,
        user_id: user?.id
      })
      .select('id').single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setSaving(false); setModalTela(false)
    setANota(''); setATelaId(null); setATelaQ(''); setATelaRes([])
    reloadFicha()
  }

  // ── Borrar marcada ────────────────────────────────────────────────────────

  async function deleteMarcada(mid) {
    if (!window.confirm('¿Eliminar esta marcada y todos sus datos?')) return
    await supabase.from('cortes_piezas').delete().eq('marcada_id', mid)
    await supabase.from('cortes_ajustes').delete().eq('marcada_id', mid)
    await supabase.from('cortes_pedidos').delete().eq('marcada_id', mid)
    await supabase.from('cortes_marcadas_productos').delete().eq('marcada_id', mid)
    await supabase.from('cortes_marcadas').delete().eq('id', mid)
    reloadFicha()
  }

  // ── Pedidos ───────────────────────────────────────────────────────────────

  function onPedInput(val) {
    setPedQ(val)
    if (pedTimer.current) clearTimeout(pedTimer.current)
    if (!val.trim()) { setPedRes([]); return }
    pedTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('pedidos')
        .select('id, numero, contactos(nombre)').ilike('numero', `%${val}%`).limit(6)
      setPedRes(data || [])
    }, 300)
  }

  async function linkPedido(p) {
    const mid = fichaData?.marcadas?.[0]?.id
    if (!mid) return
    if (fichaData.pedidos?.some(x => x.pedido_id === p.id)) { alert('Ya vinculado'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('cortes_pedidos').insert({ marcada_id: mid, pedido_id: p.id, user_id: user?.id })
    setPedQ(''); setPedRes([]); reloadFicha()
  }

  async function unlinkPedido(id) {
    await supabase.from('cortes_pedidos').delete().eq('id', id)
    reloadFicha()
  }

  // ── Autocomplete helpers ──────────────────────────────────────────────────

  // Proveedor (nueva sesión)
  function onNProvInput(val) {
    setNProvQ(val); setNProvId(null)
    if (nProvTimer.current) clearTimeout(nProvTimer.current)
    if (!val.trim()) { setNProvRes([]); return }
    nProvTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('proveedores').select('id, nombre').ilike('nombre', `%${val.trim()}%`).limit(6)
      setNProvRes(data || [])
    }, 250)
  }

  // Tela (nueva sesión) — se filtra por proveedor si hay uno seleccionado
  function onNTelaInput(val) {
    setNTelaQ(val); setNTelaId(null)
    if (nTelaTimer.current) clearTimeout(nTelaTimer.current)
    if (!val.trim()) { setNTelaRes([]); return }
    nTelaTimer.current = setTimeout(async () => {
      let q = supabase.from('telas').select('id, tipo, color, proveedor_id')
        .or(`tipo.ilike.%${val.trim()}%,color.ilike.%${val.trim()}%`)
      if (nProvId) q = q.eq('proveedor_id', nProvId)
      const { data } = await q.limit(8)
      setNTelaRes(data || [])
    }, 250)
  }

  // Tela (agregar a sesión existente)
  function onATelaInput(val) {
    setATelaQ(val); setATelaId(null)
    if (aTelaTimer.current) clearTimeout(aTelaTimer.current)
    if (!val.trim()) { setATelaRes([]); return }
    aTelaTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('telas').select('id, tipo, color')
        .or(`tipo.ilike.%${val.trim()}%,color.ilike.%${val.trim()}%`).limit(8)
      setATelaRes(data || [])
    }, 250)
  }

  // ── Group marcadas by tela ────────────────────────────────────────────────

  const telaGroups = []
  if (fichaData) {
    const seen = {}
    for (const m of fichaData.marcadas) {
      const tid = m.telas?.id || '__none__'
      if (!seen[tid]) { seen[tid] = { tela: m.telas, marcadas: [] }; telaGroups.push(seen[tid]) }
      seen[tid].marcadas.push(m)
    }
  }

  // ── Session label for list ────────────────────────────────────────────────

  function sessLabel(s) {
    const telas = [...new Set(s.marcadas.map(m => m.telas ? telaLabel(m.telas) : null).filter(Boolean))]
    const prods = [...new Set(s.marcadas.flatMap(m => (m.cortes_marcadas_productos||[]).map(p => p.productos?.nombre)).filter(Boolean))]
    return {
      fecha: fmtF(s.fecha || s.created_at),
      telas: telas.slice(0,2).join(', ') + (telas.length > 2 ? '…' : ''),
      prods: prods.slice(0,2).join(', ') + (prods.length > 2 ? '…' : ''),
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.tbar}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button style={S.btn} onClick={onMenuClick}>☰</button>
          <span style={{ fontWeight:700, fontSize:13 }}>✂ Corte</span>
        </div>
        <button style={S.btnP} onClick={() => { resetNew(); setModalNew(true) }}>+ Nueva sesión</button>
      </div>

      {/* Body */}
      <div style={S.body}>

        {/* Left panel — lista de sesiones */}
        <div style={S.left}>
          <div style={S.leftHead}>Sesiones</div>
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
                  {telas && <div style={{ fontSize:10, color:'#444', marginTop:1 }}>🧶 {telas}</div>}
                  {prods && <div style={{ fontSize:10, color:'#444' }}>📦 {prods}</div>}
                  <div style={{ fontSize:10, color:'#888' }}>{s.marcadas.length} marcada{s.marcadas.length !== 1 ? 's' : ''}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel — ficha de sesión */}
        <div style={S.right}>
          {!selectedSid ? (
            <div style={{ padding:40, textAlign:'center', color:'#666' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>✂</div>
              <div style={{ fontWeight:700, fontSize:13 }}>Seleccioná una sesión</div>
              <div style={{ fontSize:11, marginTop:4 }}>o creá una nueva</div>
            </div>
          ) : loadingFicha ? (
            <div style={{ padding:20, color:'#666' }}>Cargando...</div>
          ) : fichaData ? (
            <>
              {/* Header de la ficha */}
              <div style={S.fichaHead}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13 }}>✂ Sesión {fmtF(fichaData.marcadas?.[0]?.fecha)}</div>
                  <div style={{ fontSize:10, color:'#666', marginTop:2 }}>
                    {fichaData.marcadas?.length} marcada{fichaData.marcadas?.length !== 1 ? 's' : ''} · {telaGroups.length} tela{telaGroups.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button style={S.btn} onClick={() => setModalTela(true)}>+ tela</button>
              </div>

              {/* Pedidos vinculados */}
              <div style={{ ...S.secWrap, padding:'5px 8px', display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
                <span style={{ fontWeight:700, fontSize:10 }}>PEDIDOS:</span>
                {!fichaData.pedidos?.length && <span style={{ color:'#888', fontSize:10 }}>sin vincular</span>}
                {fichaData.pedidos?.map(p => (
                  <span key={p.id} style={S.chipPed}>
                    #{p.pedidos?.numero}{p.pedidos?.contactos?.nombre ? ` · ${p.pedidos.contactos.nombre}` : ''}
                    <button style={{ border:'none', background:'none', cursor:'pointer', padding:0, color:'#a04040', fontWeight:700, fontFamily:F, fontSize:11, lineHeight:1 }} onClick={() => unlinkPedido(p.id)}>✕</button>
                  </span>
                ))}
                <div style={{ position:'relative' }}>
                  <input style={{ ...S.inp, width:100 }} placeholder="+ pedido #" value={pedQ} onChange={e => onPedInput(e.target.value)} />
                  <AcList items={pedRes} onPick={linkPedido} label={p => `#${p.numero} · ${p.contactos?.nombre || ''}`} />
                </div>
              </div>

              {/* Secciones por tela */}
              {telaGroups.map((g, i) => (
                <TelaSection key={g.tela?.id || i} tela={g.tela} marcadas={g.marcadas}
                  allPiezas={fichaData.piezas} allAjustes={fichaData.ajustes}
                  onDeleteMarcada={deleteMarcada} onReload={reloadFicha}
                />
              ))}

              <ResultadoGlobal marcadas={fichaData.marcadas} allPiezas={fichaData.piezas} allAjustes={fichaData.ajustes} />
              <div style={{ height:16 }} />
            </>
          ) : (
            <div style={{ padding:20, color:'#a00000' }}>Error cargando sesión</div>
          )}
        </div>
      </div>

      {/* ── Modal: Nueva sesión ── */}
      {modalNew && (
        <div style={S.overlay} onClick={() => setModalNew(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalH}>
              <span>✂ Nueva sesión de corte</span>
              <button style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', fontSize:14, fontFamily:F }} onClick={() => setModalNew(false)}>✕</button>
            </div>
            <div style={S.modalB}>

              {/* Fecha */}
              <div style={{ marginBottom:10 }}>
                <div style={S.lbl}>Fecha</div>
                <input style={S.inp} type="date" value={nFecha} onChange={e => setNFecha(e.target.value)} />
              </div>

              {/* Proveedor (filtra telas) */}
              <div style={{ position:'relative', marginBottom:10 }}>
                <div style={S.lbl}>
                  Proveedor
                  <span style={{ fontWeight:400, color:'#666', marginLeft:4 }}>(filtra telas)</span>
                </div>
                <input style={{ ...S.inp, width:'100%' }} value={nProvQ}
                  onChange={e => onNProvInput(e.target.value)}
                  placeholder="Buscar proveedor..."
                />
                {nProvId && <span style={{ fontSize:10, color:'#2a6a2a' }}>✓ {nProvQ}</span>}
                <AcList items={nProvRes}
                  onPick={r => { setNProvId(r.id); setNProvQ(r.nombre); setNProvRes([]); setNTelaQ(''); setNTelaId(null) }}
                  label={r => r.nombre}
                />
              </div>

              {/* Tela */}
              <div style={{ position:'relative', marginBottom:10 }}>
                <div style={S.lbl}>Tela</div>
                <input style={{ ...S.inp, width:'100%' }} value={nTelaQ}
                  onChange={e => onNTelaInput(e.target.value)}
                  placeholder={nProvId ? `Telas de ${nProvQ}...` : 'Buscar tela...'}
                />
                {nTelaId && <span style={{ fontSize:10, color:'#2a6a2a' }}>✓ {nTelaQ}</span>}
                <AcList items={nTelaRes}
                  onPick={r => { setNTelaId(r.id); setNTelaQ(telaLabel(r)); setNTelaRes([]) }}
                  label={telaLabel}
                />
              </div>

              {/* Nota */}
              <div>
                <div style={S.lbl}>Nota</div>
                <input style={{ ...S.inp, width:'100%' }} value={nNota}
                  onChange={e => setNNota(e.target.value)}
                  placeholder="opcional"
                />
              </div>

              <div style={{ fontSize:10, color:'#666', marginTop:10, background:'#eae8d8', padding:'4px 6px', border:'1px solid #c0c0b0' }}>
                Los metros y pliegues se configuran dentro de la sesión, desde el botón ⚙ config de cada marcada.
              </div>
            </div>
            <div style={S.modalF}>
              <button style={S.btn} onClick={() => setModalNew(false)}>Cancelar</button>
              <button style={S.btnP} onClick={createSession} disabled={saving}>{saving ? 'Creando…' : '✂ Crear sesión'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Agregar tela a sesión ── */}
      {modalTela && (
        <div style={S.overlay} onClick={() => setModalTela(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalH}>
              <span>🧶 Agregar tela a sesión</span>
              <button style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', fontSize:14, fontFamily:F }} onClick={() => setModalTela(false)}>✕</button>
            </div>
            <div style={S.modalB}>

              <div style={{ position:'relative', marginBottom:10 }}>
                <div style={S.lbl}>Tela</div>
                <input style={{ ...S.inp, width:'100%' }} value={aTelaQ}
                  onChange={e => onATelaInput(e.target.value)}
                  placeholder="Buscar tela..."
                />
                {aTelaId && <span style={{ fontSize:10, color:'#2a6a2a' }}>✓ {aTelaQ}</span>}
                <AcList items={aTelaRes}
                  onPick={r => { setATelaId(r.id); setATelaQ(telaLabel(r)); setATelaRes([]) }}
                  label={telaLabel}
                />
              </div>

              <div>
                <div style={S.lbl}>Nota</div>
                <input style={{ ...S.inp, width:'100%' }} value={aNota}
                  onChange={e => setANota(e.target.value)}
                  placeholder="opcional"
                />
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
