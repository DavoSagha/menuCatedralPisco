import { useContext, useEffect, useState } from 'react'
import { LanguageContext } from '../App'
import {
  removeDishImage,
  replaceDishImage,
  resolveProductImageUrl,
} from '../lib/menuData'

function translated(value, locale = 'es') {
  if (typeof value === 'string') return value
  return value?.[locale] || value?.es || value?.en || ''
}

export default function AdminProductImageEditor({ dish, onClose, onSaved }) {
  const { locale } = useContext(LanguageContext)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const existingUrl = resolveProductImageUrl(dish?.image)
  const busy = saving || removing

  const t = (messages) => messages[locale] || messages.es

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return undefined
    }
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null
    setError('')
    if (!selected) {
      setFile(null)
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      event.target.value = ''
      setError(t({ es: 'Seleccioná un archivo de imagen válido.', en: 'Select a valid image file.', ru: 'Выберите корректный файл изображения.' }))
      return
    }
    if (selected.size > 5 * 1024 * 1024) {
      event.target.value = ''
      setError(t({ es: 'La imagen no puede superar los 5 MB.', en: 'The image cannot exceed 5 MB.', ru: 'Изображение не может превышать 5 МБ.' }))
      return
    }
    setFile(selected)
  }

  const handleSave = async () => {
    if (!file) {
      setError(t({ es: 'Seleccioná una imagen antes de confirmar.', en: 'Select an image before confirming.', ru: 'Выберите изображение перед подтверждением.' }))
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await replaceDishImage(dish.id, file, dish.image)
      await onSaved?.({ ...dish, image: result?.image || dish.image })
      onClose()
    } catch (saveError) {
      setError(saveError?.message || t({ es: 'No se pudo guardar la imagen.', en: 'The image could not be saved.', ru: 'Не удалось сохранить изображение.' }))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!dish?.image) return
    if (!window.confirm(t({ es: '¿Quitar la imagen de este producto?', en: 'Remove this product image?', ru: 'Удалить изображение продукта?' }))) return

    setRemoving(true)
    setError('')
    try {
      await removeDishImage(dish.id, dish.image)
      await onSaved?.({ ...dish, image: null })
      onClose()
    } catch (removeError) {
      setError(removeError?.message || t({ es: 'No se pudo quitar la imagen.', en: 'The image could not be removed.', ru: 'Не удалось удалить изображение.' }))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="admin-modal-backdrop">
      <section className="admin-modal admin-modal--image" role="dialog" aria-modal="true" aria-labelledby="admin-image-title">
        <div className="admin-modal__header">
          <div>
            <p className="admin-eyebrow">{translated(dish?.name, locale)}</p>
            <h2 id="admin-image-title" className="admin-modal__title">
              {dish?.image
                ? t({ es: 'Reemplazar imagen', en: 'Replace image', ru: 'Заменить изображение' })
                : t({ es: 'Agregar imagen', en: 'Add image', ru: 'Добавить изображение' })}
            </h2>
          </div>
          <button type="button" className="admin-icon-button" onClick={onClose} disabled={busy} aria-label={t({ es: 'Cerrar', en: 'Close', ru: 'Закрыть' })}>×</button>
        </div>

        <div className="admin-image-stage">
          {(previewUrl || existingUrl) ? (
            <img src={previewUrl || existingUrl} alt={`Vista previa de ${translated(dish?.name, locale)}`} />
          ) : (
            <div className="admin-image-placeholder" aria-label={t({ es: 'Producto sin imagen', en: 'Product without image', ru: 'Продукт без изображения' })}>
              <span>+</span>
              <small>Sin imagen</small>
            </div>
          )}
        </div>

        <label className="admin-field">
          <span>Nueva imagen <small>JPG, PNG o WebP; máximo 5 MB</small></span>
          <input type="file" accept="image/*" onChange={handleFileChange} disabled={busy} />
        </label>

        {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}

        <div className="admin-modal__actions admin-modal__actions--split">
          <div>
            {dish?.image && (
              <button type="button" className="admin-button admin-button--danger-quiet" onClick={handleRemove} disabled={busy}>
                {removing ? 'Quitando…' : 'Quitar imagen'}
              </button>
            )}
          </div>
          <div className="admin-action-group">
            <button type="button" className="admin-button admin-button--secondary" onClick={onClose} disabled={busy}>Cancelar</button>
            <button type="button" className="admin-button admin-button--primary" onClick={handleSave} disabled={busy || !file}>
              {saving ? 'Guardando…' : 'Confirmar imagen'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
