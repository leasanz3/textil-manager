import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmtUYU = (n) => n ? '$' + Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '$0,00'
const fmtFecha = (f) => { if (!f) return '—'; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}` }

const MESES = [
  ['2025-01','Enero 2025'],['2025-02','Febrero 2025'],['2025-03','Marzo 2025'],
  ['2025-04','Abril 2025'],['2025-05','Mayo 2025'],['2025-06','Junio 2025'],
  ['2025-07','Julio 2025'],['2025-08','Agosto 2025'],['2025-09','Setiembre 2025'],
  ['2025-10','Octubre 2025'],['2025-11','Noviembre 2025'],['2025-12','Diciembre 2025'],
  ['2026-01','Enero 2026'],['2026-02','Febrero 2026'],['2026-03','Marzo 2026'],
  ['2026-04','Abril 2026'],['2026-05','Mayo 2026'],['2026-06','Junio 2026'],
]

export default function IVA({ onMenuClick }) {
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  useEffect(() => { fetchCompras() }, [])

  async function fetchCompras() {
    setLoading(true)
    const { data } = await supabase.from('compras').select('*').order('fecha', { ascending: true })
    setCompras(data || [])
    setLoading(false)
  }

  function onMesChange(v) {
    setMes(v)
    if (v) {
      const [y, m] = v.split('-')
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
      setDesde(v + '-01')
      setHasta(v + '-' + String(lastDay).padStart(2, '0'))
    } else {
      setDesde(''); setHasta('')
    }
  }

  function onRangoChange(tipo, val) {
    setMes('')
    if (tipo === 'desde') setDesde(val)
    else setHasta(val)
  }

  const filtradas = compras.filter(x => {
    if (!x.fecha) return false
    if (desde && x.fecha < desde) return false
    if (hasta && x.fecha > hasta) return false
    return true
  })

  const conIVA = filtradas.filter(x => x.acredita_iva !== false)
  const sinIVA = filtradas.filter(x => x.acredita_iva === false)

  const totalCF = conIVA.reduce((a, x) => a + (x.iva || 0), 0)
  const totalDB = 0 // ventas pendientes
  const posicion = totalCF - totalDB
  const totalCompras = filtradas.reduce((a, x) => a + (x.total_final || x.total_uyu || 0), 0)

  let periodoStr = 'Todo el historial'
  if (desde && hasta) periodoStr = `Del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`
  else if (desde) periodoStr = `Desde ${fmtFecha(desde)}`
  else if (hasta) periodoStr = `Hasta ${fmtFecha(hasta)}`

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>📄 IVA</h2>
        </div>
      </div>

      <div className="content">
        {/* Filtros */}
        <div className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={mes} onChange={e => onMesChange(e.target.value)} style={{ width: 160 }}>
              <option value="">— Elegir mes —</option>
              {MESES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>o rango:</span>
            <input type="date" value={desde} onChange={e => onRangoChange('desde', e.target.value)} style={{ width: 140 }} />
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>hasta</span>
            <input type="date" value={hasta} onChange={e => onRangoChange('hasta', e.target.value)} style={{ width: 140 }} />
            <button className="btn btn-secondary btn-sm" onClick={() => { setMes(''); setDesde(''); setHasta('') }}>✕ Limpiar</button>
          </div>
          {(desde || hasta) && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)' }}>
              Período: <strong style={{ color: 'var(--text)' }}>{periodoStr}</strong>
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="iva-grid">
          <div className="iva-card">
            <div className="value" style={{ color: 'var(--success)' }}>{fmtUYU(totalCF)}</div>
            <div className="label">IVA Compras (CF)</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{conIVA.length} facturas</div>
          </div>
          <div className="iva-card">
            <div className="value" style={{ color: 'var(--danger)' }}>{fmtUYU(totalDB)}</div>
            <div className="label">IVA Ventas (DB)</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>módulo pendiente</div>
          </div>
          <div className="iva-card">
            <div className="value" style={{ color: posicion >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {fmtUYU(Math.abs(posicion))}
            </div>
            <div className="label">Posición (CF - DB)</div>
            <div style={{ fontSize: 11, color: posicion >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: 4 }}>
              {posicion >= 0 ? '✓ Saldo a favor' : '⚠ Saldo a pagar'}
            </div>
          </div>
          <div className="iva-card">
            <div className="value">{fmtUYU(totalCompras)}</div>
            <div className="label">Total compras período</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{filtradas.length} facturas</div>
          </div>
        </div>

        {/* Tabla CF */}
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
            📥 IVA Compras (Crédito Fiscal) — facturas que acreditan IVA
          </div>
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : conIVA.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <p>No hay facturas con IVA en este período</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Proveedor</th><th>Fecha</th><th>Factura</th>
                    <th>Total Final</th><th>Subtotal</th><th>IVA 22%</th><th>Moneda</th>
                  </tr>
                </thead>
                <tbody>
                  {conIVA.map(x => (
                    <tr key={x.id}>
                      <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{x.id}</td>
                      <td><strong>{x.proveedor}</strong></td>
                      <td>{fmtFecha(x.fecha)}</td>
                      <td>{x.factura || '—'}</td>
                      <td><strong>{fmtUYU(x.total_final || x.total_uyu)}</strong></td>
                      <td>{fmtUYU(x.subtotal)}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 700 }}>{fmtUYU(x.iva)}</td>
                      <td><span className="badge badge-blue">{x.moneda}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg3)' }}>
                    <td colSpan={4} style={{ fontWeight: 700, padding: '8px 12px' }}>
                      TOTAL ({conIVA.length} facturas)
                    </td>
                    <td style={{ fontWeight: 700, padding: '8px 12px' }}>
                      {fmtUYU(conIVA.reduce((a, x) => a + (x.total_final || x.total_uyu || 0), 0))}
                    </td>
                    <td style={{ fontWeight: 700, padding: '8px 12px' }}>
                      {fmtUYU(conIVA.reduce((a, x) => a + (x.subtotal || 0), 0))}
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: 700, padding: '8px 12px' }}>
                      {fmtUYU(totalCF)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Sin IVA */}
        {sinIVA.length > 0 && (
          <div className="table-wrap">
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
              📋 Compras sin IVA acreditable
            </div>
            <table>
              <thead>
                <tr><th>#</th><th>Proveedor</th><th>Fecha</th><th>Factura</th><th>Total</th></tr>
              </thead>
              <tbody>
                {sinIVA.map(x => (
                  <tr key={x.id}>
                    <td style={{ color: 'var(--accent)' }}>{x.id}</td>
                    <td>{x.proveedor}</td>
                    <td>{fmtFecha(x.fecha)}</td>
                    <td>{x.factura || '—'}</td>
                    <td>{fmtUYU(x.total_final || x.total_uyu)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
