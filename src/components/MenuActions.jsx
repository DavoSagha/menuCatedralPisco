import { useContext } from 'react'
import { LanguageContext } from '../App'
import Icon from './Icon'
import { BRAND_LINKS, INSTAGRAM_HANDLE } from '../lib/brandLinks'

const COPY = {
  reserve: { es: 'Reservas / WhatsApp', en: 'Reservations / WhatsApp', pt: 'Reservas / WhatsApp', ru: 'Бронирование / WhatsApp' },
  follow: { es: 'Seguinos', en: 'Follow us', pt: 'Siga-nos', ru: 'Подписаться' },
  newTab: { es: '(se abre en una pestaña nueva)', en: '(opens in a new tab)', pt: '(abre em nova guia)', ru: '(откроется в новой вкладке)' },
}

/**
 * Cierre de la carta: reservar e Instagram.
 *
 * Va antes del watermark y no dentro: en mobile `.menu-footer-mark` pasa a ser
 * un flex container, así que cualquier hijo se acomodaría AL LADO del logo en
 * vez de encima.
 */
export default function MenuActions() {
  const { locale } = useContext(LanguageContext)
  const t = (obj) => obj[locale] || obj.es

  return (
    <section className="menu-actions">
      <a
        className="menu-actions__link menu-actions__link--primary"
        href={BRAND_LINKS.reservations}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon name="calendar" size={18} />
        <span>{t(COPY.reserve)}</span>
        <span className="sr-only">{t(COPY.newTab)}</span>
      </a>

      <a
        className="menu-actions__link"
        href={BRAND_LINKS.instagram}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon name="instagram" size={18} />
        <span>{t(COPY.follow)}</span>
        <span className="menu-actions__handle">{INSTAGRAM_HANDLE}</span>
        <span className="sr-only">{t(COPY.newTab)}</span>
      </a>
    </section>
  )
}
