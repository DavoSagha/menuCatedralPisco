import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function check() {
  // Categorías e imágenes
  const { data: cats, error: catErr } = await supabase
    .from('categories')
    .select('id, name, image')
    .order('id')

  if (catErr) { console.error('Error categorías:', catErr.message); return }

  console.log(`\n📂 CATEGORÍAS (${cats.length} total):`)
  for (const c of cats) {
    const imgStatus = c.image ? `✅ ${c.image}` : '❌ sin imagen'
    console.log(`  [${c.id}] ${JSON.stringify(c.name)} → ${imgStatus}`)
  }

  // Items por categoría
  const { data: items, error: itemErr } = await supabase
    .from('items')
    .select('id, name, price, subcategory_id, image')
    .is('deleted_at', null)
    .order('subcategory_id')

  if (itemErr) { console.error('Error items:', itemErr.message); return }

  console.log(`\n🍽️  PLATOS (${items.length} total activos):`)
  for (const i of items) {
    const imgStatus = i.image ? '📷' : '  '
    const name = typeof i.name === 'object' ? i.name?.es || i.name?.en || JSON.stringify(i.name) : i.name
    console.log(`  ${imgStatus} [subcat ${i.subcategory_id}] ${name} — $${i.price}`)
  }

  // Sucursales
  const { data: branches } = await supabase.from('branches').select('*')
  console.log(`\n🏠 SUCURSALES: ${JSON.stringify(branches?.map(b => b.name))}`)
}

check()
