import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TABLAS_TALLES } from '../constants/talles'

const MIS_TALLES = [...TABLAS_TALLES.adulto, ...TABLAS_TALLES.nino]

export default function CatalogoPrendas({ onMenuClick }) {
  const [prendas,    setPrendas]    = useState([])
  const [proveedores,setProveedores]= useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filterProv, setFilterProv] = useState('')
  const [modal,      setModal]      = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [detalle,    setDetalle]    = useState(null)

  const emptyForm = { nombre: '', codigo: '', proveedor_id: '', precio: '', notas: '', talles_equiv: [] }
  const [form, setForm] = useState(emptyForm)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [talleProv, setTalleProv] = useState('')
  const [talleMio,  setTalleMio]  = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: p }, { data: pr }] = await Promise.all([
      supabase.from('prendas_catalogo').select('*').order('nombre'),
      supabase.from('proveedores').select('id, nombre').order('nombre'),
    ])
    setPrendas(p || [])
    setProveedores(pr || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setTalleProv(''); setTalleMio('')
    setModal(true)
  }

  function openEdit(p) {
    setEditing(p.id)
    const prov = proveedores.find(pr => pr.nombre === p.proveedor)
    setForm({
      nombre:      p.nombre || '',
      codigo:      p.codigo || '',
      proveedor_id: prov?.id ? String(prov.id) : '',
      precio:      p.precio ?? '',
      notas:       p.notas || '',
      talles_equiv: p.talles_equiv || [],
    })
    setTalleProv(''); setTalleMio('')
    setModal(true)
  }

  function addEquiv() {
    if (!talleProv.trim() || !talleMio.trim()) return
    setF('talles_equiv', [...form.talles_equiv, { prov: talleProv.trim(), mio: talleMio.trim() }])
    setTalleProv(''); setTalleMio('')
  }

  function delEquiv(i) {
    setF('talles_equiv', form.talles_equiv.filter((_, j) => j !== i))
  }

  async function handleSave() {
    if (!form.nombre.trim()) { alert('El nombre de la prenda es obligatorio'); return }
    setSaving(true)
    // Si quedaron campos de talle sin agregar, los agrega automáticamente
    let talles = form.talles_equiv
    if (talleProv.trim() && talleMio.trim()) {
      talles = [...talles, { prov: talleProv.trim(), mio: talleMio.trim() }]
      setTalleProv(''); setTalleMio('')
    }
    const prov = proveedores.find(p => p.id === parseInt(form.proveedor_id))
    const row = {
      nombre:      form.nombre.trim(),
      codigo:      form.codigo || null,
      proveedor:   prov?.nombre || null,
      precio:      parseFloat(form.precio) || null,
      notas:       form.notas || null,
      talles_equiv: talles,
    }
    let error
    if (editing) {
      ({ error } = await supabase.from('prendas_catalogo').update(row).eq('id', editing))
    } else {
      ({ error } = await supabase.from('prendas_catalogo').insert(row))
    }
    setSaving(false)
    if (error) { alert('Error al guardar: ' + error.message); return }
    setModal(false)
    fetchAll()
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('¿Eliminar esta prenda del catálogo?')) return
    await supabase.from('prendas_catalogo').delete().eq('id', id)
    fetchAll()
  }

  const filtered = prendas.filter(p => {
    const q = search.toLowerCase()
    const ms = !q || p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q) || p.proveedor?.toLowerCase().includes(q)
    const mp = !filterProv || p.proveedor === proveedores.find(pr => String(pr.id) === filterProv)?.nombre
    return ms && mp
  })

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>👕 Catálogo de Prendas</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nueva prenda</button>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">{prendas.length}</div><div className="stat-label">Tipos de prenda</div></div>
          <div className="stat-card"><div className="stat-value">{prendas.filter(p => p.proveedor).length}</div><div className="stat-label">Con proveedor</div></div>
          <div className="stat-card"><div className="stat-value">{prendas.filter(p => (p.talles_equiv || []).length > 0).length}</div><div className="stat-label">Con talles cargados</div></div>
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 240 }}>
              <input placeholder="Buscar prenda o código..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={filterProv} onChange={e => setFilterProv(e.target.value)} style={{ width: 180 }}>
              <option value="">Todos los proveedores</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          {loading ? <div className="loading"><div className="spinner" /> Cargando...</div>
          : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👕</div>
              <h3>No hay prendas en el catálogo</h3>
              <p>Agregá tu primera prenda con el botón de arriba</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>Proveedor</th>
                    <th style={{ textAlign: 'right' }}>Precio unit.</th>
                    <th>Talles</th>
                    <th>Notas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} onClick={() => setDetalle(p)} style={{ cursor: 'pointer' }}>
                      <td><strong>{p.nombre}</strong></td>
                      <td style={{ fontSize: 11, color: 'var(--accent)' }}>{p.codigo || '—'}</td>
                      <td>{p.proveedor || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{p.precio ? `$ ${Number(p.precio).toLocaleString('es-AR')}` : '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--text2)' }}>
                        {(p.talles_equiv || []).length > 0
                          ? (p.talles_equiv || []).map(e => `${e.prov}→${e.mio}`).join(', ')
                          : <span style={{ color: 'var(--warning)' }}>⚠ Sin talles</span>}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text2)' }}>{p.notas || '—'}</td>
                      <td onClick={e => handleDelete(p.id, e)}>
                        <button className="btn btn-danger btn-sm">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div className="modal-overlay" onClick={() => setDetalle(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>👕 {detalle.nombre}</h3>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                  {detalle.proveedor && <span>{detalle.proveedor}</span>}
                  {detalle.codigo && <span> · #{detalle.codigo}</span>}
                </div>
              </div>
              <button className="close-btn" onClick={() => setDetalle(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  { label: 'Nombre',       value: detalle.nombre || '—' },
                  { label: 'Código',       value: detalle.codigo || '—' },
                  { label: 'Proveedor',    value: detalle.proveedor || '—' },
                  { label: 'Precio unit.', value: detalle.precio ? `$ ${Number(detalle.precio).toLocaleString('es-AR')}` : '—', color: 'var(--accent)' },
                  { label: 'Talles cargados', value: (detalle.talles_equiv || []).length > 0 ? `${(detalle.talles_equiv || []).length} talles` : '—' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', padding: '7px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: color || 'var(--text)' }}>{value}</div>
                  </div>
                ))}
              </div>

              {(detalle.talles_equiv || []).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text2)', borderBottom: '1px solid var(--border)', padding: '4px 0 6px', marginBottom: 8 }}>
                    Equivalencia de talles
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(detalle.talles_equiv || []).map((eq, i) => (
                      <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', padding: '4px 10px', fontSize: 12 }}>
                        <span style={{ fontWeight: 700 }}>{eq.prov}</span>
                        <span style={{ color: 'var(--text2)', margin: '0 4px' }}>→</span>
                        <span style={{ color: 'var(--accent)' }}>{eq.mio}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detalle.notas && (
                <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic', padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                  📝 {detalle.notas}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetalle(null)}>Cerrar</button>
              <button className="btn btn-primary" onClick={() => { setDetalle(null); openEdit(detalle) }}>✏ Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar / editar */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏ Editar prenda' : '👕 Nueva prenda'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={form.nombre} onChange={e => setF('nombre', e.target.value)} placeholder="ej: Remera cuello redondo" />
                </div>
                <div className="form-group">
                  <label>Proveedor</label>
                  <select value={form.proveedor_id} onChange={e => setF('proveedor_id', e.target.value)}>
                    <option value="">— Sin proveedor —</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Código del proveedor</label>
                  <input value={form.codigo} onChange={e => setF('codigo', e.target.value)} placeholder="opcional" />
                </div>
                <div className="form-group">
                  <label>Precio unitario $</label>
                  <input type="number" value={form.precio} onChange={e => setF('precio', e.target.value)} placeholder="0" />
                </div>
              </div>

              {/* Equivalencia de talles */}
              <div style={{ marginTop: 8, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text2)', marginBottom: 8 }}>
                  Equivalencia de talles (proveedor → mis talles)
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    style={{ width: 130 }}
                    value={talleProv}
                    onChange={e => setTalleProv(e.target.value)}
                    placeholder="Talle proveedor"
                    onKeyDown={e => e.key === 'Enter' && addEquiv()}
                  />
                  <span style={{ color: 'var(--text2)' }}>→</span>
                  <select style={{ width: 130 }} value={talleMio} onChange={e => setTalleMio(e.target.value)}>
                    <option value="">Mi talle</option>
                    {MIS_TALLES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addEquiv}>+ Agregar</button>
                </div>
                {form.talles_equiv.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {form.talles_equiv.map((eq, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', padding: '3px 10px', fontSize: 12 }}>
                        <span style={{ fontWeight: 700 }}>{eq.prov}</span>
                        <span style={{ color: 'var(--text2)' }}>→</span>
                        <span style={{ color: 'var(--accent)' }}>{eq.mio}</span>
                        <button type="button" onClick={() => delEquiv(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 12, padding: '0 0 0 4px' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Notas</label>
                <input value={form.notas} onChange={e => setF('notas', e.target.value)} placeholder="Observaciones..." />
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
