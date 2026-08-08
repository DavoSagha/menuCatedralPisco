import { getSupabase } from './supabaseClient'
import {
  normalizeCreateDishPayload,
  normalizeDishState,
  validateProductImage,
} from './productValidation'

const PRODUCT_IMAGE_BUCKET = 'product-images'

export function invalidateCache() {
}

function requirePositiveId(value, label) {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`${label} es inválido`)
  return id
}

function mapItem(item) {
  return {
    id: String(item.id),
    subcategoryId: String(item.subcategory_id),
    name: item.name,
    description: item.description,
    image: item.image || null,
    price: item.price,
    currency: item.currency || 'ARS',
    ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
    allergens: item.allergens || [],
    diet_tags: item.diet_tags || [],
    spicy: item.spicy || false,
  }
}

function availabilityForBranch(rows) {
  const availability = Array.isArray(rows) ? rows[0] : null
  return {
    available: availability?.available ?? true,
    visible: availability?.visible ?? true,
  }
}

function getManagedImagePath(image) {
  if (!image || typeof image !== 'string') return null
  const value = image.trim()
  if (!value || value.startsWith('blob:') || value.startsWith('data:')) return null

  if (!/^https?:\/\//i.test(value)) {
    return value
      .replace(/^\/+/, '')
      .replace(new RegExp(`^${PRODUCT_IMAGE_BUCKET}/`), '')
  }

  try {
    const url = new URL(value)
    const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex === -1) return null
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
  } catch {
    return null
  }
}

function imageExtension(file) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

async function updateDishImage(itemId, image) {
  const { data, error } = await getSupabase()
    .from('items')
    .update({ image })
    .eq('id', itemId)
    .is('deleted_at', null)
    .select('id, image')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('No se encontró un producto activo para actualizar la imagen')
  return data
}

async function removeStoredImage(image) {
  const path = getManagedImagePath(image)
  if (!path) return

  const { error } = await getSupabase().storage.from(PRODUCT_IMAGE_BUCKET).remove([path])
  if (error) throw error
}

export async function getBranches() {
  const { data, error } = await getSupabase().from('branches').select('*').order('id')
  if (error) throw error
  return data || []
}

export async function getBranchBySlug(slug) {
  const { data, error } = await getSupabase()
    .from('branches')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data || null
}

export async function getCatalogNavigation() {
  const { data, error } = await getSupabase()
    .from('categories')
    .select('id, image, name, subcategories(id, category_id, name, description)')
    .order('id')

  if (error) throw error

  return (data || []).map((category) => ({
    id: String(category.id),
    image: category.image || null,
    name: category.name,
    subcategories: (category.subcategories || [])
      .sort((left, right) => Number(left.id) - Number(right.id))
      .map((subcategory) => ({
        id: String(subcategory.id),
        categoryId: String(category.id),
        name: subcategory.name,
        description: subcategory.description,
      })),
  }))
}

export async function getItemsBySubcategory(subcategoryId) {
  const id = requirePositiveId(subcategoryId, 'El ID de subcategoría')
  const { data, error } = await getSupabase()
    .from('items')
    .select('*')
    .eq('subcategory_id', id)
    .is('deleted_at', null)
    .order('id')

  if (error) throw error
  return (data || []).map(mapItem)
}

export async function getBranchItems(subcategoryId, branchId) {
  const subcategory_id = requirePositiveId(subcategoryId, 'El ID de subcategoría')
  const branch_id = requirePositiveId(branchId, 'El ID de sucursal')
  const { data, error } = await getSupabase()
    .from('items')
    .select('*, availability:item_availability(branch_id, available, visible)')
    .eq('subcategory_id', subcategory_id)
    .is('deleted_at', null)
    .eq('availability.branch_id', branch_id)
    .order('id')

  if (error) throw error
  return (data || []).map((item) => ({
    ...mapItem(item),
    ...availabilityForBranch(item.availability),
  }))
}

