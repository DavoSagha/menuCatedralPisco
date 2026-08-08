import { useContext, useEffect, useRef, useState } from 'react'
import { LanguageContext } from '../App'
import Icon from './Icon'
import {
  ALLERGEN_LABELS,
  ALLERGENS_HEADING,
  DIET_LABELS,
  DIET_HEADING,
  UNAVAILABLE_LABEL,
  labelFor,
} from '../lib/dishTaxonomy'

const COPY = {
  back: { es: 'Volver al menú', en: 'Back to menu', ru: 'Вернуться в меню' },
}

export default function DishDetail({ dish, onClose }) {
  const { locale } = useContext(LanguageContext)
  const [imageFailed, setImageFailed] = useState(false)
  const backButtonRef = useRef(null)
  const t = (obj) => {
    if (typeof obj === 'string') return obj
    return obj?.[locale] || obj?.es || ''
  }

  useEffect(() => {
    const scrollY = window.scrollY
    const previousFocus = document.activeElement
    const previousTop = document.body.style.top

    document.body.classList.add('no-scroll')
    document.body.style.top = `-${scrollY}px`

    const focusFrame = requestAnimationFrame(() => backButtonRef.current?.focus())

    return () => {
      cancelAnimationFrame(focusFrame)
      document.body.classList.remove('no-scroll')
      document.body.style.top = previousTop
      window.scrollTo(0, scrollY)

      requestAnimationFrame(() => {
        if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
          previousFocus.focus()
        }
      })
    }
  }, [])

  useEffect(() => {
    setImageFailed(false)
  }, [dish.image])

  const formatPrice = (amount, currency) => {
    if (currency === 'ARS') return `$${amount.toLocaleString('es-AR')}`
    return `$${amount}`
  }

  const dishName = t(dish.name)
  const categoryName = t(dish.categoryName)
  const subcategoryName = t(dish.subcategoryName)
  const hasImage = dish.image
    && typeof dish.image === 'string'
    && dish.image.length > 0
    && !imageFailed

  return (
    <div
      className="dish-detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-detail-title"
    >
      <article className="dish-detail-shell">
        <div className="dish-detail-hero">
          {hasImage ? (
            <img
              src={dish.image}
              alt={dishName}
              className="dish-detail-hero-image"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="dish-detail-placeholder" aria-hidden="true">
              <span className="dish-detail-placeholder-letter">
                {(dishName || '?')[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="dish-detail-hero-overlay" />
          <button
            ref={backButtonRef}
            type="button"
            onClick={onClose}
            className="dish-detail-back"
            aria-label={t(COPY.back)}
          >
            <Icon name="arrowLeft" size={20} />
          </button>
        </div>

        <div className="dish-detail-body">
          <div className="dish-detail-body-inner">
            {(categoryName || subcategoryName) && (
              <p className="dish-detail-path">
                {categoryName}
                {categoryName && subcategoryName && <span aria-hidden="true"> / </span>}
                {subcategoryName}
              </p>
            )}

            <div className="dish-detail-name-row">
              <h2 id="dish-detail-title" className="dish-detail-name">{dishName}</h2>
              <span className="dish-detail-price">
                {formatPrice(dish.price, dish.currency)}
              </span>
            </div>

            {dish.available === false && (
              <div className="dish-detail-status" role="status">
                {UNAVAILABLE_LABEL[locale] || UNAVAILABLE_LABEL.es}
              </div>
            )}

            {t(dish.description) && (
              <p className="dish-detail-description">{t(dish.description)}</p>
            )}

            {dish.diet_tags && dish.diet_tags.length > 0 && (
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  {DIET_HEADING[locale] || DIET_HEADING.es}
                </h3>
                <div style={styles.tagsRow}>
                  {dish.diet_tags.map((tag) => (
                    <span key={tag} style={styles.chip}>
                      {labelFor(DIET_LABELS, tag, locale)}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {dish.allergens && dish.allergens.length > 0 && (
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  {ALLERGENS_HEADING[locale] || ALLERGENS_HEADING.es}
                </h3>
                <div style={styles.tagsRow}>
                  {dish.allergens.map((allergen) => (
                    <span key={allergen} style={{ ...styles.chip, ...styles.allergenChip }}>
                      <Icon name="alert" size={13} strokeWidth={2} />
                      {labelFor(ALLERGEN_LABELS, allergen, locale)}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </article>
    </div>
  )
}

const styles = {
  section: {
    paddingTop: '18px',
    marginTop: '18px',
    borderTop: '1px solid var(--card-border)',
  },
  sectionTitle: {
    marginBottom: '10px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-heading)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  tagsRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  /* Un solo sistema de chip. Antes cada alérgeno traía su propio color de la
     paleta Flat UI 2013 y la ficha parecía un tablero de tickets. */
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '5px 12px', borderRadius: '999px',
    border: '1px solid rgba(239, 159, 39, 0.42)',
    color: 'var(--accent-gold)', background: 'transparent',
    fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500,
    letterSpacing: '0.02em', lineHeight: '20px',
  },
  allergenChip: {
    borderColor: 'rgba(184, 168, 154, 0.34)',
    color: 'var(--text-secondary)',
  },
}
