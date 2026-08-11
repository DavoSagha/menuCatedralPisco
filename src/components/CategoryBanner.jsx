import { useState, useContext, useRef, useEffect } from 'react'
import { LanguageContext } from '../App'
import DishCard from './DishCard'
import Icon from './Icon'

/**
 * Componente controlado: el estado `open` vive en MenuPage para que la nav de
 * categorías también pueda abrir una sección, no solo el click en el banner.
 */
export default function CategoryBanner({ category, onDishClick, open = false, onToggle }) {
  const { locale } = useContext(LanguageContext)
  const [animating, setAnimating] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const contentRef = useRef(null)
  const innerRef = useRef(null)
  const isFirstRender = useRef(true)

  const t = (obj) => obj[locale] || obj.es

  const handleToggle = () => {
    if (animating) return
    onToggle?.()
  }

  // Se dispara con cualquier cambio de `open`, venga del banner o de la nav.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setAnimating(true)
    const timer = setTimeout(() => setAnimating(false), 450)
    return () => clearTimeout(timer)
  }, [open])

  const shouldRenderItems = open || animating

  /**
   * Mide el alto real del contenido para animar el despliegue.
   *
   * El observer va sobre el CONTENIDO, no sobre el panel. El panel tiene el
   * alto clavado por `maxHeight`, así que su caja nunca cambia y el
   * ResizeObserver no dispararía: al cruzar el breakpoint de escritorio los
   * platos pasan a dos columnas, el contenido se achica a la mitad, y una
   * categoría abierta se quedaba con el hueco de la medición vieja.
   */
  useEffect(() => {
    if (!shouldRenderItems || !contentRef.current) return

    const measure = () => {
      setContentHeight(contentRef.current?.scrollHeight || 0)
    }

    const frame = requestAnimationFrame(measure)
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measure)
      : null

    if (innerRef.current) observer?.observe(innerRef.current)

    // Respaldo para lo que el observer no ve: cambio de orientación y el
    // reflow que provoca la fuente cuando termina de descargarse.
    window.addEventListener('resize', measure)

    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [shouldRenderItems, open, locale])

  const hasSubcategories = category.subcategories && category.subcategories.length > 0
  const subItems = (sub) => sub.items || sub.dishes || []
  const bgImage = category.image ? `url(${category.image})` : undefined

  const dishCount = hasSubcategories
    ? category.subcategories.reduce((total, sub) => total + subItems(sub).length, 0)
    : (category.dishes || category.items || []).length

  const selectDish = (dish, subcategory = null) => {
    onDishClick?.({
      ...dish,
      categoryId: String(category.id),
      categoryName: category.name,
      subcategoryId: subcategory?.id ? String(subcategory.id) : null,
      subcategoryName: subcategory?.name || null,
    })
  }

  const panelId = `category-panel-${category.id}`

  return (
    <section
      id={`category-${category.id}`}
      className={`category-section${open ? ' is-open' : ''}`}
    >
      {/* `:hover` y `:active` los resuelve el navegador. Antes esto eran dos
          `useState` y cinco handlers de puntero para pintar un brillo. */}
      <button
        type="button"
        onClick={handleToggle}
        className={`category-banner-trigger${bgImage ? '' : ' category-banner-trigger--no-image'}`}
        style={bgImage ? { backgroundImage: bgImage } : undefined}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <div className="category-banner__overlay" />
        <div className="category-banner__arch" />
        <div className="category-banner__rule" />
        <div className="category-banner__content">
          <span className="category-banner__label">{t(category.name)}</span>
          {dishCount > 0 && (
            <span className="category-banner__count">{dishCount}</span>
          )}
          <span className="category-banner__chevron">
            <Icon name="chevronDown" size={18} strokeWidth={2} />
          </span>
        </div>
      </button>

      <div
        id={panelId}
        ref={contentRef}
        className="category-banner__panel"
        /* Lo único que queda inline es la altura medida: es un dato, no un
           estilo. Opacidad, pointer-events y transición los deriva el CSS
           de `.is-open`. */
        style={{ maxHeight: open ? `${contentHeight}px` : '0px' }}
      >
        {shouldRenderItems && (
          <div className="category-banner__panel-inner" ref={innerRef} aria-hidden={!open}>
            {/* Los platos van envueltos en `.dish-grid` en los dos casos, con
                subcategorías y sin ellas. Es el gancho para que en escritorio
                pasen a dos columnas sin que el encabezado de subcategoría
                quede convertido en una celda más de la grilla. */}
            {hasSubcategories
              ? category.subcategories.map((sub, idx) => (
                  <div className="subcategory-group" key={sub.id || idx}>
                    <div className="subcategory-head">
                      <span className="subcategory-head__name">{t(sub.name)}</span>
                      {sub.description && t(sub.description) && (
                        <p className="subcategory-head__desc">{t(sub.description)}</p>
                      )}
                    </div>
                    <div className="dish-grid">
                      {subItems(sub).map((dish) => (
                        <DishCard
                          key={dish.id}
                          dish={dish}
                          onClick={(selectedDish) => selectDish(selectedDish, sub)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              : (
                  <div className="dish-grid">
                    {(category.dishes || category.items || []).map((dish) => (
                      <DishCard key={dish.id} dish={dish} onClick={selectDish} />
                    ))}
                  </div>
                )}
          </div>
        )}
      </div>
    </section>
  )
}

