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

  useEffect(() => {
    if (!shouldRenderItems || !contentRef.current) return

    const measure = () => {
      setContentHeight(contentRef.current?.scrollHeight || 0)
    }

    const frame = requestAnimationFrame(measure)
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measure)
      : null

    observer?.observe(contentRef.current)

    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [shouldRenderItems, open, locale])

  const hasSubcategories = category.subcategories && category.subcategories.length > 0
  const subItems = (sub) => sub.items || sub.dishes || []
  const bgImage = category.image ? `url(${category.image})` : undefined

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
      style={styles.wrapper}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="category-banner-trigger"
        style={{
          ...styles.banner,
          ...(bgImage ? { backgroundImage: bgImage } : {}),
        }}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <div style={styles.overlay} />
        <div style={styles.content}>
          <span style={styles.label}>{t(category.name)}</span>
          <span
            style={{
              ...styles.arrowBox,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <Icon name="chevronDown" size={18} strokeWidth={2} />
          </span>
        </div>
      </button>

      <div
        id={panelId}
        ref={contentRef}
        style={{
          ...styles.dishesContainer,
          maxHeight: open ? `${contentHeight}px` : '0px',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: open
            ? 'max-height 0.45s ease, opacity 0.35s ease'
            : 'max-height 0.35s ease, opacity 0.25s ease',
        }}
      >
        {shouldRenderItems && (
          <div style={styles.dishesInner} aria-hidden={!open}>
            {hasSubcategories
              ? category.subcategories.map((sub, idx) => (
                  <div key={sub.id || idx}>
                    <div style={styles.subHeader}>
                      <span style={styles.subName}>{t(sub.name)}</span>
                      {sub.description && t(sub.description) && (
                        <p style={styles.subDesc}>{t(sub.description)}</p>
                      )}
                    </div>
                    {subItems(sub).map((dish) => (
                      <DishCard
                        key={dish.id}
                        dish={dish}
                        onClick={(selectedDish) => selectDish(selectedDish, sub)}
                      />
                    ))}
                  </div>
                ))
              : (category.dishes || category.items || []).map((dish) => (
                  <DishCard key={dish.id} dish={dish} onClick={selectDish} />
                ))}
          </div>
        )}
      </div>
    </section>
  )
}

const styles = {
  wrapper: {
    margin: 0,
    padding: 0,
    height: 'auto',
    overflow: 'hidden',
    borderBottom: 'none',
    outline: 'none',
    boxShadow: 'none',
  },
  /* 112px en vez de 150px: con 8 categorías cerradas eran ~1200px de banners
     antes de ver un solo plato. */
  banner: {
    width: '100%',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    padding: '28px 20px',
    border: 'none',
    background: `var(--bg-banner) no-repeat center / cover`,
    color: 'var(--text-primary)',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'var(--font-sans)',
    minHeight: '112px',
    outline: 'none',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.68) 100%)',
    zIndex: 1,
  },
  content: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    width: '100%',
  },
  label: {
    fontFamily: 'var(--font-display)',
    fontSize: '26px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    flex: 1,
    textTransform: 'uppercase',
    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
  },
  arrowBox: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'rgba(239,159,39,0.12)',
    border: '1px solid var(--accent-gold)',
    color: 'var(--accent-gold)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.35s ease, background 0.2s',
    flexShrink: 0,
  },
  dishesContainer: {
    overflow: 'hidden',
    background: 'var(--bg-primary)',
  },
  dishesInner: {
    padding: '16px 14px 12px',
  },
  subHeader: {
    padding: '18px 2px 10px',
  },
  subName: {
    fontFamily: 'var(--font-heading)',
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--accent-gold)',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  subDesc: {
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '6px',
    lineHeight: 1.5,
  },
}
