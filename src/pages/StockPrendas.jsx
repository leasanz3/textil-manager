import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const F = 'Tahoma, Trebuchet MS, sans-serif'
const S = {
  th: { padding: '5px 8px', background: 'linear-gradient(to bottom,#e8eef7,#c8d4e8)', color: '#1a3a6b', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #6b83a8', textAlign: 'left' },
  td: { padding: '4px 8px', borderBottom: '1px solid #eee', fontSize: 12, verticalAlign: 'middle' },
}

export default function StockPrendas({ onMenuClick }) {
  const [compras,  setCompras]  = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: cat }, { data: comp }] = await Promise.all([
      supabase.from('prendas_catalogo').select('*').order('nombre'),
      supabase.from('prendas_compras').select('*, prendas_catalogo(nombre)').order('fecha', { ascending: false }),
    ])
    setCatalogo(cat || [])
    setCompras(comp || [])
    setLoading(false)
  }

  // Acumular stock por prenda y talle (en talles MÍOs)
  const stockMap = {}
  compras.forEach(c => {
    const prenda = catalogo.find(p => p.id === c.prenda_id)
    if (!prenda) return
    const equiv = prenda.talles_equiv || []
    Object.entries(c.cantidades || {}).forEach(([talleProv, cant]) => {
      const eq = equiv.find(e => e.prov === talleProv)
      const talleMio = eq ? eq.mio : talleProv
      if (!stockMap[prenda.nombre]) stockMap[prenda.nombre] = {}
      stockMap[prenda.nombre][talleMio] = (stockMap[prenda.nombre][talleMio] || 0) + (parseInt(cant) || 0)
    })
  })

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          <h2>👕 Stock de Prendas</h2>
        </div>
      </div>

      <div className="content">
        <div className="card">
          {loading ? <div>Cargando...</div> : Object.keys(stockMap).length === 0 ? (
            <div style={{ color: '#888', fontStyle: 'italic', fontSize: 12 }}>Sin stock registrado. Ingresá compras de prendas para ver el stock.</div>
          ) : (
            Object.entries(stockMap).map(([nombre, talles]) => (
              <div key={nombre} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>👕 {nombre}</div>
                <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {Object.keys(talles).map(t => <th key={t} style={{ ...S.th, textAlign: 'center' }}>{t}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {Object.values(talles).map((cant, i) => (
                        <td key={i} style={{ ...S.td, textAlign: 'center', fontWeight: 700, color: cant > 0 ? '#1a5a1a' : '#ccc' }}>{cant}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