export async function getMenuData(branchSlug) {
  const branch = branchSlug ? await getBranchBySlug(branchSlug) : null
  const branchId = branch?.id

  const { data: categories, error } = await getSupabase()
    .from('categories')
    .select('*, subcategories:subcategories(*, items:items(*))')
    .is('subcategories.items.deleted_at', null)
    .order('id')

  if (error) throw error

  const availMap = {}
  const visibleMap = {}
  if (branchId) {
    const { data: availability, error: availabilityError } = await getSupabase()
      .from('item_availability')
      .select('item_id, available, visible')
      .eq('branch_id', branchId)

    if (availabilityError) throw availabilityError
    ;(availability || []).forEach((entry) => {
      availMap[entry.item_id] = entry.available
      visibleMap[entry.item_id] = entry.visible
    })
  }

  const merged = (categories || []).map((category) => ({
    id: String(category.id),
    image: category.image,
    name: category.name,
    subcategories: (category.subcategories || []).map((subcategory) => ({
      id: String(subcategory.id),
      name: subcategory.name,
      description: subcategory.description,
      items: (subcategory.items || [])
        .filter((item) => !item.deleted_at)
        .filter((item) => !branchId || visibleMap[item.id] !== false)
        .map((item) => ({
          ...mapItem(item),
          image: resolveProductImageUrl(item.image),
          available: branchId ? (availMap[item.id] ?? true) : true,
        })),
    })),
  }))

  return {
    restaurant: { name: { es: 'La Catedral del Pisco', en: 'La Catedral del Pisco', ru: 'Таксон' } },
    categories: merged,
    branch,
  }
}

export async function getBranchAvailability(branchId) {
  const branch_id = requirePositiveId(branchId, 'El ID de sucursal')
  const { data, error } = await getSupabase()
    .from('items')
    .select(`
      *,
      subcategory:subcategories!inner(
        id,
        name,
        category:categories!inner(id, name)
      ),
      availability:item_availability(branch_id, available, visible)
    `)
    .is('deleted_at', null)
    .eq('availability.branch_id', branch_id)
    .order('id')

  if (error) throw error

  return (data || []).map((item) => ({
    ...mapItem(item),
    categoryName: item.subcategory?.category?.name,
    subcategoryName: item.subcategory?.name,
    ...availabilityForBranch(item.availability),
  }))
}

