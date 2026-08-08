/**
 * Recuerda la última sucursal elegida.
 *
 * El valor guardado NUNCA se usa como fuente de verdad: siempre se valida
 * contra la lista real de sucursales antes de navegar. localStorage lo puede
 * editar cualquiera desde la consola, así que se trata como entrada sucia.
 */

const STORAGE_KEY = 'tucson.branch'
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/

function safeStorage() {
  try {
    // En modo privado de algunos navegadores localStorage existe pero tira al escribir.
    return globalThis.localStorage || null
  } catch {
    return null
  }
}

export function readPreferredBranch() {
  try {
    const value = safeStorage()?.getItem(STORAGE_KEY)
    return value && SLUG_PATTERN.test(value) ? value : null
  } catch {
    return null
  }
}

export function writePreferredBranch(slug) {
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) return
  try {
    safeStorage()?.setItem(STORAGE_KEY, slug)
  } catch {
    // Sin persistencia la app sigue andando: sucursal por defecto y listo.
  }
}

/**
 * Resuelve a qué sucursal mandar al usuario, en orden de preferencia:
 * la guardada (si sigue existiendo) → la primera de la lista → null.
 */
export function resolveBranchSlug(branches) {
  if (!Array.isArray(branches) || branches.length === 0) return null

  const preferred = readPreferredBranch()
  if (preferred && branches.some((b) => b.slug === preferred)) return preferred

  return branches[0]?.slug || null
}
