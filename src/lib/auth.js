import { getSupabase } from './supabaseClient'
const supabase = () => getSupabase()

export async function login(email, password) {
  const { data, error } = await supabase().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/**
 * `metadata` va a user_metadata, que el propio usuario puede reescribir después
 * con auth.updateUser(). Por eso NUNCA puede llevar `role` ni `branch_id`: si
 * los llevara, cualquiera se registraría como admin. Los roles se asignan solo
 * del lado del servidor, en app_metadata, con la service_role.
 */
export async function signup(email, password, metadata) {
  const safeMetadata = { ...(metadata || {}) }
  delete safeMetadata.role
  delete safeMetadata.branch_id

  const { data, error } = await supabase().auth.signUp({
    email,
    password,
    options: { data: safeMetadata },
  })
  if (error) throw error
  return data
}

export async function logout() {
  const { error } = await supabase().auth.signOut()
  if (error) throw error
}

export function onAuthChange(callback) {
  return supabase().auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  }).data.subscription
}

export function getUser() {
  return supabase().auth.getUser()
}

/**
 * Lee de `app_metadata`, NO de `user_metadata`.
 *
 * `user_metadata` lo puede reescribir el propio usuario desde el navegador con
 * auth.updateUser({ data: { role: 'admin' } }). `app_metadata` solo lo escribe
 * la service_role, así que es el único lugar confiable para un rol.
 *
 * Ojo: esto es UI, no seguridad. Que el panel no se muestre no impide que
 * alguien llame a la API igual. Quien realmente autoriza son las políticas RLS
 * de migrations/004.
 */
export function getUserRole(user) {
  return user?.app_metadata?.role || null
}

export function getUserBranchId(user) {
  const id = user?.app_metadata?.branch_id
  if (id == null || id === '') return null
  const parsed = Number(id)
  return Number.isSafeInteger(parsed) ? parsed : null
}