export async function getDeletedItems() {
  const { data, error } = await getSupabase()
    .from('items')
    .select(`
      *,
      subcategory:subcategories!inner(
        id,
        name,
        category:categories!inner(id, name)
      ),
      availability:item_availability(branch_id, available, visible)
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) throw error

  return (data || []).map((item) => ({
    ...mapItem(item),
    deletedAt: item.deleted_at,
    categoryId: String(item.subcategory.category.id),
    categoryName: item.subcategory.category.name,
    subcategoryId: String(item.subcategory.id),
    subcategoryName: item.subcategory.name,
    availability: item.availability || [],
  }))
}

export async function toggleAvailability(itemId, branchId, available) {
  if (typeof available !== 'boolean') throw new Error('Disponible debe ser booleano')
  const { data, error } = await getSupabase()
    .from('item_availability')
    .upsert(
      {
        item_id: requirePositiveId(itemId, 'El ID de producto'),
        branch_id: requirePositiveId(branchId, 'El ID de sucursal'),
        available,
      },
      { onConflict: 'item_id,branch_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function toggleVisibility(itemId, branchId, visible) {
  if (typeof visible !== 'boolean') throw new Error('Visible debe ser booleano')
  const { data, error } = await getSupabase()
    .from('item_availability')
    .upsert(
      {
        item_id: requirePositiveId(itemId, 'El ID de producto'),
        branch_id: requirePositiveId(branchId, 'El ID de sucursal'),
        visible,
      },
      { onConflict: 'item_id,branch_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createDish(payload, state = {}) {
  const dish = normalizeCreateDishPayload(payload)
  const { visible, available } = normalizeDishState(state)
  const { data, error } = await getSupabase().rpc('create_dish_with_availability', {
    p_subcategory_id: dish.subcategory_id,
    p_name: dish.name,
    p_description: dish.description,
    p_price: dish.price,
    p_currency: dish.currency,
    p_ingredients: dish.ingredients,
    p_allergens: dish.allergens,
    p_diet_tags: dish.diet_tags,
    p_spicy: dish.spicy,
    p_image: dish.image,
    p_visible: visible,
    p_available: available,
  })

  if (error) throw error
  const created = Array.isArray(data) ? data[0] : data
  if (!created) throw new Error('La base de datos no devolvió el producto creado')
  return mapItem(created)
}

export async function updateDish(itemId, fields) {
  const id = requirePositiveId(itemId, 'El ID de producto')
  const { data, error } = await getSupabase()
    .from('items')
    .update(fields)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('No se encontró un producto activo para actualizar')
  return mapItem(data)
}

export async function softDeleteDish(itemId) {
  const id = requirePositiveId(itemId, 'El ID de producto')
  const { data, error } = await getSupabase()
    .from('items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('El producto no existe o ya estaba eliminado')
  return { ...mapItem(data), deletedAt: data.deleted_at }
}

export async function restoreDish(itemId) {
  const id = requirePositiveId(itemId, 'El ID de producto')
  const { data, error } = await getSupabase()
    .from('items')
    .update({ deleted_at: null })
    .eq('id', id)
    .not('deleted_at', 'is', null)
    .select()
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('El producto no existe o ya estaba restaurado')
  return mapItem(data)
}

export async function deleteDish(itemId) {
  return softDeleteDish(itemId)
}

export function resolveProductImageUrl(image) {
  if (!image || typeof image !== 'string') return null
  const value = image.trim()
  if (!value) return null
  if (/^(https?:|blob:|data:)/i.test(value) || value.startsWith('/')) return value

  const path = getManagedImagePath(value)
  if (!path) return value
  return getSupabase().storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function replaceDishImage(itemId, file, currentImage = null) {
  const id = requirePositiveId(itemId, 'El ID de producto')
  validateProductImage(file)

  const uniqueId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const path = `items/${id}/${uniqueId}.${imageExtension(file)}`
  const storage = getSupabase().storage.from(PRODUCT_IMAGE_BUCKET)
  const { error: uploadError } = await storage.upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })
  if (uploadError) throw uploadError

  try {
    await updateDishImage(id, path)
  } catch (error) {
    await storage.remove([path])
    throw error
  }

  try {
    await removeStoredImage(currentImage)
  } catch (error) {
    const { error: rollbackError } = await getSupabase()
      .from('items')
      .update({ image: currentImage || null })
      .eq('id', id)
    await storage.remove([path])
    if (rollbackError) {
      throw new Error(`La imagen se actualizó, pero fallaron la limpieza y el rollback: ${error.message}`)
    }
    throw new Error(`No se pudo reemplazar la imagen anterior: ${error.message}`)
  }

  return { image: path, url: resolveProductImageUrl(path) }
}

export async function removeDishImage(itemId, currentImage = null) {
  const id = requirePositiveId(itemId, 'El ID de producto')
  await updateDishImage(id, null)

  try {
    await removeStoredImage(currentImage)
  } catch (error) {
    const { error: rollbackError } = await getSupabase()
      .from('items')
      .update({ image: currentImage || null })
      .eq('id', id)
    if (rollbackError) {
      throw new Error(`No se pudo borrar la imagen ni restaurar su referencia: ${error.message}`)
    }
    throw new Error(`No se pudo borrar la imagen: ${error.message}`)
  }

  return null
}

export async function updateMenuTable(table, id, values) {
  const { error } = await getSupabase().from(table).update(values).eq('id', Number(id))
  if (error) throw error
}

export async function insertMenuTable(table, values) {
  const { data, error } = await getSupabase().from(table).insert(values).select().single()
  if (error) throw error
  return data
}

export async function deleteMenuTable(table, id) {
  if (table === 'items') return softDeleteDish(id)
  const { error } = await getSupabase().from(table).delete().eq('id', Number(id))
  if (error) throw error
}
