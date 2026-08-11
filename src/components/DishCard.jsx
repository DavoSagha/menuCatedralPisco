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
      className={`dish-card${unavailable ? ' is-unavailable' : ''}`}
      onClick={activate}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${dishName}, ${price}${unavailable ? `, ${unavailableLabel}` : ''}`}
    >
      {hasImage && (
        <div className="dish-card__thumb-wrap">
          <img
            className="dish-card__thumb"
            src={dish.image}
            alt={dishName}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
      <div className="dish-card__body">
        <div className="dish-card__name-row">
          <h3 className="dish-card__name">{dishName}</h3>
          <span className="dish-card__price">{price}</span>
        </div>

        {t(dish.description) && (
          <p className="dish-card__desc">{t(dish.description)}</p>
        )}

        {(unavailable || dish.diet_tags?.length > 0) && (
          <div className="dish-card__tags">
            {unavailable && (
              <span className="chip chip--unavailable">{unavailableLabel}</span>
            )}
            {dish.diet_tags?.map((tag) => (
              <span key={tag} className="chip">
                {labelFor(DIET_LABELS, tag, locale)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
