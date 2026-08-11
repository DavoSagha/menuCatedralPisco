import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LanguageContext } from '../App'
import { logout } from '../lib/auth'
import {
  getCatalogNavigation,
  getDeletedItems,
  getItemsBySubcategory,
  resolveProductImageUrl,
  restoreDish,
  softDeleteDish,
} from '../lib/menuData'
import { getSupabase } from '../lib/supabaseClient'
import AdminBranchDetail from './AdminBranchDetail'
import AdminMenuEditor from './AdminMenuEditor'
import AdminProductImageEditor from './AdminProductImageEditor'
import AdminCategoryEditor from './AdminCategoryEditor'
import AdminSubcategoryEditor from './AdminSubcategoryEditor'
import './admin.css'

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

function Status({ children }) {
  return <div className="admin-status" role="status">{children}</div>
}

export default function AdminPanel() {
  const { locale } = useContext(LanguageContext)
  const navigate = useNavigate()
  const [tab, setTab] = useState('branches')
  const [branches, setBranches] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loadingBase, setLoadingBase] = useState(true)
  const [baseError, setBaseError] = useState('')
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null)
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [itemsError, setItemsError] = useState('')
  const [deletedItems, setDeletedItems] = useState([])
  const [loadingDeleted, setLoadingDeleted] = useState(false)
  const [deletedError, setDeletedError] = useState('')
  const [editor, setEditor] = useState(null)
  const [imageDish, setImageDish] = useState(null)
  const [categoryEditor, setCategoryEditor] = useState(null)   // null | { category } | { category: null }
  const [subcategoryEditor, setSubcategoryEditor] = useState(null) // null | { subcategory, categoryId }
  const [processingId, setProcessingId] = useState(null)

  const t = (messages) => messages[locale] || messages.es
  const selectedCategory = useMemo(
    () => catalog.find((category) => String(category.id) === String(selectedCategoryId)),
    [catalog, selectedCategoryId],
  )
  const selectedSubcategory = useMemo(
    () => selectedCategory?.subcategories?.find((subcategory) => String(subcategory.id) === String(selectedSubcategoryId)),
    [selectedCategory, selectedSubcategoryId],
  )

  const loadBaseData = useCallback(async () => {
    setLoadingBase(true)
    setBaseError('')
    try {
      const [catalogData, branchesResult] = await Promise.all([
        getCatalogNavigation(),
        getSupabase().from('branches').select('*').order('id'),
      ])
      if (branchesResult.error) throw branchesResult.error
      setCatalog(catalogData || [])
      setBranches(branchesResult.data || [])
    } catch (error) {
      setBaseError(error?.message || 'No se pudo cargar la administración.')
    } finally {
      setLoadingBase(false)
    }
  }, [])

  const loadItems = useCallback(async (subcategoryId) => {
    if (!subcategoryId) {
      setItems([])
      return
    }
    setLoadingItems(true)
    setItemsError('')
    try {
      setItems(await getItemsBySubcategory(subcategoryId))
    } catch (error) {
      setItems([])
      setItemsError(error?.message || 'No se pudieron cargar los productos.')
    } finally {
      setLoadingItems(false)
    }
  }, [])

  const loadDeleted = useCallback(async () => {
    setLoadingDeleted(true)
    setDeletedError('')
    try {
      setDeletedItems(await getDeletedItems())
    } catch (error) {
      setDeletedItems([])
      setDeletedError(error?.message || 'No se pudieron cargar los productos eliminados.')
    } finally {
      setLoadingDeleted(false)
    }
  }, [])

  useEffect(() => { loadBaseData() }, [loadBaseData])
  useEffect(() => {
    if (tab === 'products' && selectedSubcategoryId) loadItems(selectedSubcategoryId)
  }, [loadItems, selectedSubcategoryId, tab])
  useEffect(() => {
    if (tab === 'deleted') loadDeleted()
  }, [loadDeleted, tab])

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  // ── Callbacks de guardado de categoría / subcategoría ────────────────────────
  const handleCategorySaved = async (saved) => {
    await loadBaseData() // recarga solo el catálogo (tabla chica)
  }

  const handleSubcategorySaved = async (saved) => {
    await loadBaseData()
  }

  const handleTabChange = (nextTab) => {
    setTab(nextTab)
    setSelectedCategoryId(null)
    setSelectedSubcategoryId(null)
    setItems([])
    setItemsError('')
  }

  const handleDelete = async (dish) => {
    if (!window.confirm(t({ es: '¿Mover este producto a Productos eliminados?', en: 'Move this product to Deleted products?', ru: 'Переместить продукт в удалённые?' }))) return
    setProcessingId(String(dish.id))
    setItemsError('')
    try {
      await softDeleteDish(dish.id)
      setItems((current) => current.filter((item) => String(item.id) !== String(dish.id)))
    } catch (error) {
      setItemsError(error?.message || 'No se pudo eliminar el producto.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRestore = async (dish) => {
    setProcessingId(String(dish.id))
    setDeletedError('')
    try {
      await restoreDish(dish.id)
      setDeletedItems((current) => current.filter((item) => String(item.id) !== String(dish.id)))
    } catch (error) {
      setDeletedError(error?.message || 'No se pudo restaurar el producto.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleEditorSaved = async (savedDish) => {
    const subcategoryId = String(savedDish?.subcategoryId ?? savedDish?.subcategory_id ?? selectedSubcategoryId ?? '')
    const category = catalog.find((entry) =>
      entry.subcategories?.some((subcategory) => String(subcategory.id) === subcategoryId),
    )
    if (category && subcategoryId) {
      setTab('products')
      setSelectedCategoryId(String(category.id))
      setSelectedSubcategoryId(subcategoryId)
      await loadItems(subcategoryId)
    }
  }

  if (selectedBranch) {
    return (
      <main className="admin-shell">
        <div className="admin-container">
          <AdminBranchDetail branchId={selectedBranch.id} branchName={selectedBranch.name} onBack={() => setSelectedBranch(null)} />
        </div>
      </main>
    )
  }

  return (
    <main className="admin-shell">
      <div className="admin-container">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">Gestión del menú</p>
            <h1>Admin La Catedral del Pisco</h1>
          </div>
          <button type="button" onClick={handleLogout} className="admin-button admin-button--secondary">Salir</button>
        </header>

        <nav className="admin-tabs" aria-label="Secciones de administración">
          {[
            ['branches', t({ es: 'Sucursales', en: 'Branches', ru: 'Филиалы' })],
            ['products', t({ es: 'Productos', en: 'Products', ru: 'Продукты' })],
            ['deleted', t({ es: 'Productos eliminados', en: 'Deleted products', ru: 'Удалённые продукты' })],
          ].map(([value, label]) => (
            <button key={value} type="button" className={tab === value ? 'admin-tab admin-tab--active' : 'admin-tab'} onClick={() => handleTabChange(value)} aria-current={tab === value ? 'page' : undefined}>
              {label}
            </button>
          ))}
        </nav>

        {baseError && (
          <div className="admin-alert admin-alert--error" role="alert">
            <span>{baseError}</span>
            <button type="button" className="admin-link-button" onClick={loadBaseData}>Reintentar</button>
          </div>
        )}

        {loadingBase ? <Status>Cargando administración…</Status> : (
          <>
            {tab === 'branches' && (
              <section aria-labelledby="branches-heading">
                <div className="admin-section-heading">
                  <div><p className="admin-eyebrow">Disponibilidad por local</p><h2 id="branches-heading">Sucursales</h2></div>
                </div>
                {branches.length ? (
                  <div className="admin-navigation-grid">
                    {branches.map((branch) => (
                      <button type="button" key={branch.id} className="admin-nav-card" onClick={() => setSelectedBranch(branch)}>
                        <span><strong>{branch.name}</strong><small>/{branch.slug}</small></span><span aria-hidden="true">→</span>
                      </button>
                    ))}
                  </div>
                ) : <Status>No hay sucursales configuradas.</Status>}
              </section>
            )}

            {tab === 'products' && (
              <section aria-labelledby="products-heading">
                <div className="admin-section-heading">
                  <div><p className="admin-eyebrow">Categoría → Subcategoría → Producto</p><h2 id="products-heading">Menú</h2></div>
                  <div className="admin-action-group">
                    {!selectedCategory && (
                      <button type="button" className="admin-button admin-button--secondary" onClick={() => setCategoryEditor({ category: null })}>+ Categoría</button>
                    )}
                    {selectedCategory && !selectedSubcategory && (
                      <button type="button" className="admin-button admin-button--secondary" onClick={() => setSubcategoryEditor({ subcategory: null, categoryId: selectedCategoryId })}>+ Subcategoría</button>
                    )}
                    <button type="button" className="admin-button admin-button--primary" onClick={() => setEditor({ dish: null, categoryId: selectedCategoryId, subcategoryId: selectedSubcategoryId })}>+ Producto</button>
                  </div>
                </div>

                <div className="admin-breadcrumb" aria-label="Ruta actual">
                  <button type="button" onClick={() => { setSelectedCategoryId(null); setSelectedSubcategoryId(null) }}>Categorías</button>
                  {selectedCategory && <><span>/</span><button type="button" onClick={() => setSelectedSubcategoryId(null)}>{translated(selectedCategory.name, locale)}</button></>}
                  {selectedSubcategory && <><span>/</span><strong>{translated(selectedSubcategory.name, locale)}</strong></>}
                </div>

                {!selectedCategory && (
                  catalog.length ? (
                    <div className="admin-navigation-grid">
                      {catalog.map((category) => (
                        <div key={category.id} className="admin-nav-card-wrapper">
                          <button type="button" className="admin-nav-card admin-nav-card--category" onClick={() => setSelectedCategoryId(String(category.id))}>
                            {category.image && <img src={category.image} alt="" loading="lazy" />}
                            <span><strong>{translated(category.name, locale)}</strong><small>{category.subcategories?.length || 0} subcategorías</small></span><span aria-hidden="true">→</span>
                          </button>
                          <button
                            type="button"
                            className="admin-nav-card__edit-btn"
                            title="Editar categoría"
                            onClick={() => setCategoryEditor({ category })}
                          >✎</button>
                        </div>
                      ))}
                    </div>
                  ) : <Status>No hay categorías configuradas.</Status>
                )}

                {selectedCategory && !selectedSubcategory && (
                  selectedCategory.subcategories?.length ? (
                    <div className="admin-navigation-grid">
                      {selectedCategory.subcategories.map((subcategory) => (
                        <div key={subcategory.id} className="admin-nav-card-wrapper">
                          <button type="button" className="admin-nav-card" onClick={() => setSelectedSubcategoryId(String(subcategory.id))}>
                            <span><strong>{translated(subcategory.name, locale)}</strong><small>{translated(subcategory.description, locale)}</small></span><span aria-hidden="true">→</span>
                          </button>
                          <button
                            type="button"
                            className="admin-nav-card__edit-btn"
                            title="Editar subcategoría"
                            onClick={() => setSubcategoryEditor({ subcategory, categoryId: selectedCategoryId })}
                          >✎</button>
                        </div>
                      ))}
                    </div>
                  ) : <Status>Esta categoría no tiene subcategorías.</Status>
                )}

                {selectedSubcategory && (
                  <div className="admin-product-list">
                    {itemsError && <p className="admin-alert admin-alert--error" role="alert">{itemsError}</p>}
                    {loadingItems ? <Status>Cargando productos…</Status> : items.length ? items.map((dish) => {
                      const imageUrl = resolveProductImageUrl(dish.image)
                      const isProcessing = processingId === String(dish.id)
                      return (
                        <article className="admin-product-row" key={dish.id}>
                          <div className="admin-product-row__image">
                            {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : <span aria-hidden="true">{translated(dish.name, locale).charAt(0)}</span>}
                          </div>
                          <div className="admin-product-row__content">
                            <h3>{translated(dish.name, locale)}</h3>
                            <p>{translated(dish.description, locale) || 'Sin descripción'}</p>
                          </div>
                          <strong className="admin-product-row__price">{formatPrice(dish.price, dish.currency)}</strong>
                          <div className="admin-product-row__actions">
                            <button type="button" className="admin-button admin-button--small admin-button--secondary" onClick={() => setEditor({ dish, categoryId: selectedCategoryId, subcategoryId: selectedSubcategoryId })} disabled={isProcessing}>Editar</button>
                            <button type="button" className="admin-button admin-button--small admin-button--secondary" onClick={() => setImageDish(dish)} disabled={isProcessing}>{dish.image ? 'Imagen' : '+ Imagen'}</button>
                            <button type="button" className="admin-button admin-button--small admin-button--danger-quiet" onClick={() => handleDelete(dish)} disabled={isProcessing}>{isProcessing ? 'Eliminando…' : 'Eliminar'}</button>
                          </div>
                        </article>
                      )
                    }) : <Status>No hay productos en esta subcategoría.</Status>}
                  </div>
                )}
              </section>
            )}

            {tab === 'deleted' && (
              <section aria-labelledby="deleted-heading">
                <div className="admin-section-heading"><div><p className="admin-eyebrow">Recuperación ante errores</p><h2 id="deleted-heading">Productos eliminados</h2></div></div>
                {deletedError && <p className="admin-alert admin-alert--error" role="alert">{deletedError}</p>}
                {loadingDeleted ? <Status>Cargando productos eliminados…</Status> : deletedItems.length ? (
                  <div className="admin-product-list">
                    {deletedItems.map((dish) => {
                      const isProcessing = processingId === String(dish.id)
                      return (
                        <article className="admin-product-row" key={dish.id}>
                          <div className="admin-product-row__content">
                            <h3>{translated(dish.name, locale)}</h3>
                            <p>{translated(dish.categoryName, locale)} / {translated(dish.subcategoryName, locale)}</p>
                            <small>Eliminado: {dish.deletedAt ? new Date(dish.deletedAt).toLocaleString('es-AR') : '—'}</small>
                          </div>
                          <strong className="admin-product-row__price">{formatPrice(dish.price, dish.currency)}</strong>
                          <div className="admin-product-row__actions">
                            <button type="button" className="admin-button admin-button--small admin-button--primary" onClick={() => handleRestore(dish)} disabled={isProcessing}>{isProcessing ? 'Restaurando…' : 'Restaurar'}</button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : <Status>No hay productos eliminados.</Status>}
              </section>
            )}
          </>
        )}
      </div>

      {editor && (
        <AdminMenuEditor
          key={`${editor.dish?.id || 'new'}-${editor.categoryId || ''}-${editor.subcategoryId || ''}`}
          dish={editor.dish}
          catalog={catalog}
          initialCategoryId={editor.categoryId}
          initialSubcategoryId={editor.subcategoryId}
          onClose={() => setEditor(null)}
          onSaved={handleEditorSaved}
        />
      )}
      {imageDish && (
        <AdminProductImageEditor
          dish={imageDish}
          onClose={() => setImageDish(null)}
          onSaved={async () => loadItems(selectedSubcategoryId)}
        />
      )}
      {categoryEditor && (
        <AdminCategoryEditor
          key={categoryEditor.category?.id || 'new-cat'}
          category={categoryEditor.category}
          onClose={() => setCategoryEditor(null)}
          onSaved={handleCategorySaved}
        />
      )}
      {subcategoryEditor && (
        <AdminSubcategoryEditor
          key={subcategoryEditor.subcategory?.id || 'new-subcat'}
          subcategory={subcategoryEditor.subcategory}
          categoryId={subcategoryEditor.categoryId}
          onClose={() => setSubcategoryEditor(null)}
          onSaved={handleSubcategorySaved}
        />
      )}
    </main>
  )
}
