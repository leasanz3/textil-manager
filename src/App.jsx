import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Pedidos from './pages/Pedidos'
import { Productos, Contactos } from './pages/Telas'
import CatalogoTelas from './pages/CatalogoTelas'
import ComprasTela from './pages/ComprasTela'
import StockTela from './pages/StockTela'
import Proveedores from './pages/Proveedores'
import Compras from './pages/Compras'
import IVA from './pages/IVA'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menu = () => setSidebarOpen(true)
  return (
    <BrowserRouter>
      <div className="app">
        <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main">
          <Routes>
            <Route path="/" element={<Navigate to="/pedidos" replace />} />
            <Route path="/pedidos" element={<Pedidos onMenuClick={menu} />} />
            <Route path="/productos" element={<Productos onMenuClick={menu} />} />
            <Route path="/telas/catalogo" element={<CatalogoTelas onMenuClick={menu} />} />
            <Route path="/telas/compras" element={<ComprasTela onMenuClick={menu} />} />
            <Route path="/telas/stock" element={<StockTela onMenuClick={menu} />} />
            <Route path="/telas" element={<Navigate to="/telas/catalogo" replace />} />
            <Route path="/proveedores" element={<Proveedores onMenuClick={menu} />} />
            <Route path="/compras" element={<Compras onMenuClick={menu} />} />
            <Route path="/iva" element={<IVA onMenuClick={menu} />} />
            <Route path="/contactos" element={<Contactos onMenuClick={menu} />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
