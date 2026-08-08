import { useContext } from 'react'
import { LanguageContext } from '../App'
import { DIET_LABELS, UNAVAILABLE_LABEL, labelFor } from '../lib/dishTaxonomy'

/**
 * Los alérgenos NO se muestran acá a propósito: nadie recorre una carta
 * filtrando por sulfitos. Son información de consulta, así que viven en
 * DishDetail. Las dietas sí se quedan (un celíaco necesita verlas al escanear),
 * pero como chip de contorno monocromo en vez de bloque de color.
 */
export default function DishCard({ dish, onClick }) {
  const { locale } = useContext(LanguageContext)
  const t = (obj) => obj?.[locale] || obj?.es || ''

  const formatPrice = (amount, currency) => {
    if (currency === 'ARS') return `$${amount.toLocaleString('es-AR')}`
    return `$${amount}`
  }

  const hasImage = dish.image && typeof dish.image === 'string' && dish.image.length > 0
  const unavailable = dish.available === false
  const dishName = t(dish.name)
  const price = formatPrice(dish.price, dish.currency)
  const unavailableLabel = UNAVAILABLE_LABEL[locale] || UNAVAILABLE_LABEL.es

  const activate = (event) => {
    event.currentTarget.focus()
    onClick?.(dish)
  }

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    activate(event)
  }

  return (
    <div
      className="dish-card-interactive"
      style={{ ...styles.card, ...(unavailable ? styles.cardUnavailable : {}) }}
      onClick={activate}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${dishName}, ${price}${unavailable ? `, ${unavailableLabel}` : ''}`}
    >
      {hasImage && (
        <div style={styles.thumbWrap}>
          <img
            src={dish.image}
            alt={dishName}
            style={{ ...styles.thumb, ...(unavailable ? styles.thumbUnavailable : {}) }}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
      <div style={styles.cardBody}>
        <div style={styles.nameRow}>
          <h3 style={styles.name}>{dishName}</h3>
          <span style={styles.price}>{price}</span>
        </div>

        {t(dish.description) && <p style={styles.desc}>{t(dish.description)}</p>}

        {(unavailable || dish.diet_tags?.length > 0) && (
          <div style={styles.tagsRow}>
            {unavailable && (
              <span style={{ ...styles.chip, ...styles.unavailableChip }}>
                {unavailableLabel}
              </span>
            )}
            {dish.diet_tags?.map((tag) => (
              <span key={tag} style={styles.chip}>
                {labelFor(DIET_LABELS, tag, locale)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  card: {
    display: 'flex',
    gap: '14px',
    background: 'var(--card-bg)',
    borderRadius: '10px',
    border: '1px solid var(--card-border)',
    marginBottom: '12px',
    padding: '14px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  cardUnavailable: {
    borderColor: 'rgba(231, 76, 60, 0.42)',
  },
  thumbWrap: {
    width: '96px', minWidth: '96px', height: '96px',
    overflow: 'hidden', flexShrink: 0, alignSelf: 'flex-start',
    borderRadius: '8px',
  },
  thumb: {
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
  },
  thumbUnavailable: {
    filter: 'saturate(0.55)',
    opacity: 0.78,
  },
  cardBody: {
    flex: 1, minWidth: 0,
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
  },
  nameRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: '6px', gap: '12px',
  },
  name: {
    fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: 600,
    color: 'var(--text-primary)', flex: 1, lineHeight: 1.25,
  },
  price: {
    fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 600,
    color: 'var(--accent-gold)', whiteSpace: 'nowrap',
  },
  desc: {
    fontFamily: 'var(--font-sans)', fontSize: '14px',
    color: 'var(--text-secondary)', lineHeight: 1.55,
  },
  tagsRow: {
    display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px',
  },
  /* Chip de contorno: marca sin gritar, y no compite con el precio. */
  chip: {
    display: 'inline-block', padding: '3px 10px', borderRadius: '999px',
    border: '1px solid rgba(239, 159, 39, 0.42)',
    color: 'var(--accent-gold)', background: 'transparent',
    fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 500,
    letterSpacing: '0.04em', lineHeight: '17px', whiteSpace: 'nowrap',
  },
  unavailableChip: {
    borderColor: 'rgba(231, 76, 60, 0.55)',
    color: '#f08a7e',
  },
}
