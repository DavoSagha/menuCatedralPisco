const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024
const SUPPORTED_PRODUCT_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

function normalizeLocalizedText(value, label, { required }) {
  if (typeof value === 'string') {
    const text = value.trim()
    if (required && !text) throw new Error(`${label} es obligatorio`)
    return { es: text }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (required) throw new Error(`${label} es obligatorio`)
    return { es: '' }
  }

  const entries = Object.entries(value)
    .filter(([key, text]) => key.trim() && typeof text === 'string')
    .map(([key, text]) => [key.trim(), text.trim()])
    .filter(([, text]) => !required || Boolean(text))

  if (required && entries.length === 0) throw new Error(`${label} es obligatorio`)
  return Object.fromEntries(entries)
}

function normalizeStringArray(value, label) {
  if (value == null) return []
  if (!Array.isArray(value)) throw new Error(`${label} debe ser una lista`)

  return [...new Set(value.map((entry) => {
    if (typeof entry !== 'string') throw new Error(`${label} contiene un valor inválido`)
    return entry.trim()
  }).filter(Boolean))]
}

export function normalizeCreateDishPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Los datos del producto son obligatorios')
  }

  const subcategoryId = Number(payload.subcategory_id)
  if (!Number.isSafeInteger(subcategoryId) || subcategoryId <= 0) {
    throw new Error('La subcategoría es inválida')
  }

  const price = Number(payload.price)
  if (!Number.isSafeInteger(price) || price < 0) {
    throw new Error('El precio debe ser un entero mayor o igual a cero')
  }

  const currency = typeof payload.currency === 'string'
    ? payload.currency.trim().toUpperCase()
    : 'ARS'
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('La moneda debe tener tres letras')

  if (payload.spicy != null && typeof payload.spicy !== 'boolean') {
    throw new Error('El estado picante debe ser booleano')
  }

  if (payload.image != null && typeof payload.image !== 'string') {
    throw new Error('La imagen debe ser una URL o path válido')
  }

  return {
    subcategory_id: subcategoryId,
    name: normalizeLocalizedText(payload.name, 'El nombre', { required: true }),
    description: normalizeLocalizedText(payload.description ?? '', 'La descripción', { required: false }),
    price,
    currency,
    ingredients: normalizeStringArray(payload.ingredients, 'Ingredientes'),
    allergens: normalizeStringArray(payload.allergens, 'Alérgenos'),
    diet_tags: normalizeStringArray(payload.diet_tags, 'Etiquetas dietarias'),
    spicy: payload.spicy ?? false,
    image: payload.image?.trim() || null,
  }
}

export function normalizeDishState(state = {}) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('La configuración de disponibilidad es inválida')
  }

  const visible = state.visible ?? true
  const available = state.available ?? true
  if (typeof visible !== 'boolean') throw new Error('Visible debe ser booleano')
  if (typeof available !== 'boolean') throw new Error('Disponible debe ser booleano')

  return { visible, available }
}

export function validateProductImage(file) {
  if (!file || typeof file !== 'object') throw new Error('Seleccioná una imagen')
  if (!SUPPORTED_PRODUCT_IMAGE_TYPES.has(file.type)) {
    throw new Error('Formato de imagen inválido. Usá JPG, PNG o WebP')
  }
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error('La imagen está vacía')
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error('La imagen no puede superar 5 MB')
  return file
}
