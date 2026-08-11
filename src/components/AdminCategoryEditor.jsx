import { useContext, useEffect, useRef, useState } from 'react'
import { LanguageContext } from '../App'
import { createCategory, updateCategory, replaceCategoryImage } from '../lib/menuData'

const LANGS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
]

function emptyI18n() { return { es: '', en: '', pt: '', ru: '' } }

export default function AdminCategoryEditor({ category, onClose, onSaved }) {
  const { locale } = useContext(LanguageContext)
  const isNew = !category

  const [name, setName] = useState(
    isNew ? emptyI18n() : { es: '', en: '', pt: '', ru: '', ...(typeof category.name === 'object' ? category.name : { es: category.name }) }
  )
  const [imageUrl, setImageUrl] = useState(
    isNew ? '' : (typeof category.image === 'string' ? category.image : '')
  )
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  // Preview de archivo seleccionado
  useEffect(() => {
    if (!imageFile) { setPreviewUrl(''); return }
    const url = URL.createObjectURL(imageFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const handleNameChange = (lang, value) => setName(prev => ({ ...prev, [lang]: value }))

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null
    setError('')
    if (!file) { setImageFile(null); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Formato no válido. Usá JPG, PNG o WebP.'); e.target.value = ''; return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5 MB.'); e.target.value = ''; return
    }
    setImageFile(file)
    setImageUrl('') // Si subís archivo, la URL manual queda vacía
  }

  const handleSave = async () => {
    if (!name.es.trim()) { setError('El nombre en español es obligatorio.'); return }
    setSaving(true)
    setError('')
    try {
      let savedCategory

      if (isNew) {
        // Crear con URL de imagen (si la puso) o sin imagen
        savedCategory = await createCategory({
          name,
          image: imageUrl.trim() || null,
        })
        // Si eligió archivo, subir ahora
        if (imageFile) {
          const url = await replaceCategoryImage(savedCategory.id, imageFile, null)
          savedCategory = { ...savedCategory, image: url }
        }
      } else {
        // Actualizar nombre (y URL si la cambió manualmente)
        const updates = { name }
        if (imageUrl.trim() && imageUrl !== category.image) updates.image = imageUrl.trim()
        savedCategory = await updateCategory(category.id, updates)
        // Si eligió archivo, reemplazar imagen
        if (imageFile) {
          const url = await replaceCategoryImage(category.id, imageFile, category.image)
          savedCategory = { ...savedCategory, image: url }
        }
      }

      await onSaved?.(savedCategory)
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la categoría.')
    } finally {
      setSaving(false)
    }
  }

  const currentDisplayImage = previewUrl || imageUrl || (category?.image || '')

  return (
    <div className="admin-modal-backdrop">
      <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="cat-editor-title">
        <div className="admin-modal__header">
          <div>
            <p className="admin-eyebrow">{isNew ? 'Menú' : 'Editar'}</p>
            <h2 id="cat-editor-title" className="admin-modal__title">
              {isNew ? 'Nueva categoría' : 'Editar categoría'}
            </h2>
          </div>
          <button type="button" className="admin-icon-button" onClick={onClose} disabled={saving} aria-label="Cerrar">×</button>
        </div>

        {/* Nombres en 4 idiomas */}
        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 16px' }}>
          <legend style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Nombre
          </legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {LANGS.map(({ code, label }) => (
              <label key={code} className="admin-field">
                <span>{label}</span>
                <input
                  type="text"
                  value={name[code] || ''}
                  onChange={e => handleNameChange(code, e.target.value)}
                  placeholder={`Nombre en ${label}`}
                  disabled={saving}
                  required={code === 'es'}
                />
              </label>
            ))}
          </div>
        </fieldset>

        {/* Imagen */}
        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 16px' }}>
          <legend style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Imagen del banner
          </legend>

          {currentDisplayImage && (
            <div style={{ marginBottom: '10px', borderRadius: '8px', overflow: 'hidden', maxHeight: '140px' }}>
              <img src={currentDisplayImage} alt="Vista previa" style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          <label className="admin-field" style={{ marginBottom: '8px' }}>
            <span>URL de imagen <small>(pegar link directo)</small></span>
            <input
              type="url"
              value={imageUrl}
              onChange={e => { setImageUrl(e.target.value); setImageFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
              placeholder="https://..."
              disabled={saving}
            />
          </label>

          <label className="admin-field">
            <span>— o subir archivo <small>JPG, PNG o WebP · máx. 5 MB</small></span>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} disabled={saving} />
          </label>
        </fieldset>

        {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}

        <div className="admin-modal__actions">
          <button type="button" className="admin-button admin-button--secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="admin-button admin-button--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : isNew ? 'Crear categoría' : 'Guardar cambios'}
          </button>
        </div>
      </section>
    </div>
  )
}
