import { useContext, useEffect, useMemo, useState } from 'react'
import { LanguageContext } from '../App'
import { createDish, replaceDishImage, updateDish } from '../lib/menuData'

const EMPTY_TRANSLATION = { es: '', en: '', ru: '' }

function translated(value, locale = 'es') {
  if (typeof value === 'string') return value
  return value?.[locale] || value?.es || value?.en || ''
}

function normalizeCatalog(catalog) {
  if (Array.isArray(catalog)) return catalog
  return Array.isArray(catalog?.categories) ? catalog.categories : []
}

export default function AdminMenuEditor({
  dish = null,
  catalog = [],
  initialCategoryId = null,
  initialSubcategoryId = null,
  onClose,
  onSaved,
}) {
  const { locale } = useContext(LanguageContext)
  const categories = useMemo(() => normalizeCatalog(catalog), [catalog])
  const isCreating = !dish?.id
  const dishSubcategoryId = dish?.subcategoryId ?? dish?.subcategory_id ?? initialSubcategoryId
  const inferredCategory = categories.find((category) =>
    (category.subcategories || []).some((subcategory) => String(subcategory.id) === String(dishSubcategoryId)),
  )

  const [categoryId, setCategoryId] = useState(
    String(initialCategoryId ?? dish?.categoryId ?? dish?.category_id ?? inferredCategory?.id ?? ''),
  )
  const [subcategoryId, setSubcategoryId] = useState(String(dishSubcategoryId ?? ''))
  const [name, setName] = useState({ ...EMPTY_TRANSLATION, ...(dish?.name || {}) })
  const [description, setDescription] = useState({ ...EMPTY_TRANSLATION, ...(dish?.description || {}) })
  const [price, setPrice] = useState(dish?.price == null ? '' : String(dish.price))
  const [currency, setCurrency] = useState(dish?.currency || 'ARS')
  const [allergens, setAllergens] = useState(Array.isArray(dish?.allergens) ? dish.allergens.join(', ') : '')
  const [ingredients, setIngredients] = useState(Array.isArray(dish?.ingredients) ? dish.ingredients.join(', ') : '')
  const [dietTags, setDietTags] = useState(Array.isArray(dish?.diet_tags) ? dish.diet_tags.join(', ') : '')
  const [spicy, setSpicy] = useState(dish?.spicy ?? false)
  const [visible, setVisible] = useState(dish?.visible ?? true)
  const [available, setAvailable] = useState(dish?.available ?? true)
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingCreatedDish, setPendingCreatedDish] = useState(null)
  const [error, setError] = useState('')

  const t = (messages) => messages[locale] || messages.es
  const selectedCategory = categories.find((category) => String(category.id) === categoryId)
  const subcategories = selectedCategory?.subcategories || []

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl('')
      return undefined
    }
    const objectUrl = URL.createObjectURL(imageFile)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

  const setTranslatedField = (setter, language, value) => {
    setter((current) => ({ ...current, [language]: value }))
  }

  const handleCategoryChange = (event) => {
    setCategoryId(event.target.value)
    setSubcategoryId('')
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null
    setError('')
    if (!file) {
      setImageFile(null)
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      event.target.value = ''
      setError(t({ es: 'Seleccioná un archivo de imagen válido.', en: 'Select a valid image file.', ru: 'Выберите корректный файл изображения.' }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      event.target.value = ''
      setError(t({ es: 'La imagen no puede superar los 5 MB.', en: 'The image cannot exceed 5 MB.', ru: 'Изображение не может превышать 5 МБ.' }))
      return
    }
    setImageFile(file)
  }

  const validate = () => {
    if (!categoryId) return t({ es: 'Seleccioná una categoría.', en: 'Select a category.', ru: 'Выберите категорию.' })
    if (!subcategoryId) return t({ es: 'Seleccioná una subcategoría.', en: 'Select a subcategory.', ru: 'Выберите подкатегорию.' })
    if (!subcategories.some((subcategory) => String(subcategory.id) === subcategoryId)) {
      return t({ es: 'La subcategoría no pertenece a la categoría seleccionada.', en: 'The subcategory does not belong to the selected category.', ru: 'Подкатегория не относится к выбранной категории.' })
    }
    if (!name.es.trim()) return t({ es: 'El nombre en español es obligatorio.', en: 'The Spanish name is required.', ru: 'Название на испанском обязательно.' })
    const numericPrice = Number(price)
    if (!Number.isSafeInteger(numericPrice) || numericPrice < 0) {
      return t({ es: 'Ingresá un precio entero mayor o igual a cero.', en: 'Enter a whole-number price greater than or equal to zero.', ru: 'Введите целую цену не меньше нуля.' })
    }
    if (!/^[A-Za-z]{3}$/.test(currency.trim())) {
      return t({ es: 'La moneda debe tener tres letras.', en: 'Currency must have three letters.', ru: 'Код валюты должен состоять из трёх букв.' })
    }
    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    let savedDish = null
    try {
      const fields = {
        subcategory_id: Number(subcategoryId),
        name: {
          es: name.es.trim(),
          en: name.en.trim() || name.es.trim(),
          ru: name.ru.trim() || name.es.trim(),
        },
        description: {
          es: description.es.trim(),
          en: description.en.trim() || description.es.trim(),
          ru: description.ru.trim() || description.es.trim(),
        },
        price: Number(price),
        currency: currency.trim().toUpperCase() || 'ARS',
        ingredients: ingredients.split(',').map((value) => value.trim()).filter(Boolean),
        allergens: allergens.split(',').map((value) => value.trim()).filter(Boolean),
        diet_tags: dietTags.split(',').map((value) => value.trim()).filter(Boolean),
        spicy,
      }

      if (isCreating) {
        savedDish = pendingCreatedDish
          ? await updateDish(pendingCreatedDish.id, fields)
          : await createDish(fields, { visible, available })
        setPendingCreatedDish(savedDish)
      } else {
        savedDish = await updateDish(dish.id, fields)
      }

      const savedId = savedDish?.id ?? dish?.id
      if (imageFile && savedId) await replaceDishImage(savedId, imageFile, savedDish?.image || dish?.image)

      await onSaved?.(savedDish)
      onClose()
    } catch (saveError) {
      if (isCreating && savedDish?.id) {
        await onSaved?.(savedDish)
        setError(`${t({ es: 'El producto se guardó, pero la imagen falló:', en: 'The product was saved, but the image failed:', ru: 'Продукт сохранён, но изображение загрузить не удалось:' })} ${saveError?.message || ''}`)
      } else {
        setError(saveError?.message || t({ es: 'No se pudo guardar el producto.', en: 'The product could not be saved.', ru: 'Не удалось сохранить продукт.' }))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-modal-backdrop">
      <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-editor-title">
        <div className="admin-modal__header">
          <div>
            <p className="admin-eyebrow">{t({ es: 'Menú La Catedral del Pisco', en: 'La Catedral del Pisco menu', ru: 'Меню La Catedral del Pisco' })}</p>
            <h2 id="admin-editor-title" className="admin-modal__title">
              {isCreating
                ? t({ es: 'Nuevo producto', en: 'New product', ru: 'Новый продукт' })
                : t({ es: 'Editar producto', en: 'Edit product', ru: 'Редактировать продукт' })}
            </h2>
          </div>
          <button type="button" className="admin-icon-button" onClick={onClose} disabled={saving} aria-label={t({ es: 'Cerrar', en: 'Close', ru: 'Закрыть' })}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-grid admin-form-grid--two">
            <label className="admin-field">
              <span>Categoría</span>
              <select value={categoryId} onChange={handleCategoryChange} required disabled={saving}>
                <option value="">Seleccionar categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>{translated(category.name, locale)}</option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Subcategoría</span>
              <select value={subcategoryId} onChange={(event) => setSubcategoryId(event.target.value)} required disabled={!categoryId || saving}>
                <option value="">Seleccionar subcategoría</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={String(subcategory.id)}>{translated(subcategory.name, locale)}</option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="admin-fieldset">
            <legend>Nombre</legend>
            <div className="admin-form-grid admin-form-grid--three">
              {['es', 'en', 'ru'].map((language) => (
                <label className="admin-field" key={`name-${language}`}>
                  <span>{language.toUpperCase()}{language === 'es' ? ' *' : ''}</span>
                  <input value={name[language]} onChange={(event) => setTranslatedField(setName, language, event.target.value)} required={language === 'es'} disabled={saving} />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="admin-fieldset">
            <legend>Descripción</legend>
            <div className="admin-form-grid">
              {['es', 'en', 'ru'].map((language) => (
                <label className="admin-field" key={`description-${language}`}>
                  <span>{language.toUpperCase()}</span>
                  <textarea rows="2" value={description[language]} onChange={(event) => setTranslatedField(setDescription, language, event.target.value)} disabled={saving} />
                </label>
              ))}
            </div>
          </fieldset>

          <div className="admin-form-grid admin-form-grid--price">
            <label className="admin-field">
              <span>Precio *</span>
              <input type="number" min="0" step="1" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} required disabled={saving} />
            </label>
            <label className="admin-field">
              <span>Moneda</span>
              <input value={currency} maxLength="3" onChange={(event) => setCurrency(event.target.value)} disabled={saving} />
            </label>
          </div>

          <div className="admin-form-grid admin-form-grid--two">
            <label className="admin-field">
              <span>Ingredientes <small>separados por coma</small></span>
              <input value={ingredients} onChange={(event) => setIngredients(event.target.value)} disabled={saving} />
            </label>
            <label className="admin-field">
              <span>Alérgenos <small>separados por coma</small></span>
              <input value={allergens} onChange={(event) => setAllergens(event.target.value)} placeholder="Gluten, lácteos" disabled={saving} />
            </label>
          </div>

          <div className="admin-form-grid admin-form-grid--two">
            <label className="admin-field">
              <span>Dietas <small>separadas por coma</small></span>
              <input value={dietTags} onChange={(event) => setDietTags(event.target.value)} disabled={saving} />
            </label>
            <label className="admin-check admin-check--compact">
              <input type="checkbox" checked={spicy} onChange={(event) => setSpicy(event.target.checked)} disabled={saving} />
              <span><strong>Picante</strong><small>Marca el producto como picante</small></span>
            </label>
          </div>

          {isCreating && (
            <>
              <div className="admin-toggle-grid">
                <label className="admin-check">
                  <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} disabled={saving} />
                  <span><strong>Visible</strong><small>Aparece en el menú público</small></span>
                </label>
                <label className="admin-check">
                  <input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} disabled={saving} />
                  <span><strong>Disponible</strong><small>Puede pedirse actualmente</small></span>
                </label>
              </div>

              <label className="admin-field">
                <span>Imagen <small>opcional, máximo 5 MB</small></span>
                <input type="file" accept="image/*" onChange={handleImageChange} disabled={saving} />
              </label>
              {previewUrl && <img className="admin-image-preview" src={previewUrl} alt="Vista previa del producto" />}
            </>
          )}

          {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}

          <div className="admin-modal__actions">
            <button type="button" className="admin-button admin-button--secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="admin-button admin-button--primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar producto'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
