import React from 'react'
import MarcadaSimContent, { S } from '../components/MarcadaSim'

export default function Marcada({ onMenuClick }) {
  return (
    <div style={S.wrap}>
      <div style={S.tbar}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button style={S.btn} onClick={onMenuClick}>☰</button>
          <span style={{ fontWeight:700, fontSize:13 }}>📐 Marcada</span>
        </div>
      </div>
      <MarcadaSimContent style={{ flex:1, overflow:'hidden' }} />
    </div>
  )
}
