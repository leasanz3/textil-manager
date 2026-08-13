import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Pedidos from './pages/Pedidos'
import Productos from './pages/Productos'
import Produccion from './pages/Produccion'
import Contactos from './pages/Contactos'
import CatalogoTelas from './pages/CatalogoTelas'
import ComprasTela from './pages/ComprasTela'
import StockTela from './pages/StockTela'
import CatalogoAvios from './pages/CatalogoAvios'
import ComprasAvios from './pages/ComprasAvios'
import StockAvios from './pages/StockAvios'
import Proveedores from './pages/Proveedores'
import Compras from './pages/Compras'
import IVA from './pages/IVA'
import Bitacora from './pages/Bitacora'
import Tareas from './pages/Tareas'
import Diario from './pages/Diario'
import Home from './pages/Home'
import Cotizacion from './pages/Cotizacion'
import CuentaCorriente from './pages/CuentaCorriente'
import Corte from './pages/Corte'
import Marcada from './pages/Marcada'
import Talleres from './pages/Talleres'
import CatalogoPrendas from './pages/CatalogoPrendas'
import StockPrendas from './pages/StockPrendas'
import ComprasPrendas from './pages/ComprasPrendas'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = cargando
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menu = () => setSidebarOpen(true)

  useEffect(() => {
    // Sesión actual
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
    // Escuchar cambios (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Todavía resolviendo sesión
  if (session === undefined) return null

  // Sin sesión → Login
  if (!session) return <Login />

  // Con sesión → App completa
  return (
    <BrowserRouter>
      <div className="app">
        <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main">
          <Routes>
            <Route path="/" element={<Home onMenuClick={menu} />} />
            <Route path="/produccion" element={<Produccion onMenuClick={menu} />} />
            <Route path="/pedidos" element={<Pedidos onMenuClick={menu} />} />
            <Route path="/productos" element={<Productos onMenuClick={menu} />} />
            <Route path="/telas/catalogo" element={<CatalogoTelas onMenuClick={menu} />} />
            <Route path="/telas/compras" element={<ComprasTela onMenuClick={menu} />} />
            <Route path="/telas/stock" element={<StockTela onMenuClick={menu} />} />
            <Route path="/telas" element={<Navigate to="/telas/catalogo" replace />} />
            <Route path="/avios/catalogo" element={<CatalogoAvios onMenuClick={menu} />} />
            <Route path="/avios/compras" element={<ComprasAvios onMenuClick={menu} />} />
            <Route path="/avios/stock" element={<StockAvios onMenuClick={menu} />} />
            <Route path="/avios" element={<Navigate to="/avios/catalogo" replace />} />
            <Route path="/prendas/catalogo" element={<CatalogoPrendas onMenuClick={menu} />} />
            <Route path="/prendas/stock" element={<StockPrendas onMenuClick={menu} />} />
            <Route path="/prendas/compras" element={<ComprasPrendas onMenuClick={menu} />} />
            <Route path="/prendas" element={<Navigate to="/prendas/catalogo" replace />} />
            <Route path="/proveedores" element={<Proveedores onMenuClick={menu} />} />
            <Route path="/compras" element={<Compras onMenuClick={menu} />} />
            <Route path="/cotizacion" element={<Cotizacion onMenuClick={menu} />} />
            <Route path="/iva" element={<IVA onMenuClick={menu} />} />
            <Route path="/cuenta-corriente" element={<CuentaCorriente onMenuClick={menu} />} />
            <Route path="/corte" element={<Corte onMenuClick={menu} />} />
            <Route path="/marcada" element={<Marcada onMenuClick={menu} />} />
            <Route path="/talleres" element={<Talleres onMenuClick={menu} />} />
            <Route path="/contactos" element={<Contactos onMenuClick={menu} />} />
            <Route path="/diario" element={<Diario onMenuClick={menu} />} />
            <Route path="/bitacora" element={<Navigate to="/diario" replace />} />
            <Route path="/tareas" element={<Navigate to="/diario" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
