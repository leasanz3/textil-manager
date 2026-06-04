# textil-manager — CONTEXT.md
> Actualizar al final de cada sesión de Claude Code.

## Stack
- React CRA · Supabase · Vercel
- Repo: github.com/leasanz3/textil-manager
- Deploy: textil-manager.vercel.app
- Local: C:\Users\LEANDRO\textil-manager

## Estructura
```
src/
├── pages/        # Un archivo por módulo
├── components/   # Sidebar
└── lib/          # supabase.js (cliente)
```

## Estética — boringpunk
- Tahoma 11px, sin border-radius
- Headers: gradiente #e8eef7 → #c8d4e8
- Hover: #ffffcc · Fondo: #d4d0c8

---

## Rutas activas (App.jsx)
| Ruta | Componente |
|------|-----------|
| / | Home |
| /pedidos | Pedidos |
| /productos | Productos |
| /produccion | Produccion |
| /corte | Corte |
| /diario | Diario (unifica Bitácora + Tareas) |
| /cotizacion | Cotizacion |
| /cuenta-corriente | CuentaCorriente |
| /telas/catalogo | CatalogoTelas |
| /telas/compras | ComprasTela |
| /telas/stock | StockTela |
| /avios/catalogo | CatalogoAvios |
| /avios/compras | ComprasAvios |
| /avios/stock | StockAvios |
| /compras | Compras |
| /proveedores | Proveedores |
| /iva | IVA |
| /contactos | Contactos |
| /bitacora | → redirect /diario |
| /tareas | → redirect /diario |

---

## Tablas Supabase
```
productos              — ficha técnica completa
pedidos                — órdenes de clientes
produccion_etapas      — lotes por etapa de producción
telas                  — catálogo de telas
avios                  — catálogo de avíos
compras                — facturas de compra
contactos              — clientes, proveedores, costureras
bitacora               — entradas diarias (legacy, unificado en diario)
tareas                 — tareas (legacy, unificado en diario)
cotizaciones           — presupuestos
cuenta_corriente       — movimientos por cliente
cortes_marcadas        — sesiones de corte
cortes_piezas          — piezas por marcada
cortes_ajustes         — modificaciones de pieza/talle
cortes_pedidos         — vínculo corte → pedido
cortes_marcadas_productos — vínculo marcada → producto
conocimiento_paginas   — base de conocimiento (pendiente)
```

## RLS
- Patrón que funciona: dos políticas ALL por tabla (public + authenticated)
- `user_id` debe enviarse explícitamente en cada insert
- **BUG ACTIVO**: insert en `cortes_marcadas` no envía `user_id` → RLS rechaza

---

## Etapas de pedido
```
recibido → presupuestado → confirmado → compra_tela → corte → taller → entrega → cancelado
```

---

## Módulos — estado actual

### Pedidos
- CRUD completo + autocomplete de cliente/producto
- Avance de etapas
- Chips de talles (bug: sin orden canónico — debe ser XS→S→M→L→XL→XXL / niño / malla)
- Pendiente: ordenar columnas al hacer click, vista detalle readonly, soporte talles adulto+niño por ítem

### Productos
- Ficha técnica completa: telas/RIB, piezas de corte, avíos por talle, variantes, molde, cliente
- Archivo más grande del proyecto (~104k chars) — refactor pendiente

### Corte
- Sesiones por producto, telas, marcadas, piezas, ajustes
- **Bug crítico**: insert `cortes_marcadas` no envía `user_id`
- Pendiente: múltiples productos/marcada, hoja A4 imprimible, resultado vs pedido

### Producción
- Hub por etapa (Corte / Taller / Entrega)
- Tabla `produccion_etapas` con hechas JSONB, responsable, historial

### Diario
- Unifica Bitácora + Tareas en /diario
- 3 columnas: árbol año/mes/día · editor + tareas · pedidos activos
- Bug: selector pedido muestra #id en vez de cliente — productos
- Bug: mobile sin hamburguesa / colapso de columnas

### Cotización
- Desglose de costos, calculadora bidireccional % ↔ precio
- Historial y estados

### Cuentas Corrientes
- Cargos al entregar, pagos, devoluciones, cheque
- Facturación parcial por cliente (ej: 50% con IVA + 50% con descuento sin factura)
- Pendiente: modal de entrega → cargo automático

---

## Bugs activos
1. `cortes_marcadas` insert sin `user_id` → RLS rechaza ⚠️ CRÍTICO
2. Chips talles en Pedidos sin orden canónico
3. Selector pedido en Diario muestra #id en vez de cliente+productos
4. Diario mobile: falta hamburguesa + colapso 3 cols → 1

## Pendientes generales
- Ordenar columnas en Pedidos (click en header)
- Modal entrega → cargo automático en Cuentas Corrientes
- Home: calendario mensual + 3 carriles (bloqueados / listos / entregas)
- Base de Conocimiento (/conocimiento)
- Contactos CRUD completo
- Stock automático al registrar compras
- Imagen resumen de pedido para compartir por WhatsApp
- Refactor: extraer constantes, servicios Supabase, split Productos.jsx y Pedidos.jsx

---

## Casos reales de referencia
- **Remeras jersey San Juan** → bloqueadas esperando grifas (cliente: Santiago y Lorena)
- **Camperas IEP t14** → bloqueadas por faja+puños tejidos (proveedor: Gabriel Rojas)
- **Canguro M + Pantalón t14 IEP** → listos para cortar, tela Vitamor, remanente justo
- **Pantalón British/IEP** → mezclan talles adulto y niño en mismo pedido
- **Pantalón IEP** → 8 pliegues, 2pp/par, 1L+1M por par
- **Boxer corto Sanz** → Tricot + Forro, pedido L/3 M/4 S/3
- **Santiago y Lorena** → facturación parcial 50% con IVA / 50% con 10% dto sin factura

---

## Contactos clave
- Patricia → costurera, jersey
- Andrea → taller El Pinar, camperas IEP
- Gabriel Rojas → proveedor tejido de punto, también padre IEP

---

## Workflow
1. Diseñar feature en claude.ai (TM-04)
2. Ejecutar en Claude Code con este contexto
3. `git add . && git commit -m "descripción" && git push origin main`
4. Vercel auto-deploya en textil-manager.vercel.app
5. Actualizar este archivo si hay cambios de estructura
