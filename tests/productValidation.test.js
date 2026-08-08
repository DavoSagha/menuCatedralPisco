import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeCreateDishPayload,
  normalizeDishState,
  validateProductImage,
} from '../src/lib/productValidation.js'

test('normaliza un producto nuevo sin persistir category_id', () => {
  const result = normalizeCreateDishPayload({
    category_id: 99,
    subcategory_id: '7',
    name: '  Ribs ahumadas  ',
    description: ' Costillar con BBQ ',
    price: '18500',
    currency: 'ars',
    allergens: [' gluten ', 'gluten', ''],
  })

  assert.deepEqual(result, {
    subcategory_id: 7,
    name: { es: 'Ribs ahumadas' },
    description: { es: 'Costillar con BBQ' },
    price: 18500,
    currency: 'ARS',
    ingredients: [],
    allergens: ['gluten'],
    diet_tags: [],
    spicy: false,
    image: null,
  })
  assert.equal('category_id' in result, false)
})

test('preserva traducciones válidas y descarta claves vacías', () => {
  const result = normalizeCreateDishPayload({
    subcategory_id: 2,
    name: { es: 'Café', en: ' Coffee ', ru: '' },
    description: { es: '', en: 'Espresso' },
    price: 0,
  })

  assert.deepEqual(result.name, { es: 'Café', en: 'Coffee' })
  assert.deepEqual(result.description, { es: '', en: 'Espresso' })
})

test('rechaza subcategoría, nombre y precio inválidos', () => {
  assert.throws(
    () => normalizeCreateDishPayload({ subcategory_id: 'x', name: 'Ribs', price: 10 }),
    /subcategoría/i,
  )
  assert.throws(
    () => normalizeCreateDishPayload({ subcategory_id: 1, name: ' ', price: 10 }),
    /nombre/i,
  )
  assert.throws(
    () => normalizeCreateDishPayload({ subcategory_id: 1, name: 'Ribs', price: -1 }),
    /precio/i,
  )
  assert.throws(
    () => normalizeCreateDishPayload({ subcategory_id: 1, name: 'Ribs', price: 1.5 }),
    /precio/i,
  )
})

test('visible y disponible deben ser booleanos', () => {
  assert.deepEqual(normalizeDishState({}), { visible: true, available: true })
  assert.deepEqual(
    normalizeDishState({ visible: false, available: true }),
    { visible: false, available: true },
  )
  assert.throws(() => normalizeDishState({ visible: 'false' }), /visible/i)
  assert.throws(() => normalizeDishState({ available: 0 }), /disponible/i)
})

test('valida tipo y tamaño de imágenes de producto', () => {
  const valid = { name: 'ribs.webp', type: 'image/webp', size: 1024 }
  assert.equal(validateProductImage(valid), valid)

  assert.throws(
    () => validateProductImage({ name: 'menu.svg', type: 'image/svg+xml', size: 10 }),
    /formato/i,
  )
  assert.throws(
    () => validateProductImage({ name: 'ribs.jpg', type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }),
    /5 MB/i,
  )
})
