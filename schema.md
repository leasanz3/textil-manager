# Esquema de Base de Datos — Textil Manager (Supabase)

Documentación inferida desde el código fuente. Refleja las tablas, columnas, tipos y relaciones usadas actualmente en la aplicación.

---

## Tablas

### `proveedores`
Catálogo de proveedores de telas, avíos y otros insumos.

| Columna     | Tipo      | Descripción                                              |
|-------------|-----------|----------------------------------------------------------|
| `id`        | integer   | PK                                                       |
| `nombre`    | text      | Nombre del proveedor                                     |
| `rut`       | text      | RUT / documento fiscal                                   |
| `tipo`      | text      | `'tela'` \| `'avios'` \| `'maquinaria'` \| `'varios'`   |
| `notas`     | text      | Dirección, condiciones de pago, etc.                     |
| `vendedores`| jsonb     | Array: `[{ nombre: string, tel: string }]`               |
| `created_at`| timestamp |                                                          |

---

### `telas`
Registro de partidas de tela compradas, con stock y rendimiento.

| Columna            | Tipo      | Descripción                                         |
|--------------------|-----------|-----------------------------------------------------|
| `id`               | integer   | PK                                                  |
| `tipo`             | text      | Nombre / tipo de tela                               |
| `codigo`           | text      | Código del proveedor                                |
| `color`            | text      | Color o descripción visual                          |
| `proveedor`        | text      | Nombre (desnormalizado)                             |
| `proveedor_id`     | integer   | FK → `proveedores.id`                               |
| `compra_id`        | integer   | FK → `compras.id`                                   |
| `unidad`           | text      | `'m'` \| `'kg'`                                     |
| `metros`           | numeric   | Metros comprados (cantidad inicial)                 |
| `metros_iniciales` | numeric   | Metros al momento de recibir la partida             |
| `usados`           | numeric   | Metros consumidos en producción                     |
| `stock_disponible` | numeric   | Stock actual en metros                              |
| `stock_metros`     | numeric   | Stock en metros para seguimiento detallado          |
| `unidad_stock`     | text      | `'m'` \| `'kg'`                                     |
| `precio`           | numeric   | Precio unitario                                     |
| `moneda`           | text      | `'UYU'` \| `'USD'`                                  |
| `rendimiento`      | numeric   | Metros por kg (factor de conversión)                |
| `fecha`            | date      | Fecha de la compra                                  |
| `notas`            | text      |                                                     |
| `created_at`       | timestamp |                                                     |

---

### `avios`
Catálogo de avíos y accesorios (elásticos, botones, cierres, hilos, etc.).

| Columna            | Tipo      | Descripción                                                                          |
|--------------------|-----------|--------------------------------------------------------------------------------------|
| `id`               | integer   | PK                                                                                   |
| `nombre`           | text      | Nombre del avío                                                                      |
| `tipo`             | text      | `'Elástico'` \| `'Botón'` \| `'Cierre'` \| `'Entretela'` \| `'Hilo'` \| otros      |
| `codigo`           | text      | Código del proveedor                                                                 |
| `descripcion`      | text      | Color, tamaño, especificaciones                                                      |
| `proveedor`        | text      | Nombre (desnormalizado)                                                              |
| `proveedor_id`     | integer   | FK → `proveedores.id`                                                                |
| `unidad`           | text      | `'unidad'` \| `'m'` \| `'cm'` \| `'kg'` \| `'g'` \| `'rollo'` \| `'docena'` \| `'caja'` |
| `precio`           | numeric   | Precio unitario                                                                      |
| `moneda`           | text      | `'UYU'` \| `'USD'`                                                                   |
| `stock_disponible` | numeric   | Stock disponible                                                                     |
| `notas`            | text      |                                                                                      |
| `created_at`       | timestamp |                                                                                      |

---

### `compras`
Cabezal de facturas de compra. Centraliza los datos fiscales.

| Columna          | Tipo      | Descripción                                                          |
|------------------|-----------|----------------------------------------------------------------------|
| `id`             | integer   | PK                                                                   |
| `proveedor`      | text      | Nombre (desnormalizado)                                              |
| `proveedor_id`   | integer   | FK → `proveedores.id`                                                |
| `factura`        | text      | Número de factura                                                    |
| `fecha`          | date      | Fecha de la factura                                                  |
| `moneda`         | text      | `'UYU'` \| `'USD'`                                                   |
| `total_usd`      | numeric   | Total en dólares (si aplica)                                         |
| `dolar_fiscal`   | numeric   | Tipo de cambio para liquidar IVA                                     |
| `dolar_costeo`   | numeric   | Tipo de cambio de pago (para costeo)                                 |
| `subtotal`       | numeric   | Subtotal sin IVA                                                     |
| `iva`            | numeric   | IVA 22% acreditable                                                  |
| `total_uyu`      | numeric   | Total en pesos (base para IVA)                                       |
| `total_final`    | numeric   | Total pagado en pesos                                                |
| `acredita_iva`   | boolean   | `true` si la factura acredita IVA (Consumidor Final = `false`)       |
| `tiene_items`    | boolean   | `true` si tiene ítems de tela/avío vinculados                        |
| `notas`          | text      |                                                                      |
| `created_at`     | timestamp |                                                                      |

