import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtMoney = v =>
  v == null ? '—' : `$${Number(v).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtFecha = f => {
  if (!f) return '—'
  const [y, m, d] = f.split('-')
  return `${d}/${m}/${y}`
}

export default function CuentaCorriente({ onMenuClick }) {
  const [contactos, setContactos] = useState([])
  const [selected, setSelected]   = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [loadingMov, setLoadingMov] = useState(false)
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [editId, setEditId]       = useState(null)
  const [misBancos, setMisBancos] = useState([])

  const hoy = new Date().toISOString().split('T')[0]

  const emptyPago = {
    tipo: 'haber',
    fecha: hoy,
    monto: '',
    forma_pago: 'efectivo',
    banco_destino: '',
    cheque_numero: '',
    cheque_banco: '',
    cheque_fecha_cobro: '',
    cheque_titular: '',
    observacion: '',
  }
  const [pago, setPago] = useState(emptyPago)
  const setP = (k, v) => setPago(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetchContactos()
    supabase.from('cuentas_bancarias').select('id,banco,alias,moneda').eq('activa', true).order('banco')
      .then(({ data }) => setMisBancos(data || []))
  }, [])

  useEffect(() => {
    if (selected) fetchMovimientos(selected.id)
  }, [selected])

  async function fetchContactos() {
    setLoading(true)
    const { data: clientes } = await supabase
      .from('contactos')
      .select('id, nombre, tipo, facturacion_tipo')
      .eq('tipo', 'Cliente')
      .order('nombre')

    const { data: movs } = await supabase
      .from('cuenta_corriente')
      .select('contacto_id, tipo, total_cobrar, monto')

    const balances = {}
    ;(movs || []).forEach(mv => {
      const cid = mv.contacto_id
      if (!balances[cid]) balances[cid] = 0
      const esDeuda = mv.tipo === 'cobro' || mv.tipo === 'recibo' || mv.tipo === 'seña' || mv.tipo === 'haber'
      if (esDeuda) balances[cid] -= parseFloat(mv.total_cobrar || mv.monto || 0)
      else balances[cid] += parseFloat(mv.total_cobrar || mv.monto || 0)
    })

    setContactos((clientes || []).map(c => ({ ...c, saldo: balances[c.id] || 0 })))
    setLoading(false)
  }

  async function fetchMovimientos(contactoId) {
    setLoadingMov(true)
    const { data } = await supabase
      .from('cuenta_corriente')
      .select('*')
      .eq('contacto_id', contactoId)
      .order('fecha', { ascending: false })
    setMovimientos(data || [])
    setLoadingMov(false)
  }

  function abrirPago() {
    setPago({ ...emptyPago, fecha: hoy })
    setEditId(null)
    setModal(true)
  }

  function abrirEditar(m) {
    setPago({
      tipo: m.tipo === 'debito' ? 'debe' : (m.tipo || 'haber'),
      fecha: m.fecha || hoy,
      monto: m.monto || '',
      forma_pago: m.forma_pago || 'efectivo',
      banco_destino: m.banco_destino || '',
      cheque_numero: m.cheque_numero || '',
      cheque_banco: m.cheque_banco || '',
      cheque_fecha_cobro: m.cheque_fecha_cobro || '',
      cheque_titular: m.cheque_titular || '',
      observacion: m.observacion || '',
    })
    setEditId(m.id)
    setModal(true)
  }

  async function handleSave() {
    if (!pago.monto || parseFloat(pago.monto) <= 0) { alert('El monto es obligatorio'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const monto = parseFloat(pago.monto)
    const registro = {
      tipo: pago.tipo,
      fecha: pago.fecha,
      monto,
      total_cobrar: monto,
      forma_pago: pago.forma_pago,
      banco_destino: pago.banco_destino || null,
      cheque_numero: pago.cheque_numero || null,
      cheque_banco: pago.cheque_banco || null,
      cheque_fecha_cobro: pago.cheque_fecha_cobro || null,
      cheque_titular: pago.cheque_titular || null,
      observacion: pago.observacion || null,
    }
    let error
    if (editId) {
      ;({ error } = await supabase.from('cuenta_corriente').update(registro).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('cuenta_corriente').insert({ ...registro, contacto_id: selected.id, user_id: user?.id }))
    }
    setSaving(false)
    if (error) { alert('Error al guardar: ' + error.message); return }
    setModal(false)
    fetchContactos()
    fetchMovimientos(selected.id)
  }

  async function handleDeleteMov(id) {
    if (!window.confirm('¿Eliminar este movimiento?')) return
    await supabase.from('cuenta_corriente').delete().eq('id', id)
    fetchContactos()
    fetchMovimientos(selected.id)
  }

  const filteredContactos = contactos.filter(c =>
    !search || c.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const saldoTotal = movimientos.reduce((acc, m) => {
    const v = parseFloat(m.total_cobrar || m.monto || 0)
    const esDeuda = m.tipo === 'cobro' || m.tipo === 'recibo' || m.tipo === 'seña' || m.tipo === 'haber'
    return esDeuda ? acc - v : acc + v
  }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>💳 Cuentas corrientes</h2>
        </div>
        {selected && (
          <button className="btn btn-primary btn-sm" onClick={abrirPago}>+ Registrar movimiento</button>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Panel izquierdo: lista de clientes ── */}
        <div style={{
          width: 220, minWidth: 220,
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg)',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <input
              placeholder="Buscar cliente..."
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
            ) : filteredContactos.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--text2)' }}>
                {search ? 'Sin resultados' : 'No hay clientes'}
              </div>
            ) : filteredContactos.map(c => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: selected?.id === c.id ? '#e8f0fe' : 'transparent',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{c.nombre}</div>
                <div style={{
                  fontSize: 11, marginTop: 2, fontWeight: 700,
                  color: c.saldo >= 0 ? '#1a7a1a' : '#c06060',
                }}>
                  {c.saldo >= 0 ? '▲ ' : '▼ '}{fmtMoney(Math.abs(c.saldo))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Panel derecho: movimientos ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div className="empty-state" style={{ margin: 'auto' }}>
              <div className="icon">💳</div>
              <h3>Seleccioná un cliente</h3>
              <p>Hacé clic en un cliente para ver sus movimientos</p>
            </div>
          ) : (
            <>
              {/* Cabecera del panel */}
              <div style={{
                padding: '12px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg)',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    Saldo:{' '}
                    <strong style={{ color: saldoTotal >= 0 ? '#1a7a1a' : '#c06060' }}>
                      {fmtMoney(saldoTotal)}
                    </strong>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={abrirPago}>+ Registrar movimiento</button>
              </div>

              {/* Tabla de movimientos */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
                {loadingMov ? (
                  <div className="loading" style={{ marginTop: 40 }}>
                    <div className="spinner" /> Cargando...
                  </div>
                ) : movimientos.length === 0 ? (
                  <div className="empty-state" style={{ marginTop: 60 }}>
                    <div className="icon">📄</div>
                    <h3>Sin movimientos</h3>
                    <p>Registrá el primer movimiento con el botón de arriba</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ marginTop: 16 }}>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo</th>
                          <th>Monto</th>
                          <th>Forma de pago</th>
                          <th>Observación</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientos.map(m => (
                          <tr key={m.id}>
                            <td>{fmtFecha(m.fecha)}</td>
                            <td>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 2,
                                background: (m.tipo === 'cobro' || m.tipo === 'recibo' || m.tipo === 'seña' || m.tipo === 'haber') ? '#c0606022' : '#1a7a1a22',
                                color: (m.tipo === 'cobro' || m.tipo === 'recibo' || m.tipo === 'seña' || m.tipo === 'haber') ? '#c06060' : '#1a7a1a',
                                border: `1px solid ${(m.tipo === 'cobro' || m.tipo === 'recibo' || m.tipo === 'seña' || m.tipo === 'haber') ? '#c0606088' : '#1a7a1a88'}`,
                              }}>
                                {m.tipo === 'haber' ? '▲ Haber'
                                  : m.tipo === 'recibo' ? '▲ Recibo'
                                  : m.tipo === 'cobro' ? '▲ Cobro'
                                  : m.tipo === 'seña' ? '▲ Seña'
                                  : m.tipo === 'debito' || m.tipo === 'debe' ? '📦 Entrega'
                                  : '▼ Pago'}
                              </span>
                            </td>
                            <td>{fmtMoney(m.monto)}</td>
                            <td style={{ fontSize: 12 }}>
                              {m.tipo === 'debito' ? '—' : m.forma_pago || '—'}
                              {m.banco_destino && (
                                <span style={{ color: 'var(--text2)', marginLeft: 4, fontSize: 11 }}>→ {m.banco_destino}</span>
                              )}
                              {m.cheque_numero && (
                                <span style={{ color: 'var(--text2)', marginLeft: 4, fontSize: 11 }}>
                                  #{m.cheque_numero}
                                  {m.cheque_banco && ` (${m.cheque_banco})`}
                                </span>
                              )}
                            </td>
                            <td style={{
                              fontSize: 11, color: 'var(--text2)', maxWidth: 160,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {m.observacion || '—'}
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <button className="btn btn-secondary btn-sm" style={{ marginRight: 4 }} onClick={() => abrirEditar(m)}>✏</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMov(m.id)}>🗑</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modal registrar movimiento ── */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>{editId ? '✏ Editar movimiento' : `💳 ${selected?.nombre}`}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Tipo — botones */}
              <div className="form-group">
                <label>Tipo</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { v: 'haber', label: '▲ Haber', color: '#1a7a1a' },
                    { v: 'debe',  label: '▼ Debe',  color: '#c06060' },
                  ].map(opt => (
                    <button key={opt.v}
                      onClick={() => setP('tipo', opt.v)}
                      style={{
                        flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        border: `2px solid ${opt.color}`,
                        background: pago.tipo === opt.v ? opt.color : 'transparent',
                        color: pago.tipo === opt.v ? '#fff' : opt.color,
                        borderRadius: 4,
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" value={pago.fecha} onChange={e => setP('fecha', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Monto *</label>
                  <input type="number" min="0" step="0.01" value={pago.monto}
                    onChange={e => setP('monto', e.target.value)} placeholder="0.00" autoFocus />
                </div>
              </div>

              {/* Forma de pago — botones */}
              <div className="form-group">
                <label>Forma de pago</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['efectivo', 'transferencia', 'cheque', 'otro'].map(fp => (
                    <button key={fp}
                      onClick={() => setP('forma_pago', fp)}
                      style={{
                        padding: '4px 12px', fontSize: 11, cursor: 'pointer', borderRadius: 4,
                        border: '1px solid var(--border)',
                        background: pago.forma_pago === fp ? '#1a3a6b' : 'var(--bg2)',
                        color: pago.forma_pago === fp ? '#fff' : 'var(--text)',
                        fontWeight: pago.forma_pago === fp ? 700 : 400,
                        textTransform: 'capitalize',
                      }}>
                      {fp === 'efectivo' ? '💵 Efectivo'
                        : fp === 'transferencia' ? '🏦 Transferencia'
                        : fp === 'cheque' ? '📄 Cheque'
                        : '➕ Otro'}
                    </button>
                  ))}
                </div>
              </div>

              {pago.forma_pago === 'transferencia' && (
                <div className="form-group">
                  <label>Banco destino</label>
                  {misBancos.length > 0 ? (
                    <select value={pago.banco_destino} onChange={e => setP('banco_destino', e.target.value)}>
                      <option value="">— Seleccioná una cuenta —</option>
                      {misBancos.map(b => (
                        <option key={b.id} value={b.banco}>
                          {b.banco}{b.alias ? ` (${b.alias})` : ''}{b.moneda === 'USD' ? ' · USD' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input value={pago.banco_destino} onChange={e => setP('banco_destino', e.target.value)}
                      placeholder="Ej: Galicia, Mercado Pago..." />
                  )}
                </div>
              )}

              {pago.forma_pago === 'cheque' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>N° cheque</label>
                    <input value={pago.cheque_numero} onChange={e => setP('cheque_numero', e.target.value)} placeholder="123456" />
                  </div>
                  <div className="form-group">
                    <label>Banco</label>
                    <input value={pago.cheque_banco} onChange={e => setP('cheque_banco', e.target.value)} placeholder="Ej: BROU" />
                  </div>
                  <div className="form-group">
                    <label>Fecha de cobro</label>
                    <input type="date" value={pago.cheque_fecha_cobro} onChange={e => setP('cheque_fecha_cobro', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Titular</label>
                    <input value={pago.cheque_titular} onChange={e => setP('cheque_titular', e.target.value)} placeholder="Nombre" />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Observación</label>
                <input value={pago.observacion} onChange={e => setP('observacion', e.target.value)}
                  placeholder="Ej: seña boxers, transferencia 15/9..." />
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editId ? '✔ Actualizar' : '✔ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
