export const TABLAS_TALLES = {
  adulto:   ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  nino:     ['2', '4', '6', '8', '10', '12', '14', '16'],
  malla:    ['40', '42', '44', '46', '48', '50', '52'],
  mallaesp: ['54', '56', '58'],
}

export const TALLES_ADULTO = TABLAS_TALLES.adulto
export const TALLES_NINO   = TABLAS_TALLES.nino
export const TALLES_MALLA  = TABLAS_TALLES.malla

// Estructura con label para Pedidos, Productos y Produccion
export const TABLAS = {
  adulto:   { label: 'Adulto',         talles: TABLAS_TALLES.adulto },
  nino:     { label: 'Niño',           talles: TABLAS_TALLES.nino },
  malla:    { label: 'Malla',          talles: TABLAS_TALLES.malla },
  mallaesp: { label: 'Malla Especial', talles: TABLAS_TALLES.mallaesp },
}

export const ORDEN_TALLES = [
  ...TABLAS_TALLES.adulto,
  ...TABLAS_TALLES.nino,
  ...TABLAS_TALLES.malla,
  ...TABLAS_TALLES.mallaesp,
]

export function inferirTabla(talles) {
  if (!talles) return 'adulto'
  const keys = Object.keys(talles)
  if (keys.some(k => TABLAS_TALLES.adulto.includes(k)))   return 'adulto'
  if (keys.some(k => TABLAS_TALLES.nino.includes(k)))     return 'nino'
  if (keys.some(k => TABLAS_TALLES.mallaesp.includes(k))) return 'mallaesp'
  if (keys.some(k => TABLAS_TALLES.malla.includes(k)))    return 'malla'
  return 'adulto'
}
