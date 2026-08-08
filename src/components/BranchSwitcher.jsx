import { useContext } from 'react'
import { LanguageContext } from '../App'

/**
 * Etiqueta fija de sucursal.
 *
 * La sucursal se identifica por la URL (`/menu/:branchSlug`). Este componente
 * solo muestra "La Catedral del Pisco, <sucursal>" como texto plano: sin botón, sin chevron,
 * sin hover y sin eventos click. El cambio de sucursal se hace navegando a
 * otra URL (QR, link compartido), no desde la carta.
 */
export default function BranchSwitcher({ branches, currentSlug }) {
  const { locale } = useContext(LanguageContext)
  const current = branches?.find((b) => b.slug === currentSlug) || null
  const label = `La Catedral del Pisco${current?.name ? `, ${current.name}` : ''}`

  return <p className="branch-switcher__static">{label}</p>
}
