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
  return { banco: '', tipo: 'caja_ahorro', numero: '', alias: '', moneda: 'UYU' }
}

export default function MisBancos({ onMenuClick }) {
  const [cuentas, setCuentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

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
    setForm({ banco: c.banco, tipo: c.tipo, numero: c.numero || '', alias: c.alias || '', moneda: c.moneda || 'ARS' })
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 600 }}>
            {cuentas.map(c => (
              <div key={c.id} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: c.activa ? 1 : 0.45,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {c.banco}
                    <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>
                      {TIPOS.find(t => t.v === c.tipo)?.label} · {c.moneda}
                    </span>
                  </div>
                  {c.numero && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                      N°: {c.numero}
                      {c.alias && <span style={{ marginLeft: 8 }}>· Alias: {c.alias}</span>}
                    </div>
                  )}
                  {!c.numero && c.alias && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Alias: {c.alias}</div>
                  )}
                </div>
                <button onClick={() => abrirEditar(c)}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--text)' }}>
                  Editar
                </button>
                <button onClick={() => toggleActiva(c)}
                  title={c.activa ? 'Desactivar' : 'Activar'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.6 }}>
                  {c.activa ? '✅' : '⬜'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>{editId ? 'Editar cuenta' : 'Nueva cuenta bancaria'}</h3>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Banco / Entidad *</label>
                <input value={form.banco} onChange={e => setF('banco', e.target.value)}
                  placeholder="Ej: Galicia, Mercado Pago, BROU..." autoFocus />
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
                <label>Número de cuenta</label>
                <input value={form.numero} onChange={e => setF('numero', e.target.value)}
                  placeholder="Número de cuenta o IBAN" />
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
