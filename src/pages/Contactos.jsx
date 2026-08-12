import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TIPOS = ['Cliente', 'Costurera', 'Taller', 'Estampador', 'Bordador', 'Proveedor', 'Otro']

const TIPO_COLOR = {
  Cliente:    '#2060a8',
  Costurera:  '#2a7a2a',
  Taller:     '#1a6a6a',
  Estampador: '#c06000',
  Bordador:   '#8a2080',
  Proveedor:  '#8060c0',
  Otro:       '#888888',
}

function TipoBadge({ tipo }) {
  const color = TIPO_COLOR[tipo] || '#888'
  return (
    <span style={{
      background: color + '22', color, border: `1px solid ${color}88`,
      padding: '1px 8px', fontSize: 10, fontWeight: 700, borderRadius: 2,
    }}>
      {tipo || '—'}
    </span>
  )
}

function MapButtons({ direccion }) {
  if (!direccion) return null
  const q = encodeURIComponent(direccion)
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${q}`}
        target="_blank" rel="noreferrer"
        style={{ fontSize: 11, color: '#fff', background: '#4285F4', padding: '2px 8px', borderRadius: 2, textDecoration: 'none', fontWeight: 600 }}
      >
        📍 Google Maps
      </a>
      <a
        href={`https://waze.com/ul?q=${q}&navigate=yes`}
        target="_blank" rel="noreferrer"
        style={{ fontSize: 11, color: '#fff', background: '#33CCFF', padding: '2px 8px', borderRadius: 2, textDecoration: 'none', fontWeight: 600 }}
      >
        🚗 Waze
      </a>
    </div>
  )
}

