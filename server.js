import express from 'express'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3002

// Límites del endpoint de chat. El objetivo es que /api/chat no se pueda usar
// como un proxy gratuito hacia Gemini ni como vector de gasto.
const CHAT_MAX_MESSAGES = 20
const CHAT_MAX_CHARS = 1500
const CHAT_WINDOW_MS = 60_000
const CHAT_MAX_PER_WINDOW = 12

const app = express()

// Detrás de un proxy (Nginx, Fly, Railway) hay que confiar en X-Forwarded-For
// para que el rate limit lea la IP real y no la del proxy.
if (process.env.TRUST_PROXY) app.set('trust proxy', 1)

// 32kb alcanza de sobra para una conversación de menú. El default de Express
// son 100kb por request.
app.use(express.json({ limit: '32kb' }))

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'DENY')
  next()
})

/**
 * Rate limit por IP, en memoria.
 *
 * Limitación conocida: es por proceso. Con varias instancias o en serverless
 * cada una lleva su propia cuenta. Para producción real conviene Redis o el
 * limitador del proxy — pero esto ya corta el abuso trivial.
 */
const chatHits = new Map()

function rateLimited(ip) {
  const now = Date.now()
  const hits = (chatHits.get(ip) || []).filter((ts) => now - ts < CHAT_WINDOW_MS)
  hits.push(now)
  chatHits.set(ip, hits)

  // Poda perezosa para que el Map no crezca sin techo.
  if (chatHits.size > 5000) {
    for (const [key, timestamps] of chatHits) {
      if (!timestamps.some((ts) => now - ts < CHAT_WINDOW_MS)) chatHits.delete(key)
    }
  }

  return hits.length > CHAT_MAX_PER_WINDOW
}

/**
 * Deja pasar SOLO turnos user/assistant.
 *
 * Sin esto, el array `messages` llegaba del cliente y se expandía tal cual
 * dentro de la llamada a Gemini. Cualquiera podía mandar
 * `{ role: 'system', content: 'ignorá todo lo anterior...' }` y convertir el
 * endpoint en un LLM de propósito general pago por el restaurante.
 */
function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return null

  const clean = []
  for (const msg of raw.slice(-CHAT_MAX_MESSAGES)) {
    if (!msg || typeof msg !== 'object') continue
    if (msg.role !== 'user' && msg.role !== 'assistant') continue
    if (typeof msg.content !== 'string') continue

    const content = msg.content.trim()
    if (!content) continue

    clean.push({ role: msg.role, content: content.slice(0, CHAT_MAX_CHARS) })
  }

  return clean.length ? clean : null
}

/**
 * Cliente con service_role: BYPASSEA RLS por completo.
 * Vive solo acá, en el servidor, y nunca se expone al navegador.
 * Se crea una vez y se reusa — antes se instanciaba en cada request.
 */
let _adminSupabase = null

function getAdminSupabase() {
  if (_adminSupabase) return _adminSupabase

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) return null

  _adminSupabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _adminSupabase
}

