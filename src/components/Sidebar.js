import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const NAV = [
  { section: 'Producción' },
  { path: '/pedidos', icon: '📋', label: 'Pedidos' },
  { path: '/productos', icon: '📦', label: 'Productos' },
  { section: 'Insumos' },
  { path: '/telas', icon: '🧶', label: 'Telas' },
  { section: 'Compras' },
  { path: '/proveedores', icon: '🏢', label: 'Proveedores' },
  { path: '/compras', icon: '🧾', label: 'Facturas' },
  { section: 'Finanzas' },
  { path: '/iva', icon: '📄', label: 'IVA' },
  { section: 'Directorio' },
  { path: '/contactos', icon: '👥', label: 'Contactos' },
]

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleNav = (path) => {
    navigate(path)
    onClose()
  }

  return (
    <div className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <h1>🧵 TEXTIL MGR</h1>
        <p>Gestión de producción</p>
      </div>
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
    </div>
  )
}
