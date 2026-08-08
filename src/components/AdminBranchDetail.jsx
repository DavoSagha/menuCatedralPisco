import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LanguageContext } from '../App'
import {
  getBranchItems,
  getCatalogNavigation,
  toggleAvailability,
  toggleVisibility,
} from '../lib/menuData'

function translated(value, locale = 'es') {
  if (typeof value === 'string') return value
  return value?.[locale] || value?.es || value?.en || ''
}

function formatPrice(value, currency = 'ARS') {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '—'
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(numericValue)
  } catch {
    return `$${numericValue}`
  }
}

export function BranchAvailabilityNavigator({ branchId }) {
  const { locale } = useContext(LanguageContext)
  const [catalog, setCatalog] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null)
  const [items, setItems] = useState([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState('')
  const [processingKey, setProcessingKey] = useState('')

  const selectedCategory = useMemo(
    () => catalog.find((category) => String(category.id) === String(selectedCategoryId)),
    [catalog, selectedCategoryId],
  )
  const selectedSubcategory = useMemo(
    () => selectedCategory?.subcategories?.find((subcategory) => String(subcategory.id) === String(selectedSubcategoryId)),
    [selectedCategory, selectedSubcategoryId],
  )

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true)
    setError('')
    try {
      setCatalog(await getCatalogNavigation())
    } catch (loadError) {
      setError(loadError?.message || 'No se pudo cargar el catálogo.')
    } finally {
      setLoadingCatalog(false)
    }
  }, [])

  const loadItems = useCallback(async (subcategoryId) => {
    if (!subcategoryId || !branchId) {
      setItems([])
      return
    }
    setLoadingItems(true)
    setError('')
    try {
      setItems(await getBranchItems(subcategoryId, branchId))
    } catch (loadError) {
      setItems([])
      setError(loadError?.message || 'No se pudieron cargar los productos de la sucursal.')
    } finally {
      setLoadingItems(false)
    }
  }, [branchId])

  useEffect(() => {
    setSelectedCategoryId(null)
    setSelectedSubcategoryId(null)
    setItems([])
    loadCatalog()
  }, [branchId, loadCatalog])

  useEffect(() => {
    if (selectedSubcategoryId) loadItems(selectedSubcategoryId)
  }, [loadItems, selectedSubcategoryId])

  const handleToggle = async (item, field) => {
    const nextValue = !item[field]
    const key = `${item.id}-${field}`
    setProcessingKey(key)
    setError('')
    try {
      if (field === 'visible') await toggleVisibility(item.id, branchId, nextValue)
      else await toggleAvailability(item.id, branchId, nextValue)
      setItems((current) => current.map((entry) =>
        String(entry.id) === String(item.id) ? { ...entry, [field]: nextValue } : entry,
      ))
    } catch (toggleError) {
      setError(toggleError?.message || 'No se pudo actualizar el producto.')
    } finally {
      setProcessingKey('')
    }
  }

  if (loadingCatalog) return <div className="admin-status" role="status">Cargando categorías…</div>

  return (
    <section aria-labelledby="branch-menu-heading">
      <div className="admin-section-heading">
        <div>
          <p className="admin-eyebrow">Categoría → Subcategoría → Producto</p>
          <h2 id="branch-menu-heading">Visibilidad y disponibilidad</h2>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <span>{error}</span>
          {!catalog.length && <button type="button" className="admin-link-button" onClick={loadCatalog}>Reintentar</button>}
        </div>
      )}

      <div className="admin-breadcrumb" aria-label="Ruta actual">
        <button type="button" onClick={() => { setSelectedCategoryId(null); setSelectedSubcategoryId(null) }}>Categorías</button>
        {selectedCategory && <><span>/</span><button type="button" onClick={() => setSelectedSubcategoryId(null)}>{translated(selectedCategory.name, locale)}</button></>}
        {selectedSubcategory && <><span>/</span><strong>{translated(selectedSubcategory.name, locale)}</strong></>}
      </div>

      {!selectedCategory && (
        catalog.length ? (
          <div className="admin-navigation-grid">
            {catalog.map((category) => (
              <button type="button" className="admin-nav-card" key={category.id} onClick={() => setSelectedCategoryId(String(category.id))}>
                <span><strong>{translated(category.name, locale)}</strong><small>{category.subcategories?.length || 0} subcategorías</small></span><span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        ) : <div className="admin-status">No hay categorías configuradas.</div>
      )}

      {selectedCategory && !selectedSubcategory && (
        selectedCategory.subcategories?.length ? (
          <div className="admin-navigation-grid">
            {selectedCategory.subcategories.map((subcategory) => (
              <button type="button" className="admin-nav-card" key={subcategory.id} onClick={() => setSelectedSubcategoryId(String(subcategory.id))}>
                <span><strong>{translated(subcategory.name, locale)}</strong><small>{translated(subcategory.description, locale)}</small></span><span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        ) : <div className="admin-status">Esta categoría no tiene subcategorías.</div>
      )}

      {selectedSubcategory && (
        loadingItems ? <div className="admin-status" role="status">Cargando productos…</div> : items.length ? (
          <div className="admin-product-list">
            {items.map((item) => (
              <article className="admin-product-row admin-product-row--availability" key={item.id}>
                <div className="admin-product-row__content">
                  <h3>{translated(item.name, locale)}</h3>
                  <p>{translated(selectedCategory.name, locale)} / {translated(selectedSubcategory.name, locale)}</p>
                </div>
                <strong className="admin-product-row__price">{formatPrice(item.price, item.currency)}</strong>
                <div className="admin-product-row__actions">
                  <button
                    type="button"
                    className={item.visible ? 'admin-state-button admin-state-button--visible' : 'admin-state-button admin-state-button--off'}
                    onClick={() => handleToggle(item, 'visible')}
                    disabled={Boolean(processingKey)}
                    aria-pressed={item.visible}
                  >
                    {processingKey === `${item.id}-visible` ? 'Guardando…' : item.visible ? 'Visible' : 'Oculto'}
                  </button>
                  <button
                    type="button"
                    className={item.available ? 'admin-state-button admin-state-button--available' : 'admin-state-button admin-state-button--unavailable'}
                    onClick={() => handleToggle(item, 'available')}
                    disabled={Boolean(processingKey)}
                    aria-pressed={item.available}
                  >
                    {processingKey === `${item.id}-available` ? 'Guardando…' : item.available ? 'Disponible' : 'Agotado'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="admin-status">No hay productos en esta subcategoría.</div>
      )}
    </section>
  )
}

export default function AdminBranchDetail({ branchId, branchName, onBack }) {
  return (
    <>
      <header className="admin-header admin-header--compact">
        <div>
          <p className="admin-eyebrow">Sucursal</p>
          <h1>{branchName || 'La Catedral del Pisco'}</h1>
        </div>
        <button type="button" onClick={onBack} className="admin-button admin-button--secondary">← Volver a sucursales</button>
      </header>
      <BranchAvailabilityNavigator branchId={branchId} />
    </>
  )
}
