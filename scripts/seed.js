/*
  Seed script: loads demo data from menu-data.json into Supabase,
  creates test users, and sets up default availability.

  Usage:
    node --env-file .env scripts/seed.js

  Requires in .env:
    VITE_SUPABASE_URL=https://xxx.supabase.co
    SUPABASE_SERVICE_KEY=eyJhbG...   ← service_role key (Supabase Dashboard > Settings > API)
*/

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL in .env')
  process.exit(1)
}
if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_KEY in .env')
  console.error('Get it from: Supabase Dashboard → Project Settings → API → service_role key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

const menuData = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'data', 'menu-data.json'), 'utf-8')
)

async function seed() {
  // ── Users ────────────────────────────────────────────
  console.log('Creating test users...')

  const tryCreateUser = async (email, password, metadata) => {
    const { data, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: metadata,
    })
    if (error) {
      if (error.message?.includes('already') || error.code === 'UserAlreadyExists') {
        console.log(`  → ${email} already exists, skipping`)
        return null
      }
      console.error(`  User error (${email}):`, error)
      return null
    }
    return data.user
  }

  const adminUser = await tryCreateUser('admin@catedradelpisco.com', 'admin123', { role: 'admin' })
  if (adminUser) console.log(`  → Admin: admin@catedradelpisco.com / admin123  (uid: ${adminUser.id})`)

  const staffUser = await tryCreateUser('staff@catedradelpisco.com', 'staff123', { role: 'staff', branch_id: 1 })
  if (staffUser) console.log(`  → Staff: staff@catedradelpisco.com / staff123  (uid: ${staffUser.id}, branch: 1)`)

  // ── Branches ─────────────────────────────────────────
  console.log('Seeding branches...')

  const { data: branches, error: branchErr } = await supabase
    .from('branches')
    .upsert([
      { name: 'Buenos Aires', slug: 'buenos-aires' },
    ])
    .select()

  if (branchErr) { console.error('Branch error:', branchErr); return }
  console.log(`  → ${branches.length} branches inserted`)

  // ── Menu data ────────────────────────────────────────
  for (const cat of menuData.categories) {
    console.log(`Seeding category: ${cat.name?.es || cat.name}`)

    const { data: category, error: catErr } = await supabase
      .from('categories')
      .upsert({ image: cat.image, name: cat.name })
      .select()
      .single()

    if (catErr) { console.error('Category error:', catErr); continue }

    for (const sub of cat.subcategories || []) {
      const { data: subcategory, error: subErr } = await supabase
        .from('subcategories')
        .upsert({
          category_id: category.id,
          name: sub.name,
          description: sub.description || {},
        })
        .select()
        .single()

      if (subErr) { console.error('Subcategory error:', subErr); continue }

      for (const item of (sub.items || [])) {
        const { data: inserted, error: itemErr } = await supabase
          .from('items')
          .upsert({
            subcategory_id: subcategory.id,
            name: item.name,
            description: item.description,
            price: item.price,
            currency: item.currency || 'ARS',
            ingredients: item.ingredients || [],
            allergens: item.allergens || [],
            diet_tags: item.diet_tags || [],
            spicy: item.spicy || false,
          })
          .select()
          .single()

        if (itemErr) { console.error('Item error:', itemErr); continue }

        const availInserts = branches.map((b) => ({
          item_id: inserted.id,
          branch_id: b.id,
          available: true,
        }))

        const { error: availErr } = await supabase
          .from('item_availability')
          .upsert(availInserts)

        if (availErr) console.error('Availability error:', availErr)
      }
    }
  }

  console.log('')
  console.log('✅ Seed complete — La Catedral del Pisco')
  console.log('')
  console.log('Test credentials:')
  console.log('  Admin: admin@catedradelpisco.com / admin123')
  console.log('  Staff: staff@catedradelpisco.com / staff123')
  console.log('')
  console.log('Open the app with:')
  console.log('  http://localhost:5173/menu/buenos-aires')
}

seed().catch(console.error)
