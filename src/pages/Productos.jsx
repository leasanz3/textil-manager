import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const UNIDADES_AVIO = ['unidad', 'm', 'cm', 'kg', 'g', 'rollo', 'docena']

export default function Productos({ onMenuClick }) {
  const [productos, setProductos] = useState([])
  const [telas, setTelas] = useState([])
  const [avios, setAvios] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = {
    nombre: '', codigo: '', tabla: 'adulto', base_id: '',
    piezas: [], telas_prod: [], avios: [], terminaciones: { grifaTalle: false, grifa: false, talle: false },
    terminaciones_extra: [], notas: ''
  }
  const [form, setForm] = useState(emptyForm)

  // Nuevos items temporales
  const [nuevaPieza, setNuevaPieza] = useState({ nombre: '', mult: 1, tela_id: '' })
  const [nuevaTela, setNuevaTela] = useState({ tela_id: '', consumo: '', unit: 'm', desc: '' })
  const [nuevoAvio, setNuevoAvio] = useState({ nombre: '', cant: 1, unit: 'unidad' })
  const [nuevaTerm, setNuevaTerm] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: p }, { data: t }, { data: a }] = await Promise.all([
      supabase.from('productos').select('*').order('nombre'),
      supabase.from('telas').select('id, tipo, color, unidad').order('tipo'),
      supabase.from('avios').select('id, nombre, tipo, unidad').order('nombre')
    ])
    setProductos(p || [])
    setTelas(t || [])
    setAvios(a || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setModal(true)
  }

  function openEdit(p) {
    setEditing(p.id)
    setForm({
      nombre: p.nombre || '',
      codigo: p.codigo || '',
      tabla: p.tabla || 'adulto',
      base_id: p.base_id || '',
      piezas: p.piezas || [],
      telas_prod: p.telas_prod || [],
      avios: p.avios || [],
      terminaciones: p.terminaciones || { grifaTalle: false, grifa: false, talle: false },
      terminaciones_extra: p.terminaciones_extra || [],
      notas: p.notas || ''
    })
    setModal(true)
  }

  function aplicarBase(baseId) {
    if (!baseId) { setForm(f => ({ ...f, base_id: '' })); return }
    const base = productos.find(p => p.id === parseInt(baseId))
    if (!base) return
    setForm(f => ({
      ...f,
      base_id: baseId,
      tabla: base.tabla || f.tabla,
      piezas: (base.piezas || []).map(x => ({ ...x })),
      telas_prod: (base.telas_prod || []).map(x => ({ ...x })),
      avios: (base.avios || []).map(x => ({ ...x })),
      terminaciones: { ...(base.terminaciones || {}) },
      terminaciones_extra: (base.terminaciones_extra || []).map(x => ({ ...x }))
    }))
  }

  function agregarPieza() {
    if (!nuevaPieza.nombre) return
    setForm(f => ({ ...f, piezas: [...f.piezas, { ...nuevaPieza, tela_id: parseInt(nuevaPieza.tela_id) || null }] }))
    setNuevaPieza({ nombre: '', mult: 1, tela_id: '' })
  }

  function agregarTela() {
    if (!nuevaTela.tela_id) return
    const t = telas.find(x => x.id === parseInt(nuevaTela.tela_id))
    setForm(f => ({ ...f, telas_prod: [...f.telas_prod, { ...nuevaTela, tela_id: parseInt(nuevaTela.tela_id), tipo: t?.tipo || '' }] }))
    setNuevaTela({ tela_id: '', consumo: '', unit: 'm', desc: '' })
  }

  function agregarAvio() {
    if (!nuevoAvio.nombre) return
    setForm(f => ({ ...f, avios: [...f.avios, { ...nuevoAvio }] }))
    setNuevoAvio({ nombre: '', cant: 1, unit: 'unidad' })
  }

  function agregarTerminacion() {
    if (!nuevaTerm) return
    setForm(f => ({ ...f, terminaciones_extra: [...f.terminaciones_extra, { nombre: nuevaTerm }] }))
    setNuevaTerm('')
  }

  function generarCodigo(nombre) {
    const pre = { canguro: 'CANG', remera: 'REM', buzo: 'BUZO', pantalon: 'PANT', malla: 'MALL', polo: 'POLO', short: 'SHORT' }
    let p = 'PROD'
    for (const [k, v] of Object.entries(pre)) { if (nombre.toLowerCase().includes(k)) { p = v; break } }
    const nums = productos.filter(x => x.codigo?.startsWith(p)).map(x => { const m = x.codigo?.match(/\d+$/); return m ? parseInt(m[0]) : 0 })
    return p + '-' + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')
  }

  async function handleSave() {
    if (!form.nombre) return alert('El nombre del producto es obligatorio')
    setSaving(true)
    const codigo = form.codigo || generarCodigo(form.nombre)
    const datos = {
      nombre: form.nombre,
      codigo,
      tabla: form.tabla,
      base_id: parseInt(form.base_id) || null,
      piezas: form.piezas,
      telas_prod: form.telas_prod,
      avios: form.avios,
      terminaciones: form.terminaciones,
      terminaciones_extra: form.terminaciones_extra,
      notas: form.notas || null
    }
    if (editing) {
      await supabase.from('productos').update(datos).eq('id', editing)
    } else {
      await supabase.from('productos').insert(datos)
    }
    setSaving(false)
    setModal(false)
    fetchAll()
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('¿Borrar este producto?')) return
    await supabase.from('productos').delete().eq('id', id)
    fetchAll()
  }

  const filtered = productos.filter(p =>
    !search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.codigo?.toLowerCase().includes(search.toLowerCase())
  )

  const telaLabel = (id) => { const t = telas.find(x => x.id === id); return t ? `${t.tipo}${t.color ? ` · ${t.color}` : ''}` : '?' }

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>📦 Productos</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo producto</button>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">{productos.length}</div><div className="stat-label">Productos</div></div>
          <div className="stat-card"><div className="stat-value">{productos.filter(p => !p.base_id).length}</div><div className="stat-label">Productos base</div></div>
          <div className="stat-card"><div className="stat-value">{productos.filter(p => p.base_id).length}</div><div className="stat-label">Derivados</div></div>
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 280 }}>
              <input placeholder="Buscar producto o código..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? <div className="loading"><div className="spinner" /> Cargando...</div>
          : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📦</div>
              <h3>No hay productos</h3>
              <p>Creá tu primer producto con el botón de arriba</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Código</th><th>Nombre</th><th>Base / Derivado</th>
                    <th>Talles</th><th>Piezas</th><th>Telas</th><th>Avíos</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const base = p.base_id ? productos.find(x => x.id === p.base_id) : null
                    return (
                      <tr key={p.id} onClick={() => openEdit(p)} style={{ cursor: 'pointer' }}>
                        <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{p.codigo || '—'}</td>
                        <td><strong>{p.nombre}</strong></td>
                        <td style={{ fontSize: 11 }}>
                          {base
                            ? <span className="badge badge-blue">hijo · {base.nombre}</span>
                            : <span className="badge badge-yellow">base</span>}
                        </td>
                        <td style={{ fontSize: 11 }}>{p.tabla}</td>
                        <td style={{ fontSize: 11 }}>{(p.piezas || []).length} pzas</td>
                        <td style={{ fontSize: 11 }}>{(p.telas_prod || []).length} telas</td>
                        <td style={{ fontSize: 11 }}>{(p.avios || []).length} avíos</td>
                        <td onClick={e => handleDelete(p.id, e)}>
                          <button className="btn btn-danger btn-sm">🗑</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏ Editar producto' : '📦 Nuevo producto'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Datos básicos */}
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="ej: Canguro IEP" autoFocus />
                </div>
                <div className="form-group">
                  <label>Código (auto si vacío)</label>
                  <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="ej: CANG-001" />
                </div>
                <div className="form-group">
                  <label>Tabla de talles</label>
                  <select value={form.tabla} onChange={e => setForm(f => ({ ...f, tabla: e.target.value }))}>
                    <option value="adulto">Adulto (XS-XXL)</option>
                    <option value="nino">Niño (2-16)</option>
                    <option value="malla">Malla (40-52)</option>
                    <option value="mallaesp">Malla Especial (54-58)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Producto base (opcional)</label>
                  <select value={form.base_id} onChange={e => aplicarBase(e.target.value)}>
                    <option value="">— Sin base —</option>
                    {productos.filter(p => p.id !== editing).map(p => (
                      <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Piezas de corte */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>✂ Piezas de corte</div>
                {form.piezas.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ flex: 2 }}>{p.nombre}</span>
                    <span style={{ color: 'var(--text2)' }}>×{p.mult} x prenda</span>
                    <span style={{ color: 'var(--accent)', fontSize: 11 }}>{p.tela_id ? telaLabel(p.tela_id) : '—'}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => setForm(f => ({ ...f, piezas: f.piezas.filter((_, j) => j !== i) }))}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <input value={nuevaPieza.nombre} onChange={e => setNuevaPieza(f => ({ ...f, nombre: e.target.value }))} placeholder="ej: Delantera" style={{ flex: 2, minWidth: 100 }} onKeyDown={e => e.key === 'Enter' && agregarPieza()} />
                  <input type="number" min="1" value={nuevaPieza.mult} onChange={e => setNuevaPieza(f => ({ ...f, mult: parseInt(e.target.value) || 1 }))} style={{ width: 50 }} title="x prenda" />
                  <span style={{ fontSize: 11, color: 'var(--text2)', alignSelf: 'center' }}>x prenda</span>
                  <select value={nuevaPieza.tela_id} onChange={e => setNuevaPieza(f => ({ ...f, tela_id: e.target.value }))} style={{ flex: 2, minWidth: 120 }}>
                    <option value="">Tela (opcional)</option>
                    {telas.map(t => <option key={t.id} value={t.id}>{t.tipo}{t.color ? ` · ${t.color}` : ''}</option>)}
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={agregarPieza}>+ Agregar</button>
                </div>
              </div>

              {/* Telas utilizadas */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>🧶 Telas utilizadas</div>
                {form.telas_prod.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ flex: 2 }}>{t.tipo || telaLabel(t.tela_id)}</span>
                    <span style={{ color: 'var(--text2)' }}>{t.consumo} {t.unit}/prenda</span>
                    <span style={{ color: 'var(--text2)', fontSize: 11 }}>{t.desc}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => setForm(f => ({ ...f, telas_prod: f.telas_prod.filter((_, j) => j !== i) }))}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <select value={nuevaTela.tela_id} onChange={e => setNuevaTela(f => ({ ...f, tela_id: e.target.value }))} style={{ flex: 2, minWidth: 140 }}>
                    <option value="">— Elegir tela —</option>
                    {telas.map(t => <option key={t.id} value={t.id}>{t.tipo}{t.color ? ` · ${t.color}` : ''}</option>)}
                  </select>
                  <input type="number" value={nuevaTela.consumo} onChange={e => setNuevaTela(f => ({ ...f, consumo: e.target.value }))} placeholder="consumo" style={{ width: 70 }} />
                  <select value={nuevaTela.unit} onChange={e => setNuevaTela(f => ({ ...f, unit: e.target.value }))} style={{ width: 65 }}>
                    <option value="m">m</option>
                    <option value="kg">kg</option>
                  </select>
                  <input value={nuevaTela.desc} onChange={e => setNuevaTela(f => ({ ...f, desc: e.target.value }))} placeholder="ej: Tela principal" style={{ flex: 2, minWidth: 100 }} />
                  <button className="btn btn-secondary btn-sm" onClick={agregarTela}>+ Agregar</button>
                </div>
              </div>

              {/* Avíos */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>🧵 Avíos e insumos</div>
                {form.avios.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ flex: 2 }}>{a.nombre}</span>
                    <span style={{ color: 'var(--text2)' }}>{a.cant} {a.unit}/prenda</span>
                    <button className="btn btn-danger btn-sm" onClick={() => setForm(f => ({ ...f, avios: f.avios.filter((_, j) => j !== i) }))}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <input value={nuevoAvio.nombre} onChange={e => setNuevoAvio(f => ({ ...f, nombre: e.target.value }))} placeholder="ej: Elástico 2cm" style={{ flex: 2 }} onKeyDown={e => e.key === 'Enter' && agregarAvio()} />
                  <input type="number" value={nuevoAvio.cant} onChange={e => setNuevoAvio(f => ({ ...f, cant: parseFloat(e.target.value) || 1 }))} style={{ width: 65 }} />
                  <select value={nuevoAvio.unit} onChange={e => setNuevoAvio(f => ({ ...f, unit: e.target.value }))} style={{ width: 80 }}>
                    {UNIDADES_AVIO.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={agregarAvio}>+ Agregar</button>
                </div>
              </div>

              {/* Terminaciones */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>🏷 Terminaciones y etiquetas</div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
                  {[['grifaTalle', 'Grifa con talle'], ['grifa', 'Grifa sola'], ['talle', 'Talle solo']].map(([k, l]) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.terminaciones[k] || false} onChange={e => setForm(f => ({ ...f, terminaciones: { ...f.terminaciones, [k]: e.target.checked } }))} />
                      {l}
                    </label>
                  ))}
                </div>
                {form.terminaciones_extra.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ flex: 1 }}>{t.nombre}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => setForm(f => ({ ...f, terminaciones_extra: f.terminaciones_extra.filter((_, j) => j !== i) }))}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input value={nuevaTerm} onChange={e => setNuevaTerm(e.target.value)} placeholder="ej: Planchado cartera con entretela" style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && agregarTerminacion()} />
                  <button className="btn btn-secondary btn-sm" onClick={agregarTerminacion}>+ Agregar</button>
                </div>
              </div>

              <div className="form-group">
                <label>Notas</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Molde, observaciones..." style={{ height: 60 }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : '✔ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
