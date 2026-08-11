import { useContext, useEffect, useRef, useState } from 'react'
import { LanguageContext } from '../App'

/**
 * Barra de categorías sticky con scroll-spy.
 *
 * Deliberadamente delgada (56px) y sin sombra pesada: las barras sticky
 * gruesas rompen al hacer zoom y se comen la pantalla en mobile, sobre todo
 * con el teclado virtual abierto.
 */
export default function CategoryNav({ categories, activeId, onSelect }) {
  const { locale } = useContext(LanguageContext)
  const listRef = useRef(null)
  const t = (obj) => obj?.[locale] || obj?.es || ''

  // Mantiene la pill activa a la vista cuando el scroll-spy cambia de categoría.
  useEffect(() => {
    if (!activeId || !listRef.current) return
    const pill = listRef.current.querySelector(`[data-cat-id="${activeId}"]`)
    pill?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activeId])

  if (!categories || categories.length < 2) return null

  return (
    <nav className="category-nav" aria-label={NAV_LABEL[locale] || NAV_LABEL.es}>
      <ul className="category-nav__list" ref={listRef}>
        {categories.map((cat) => {
          const id = String(cat.id)
          const isActive = id === activeId
          return (
            <li key={id}>
              <button
                type="button"
                data-cat-id={id}
                onClick={() => onSelect(id)}
                className={`category-nav__pill${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'true' : undefined}
              >
                {t(cat.name)}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

const NAV_LABEL = {
  es: 'Categorías del menú',
  en: 'Menu categories',
  ru: 'Категории меню',
}

/**
 * Marca como activa la categoría cuyo encabezado cruzó la línea de lectura,
 * justo debajo del header y de la propia nav.
 */
export function useCategoryScrollSpy(categories) {
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    if (!categories?.length) return undefined

    const ids = categories.map((cat) => String(cat.id))
    setActiveId((prev) => (prev && ids.includes(prev) ? prev : ids[0]))

    const nodes = ids
      .map((id) => document.getElementById(`category-${id}`))
      .filter(Boolean)

    if (!nodes.length) return undefined

    const pickActive = () => {
      const line = HEADER_OFFSET + 1
      let current = ids[0]
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= line) {
          current = node.id.replace('category-', '')
        }
      }
      setActiveId(current)
    }

    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(pickActive)
    }

    pickActive()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [categories])

  return activeId
}

/**
 * Alto del header (80px) + alto de la nav (56px).
 *
 * La nav quedó en 56 y no en 52 para que las pills lleguen a los 44px de touch
 * target que usa el resto de la app. Si se toca este número, hay que tocar
 * también `scroll-margin-top` en `.category-section`.
 */
export const HEADER_OFFSET = 136
