import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import FichaCorteCompleta from '../components/FichaCorteCompleta'

const TABLAS_TALLES = {
  adulto:   ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  nino:     ['2', '4', '6', '8', '10', '12', '14', '16'],
  malla:    ['40', '42', '44', '46', '48', '50', '52'],
  mallaesp: ['54', '56', '58'],
}

const fmtFecha = f => {
  if (!f) return '—'
  const [y, m, d] = f.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

const fmtNum = n => n != null ? Number(n).toFixed(2) : '—'

export default function Corte({ onMenuClick }) {
  const [cortes,   setCortes]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  // ── Form: nuevo corte ──────────────────────────────────────────────────────

  const emptyForm = {
    // Producto
    producto_id:     null,
    producto_nombre: '',
    // Tela
    tela_id:     null,
    tela_nombre: '',
    // Marcada
    metros:   '',
    pliegues: '1',
    promedio_pieza: '',
    nota: '',
  }
  const [form, setForm] = useState(emptyForm)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Autocomplete producto
  const [prodQuery,   setProdQuery]   = useState('')
  const [prodResults, setProdResults] = useState([])
  const prodTimeout = useRef(null)

  // Autocomplete tela
  const [telaQuery,   setTelaQuery]   = useState('')
  const [telaResults, setTelaResults] = useState([])
  const telaTimeout = useRef(null)

  useEffect(() => { fetchCortes() }, [])

  async function fetchCortes() {
    setLoading(true)
    const { data } = await supabase
      .from('cortes_marcadas')
      .select('*, productos(nombre, tabla, cara_uso), telas(tipo, color)')
      .order('created_at', { ascending: false })
    setCortes(data || [])
    setLoading(false)
  }

  // ── Autocomplete producto ────────────────────────────────────────────────

  function onProdInput(val) {
    setProdQuery(val)
    setF('producto_nombre', val)
    setF('producto_id', null)
    if (prodTimeout.current) clearTimeout(prodTimeout.current)
    if (!val.trim()) { setProdResults([]); return }
    prodTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('productos').select('id, nombre, tabla, cara_uso')
        .ilike('nombre', `%${val.trim()}%`).limit(8)
      setProdResults(data || [])
    }, 250)
  }

  function selectProducto(p) {
    setF('producto_id', p.id)
    setF('producto_nombre', p.nombre)
    setProdQuery(p.nombre)
    setProdResults([])
  }

  // ── Autocomplete tela ────────────────────────────────────────────────────

  function onTelaInput(val) {
    setTelaQuery(val)
    setF('tela_nombre', val)
    setF('tela_id', null)
    if (telaTimeout.current) clearTimeout(telaTimeout.current)
    if (!val.trim()) { setTelaResults([]); return }
    telaTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('telas').select('id, tipo, color, proveedor_id')
        .or(`tipo.ilike.%${val.trim()}%,color.ilike.%${val.trim()}%`)
        .limit(8)
      setTelaResults(data || [])
    }, 250)
  }

  function selectTela(t) {
    setF('tela_id', t.id)
    setF('tela_nombre', `${t.tipo}${t.color ? ` · ${t.color}` : ''}`)
    setTelaQuery(`${t.tipo}${t.color ? ` · ${t.color}` : ''}`)
    setTelaResults([])
  }

  // ── Abrir modal nuevo ────────────────────────────────────────────────────

  function openNew() {
    setForm(emptyForm)
    setProdQuery('')
    setProdResults([])
    setTelaQuery('')
    setTelaResults([])
    setError('')
    setModal(true)
  }

  // ── Guardar nuevo corte ──────────────────────────────────────────────────

  async function handleSave() {
    if (!form.producto_id) { setError('Seleccioná un producto de la lista'); return }
    if (!parseFloat(form.metros) > 0 && form.metros !== '') { setError('Metros inválidos'); return }
    if (!form.metros) { setError('Ingresá los metros de tela usados'); return }
    setError('')
    setSaving(true)

    const metros   = parseFloat(form.metros) || 0
    const pliegues = parseInt(form.pliegues) || 1
    const total    = metros * pliegues

    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: err } = await supabase
      .from('cortes_marcadas')
      .insert({
        producto_id:    form.producto_id,
        tela_id:        form.tela_id || null,
        metros,
        pliegues,
        total_metros:   total,
        promedio_pieza: parseFloat(form.promedio_pieza) || null,
        nota:           form.nota.trim() || null,
        user_id:        user?.id,
      })
      .select('*, productos(nombre, tabla, cara_uso), telas(tipo, color)')
      .single()

    setSaving(false)
    if (err) { setError('Error: ' + err.message); return }
    setModal(false)
    setSelected(data)
    fetchCortes()
  }

  // ── Filtros ──────────────────────────────────────────────────────────────

  const filtered = cortes.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.productos?.nombre?.toLowerCase().includes(q) ||
      c.telas?.tipo?.toLowerCase().includes(q) ||
      c.telas?.color?.toLowerCase().includes(q)
    )
  })

  // ── Auto-calcular promedio desde metros/pliegues ──────────────────────────
  // (ayuda: promedio = total / piezas esperadas — usuario puede editarlo)
  const totalMetrosForm = (parseFloat(form.metros) || 0) * (parseInt(form.pliegues) || 1)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>✂ Corte</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo corte</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Panel izquierdo: lista de cortes ── */}
        <div style={{
          width: 240, minWidth: 240,
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg)',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <input
              placeholder="Buscar producto o tela..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', fontSize: 12, padding: '4px 8px',
                border: '1px solid var(--border)', borderRadius: 4,
                background: 'var(--bg2)', color: 'var(--text)', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--text2)' }}>Cargando...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--text2)' }}>
                {search ? 'Sin resultados' : 'No hay cortes — creá el primero'}
              </div>
            ) : filtered.map(c => {
              const talles = TABLAS_TALLES[c.productos?.tabla] || TABLAS_TALLES.adulto
              const isSelected = selected?.id === c.id
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: isSelected ? '#e8f0fe' : 'transparent',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                    {c.productos?.nombre || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                    {c.telas ? `${c.telas.tipo}${c.telas.color ? ` · ${c.telas.color}` : ''}` : 'Sin tela'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
                    {fmtFecha(c.created_at)} · {fmtNum(c.total_metros)} m
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Panel derecho: ficha ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div className="empty-state" style={{ margin: 'auto' }}>
              <div className="icon">✂</div>
              <h3>Seleccioná un corte</h3>
              <p>O creá uno nuevo con el botón de arriba</p>
            </div>
          ) : (
            <FichaCorteCompleta
              key={selected.id}
              corte={selected}
              onClose={() => setSelected(null)}
              onDeleted={() => { setSelected(null); fetchCortes() }}
            />
          )}
        </div>
      </div>

      {/* ── Modal nuevo corte ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>✂ Nuevo corte</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Producto */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Producto *</label>
                <input
                  value={prodQuery}
                  onChange={e => onProdInput(e.target.value)}
                  placeholder="Buscar producto..."
                  autoFocus
                />
                {prodResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto',
                  }}>
                    {prodResults.map(p => (
                      <div
                        key={p.id} onClick={() => selectProducto(p)}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }}
                      >
                        <strong>{p.nombre}</strong>
                        {p.cara_uso && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text2)' }}>Cara: {p.cara_uso}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {form.producto_id && (
                  <span style={{ fontSize: 11, color: '#1a7a1a', marginTop: 3, display: 'block' }}>✓ Seleccionado</span>
                )}
              </div>

              {/* Cara de uso (readonly, del producto) */}
              {form.producto_id && prodResults.length === 0 && (
                (() => {
                  // Find cara from results cache — might be gone after selection. Show from form.
                  return null // cara_uso se muestra en la ficha
                })()
              )}

              {/* Tela */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Tela <span style={{ fontWeight: 400, color: 'var(--text2)' }}>(opcional)</span></label>
                <input
                  value={telaQuery}
                  onChange={e => onTelaInput(e.target.value)}
                  placeholder="Buscar tela del catálogo..."
                />
                {telaResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto',
                  }}>
                    {telaResults.map(t => (
                      <div
                        key={t.id} onClick={() => selectTela(t)}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }}
                      >
                        <strong>{t.tipo}</strong>
                        {t.color && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text2)' }}>{t.color}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {form.tela_id && (
                  <span style={{ fontSize: 11, color: '#1a7a1a', marginTop: 3, display: 'block' }}>✓ Seleccionada</span>
                )}
              </div>

              {/* Metros + pliegues */}
              <div className="form-grid">
                <div className="form-group">
                  <label>Metros de tela *</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.metros}
                    onChange={e => setF('metros', e.target.value)}
                    placeholder="ej: 0.75"
                  />
                </div>
                <div className="form-group">
                  <label>Pliegues</label>
                  <input
                    type="number" min="1"
                    value={form.pliegues}
                    onChange={e => setF('pliegues', e.target.value)}
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Total auto */}
              {totalMetrosForm > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: -8, marginBottom: 12 }}>
                  Total: <strong style={{ color: 'var(--text)' }}>{fmtNum(totalMetrosForm)} m</strong>
                  {' '}({form.metros} m × {form.pliegues} pliegues)
                </div>
              )}

              {/* Promedio por pieza (opcional, editable) */}
              <div className="form-group">
                <label>Promedio por pieza (m) <span style={{ fontWeight: 400, color: 'var(--text2)' }}>(opcional)</span></label>
                <input
                  type="number" min="0" step="0.001"
                  value={form.promedio_pieza}
                  onChange={e => setF('promedio_pieza', e.target.value)}
                  placeholder="ej: 0.30"
                />
              </div>

              {/* Nota */}
              <div className="form-group">
                <label>Nota</label>
                <textarea
                  value={form.nota}
                  onChange={e => setF('nota', e.target.value)}
                  placeholder="Observaciones del corte, defectos de tela, etc."
                  style={{ height: 60 }}
                />
              </div>

              {error && (
                <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>⚠ {error}</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Creando...' : '✂ Crear corte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
