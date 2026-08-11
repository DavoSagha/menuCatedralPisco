import { useContext, useState } from 'react'
import { LanguageContext } from '../App'
import { createSubcategory, updateSubcategory } from '../lib/menuData'

const LANGS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
]

function emptyI18n() { return { es: '', en: '', pt: '', ru: '' } }

function parseI18n(value) {
  if (!value) return emptyI18n()
  if (typeof value === 'string') return { es: value, en: '', pt: '', ru: '' }
  return { es: '', en: '', pt: '', ru: '', ...value }
}

export default function AdminSubcategoryEditor({ subcategory, categoryId, onClose, onSaved }) {
  const { locale } = useContext(LanguageContext)
  const isNew = !subcategory

  const [name, setName] = useState(isNew ? emptyI18n() : parseI18n(subcategory.name))
  const [description, setDescription] = useState(isNew ? emptyI18n() : parseI18n(subcategory.description))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.es.trim()) { setError('El nombre en español es obligatorio.'); return }
    setSaving(true)
    setError('')
    try {
      let saved
      if (isNew) {
        saved = await createSubcategory({
          category_id: Number(categoryId),
          name,
          description,
        })
      } else {
        saved = await updateSubcategory(subcategory.id, { name, description })
      }
      await onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la subcategoría.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-modal-backdrop">
      <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="subcat-editor-title">
        <div className="admin-modal__header">
          <div>
            <p className="admin-eyebrow">{isNew ? 'Nueva subcategoría' : 'Editar subcategoría'}</p>
            <h2 id="subcat-editor-title" className="admin-modal__title">
              {isNew ? 'Agregar subcategoría' : (typeof subcategory.name === 'object' ? subcategory.name[locale] || subcategory.name.es : subcategory.name)}
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
                  onChange={e => setName(prev => ({ ...prev, [code]: e.target.value }))}
                  placeholder={`Nombre en ${label}`}
                  disabled={saving}
                  required={code === 'es'}
                />
              </label>
            ))}
          </div>
        </fieldset>

        {/* Descripciones en 4 idiomas */}
        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 16px' }}>
          <legend style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Descripción <small style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</small>
          </legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {LANGS.map(({ code, label }) => (
              <label key={code} className="admin-field">
                <span>{label}</span>
                <textarea
                  value={description[code] || ''}
                  onChange={e => setDescription(prev => ({ ...prev, [code]: e.target.value }))}
                  placeholder={`Descripción en ${label}`}
                  rows={2}
                  disabled={saving}
                  style={{ resize: 'vertical' }}
                />
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}

        <div className="admin-modal__actions">
          <button type="button" className="admin-button admin-button--secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="admin-button admin-button--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : isNew ? 'Crear subcategoría' : 'Guardar cambios'}
          </button>
        </div>
      </section>
    </div>
  )
}
