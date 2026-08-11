/**
 * translate-menu.js
 * Genera menu-data-translated.json con traducciones reales (EN, PT, RU).
 * 
 * Uso: node --env-file .env scripts/translate-menu.js
 * Requiere: GEMINI_API_KEY en .env
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const menuData = JSON.parse(readFileSync(resolve(__dirname, '..', 'data', 'menu-data.json'), 'utf-8'))

const GEMINI_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_KEY) { console.error('Missing GEMINI_API_KEY'); process.exit(1) }

async function translate(texts, targetLang) {
  const langNames = { en: 'English', pt: 'Brazilian Portuguese', ru: 'Russian' }
  const prompt = `Translate the following JSON array of strings from Spanish to ${langNames[targetLang]}.
Rules:
- Keep proper nouns, dish names, and Peruvian culinary terms in the original language (e.g. "Lomo Saltado", "Ceviche", "Ají de Gallina", "Pisco", "Anticucho", "Tacu-Tacu", "Huancaína", "Chaufa").
- Keep ingredient names in Spanish if they are Peruvian-specific and have no direct translation.
- Return ONLY a valid JSON array with the same number of strings, no explanation.

${JSON.stringify(texts, null, 2)}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      })
    }
  )

  const json = await res.json()
  const content = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!content) throw new Error(`No content from API: ${JSON.stringify(json).slice(0, 300)}`)
  
  // Extraer el array del markdown si viene envuelto en ```json
  const match = content.match(/```(?:json)?\s*([\s\S]*?)```/) 
  const raw = match ? match[1].trim() : content
  return JSON.parse(raw)
}

async function translateAll() {
  // Recolectar todos los textos únicos a traducir
  const textsToTranslate = new Set()
  
  for (const cat of menuData.categories) {
    textsToTranslate.add(cat.name.es)
    for (const sub of cat.subcategories || []) {
      textsToTranslate.add(sub.name.es)
      if (sub.description?.es) textsToTranslate.add(sub.description.es)
      for (const item of sub.items || []) {
        textsToTranslate.add(item.name.es)
        if (item.description?.es) textsToTranslate.add(item.description.es)
      }
    }
  }

  const uniqueTexts = [...textsToTranslate].filter(t => t.trim() !== '')
  console.log(`📝 Textos únicos a traducir: ${uniqueTexts.length}`)

  const translations = {}
  
  for (const lang of ['en', 'pt', 'ru']) {
    console.log(`\n🌐 Traduciendo al ${lang}...`)
    // Traducir en batches de 30 para no sobrepasar el límite
    const BATCH = 30
    const translated = []
    for (let i = 0; i < uniqueTexts.length; i += BATCH) {
      const batch = uniqueTexts.slice(i, i + BATCH)
      process.stdout.write(`  Batch ${Math.floor(i/BATCH)+1}/${Math.ceil(uniqueTexts.length/BATCH)}... `)
      const result = await translate(batch, lang)
      translated.push(...result)
      process.stdout.write('✅\n')
      await new Promise(r => setTimeout(r, 500)) // pequeña pausa entre batches
    }
    translations[lang] = Object.fromEntries(uniqueTexts.map((t, i) => [t, translated[i]]))
  }

  // Aplicar traducciones al JSON
  function applyT(obj) {
    if (!obj || typeof obj !== 'object') return obj
    if (typeof obj.es === 'string') {
      const es = obj.es
      return {
        es,
        en: es.trim() === '' ? '' : (translations.en[es] || es),
        pt: es.trim() === '' ? '' : (translations.pt[es] || es),
        ru: es.trim() === '' ? '' : (translations.ru[es] || es),
      }
    }
    return obj
  }

  const translated = {
    ...menuData,
    categories: menuData.categories.map(cat => ({
      ...cat,
      name: applyT(cat.name),
      subcategories: (cat.subcategories || []).map(sub => ({
        ...sub,
        name: applyT(sub.name),
        description: applyT(sub.description),
        items: (sub.items || []).map(item => ({
          ...item,
          name: applyT(item.name),
          description: applyT(item.description),
        }))
      }))
    }))
  }

  const outPath = resolve(__dirname, '..', 'data', 'menu-data.json')
  writeFileSync(outPath, JSON.stringify(translated, null, 2), 'utf-8')
  console.log(`\n✅ Traducciones aplicadas y guardadas en menu-data.json`)
}

translateAll().catch(err => { console.error('Error:', err.message); process.exit(1) })