---

### `compras_tela`
Líneas de detalle de compras de tela (ítem por ítem de factura).

| Columna           | Tipo      | Descripción                       |
|-------------------|-----------|-----------------------------------|
| `id`              | integer   | PK                                |
| `tela_id`         | integer   | FK → `telas.id`                   |
| `compra_id`       | integer   | FK → `compras.id`                 |
| `cantidad`        | numeric   | Cantidad comprada                 |
| `unidad`          | text      | `'kg'` \| `'m'`                   |
| `precio_lista`    | numeric   | Precio de lista (sin descuento)   |
| `descuento_pct`   | numeric   | Descuento en porcentaje           |
| `descuento_monto` | numeric   | Descuento en monto                |
| `precio_unitario` | numeric   | Precio efectivo por unidad        |
| `moneda`          | text      | `'UYU'` \| `'USD'`                |
| `tc`              | numeric   | Tipo de cambio aplicado           |
| `total_factura`   | numeric   | Total del renglón                 |
| `fecha`           | date      | Fecha del movimiento              |
| `notas`           | text      |                                   |
| `created_at`      | timestamp |                                   |

---

### `compras_avios`
Líneas de detalle de compras de avíos.

| Columna           | Tipo      | Descripción                       |
|-------------------|-----------|-----------------------------------|
| `id`              | integer   | PK                                |
| `avio_id`         | integer   | FK → `avios.id`                   |
| `compra_id`       | integer   | FK → `compras.id`                 |
| `cantidad`        | numeric   | Cantidad comprada                 |
| `unidad`          | text      | Unidad de medida                  |
| `precio_lista`    | numeric   | Precio de lista                   |
| `descuento_pct`   | numeric   | Descuento en porcentaje           |
| `descuento_monto` | numeric   | Descuento en monto                |
| `precio_unitario` | numeric   | Precio efectivo por unidad        |
| `moneda`          | text      | `'UYU'` \| `'USD'`                |
| `tc`              | numeric   | Tipo de cambio aplicado           |
| `total_factura`   | numeric   | Total del renglón                 |
| `fecha`           | date      | Fecha del movimiento              |
| `notas`           | text      |                                   |
| `created_at`      | timestamp |                                   |

---

### `tipos_cambio`
Historial de tipos de cambio USD/UYU registrados manualmente.

| Columna      | Tipo      | Descripción                               |
|--------------|-----------|-------------------------------------------|
| `id`         | integer   | PK                                        |
| `valor`      | numeric   | Tipo de cambio (ej: `39.90`)              |
| `fecha`      | date      | Fecha del registro                        |
| `notas`      | text      | Referencia (factura, proveedor, etc.)     |
| `created_at` | timestamp |                                           |

---

### `rendimientos_tela`
Rendimientos reales medidos por lote de tela (metros obtenidos por kg).

| Columna       | Tipo      | Descripción                                    |
|---------------|-----------|------------------------------------------------|
| `id`          | integer   | PK                                             |
| `tela_id`     | integer   | FK → `telas.id`                                |
| `kg`          | numeric   | Kilogramos del lote medido                     |
| `metros`      | numeric   | Metros obtenidos del lote                      |
| `rendimiento` | numeric   | `metros / kg` (calculado al insertar)          |
| `fecha`       | date      | Fecha del registro                             |
| `notas`       | text      | Observaciones del lote                         |
| `created_at`  | timestamp |                                                |

---

### `stock_avios`
Stock actual consolidado por avío.

| Columna            | Tipo      | Descripción                      |
|--------------------|-----------|----------------------------------|
| `id`               | integer   | PK                               |
| `avio_id`          | integer   | FK → `avios.id`                  |
| `stock_disponible` | numeric   | Cantidad disponible              |
| `unidad`           | text      | Unidad de medida                 |
| `updated_at`       | timestamp | Última actualización             |
| `created_at`       | timestamp |                                  |

---

### `productos`
Fichas técnicas de productos con piezas, materiales y procesos de confección.

