/**
 * Etiquetas de alérgenos y dietas, en un solo lugar.
 * Antes vivían duplicadas e idénticas en DishCard y DishDetail: agregar un
 * alérgeno obligaba a tocar dos archivos y era cuestión de tiempo que se
 * desincronizaran.
 */

export const ALLERGEN_LABELS = {
  gluten: { es: 'Gluten', en: 'Gluten', ru: 'Глютен' },
  lactosa: { es: 'Lactosa', en: 'Lactose', ru: 'Лактоза' },
  huevo: { es: 'Huevo', en: 'Egg', ru: 'Яйцо' },
  soja: { es: 'Soja', en: 'Soy', ru: 'Соя' },
  frutos_secos: { es: 'Frutos secos', en: 'Tree nuts', ru: 'Орехи' },
  mani: { es: 'Maní', en: 'Peanuts', ru: 'Арахис' },
  sulfitos: { es: 'Sulfitos', en: 'Sulfites', ru: 'Сульфиты' },
}

export const DIET_LABELS = {
  vegano: { es: 'Vegano', en: 'Vegan', ru: 'Веган' },
  vegetariano: { es: 'Vegetariano', en: 'Vegetarian', ru: 'Вегетарианское' },
  sin_gluten: { es: 'Sin gluten', en: 'Gluten-Free', ru: 'Без глютена' },
  sin_lactosa: { es: 'Sin lactosa', en: 'Dairy-Free', ru: 'Без лактозы' },
  sin_tacc: { es: 'Sin TACC', en: 'Gluten-Free', ru: 'Без глютена' },
  lacteos: { es: 'Lácteos', en: 'Dairy', ru: 'Молочные продукты' },
  huevos: { es: 'Huevos', en: 'Eggs', ru: 'Яйца' },
}

export const UNAVAILABLE_LABEL = {
  es: 'No disponible',
  en: 'Unavailable',
  ru: 'Недоступно',
}

export const ALLERGENS_HEADING = {
  es: 'Contiene',
  en: 'Contains',
  ru: 'Содержит',
}

export const DIET_HEADING = {
  es: 'Apto para',
  en: 'Suitable for',
  ru: 'Подходит для',
}

/** Devuelve la traducción de `dict[key]` con fallback a español y luego a la clave cruda. */
export function labelFor(dict, key, locale) {
  return dict[key]?.[locale] || dict[key]?.es || key
}
