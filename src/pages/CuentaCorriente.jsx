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

  const hoy = new Date().toISOString().split('T')[0]

  const emptyPago = {
    tipo: 'cobro',
    fecha: hoy,
    monto: '',
    facturacion_tipo: 'normal',
    descuento_pct: '0',
    monto_con_factura: '',
    descuento_sin_factura_pct: '0',
    monto_sin_factura: '',
    total_cobrar: '',
    forma_pago: 'efectivo',
    cheque_numero: '',
    cheque_banco: '',
    cheque_fecha_cobro: '',
    cheque_titular: '',
    observacion: '',
  }
  const [pago, setPago] = useState(emptyPago)
  const setP = (k, v) => setPago(p => ({ ...p, [k]: v }))

  useEffect(() => { fetchContactos() }, [])

  useEffect(() => {
    if (selected) fetchMovimientos(selected.id)
  }, [selected])

  // Recalcular total cuando cambian los campos de facturación
  useEffect(() => {
    const m = parseFloat(pago.monto) || 0
    if (pago.facturacion_tipo === 'normal') {
      const d = parseFloat(pago.descuento_pct) || 0
      const total = m * (1 - d / 100)
      setPago(p => ({ ...p, total_cobrar: m > 0 ? total.toFixed(2) : '' }))
    } else {
      const conFact = parseFloat(pago.monto_con_factura) || 0
      const dSin = parseFloat(pago.descuento_sin_factura_pct) || 0
      const sinFact = m - conFact
      const totalSin = sinFact * (1 - dSin / 100)
      const total = conFact + totalSin
      setPago(p => ({
        ...p,
        monto_sin_factura: sinFact >= 0 ? sinFact.toFixed(2) : '0',
        total_cobrar: total > 0 ? total.toFixed(2) : '',
      }))
    }
  }, [pago.monto, pago.descuento_pct, pago.monto_con_factura, pago.descuento_sin_factura_pct, pago.facturacion_tipo])

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
      if (mv.tipo === 'cobro') balances[cid] += parseFloat(mv.total_cobrar || mv.monto || 0)
      else balances[cid] -= parseFloat(mv.total_cobrar || mv.monto || 0)
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
    const ft = selected?.facturacion_tipo || 'normal'
    setPago({ ...emptyPago, facturacion_tipo: ft, fecha: hoy })
    setModal(true)
  }

  async function handleSave() {
    if (!pago.monto || parseFloat(pago.monto) <= 0) { alert('El monto es obligatorio'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const registro = {
      contacto_id: selected.id,
      tipo: pago.tipo,
      fecha: pago.fecha,
      monto: parseFloat(pago.monto),
      descuento_pct: parseFloat(pago.descuento_pct) || 0,
      monto_con_factura: pago.facturacion_tipo === 'parcial' ? (parseFloat(pago.monto_con_factura) || 0) : null,
      monto_sin_factura: pago.facturacion_tipo === 'parcial' ? (parseFloat(pago.monto_sin_factura) || 0) : null,
      descuento_sin_factura_pct: pago.facturacion_tipo === 'parcial' ? (parseFloat(pago.descuento_sin_factura_pct) || 0) : null,
      total_cobrar: parseFloat(pago.total_cobrar) || parseFloat(pago.monto),
      forma_pago: pago.forma_pago,
      cheque_numero: pago.cheque_numero || null,
      cheque_banco: pago.cheque_banco || null,
      cheque_fecha_cobro: pago.cheque_fecha_cobro || null,
      cheque_titular: pago.cheque_titular || null,
      observacion: pago.observacion || null,
      user_id: user?.id,
    }
    const { error } = await supabase.from('cuenta_corriente').insert(registro)
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
    return m.tipo === 'cobro' ? acc + v : acc - v
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
                    <p>Registrá el primer cobro con el botón de arriba</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ marginTop: 16 }}>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo</th>
                          <th>Monto</th>
                          <th>Facturación</th>
                          <th>Forma de pago</th>
                          <th>Total cobrar</th>
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
                                background: m.tipo === 'cobro' ? '#1a7a1a22' : '#c0606022',
                                color: m.tipo === 'cobro' ? '#1a7a1a' : '#c06060',
                                border: `1px solid ${m.tipo === 'cobro' ? '#1a7a1a88' : '#c0606088'}`,
                              }}>
                                {m.tipo === 'cobro' ? '▲ Cobro' : '▼ Gasto'}
                              </span>
                            </td>
                            <td>{fmtMoney(m.monto)}</td>
                            <td style={{ fontSize: 11, color: 'var(--text2)' }}>
                              {m.monto_con_factura != null
                                ? `Con fact: ${fmtMoney(m.monto_con_factura)} / Sin: ${fmtMoney(m.monto_sin_factura)}`
                                : m.descuento_pct > 0 ? `Dto ${m.descuento_pct}%` : 'Normal'
                              }
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {m.forma_pago || '—'}
                              {m.cheque_numero && (
                                <span style={{ color: 'var(--text2)', marginLeft: 4, fontSize: 11 }}>
                                  #{m.cheque_numero}
                                  {m.cheque_banco && ` (${m.cheque_banco})`}
                                </span>
                              )}
                            </td>
                            <td>
                              <strong style={{ color: '#1a7a1a' }}>{fmtMoney(m.total_cobrar)}</strong>
                            </td>
                            <td style={{
                              fontSize: 11, color: 'var(--text2)', maxWidth: 160,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {m.observacion || '—'}
                            </td>
                            <td>
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
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>💳 Registrar movimiento — {selected?.nombre}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={pago.tipo} onChange={e => setP('tipo', e.target.value)}>
                    <option value="cobro">▲ Cobro</option>
                    <option value="gasto">▼ Gasto / Ajuste</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" value={pago.fecha} onChange={e => setP('fecha', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>Monto *</label>
                <input
                  type="number" min="0" step="0.01"
                  value={pago.monto}
                  onChange={e => setP('monto', e.target.value)}
                  placeholder="0.00" autoFocus
                />
              </div>

              <div className="form-group">
                <label>Tipo de facturación</label>
                <select value={pago.facturacion_tipo} onChange={e => setP('facturacion_tipo', e.target.value)}>
                  <option value="normal">Normal (con descuento)</option>
                  <option value="parcial">Parcial con IVA</option>
                </select>
              </div>

              {pago.facturacion_tipo === 'normal' ? (
                <div className="form-group">
                  <label>Descuento (%)</label>
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={pago.descuento_pct}
                    onChange={e => setP('descuento_pct', e.target.value)}
                    placeholder="0"
                  />
                </div>
              ) : (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Monto con factura ($)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={pago.monto_con_factura}
                      onChange={e => setP('monto_con_factura', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Monto sin factura ($)</label>
                    <input
                      type="number" readOnly
                      value={pago.monto_sin_factura}
                      style={{ background: 'var(--bg2)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Dto. sin factura (%)</label>
                    <input
                      type="number" min="0" max="100" step="0.1"
                      value={pago.descuento_sin_factura_pct}
                      onChange={e => setP('descuento_sin_factura_pct', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Total a cobrar</label>
                <input
                  type="number" readOnly
                  value={pago.total_cobrar}
                  style={{ background: 'var(--bg2)', fontWeight: 700, color: '#1a7a1a' }}
                />
              </div>

              <div className="form-group">
                <label>Forma de pago</label>
                <select value={pago.forma_pago} onChange={e => setP('forma_pago', e.target.value)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

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
                    <label>Fecha cobro cheque</label>
                    <input type="date" value={pago.cheque_fecha_cobro} onChange={e => setP('cheque_fecha_cobro', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Titular</label>
                    <input value={pago.cheque_titular} onChange={e => setP('cheque_titular', e.target.value)} placeholder="Nombre del titular" />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Observación</label>
                <textarea
                  value={pago.observacion}
                  onChange={e => setP('observacion', e.target.value)}
                  placeholder="Notas adicionales..."
                  style={{ height: 60 }}
                />
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