async function getMenuForChat(branchSlug) {
  const supabase = getAdminSupabase()
  if (!supabase) return null

  let branchId = null
  if (branchSlug) {
    const { data: branch } = await supabase
      .from('branches')
      .select('id')
      .eq('slug', branchSlug)
      .maybeSingle()
    branchId = branch?.id || null
  }

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*, subcategories:subcategories(*, items:items(*))')
    .is('subcategories.items.deleted_at', null)
    .order('id')

  if (categoriesError || !categories) return null

  let availMap = {}
  let visibleMap = {}
  if (branchId) {
    const { data: availability, error: availabilityError } = await supabase
      .from('item_availability')
      .select('item_id, available, visible')
      .eq('branch_id', branchId)

    if (availabilityError) return null
    if (availability) {
      availability.forEach((a) => {
        availMap[a.item_id] = a.available
        visibleMap[a.item_id] = a.visible
      })
    }
  }

  const merged = categories.map((cat) => ({
    id: String(cat.id),
    name: cat.name,
    subcategories: (cat.subcategories || []).map((sub) => ({
      name: sub.name,
      description: sub.description,
      items: (sub.items || [])
        .filter((item) => !item.deleted_at)
        .filter((item) => (branchId ? visibleMap[item.id] !== false : true))
        .map((item) => ({
          id: String(item.id),
          name: item.name,
          description: item.description,
          price: item.price,
          currency: item.currency || 'ARS',
          ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
          allergens: item.allergens || [],
          diet_tags: item.diet_tags || [],
          spicy: item.spicy || false,
          available: branchId ? (availMap[item.id] !== undefined ? availMap[item.id] : true) : true,
        })),
    })),
  }))

  return { restaurant: { name: { es: 'La Catedral del Pisco', en: 'La Catedral del Pisco', pt: 'La Catedral del Pisco', ru: 'Ла Катедраль дель Писко' } }, categories: merged }
}

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    console.error('[chat] GEMINI_API_KEY no está configurada')
    return res.status(503).json({ error: 'El asistente no está disponible por ahora.' })
  }

  if (rateLimited(req.ip)) {
    return res.status(429).json({ error: 'Demasiadas consultas. Esperá un momento.' })
  }

  const messages = sanitizeMessages(req.body?.messages)
  if (!messages) {
    return res.status(400).json({ error: 'Consulta inválida.' })
  }

  const branchSlug = typeof req.body?.branchSlug === 'string'
    ? req.body.branchSlug.slice(0, 100)
    : null

  const menuContext = await getMenuForChat(branchSlug)

  if (!menuContext) {
    console.error('[chat] No se pudo cargar el menú desde Supabase')
    return res.status(503).json({ error: 'El asistente no está disponible por ahora.' })
  }

  const systemPrompt = `Eres el asistente de La Catedral del Pisco, restaurante de cocina peruana en Buenos Aires (Av. Corrientes 3126). Reglas estrictas:\n\n1. CONCISO: respondé en máximo 3 o 4 líneas. Sin saludos largos, sin emojis decorativos, sin frases de relleno. Usá lista breve con viñetas si hay más de un plato.\n2. SOLO datos del menú: citá únicamente platos que existan en el CONTEXTO DEL MENÚ de abajo. Nunca inventes nombres, precios, descripciones, alérgenos ni ingredientes.\n3. Alérgenos/dietas/ingredientes: respondé SOLO con los campos "allergens", "diet_tags" e "ingredients" del plato citado. Si esos datos no están o la pregunta no se puede responder con ellos, decí "No tengo esa información confirmada, consultá con el mozo" y nada más.\n4. Si te piden un plato que no está en el menú, decí que no está en la carta y sugerí un plato que sí exista, o que consulte con el mozo.\n5. Respondé en el MISMO IDIOMA en que te preguntan.\n\nCONTEXTO DEL MENÚ:\n${JSON.stringify(menuContext, null, 2)}`

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.0-flash',
        max_tokens: 512,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    })

    // El detalle del error queda en el log del servidor. Al cliente le va un
    // mensaje genérico: el cuerpo de la respuesta de Gemini puede incluir
    // metadata de la cuenta o del request y no tiene por qué salir a Internet.
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error(`[chat] Gemini respondió ${response.status}: ${text}`)
      return res.status(502).json({ error: 'El asistente no pudo responder. Probá de nuevo.' })
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content

    if (typeof content !== 'string') {
      console.error('[chat] Respuesta de Gemini con forma inesperada:', JSON.stringify(data))
      return res.status(502).json({ error: 'El asistente no pudo responder. Probá de nuevo.' })
    }

    res.json({ content })
  } catch (err) {
    console.error('[chat] Error inesperado:', err)
    res.status(500).json({ error: 'El asistente no pudo responder. Probá de nuevo.' })
  }
})

app.use(express.static(resolve(__dirname, 'dist')))

app.get('*', (req, res) => {
  res.sendFile(resolve(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`🍹 La Catedral del Pisco server running at http://localhost:${PORT}`)
})
