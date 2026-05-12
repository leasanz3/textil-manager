import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const NAV = [
  { section: 'Diario' },
  { path: '/diario',       icon: '📓', label: 'Diario' },
  { section: 'Producción' },
  { path: '/',             icon: '🏠', label: 'Home' },
  { path: '/pedidos',      icon: '📋', label: 'Pedidos' },
  { path: '/productos',    icon: '📦', label: 'Productos' },
  { path: '/produccion',   icon: '🏭', label: 'Producción' },
  { section: 'Telas' },
  { path: '/telas/catalogo', icon: '🧶', label: 'Catálogo' },
  { path: '/telas/compras',  icon: '🛒', label: 'Compras' },
  { path: '/telas/stock',    icon: '📊', label: 'Stock' },
  { section: 'Avíos' },
  { path: '/avios/catalogo', icon: '🧵', label: 'Catálogo' },
  { path: '/avios/compras',  icon: '🛒', label: 'Compras' },
  { path: '/avios/stock',    icon: '📊', label: 'Stock' },
  { section: 'Compras' },
  { path: '/proveedores', icon: '🏢', label: 'Proveedores' },
  { path: '/compras',     icon: '🧾', label: 'Facturas' },
  { section: 'Finanzas' },
  { path: '/cotizacion',       icon: '💰', label: 'Cotización' },
  { path: '/iva',              icon: '📄', label: 'IVA' },
  { path: '/cuenta-corriente', icon: '💳', label: 'Cuentas corrientes' },
  { section: 'Directorio' },
  { path: '/contactos',   icon: '👥', label: 'Contactos' },
]

export default function Sidebar({ open, onClose }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const handleNav = (path) => { navigate(path); onClose() }

  return (
    <div className={`sidebar ${open ? 'open' : ''}`}>
      {/* Logo / título */}
      <div className="sidebar-logo">
        <h1>🧵 TEXTIL MGR</h1>
        <p>Gestión de producción</p>
      </div>

      {/* Navegación */}
      <nav className="sidebar-nav">
        {NAV.map((item, i) =>
          item.section ? (
            <div key={i} className="nav-section">{item.section}</div>
          ) : (
            <div
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => handleNav(item.path)}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </div>
          )
        )}
      </nav>

      {/* Cerrar sesión */}
      <div style={{
        padding: '8px',
        borderTop: '1px solid var(--border)',
        background: '#f4f4ec',
      }}>
        <button
          className="btn btn-secondary btn-sm"
          style={{ width: '100%' }}
          onClick={() => supabase.auth.signOut()}
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  )
}
