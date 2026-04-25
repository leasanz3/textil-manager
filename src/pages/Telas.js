import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtFecha = (f) => { if (!f) return '—'; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}` }
const fmtUYU = (n) => n ? '$' + Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2 }) : '—'

export function Telas({ onMenuClick }) {
  const [telas, setTelas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    tipo: '', codigo: '', color: '', proveedor: '', proveedor_id: '',
    unidad: 'm', metros: '', precio: '', moneda: 'UYU', tc: '', fecha: '', usados: '', notas: ''
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('telas').select('*').order('created_at', { ascending: false }),
      supabase.from('proveedores').select('id, nombre').order('nombre')
    ])
    setTelas(t || [])
    setProveedores(p || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ tipo: '', codigo: '', color: '', proveedor: '', proveedor_id: '', unidad: 'm', metros: '', precio: '', moneda: 'UYU', tc: '', fecha: new Date().toISOString().split('T')[0], usados: '', notas: '' })
    setError(''); setModal(true)
  }

  function openEdit(t) {
    setEditing(t.id)
    setForm({
      tipo: t.tipo || '', codigo: t.codigo || '', color: t.color || '',
      proveedor: t.proveedor || '', proveedor_id: t.proveedor_id || '',
      unidad: t.unidad || 'm', metros: t.metros || '', precio: t.precio || '',
      moneda: t.moneda || 'UYU', tc: t.tc || '', fecha: t.fecha || '',
      usados: t.usados || '', notas: t.notas || ''
    })
    setError(''); setModal(true)
  }

  async function handleSave() {
    if (!form.tipo || !form.proveedor_id || !form.metros) { setError('Completá tipo, proveedor y cantidad'); return }
    setSaving(true)
    const prov = proveedores.find(p => p.id === parseInt(form.proveedor_id))
    const datos = {
      tipo: form.tipo, codigo: form.codigo, color: form.color,
      proveedor: prov?.nombre || form.proveedor,
      proveedor_id: parseInt(form.proveedor_id) || null,
      unidad: form.unidad, metros: parseFloat(form.metros) || 0,
      precio: parseFloat(form.precio) || 0, moneda: form.moneda,
      tc: parseFloat(form.tc) || null, fecha: form.fecha,
      usados: parseFloat(form.usados) || 0, notas: form.notas
    }
    if (editing) await supabase.from('telas').update(datos).eq('id', editing)
    else await supabase.from('telas').insert(datos)
    setSaving(false); setModal(false); fetchAll()
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Borrar esta tela?')) return
    await supabase.from('telas').delete().eq('id', id)
    fetchAll()
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const filtered = telas.filter(t => !search || t.tipo?.toLowerCase().includes(search.toLowerCase()) || t.proveedor?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>🧶 Telas</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nueva compra</button>
      </div>
      <div className="content">
        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 280 }}>
              <input placeholder="Buscar tela o proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? <div className="loading"><div className="spinner" /></div>
          : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon">🧶</div><h3>No hay telas</h3><p>Agregá tu primera compra de tela</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Tipo</th><th>Código</th><th>Color</th><th>Proveedor</th><th>Fecha</th><th>Comprado</th><th>Usado</th><th>Disponible</th><th>Precio</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(t => {
                    const disp = Math.max(0, (t.metros || 0) - (t.usados || 0))
                    const pct = t.metros ? Math.min(100, Math.round(disp / t.metros * 100)) : 0
                    const low = pct < 20
                    return (
                      <tr key={t.id} onClick={() => openEdit(t)}>
                        <td><strong>{t.tipo}</strong></td>
                        <td style={{ fontSize: 11, color: 'var(--accent)' }}>{t.codigo || '—'}</td>
                        <td style={{ fontSize: 12 }}>{t.color || '—'}</td>
                        <td>{t.proveedor}</td>
                        <td>{fmtFecha(t.fecha)}</td>
                        <td>{t.metros} {t.unidad || 'm'}</td>
                        <td>{t.usados || 0} {t.unidad || 'm'}</td>
                        <td style={{ color: low ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                          {disp.toFixed(1)} {t.unidad || 'm'}
                          {low && <span style={{ fontSize: 10, marginLeft: 4 }}>⚠</span>}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {t.precio ? (t.moneda === 'USD' ? `U$D ${t.precio}` : fmtUYU(t.precio)) : '—'}
                        </td>
                        <td onClick={e => { e.stopPropagation(); handleDelete(t.id) }}>
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
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏ Editar tela' : '🧶 Nueva compra de tela'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo / nombre *</label>
                  <input value={form.tipo} onChange={e => setF('tipo', e.target.value)} placeholder="ej: Jersey 24/1 algodón" />
                </div>
                <div className="form-group">
                  <label>Proveedor *</label>
                  <select value={form.proveedor_id} onChange={e => setF('proveedor_id', e.target.value)}>
                    <option value="">— Elegir —</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Código del proveedor</label>
                  <input value={form.codigo} onChange={e => setF('codigo', e.target.value)} placeholder="ej: JRS-241-BL" />
                </div>
                <div className="form-group">
                  <label>Color / descripción</label>
                  <input value={form.color} onChange={e => setF('color', e.target.value)} placeholder="ej: Blanco, ancho 150cm" />
                </div>
                <div className="form-group">
                  <label>Unidad</label>
                  <select value={form.unidad} onChange={e => setF('unidad', e.target.value)}>
                    <option value="m">Metros (m)</option>
                    <option value="kg">Kilogramos (kg)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Cantidad comprada *</label>
                  <input type="number" value={form.metros} onChange={e => setF('metros', e.target.value)} placeholder="0.0" />
                </div>
                <div className="form-group">
                  <label>Moneda</label>
                  <select value={form.moneda} onChange={e => setF('moneda', e.target.value)}>
                    <option value="UYU">$ Pesos UY</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Precio por {form.unidad}</label>
                  <input type="number" value={form.precio} onChange={e => setF('precio', e.target.value)} placeholder="0" />
                </div>
                {form.moneda === 'USD' && (
                  <div className="form-group">
                    <label>Tipo de cambio (opc.)</label>
                    <input type="number" value={form.tc} onChange={e => setF('tc', e.target.value)} placeholder="ej: 39.90" />
                  </div>
                )}
                <div className="form-group">
                  <label>Fecha de compra</label>
                  <input type="date" value={form.fecha} onChange={e => setF('fecha', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Ya usado ({form.unidad})</label>
                  <input type="number" value={form.usados} onChange={e => setF('usados', e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label>Notas adicionales</label>
                <textarea value={form.notas} onChange={e => setF('notas', e.target.value)} placeholder="Lote, observaciones..." />
              </div>
              {error && <p style={{ color: 'var(--danger)', fontSize: 12 }}>⚠ {error}</p>}
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

export function Productos({ onMenuClick }) {
  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>📦 Productos</h2>
        </div>
      </div>
      <div className="content">
        <div className="empty-state">
          <div className="icon">📦</div>
          <h3>Módulo en construcción</h3>
          <p>Fichas técnicas, piezas de corte, avíos y más — próximamente</p>
        </div>
      </div>
    </div>
  )
}

export function Contactos({ onMenuClick }) {
  const [contactos, setContactos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('contactos').select('*').order('nombre').then(({ data }) => {
      setContactos(data || [])
      setLoading(false)
    })
  }, [])

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>👥 Contactos</h2>
        </div>
      </div>
      <div className="content">
        <div className="table-wrap">
          {loading ? <div className="loading"><div className="spinner" /></div>
          : contactos.length === 0 ? (
            <div className="empty-state"><div className="icon">👥</div><h3>No hay contactos</h3></div>
          ) : (
            <table>
              <thead><tr><th>Nombre</th><th>Tipo</th><th>Teléfono</th><th>Notas</th></tr></thead>
              <tbody>
                {contactos.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.nombre}</strong></td>
                    <td><span className="badge badge-blue">{c.tipo}</span></td>
                    <td>{c.tel || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{c.notas || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
