import React, { useState } from 'react'

// Orden canónico de talles
const TALLES_ORDEN = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL',
  '2', '4', '6', '8', '10', '12', '14', '16',
  '40', '42', '44', '46', '48', '50', '52', '54', '56', '58',
]

const thS = {
  padding: '6px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', color: 'var(--text2)', borderBottom: '2px solid var(--border)',
  background: 'var(--bg2)', whiteSpace: 'nowrap',
}
const tdS = { padding: '5px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center' }

/**
 * piezasMap: { [pieza_nombre]: { [talle]: cantidad } }
 * talles: string[] — talles a mostrar (del producto)
 * onCellChange(pieza, talle, value) — callback al editar celda
 * onAchicar(talle) — callback al clickear Achicar
 * readonly: bool
 */
export default function TablaCorte({ piezasMap, talles, onCellChange, onAchicar, readonly }) {
  const [editCell, setEditCell] = useState(null) // {pieza, talle}
  const [editVal, setEditVal]   = useState('')

  const piezas = Object.keys(piezasMap || {})

  // Talles a mostrar: sólo los que tienen datos o todos los del producto
  const tallesVisibles = TALLES_ORDEN.filter(t => talles?.includes(t))

  // MIN por talle (prendas completas)
  const minPerTalle = {}
  tallesVisibles.forEach(t => {
    if (piezas.length === 0) { minPerTalle[t] = 0; return }
    minPerTalle[t] = Math.min(...piezas.map(p => (piezasMap[p]?.[t] || 0)))
  })

  function startEdit(pieza, talle) {
    if (readonly) return
    setEditCell({ pieza, talle })
    setEditVal(String(piezasMap[pieza]?.[talle] || 0))
  }

  function commitEdit() {
    if (!editCell || !onCellChange) return
    const val = Math.max(0, parseInt(editVal) || 0)
    onCellChange(editCell.pieza, editCell.talle, val)
    setEditCell(null)
  }

  if (piezas.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic', padding: '12px 0' }}>
        Sin piezas registradas todavía.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: 300 }}>
        <thead>
          <tr>
            <th style={{ ...thS, textAlign: 'left', paddingLeft: 12 }}>Pieza</th>
            {tallesVisibles.map(t => <th key={t} style={thS}>{t}</th>)}
          </tr>
        </thead>
        <tbody>
          {piezas.map(pieza => (
            <tr key={pieza}>
              <td style={{ ...tdS, textAlign: 'left', paddingLeft: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {pieza}
              </td>
              {tallesVisibles.map(t => {
                const isEditing = editCell?.pieza === pieza && editCell?.talle === t
                const val = piezasMap[pieza]?.[t] || 0
                return (
                  <td
                    key={t}
                    style={{ ...tdS, cursor: readonly ? 'default' : 'pointer', background: isEditing ? '#f0f4ff' : 'transparent' }}
                    onClick={() => startEdit(pieza, t)}
                  >
                    {isEditing ? (
                      <input
                        type="number" min="0"
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitEdit()
                          if (e.key === 'Escape') setEditCell(null)
                        }}
                        style={{ width: 48, textAlign: 'center', padding: '2px 4px', fontSize: 13 }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ color: val === 0 ? '#ddd' : 'var(--text)' }}>{val || '—'}</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>

        {/* Fila de totales / resultado */}
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--border)' }}>
            <td style={{ ...tdS, textAlign: 'left', paddingLeft: 12, fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase' }}>
              PRENDAS
            </td>
            {tallesVisibles.map(t => {
              const min = minPerTalle[t]
              return (
                <td key={t} style={{ ...tdS }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <strong style={{
                      fontSize: 14,
                      color: min > 0 ? '#1a7a1a' : '#ccc',
                    }}>
                      {min}
                    </strong>
                    {min > 0 && onAchicar && !readonly && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 9, padding: '1px 5px', lineHeight: '14px' }}
                        onClick={e => { e.stopPropagation(); onAchicar(t) }}
                      >
                        Achicar ▼
                      </button>
                    )}
                  </div>
                </td>
              )
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
