import { useState, useContext, useRef, useEffect, useCallback } from 'react'
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
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false) }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        style={{
          ...styles.banner,
          ...(bgImage ? { backgroundImage: bgImage } : {}),
          ...(hovered && !pressed ? styles.bannerHover : {}),
          ...(pressed ? styles.bannerActive : {}),
        }}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <div style={styles.overlay} />
        {/* Línea dorada inferior que aparece en hover/open */}
        <div style={{
          ...styles.goldLine,
          opacity: (hovered || open) ? 1 : 0,
          transform: (hovered || open) ? 'scaleX(1)' : 'scaleX(0)',
        }} />
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
    /* Separación entre banners: el fondo oscuro queda visible entre cards */
    margin: '0 10px 8px',
    padding: 0,
    height: 'auto',
    overflow: 'hidden',
    borderRadius: '12px',
    border: '1px solid rgba(212, 175, 55, 0.10)',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.35)',
    outline: 'none',
  },
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
    transition: 'filter 0.25s ease, transform 0.2s ease',
  },
  bannerHover: {
    filter: 'brightness(1.08)',
  },
  bannerActive: {
    filter: 'brightness(0.92)',
    transform: 'scale(0.995)',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    /* Gradiente diagonal: oscuro abajo-izquierda, semitransparente arriba-derecha */
    background: 'linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.40) 55%, rgba(0,0,0,0.55) 100%)',
    zIndex: 1,
  },
  goldLine: {
    position: 'absolute',
    bottom: 0,
    left: '5%',
    right: '5%',
    height: '2px',
    borderRadius: '2px',
    background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)',
    zIndex: 3,
    transformOrigin: 'center',
    transition: 'opacity 0.3s ease, transform 0.35s ease',
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
    textShadow: '0 2px 12px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)',
  },
  arrowBox: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'rgba(212,175,55,0.12)',
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
    borderTop: '1px solid rgba(212, 175, 55, 0.08)',
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