| Columna              | Tipo      | Descripción                                                                                                           |
|----------------------|-----------|-----------------------------------------------------------------------------------------------------------------------|
| `id`                 | integer   | PK                                                                                                                    |
| `nombre`             | text      | Nombre del producto                                                                                                   |
| `codigo`             | text      | Código auto-generado (ej: `CANG-001`)                                                                                 |
| `tabla`              | text      | Tabla de talles: `'adulto'` \| `'nino'` \| `'malla'` \| `'mallaesp'`                                                 |
| `base_id`            | integer   | FK → `productos.id` (producto base del que hereda; null si es original)                                               |
| `tela1_id`           | integer   | FK → `telas.id` (tela principal)                                                                                      |
| `tela2_id`           | integer   | FK → `telas.id` (tela secundaria)                                                                                     |
| `rib_id`             | integer   | FK → `telas.id` (tela para puños / cuellos)                                                                           |
| `piezas`             | jsonb     | `[{ nombre: string, mult: integer, tela_rol: 'tela1'\|'tela2'\|'rib' }]`                                              |
| `procesos`           | jsonb     | `[{ id: string, label: string, nota: string }]`                                                                       |
| `avios_medidas`      | jsonb     | `[{ nombre, unit, todos, ancho, medidas: { [talle]: valor } }]`                                                       |
| `terminaciones`      | jsonb     | `{ grifaTalle: boolean, grifa: boolean, talle: boolean }`                                                             |
| `terminaciones_extra`| jsonb     | `[{ nombre: string }]`                                                                                                |
| `notas`              | text      |                                                                                                                       |
| `created_at`         | timestamp |                                                                                                                       |

---

### `pedidos`
Órdenes de producción por cliente, con seguimiento por etapa.

| Columna        | Tipo      | Descripción                                                                                       |
|----------------|-----------|---------------------------------------------------------------------------------------------------|
| `id`           | integer   | PK                                                                                                |
| `producto`     | text      | Nombre del producto pedido                                                                        |
| `cliente`      | text      | Nombre del cliente                                                                                |
| `talles`       | jsonb     | Cantidades por talle: `{ XS: 5, S: 10, M: 8, ... }`                                              |
| `etapa_actual` | text      | `'corte'` \| `'taller'` \| `'estampado'` \| `'bordado'` \| `'sublimado'` \| `'entrega'` \| `'cancelado'` |
| `fecha`        | date      | Fecha de entrega comprometida                                                                     |
| `created_at`   | timestamp |                                                                                                   |

---

### `contactos`
Contactos varios (no proveedores).

| Columna      | Tipo      | Descripción           |
|--------------|-----------|-----------------------|
| `id`         | integer   | PK                    |
| `nombre`     | text      | Nombre del contacto   |
| `tipo`       | text      | Categoría / rol       |
| `tel`        | text      | Teléfono              |
| `notas`      | text      |                       |
| `created_at` | timestamp |                       |

---

## Diagrama de Relaciones

```
proveedores
  ├─(1:N)─→ telas          (proveedor_id)
  ├─(1:N)─→ avios          (proveedor_id)
  └─(1:N)─→ compras        (proveedor_id)

compras
  ├─(1:N)─→ compras_tela   (compra_id)
  ├─(1:N)─→ compras_avios  (compra_id)
  └─(1:N)─→ telas          (compra_id)

telas
  ├─(1:N)─→ compras_tela   (tela_id)
  ├─(1:N)─→ rendimientos_tela (tela_id)
  └─(1:N)─→ productos      (tela1_id / tela2_id / rib_id)

avios
  ├─(1:N)─→ compras_avios  (avio_id)
  └─(1:1)─→ stock_avios    (avio_id)

productos
  └─(1:N)─→ productos      (base_id — self-join para variantes)

tipos_cambio  — tabla independiente
contactos     — tabla independiente
pedidos       — tabla independiente (sin FK)
```

---

## Notas sobre tipos JSONB

| Campo                           | Estructura                                                             |
|---------------------------------|------------------------------------------------------------------------|
| `proveedores.vendedores`        | `[{ nombre: string, tel: string }]`                                    |
| `productos.piezas`              | `[{ nombre: string, mult: integer, tela_rol: 'tela1'\|'tela2'\|'rib' }]` |
| `productos.procesos`            | `[{ id: string, label: string, nota: string }]`                        |
| `productos.avios_medidas`       | `[{ nombre, unit, todos, ancho, medidas: { [talle]: number } }]`       |
| `productos.terminaciones`       | `{ grifaTalle: boolean, grifa: boolean, talle: boolean }`              |
| `productos.terminaciones_extra` | `[{ nombre: string }]`                                                 |
| `pedidos.talles`                | `{ [talle: string]: number }` — ej: `{ XS: 5, S: 10, M: 8 }`         |

---

## Convenciones

- Todos los IDs son `integer` autoincremental (secuencia de Postgres / Supabase default).
- Todos los `created_at` / `updated_at` son `timestamp with time zone`.
- Campos de nombre de proveedor desnormalizados (ej: `telas.proveedor`) se mantienen por legibilidad en listados, pero la FK `proveedor_id` es la fuente de verdad.
- Los montos en `NUMERIC` se almacenan sin redondeo; el redondeo a 2 decimales se aplica en la capa de presentación.
- Los campos `moneda` usan siempre `'UYU'` o `'USD'` en mayúsculas.
