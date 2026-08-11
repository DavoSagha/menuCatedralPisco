/*
  reseed-menu.js — Borra y recarga SOLO el menú (categorías, subcategorías, items).
  NO toca usuarios ni sucursales.

  Uso:
    node --env-file .env scripts/reseed-menu.js
*/

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const menuData = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'data', 'menu-data.json'), 'utf-8')
)

async function reseed() {
  // 1. Obtener la sucursal
  const { data: branches } = await supabase.from('branches').select('*').order('id')
  if (!branches?.length) { console.error('No hay sucursales. Corré seed.js primero.'); return }
  console.log(`🏠 Sucursal: ${branches.map(b => b.name).join(', ')}`)

  // 2. Borrar todo el menú en cascada (items → subcategories → categories)
  console.log('\n🗑️  Limpiando menú anterior...')
  const { error: delItems } = await supabase.from('items').delete().gte('id', 0)
  if (delItems) { console.error('Error borrando items:', delItems.message); return }

  const { error: delSubs } = await supabase.from('subcategories').delete().gte('id', 0)
  if (delSubs) { console.error('Error borrando subcategorías:', delSubs.message); return }

  const { error: delCats } = await supabase.from('categories').delete().gte('id', 0)
  if (delCats) { console.error('Error borrando categorías:', delCats.message); return }

  console.log('  ✅ Menú limpiado')

  // 3. Insertar todo desde el JSON
  let totalItems = 0

  for (const cat of menuData.categories) {
    const catName = cat.name?.es || cat.name
    process.stdout.write(`\n📂 ${catName}... `)

    const { data: category, error: catErr } = await supabase
      .from('categories')
      .insert({ name: cat.name, image: cat.image || null })
      .select()
      .single()

    if (catErr) { console.error(`\n  ❌ Error categoría:`, catErr.message); continue }

    for (const sub of cat.subcategories || []) {
      const { data: subcategory, error: subErr } = await supabase
        .from('subcategories')
        .insert({
          category_id: category.id,
          name: sub.name,
          description: sub.description || {},
        })
        .select()
        .single()

      if (subErr) { console.error(`\n  ❌ Error subcategoría:`, subErr.message); continue }

      for (const item of sub.items || []) {
        const { data: inserted, error: itemErr } = await supabase
          .from('items')
          .insert({
            subcategory_id: subcategory.id,
            name: item.name,
            description: item.description || {},
            price: item.price,
            currency: item.currency || 'ARS',
            ingredients: item.ingredients || [],
            allergens: item.allergens || [],
            diet_tags: item.diet_tags || [],
            spicy: item.spicy || false,
            image: item.image || null,
          })
          .select()
          .single()

        if (itemErr) { console.error(`\n  ❌ Error item:`, itemErr.message); continue }

        // Crear disponibilidad para cada sucursal
        const availInserts = branches.map((b) => ({
          item_id: inserted.id,
          branch_id: b.id,
          available: true,
          visible: true,
        }))

        const { error: availErr } = await supabase.from('item_availability').insert(availInserts)
        if (availErr) console.error(`\n  ⚠️  Availability error:`, availErr.message)

        totalItems++
      }
    }

    const catItems = cat.subcategories.flatMap(s => s.items).length
    process.stdout.write(`✅ ${catItems} platos`)
  }

  console.log(`\n\n✅ Reseed completo — ${menuData.categories.length} categorías, ${totalItems} platos`)
  console.log('Abrí la app en: http://localhost:5173/menu/buenos-aires')
}

reseed().catch(console.error)