export default function Contactos({ onMenuClick }) {
  const [contactos, setContactos]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [modal, setModal]           = useState(false)
  const [editing, setEditing]       = useState(null)
  const [vistaFicha, setVistaFicha] = useState(null)
  const [saving, setSaving]         = useState(false)

  const emptyForm = { nombre: '', tipo: 'Cliente', telefono: '', email: '', direccion: '', notas: '', facturacion_tipo: 'normal', facturacion_pct_con_factura: '100', facturacion_descuento_sin_factura: '0' }
  const [form, setForm] = useState(emptyForm)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('contactos').select('*').order('nombre')
    setContactos(data || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setModal(true)
  }

  function openEdit(c) {
    setEditing(c.id)
    setForm({
      nombre:    c.nombre    || '',
      tipo:      c.tipo      || 'Cliente',
      telefono:  c.telefono  || '',
      email:     c.email     || '',
      direccion: c.direccion || '',
      notas:     c.notas     || '',
      facturacion_tipo:                 c.facturacion_tipo                  || 'normal',
      facturacion_pct_con_factura:      c.facturacion_pct_con_factura != null ? String(c.facturacion_pct_con_factura) : '100',
      facturacion_descuento_sin_factura: c.facturacion_descuento_sin_factura != null ? String(c.facturacion_descuento_sin_factura) : '0',
    })
    setModal(true)
  }

  async function handleSave() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    const datos = {
      nombre:    form.nombre.trim(),
      tipo:      form.tipo,
      telefono:  form.telefono.trim()  || null,
      email:     form.email.trim()     || null,
      direccion: form.direccion.trim() || null,
      notas:     form.notas.trim()     || null,
      facturacion_tipo:                  form.tipo === 'Cliente' ? (form.facturacion_tipo || 'normal') : null,
      facturacion_pct_con_factura:       form.tipo === 'Cliente' ? (parseFloat(form.facturacion_pct_con_factura) || 100) : null,
      facturacion_descuento_sin_factura: form.tipo === 'Cliente' ? (parseFloat(form.facturacion_descuento_sin_factura) || 0) : null,
    }
    let error
    if (editing) {
      ;({ error } = await supabase.from('contactos').update(datos).eq('id', editing))
      if (!error) setVistaFicha(prev => prev?.id === editing ? { ...prev, ...datos } : prev)
    } else {
      ;({ error } = await supabase.from('contactos').insert(datos))
    }
    setSaving(false)
    if (error) { alert('Error al guardar: ' + error.message); return }
    setModal(false)
    fetchAll()
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('¿Eliminar este contacto?')) return
    await supabase.from('contactos').delete().eq('id', id)
    if (vistaFicha?.id === id) setVistaFicha(null)
    fetchAll()
  }

  const filtered = contactos.filter(c => {
    const q  = search.toLowerCase()
    const ms = !q || c.nombre?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.telefono?.includes(q) || c.direccion?.toLowerCase().includes(q)
    const mt = !filterTipo || c.tipo === filterTipo
    return ms && mt
  })

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>👥 Contactos</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo contacto</button>
      </div>

      <div className="content">

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{contactos.length}</div>
            <div className="stat-label">Total</div>
          </div>
          {TIPOS.map(t => (
            <div key={t} className="stat-card">
              <div className="stat-value">{contactos.filter(c => c.tipo === t).length}</div>
              <div className="stat-label">{t}s</div>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="search-input" style={{ flex: 1, maxWidth: 260 }}>
              <input
                placeholder="Buscar nombre, email, dirección..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{ width: 150 }}>
              <option value="">Todos los tipos</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /> Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👥</div>
              <h3>No hay contactos</h3>
              <p>Agregá tu primer contacto con el botón de arriba</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Teléfono</th>
                    <th>Dirección</th>
                    <th>Notas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => setVistaFicha(vistaFicha?.id === c.id ? null : c)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td><strong>{c.nombre}</strong></td>
                      <td><TipoBadge tipo={c.tipo} /></td>
                      <td>{c.telefono || '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--text2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.direccion || '—'}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.notas || '—'}
                      </td>
                      <td onClick={e => handleDelete(c.id, e)}>
                        <button className="btn btn-danger btn-sm">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vista detalle */}
        {vistaFicha && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 15 }}>👤 {vistaFicha.nombre}</strong>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(vistaFicha)}>✏ Editar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setVistaFicha(null)}>✕</button>
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', gap: 32, flexWrap: 'wrap', fontSize: 13 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Tipo</div>
                <TipoBadge tipo={vistaFicha.tipo} />
              </div>
              {vistaFicha.telefono && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Teléfono</div>
                  <a href={`tel:${vistaFicha.telefono}`} style={{ color: 'var(--accent)' }}>{vistaFicha.telefono}</a>
                </div>
              )}
              {vistaFicha.email && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Email</div>
                  <a href={`mailto:${vistaFicha.email}`} style={{ color: 'var(--accent)' }}>{vistaFicha.email}</a>
                </div>
              )}
              {vistaFicha.direccion && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Dirección</div>
                  <div>{vistaFicha.direccion}</div>
                  <MapButtons direccion={vistaFicha.direccion} />
                </div>
              )}
              {vistaFicha.notas && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Notas</div>
                  <span>{vistaFicha.notas}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏ Editar contacto' : '👤 Nuevo contacto'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    value={form.nombre}
                    onChange={e => setF('nombre', e.target.value)}
                    placeholder="Nombre completo"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={form.tipo} onChange={e => setF('tipo', e.target.value)}>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    value={form.telefono}
                    onChange={e => setF('telefono', e.target.value)}
                    placeholder="ej: 098 123 456"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setF('email', e.target.value)}
                    placeholder="ej: nombre@mail.com"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input
                  value={form.direccion}
                  onChange={e => setF('direccion', e.target.value)}
                  placeholder="ej: Av. 18 de Julio 1234, Montevideo"
                />
                {form.direccion && (
                  <div style={{ marginTop: 6 }}>
                    <MapButtons direccion={form.direccion} />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Notas</label>
                <textarea
                  value={form.notas}
                  onChange={e => setF('notas', e.target.value)}
                  placeholder="Observaciones, condiciones de trabajo, referencias..."
                  style={{ height: 70 }}
                />
              </div>

              {/* Facturación — solo para Clientes */}
              {form.tipo === 'Cliente' && (
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: 0.5, marginBottom: 8 }}>
                    💳 Facturación
                  </div>
                  <div className="form-group">
                    <label>Tipo de facturación</label>
                    <select value={form.facturacion_tipo} onChange={e => setF('facturacion_tipo', e.target.value)}>
                      <option value="normal">Normal (con descuento global)</option>
                      <option value="parcial">Parcial con IVA</option>
                    </select>
                  </div>
                  {form.facturacion_tipo === 'parcial' && (
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Monto con factura (% del total)</label>
                        <input
                          type="number" min="0" max="100" step="1"
                          value={form.facturacion_pct_con_factura}
                          onChange={e => setF('facturacion_pct_con_factura', e.target.value)}
                          placeholder="100"
                        />
                      </div>
                      <div className="form-group">
                        <label>Dto. sin factura (%)</label>
                        <input
                          type="number" min="0" max="100" step="0.1"
                          value={form.facturacion_descuento_sin_factura}
                          onChange={e => setF('facturacion_descuento_sin_factura', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
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
