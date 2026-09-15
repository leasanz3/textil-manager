import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const F = 'Tahoma, Arial, sans-serif'

const TIPOS = [
  { v: 'caja_ahorro', label: 'Caja de ahorro' },
  { v: 'cuenta_corriente', label: 'Cuenta corriente' },
  { v: 'virtual', label: 'Cuenta virtual' },
]

const MONEDAS = ['UYU', 'USD']

function emptyForm() {
  return { banco: '', tipo: 'caja_ahorro', numero: '', numero_mismo_banco: '', titular: '', alias: '', moneda: 'UYU' }
}

function textoCopiar(c) {
  const lines = []
  lines.push(`Banco: ${c.banco}`)
  if (c.titular) lines.push(`Titular: ${c.titular}`)
  if (c.numero) lines.push(`N° de cuenta (desde otro banco): ${c.numero}`)
  if (c.numero_mismo_banco) lines.push(`N° de cuenta (mismo banco): ${c.numero_mismo_banco}`)
  if (c.moneda === 'USD') lines.push('Moneda: USD')
  return lines.join('\n')
}

export default function MisBancos({ onMenuClick }) {
  const [cuentas, setCuentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [copiado, setCopiado] = useState(null)

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { fetchCuentas() }, [])

  async function fetchCuentas() {
    setLoading(true)
    const { data } = await supabase
      .from('cuentas_bancarias')
      .select('*')
      .order('banco')
    setCuentas(data || [])
    setLoading(false)
  }

  function abrirNueva() {
    setForm(emptyForm())
    setEditId(null)
    setModal(true)
  }

  function abrirEditar(c) {
    setForm({
      banco: c.banco, tipo: c.tipo,
      numero: c.numero || '', numero_mismo_banco: c.numero_mismo_banco || '',
      titular: c.titular || '', alias: c.alias || '', moneda: c.moneda || 'UYU',
    })
    setEditId(c.id)
    setModal(true)
  }

  async function guardar() {
    if (!form.banco.trim()) { alert('El nombre del banco es obligatorio'); return }
    setSaving(true)
    const datos = {
      banco: form.banco.trim(),
      tipo: form.tipo,
      numero: form.numero.trim() || null,
      numero_mismo_banco: form.numero_mismo_banco.trim() || null,
      titular: form.titular.trim() || null,
      alias: form.alias.trim() || null,
      moneda: form.moneda,
    }
    if (editId) {
      await supabase.from('cuentas_bancarias').update(datos).eq('id', editId)
    } else {
      await supabase.from('cuentas_bancarias').insert(datos)
    }
    setSaving(false)
    setModal(false)
    fetchCuentas()
  }

  async function toggleActiva(c) {
    await supabase.from('cuentas_bancarias').update({ activa: !c.activa }).eq('id', c.id)
    fetchCuentas()
  }

  function copiar(c) {
    navigator.clipboard.writeText(textoCopiar(c)).then(() => {
      setCopiado(c.id)
      setTimeout(() => setCopiado(null), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: F }}>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>🏦 Mis cuentas bancarias</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={abrirNueva}>+ Nueva cuenta</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {loading ? (
          <p style={{ color: 'var(--text2)' }}>Cargando...</p>
        ) : cuentas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div>
            <h3>Sin cuentas registradas</h3>
            <p>Agregá tus cuentas para usarlas al registrar transferencias</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 620 }}>
            {cuentas.map(c => (
              <div key={c.id} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '14px 16px',
                opacity: c.activa ? 1 : 0.45,
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{c.banco}</span>
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                    {TIPOS.find(t => t.v === c.tipo)?.label}
                    {c.moneda === 'USD' && ' · USD'}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button onClick={() => copiar(c)}
                      title="Copiar datos"
                      style={{
                        background: copiado === c.id ? '#1a7a1a22' : 'var(--bg)',
                        border: '1px solid var(--border)', borderRadius: 4,
                        padding: '3px 10px', cursor: 'pointer', fontSize: 11,
                        color: copiado === c.id ? '#1a7a1a' : 'var(--text)',
                        fontWeight: copiado === c.id ? 700 : 400,
                      }}>
                      {copiado === c.id ? '✔ Copiado' : '📋 Copiar'}
                    </button>
                    <button onClick={() => abrirEditar(c)}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: 'var(--text)' }}>
                      Editar
                    </button>
                    <button onClick={() => toggleActiva(c)} title={c.activa ? 'Desactivar' : 'Activar'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>
                      {c.activa ? '✅' : '⬜'}
                    </button>
                  </div>
                </div>

                {/* Datos */}
                <div style={{ display: 'grid', gap: '4px 0', fontSize: 12 }}>
                  {c.titular && (
                    <div><span style={{ color: 'var(--text2)', marginRight: 6 }}>Titular:</span>{c.titular}</div>
                  )}
                  {c.numero && (
                    <div>
                      <span style={{ color: 'var(--text2)', marginRight: 6 }}>
                        {c.numero_mismo_banco ? 'Desde otro banco:' : 'N° de cuenta:'}
                      </span>
                      <span style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{c.numero}</span>
                    </div>
                  )}
                  {c.numero_mismo_banco && (
                    <div>
                      <span style={{ color: 'var(--text2)', marginRight: 6 }}>Mismo banco:</span>
                      <span style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{c.numero_mismo_banco}</span>
                    </div>
                  )}
                  {c.alias && (
                    <div><span style={{ color: 'var(--text2)', marginRight: 6 }}>Alias:</span>{c.alias}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>{editId ? 'Editar cuenta' : 'Nueva cuenta bancaria'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              <div className="form-group">
                <label>Banco / Entidad *</label>
                <input value={form.banco} onChange={e => setF('banco', e.target.value)}
                  placeholder="Ej: BROU, BBVA, Mercado Pago..." autoFocus />
              </div>

              <div className="form-group">
                <label>Titular</label>
                <input value={form.titular} onChange={e => setF('titular', e.target.value)}
                  placeholder="Nombre completo del titular" />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={form.tipo} onChange={e => setF('tipo', e.target.value)}>
                    {TIPOS.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Moneda</label>
                  <select value={form.moneda} onChange={e => setF('moneda', e.target.value)}>
                    {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>N° de cuenta (desde otro banco)</label>
                <input value={form.numero} onChange={e => setF('numero', e.target.value)}
                  placeholder="Número completo para transferencias externas" />
              </div>

              <div className="form-group">
                <label>N° de cuenta (mismo banco)</label>
                <input value={form.numero_mismo_banco} onChange={e => setF('numero_mismo_banco', e.target.value)}
                  placeholder="Número abreviado para transferencias internas" />
              </div>

              <div className="form-group">
                <label>Alias</label>
                <input value={form.alias} onChange={e => setF('alias', e.target.value)}
                  placeholder="Ej: leandro.textil" />
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando...' : '✔ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
