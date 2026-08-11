import { useState, createContext, useEffect, useContext, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import Header from './components/Header'
import FooterWatermark from './components/FooterWatermark'
import CategoryBanner from './components/CategoryBanner'
import CategoryNav, { useCategoryScrollSpy } from './components/CategoryNav'
import BranchSwitcher from './components/BranchSwitcher'
import MenuActions from './components/MenuActions'
import ChatWidget from './components/ChatWidget'
import DishDetail from './components/DishDetail'
import LoginPage from './components/LoginPage'
import AdminPanel from './components/AdminPanel'
import StaffPanel from './components/StaffPanel'
import { getMenuData, getBranches, invalidateCache } from './lib/menuData'
import { onAuthChange, getUser, getUserRole } from './lib/auth'
import { resolveBranchSlug, writePreferredBranch } from './lib/branchPreference'

export const LanguageContext = createContext()

const COPY = {
  loading: { es: 'Cargando...', en: 'Loading...', pt: 'Carregando...', ru: 'Загрузка...' },
  noBranches: {
    es: 'No pudimos cargar las sucursales. Probá de nuevo en un momento.',
    en: "We couldn't load the locations. Please try again shortly.",
    pt: 'Não foi possível carregar os locais. Tente novamente em breve.',
    ru: 'Не удалось загрузить заведения. Попробуйте позже.',
  },
  unknownBranch: {
    es: 'Esa sucursal no existe. Elegí una de la lista:',
    en: "That location doesn't exist. Pick one from the list:",
    pt: 'Esse local não existe. Escolha um da lista:',
    ru: 'Такого заведения нет. Выберите из списка:',
  },
}

function ProtectedRoute({ role, children }) {
  const { user, authLoading } = useContext(LanguageContext)
  if (authLoading) return null // Esperar a que se resuelva la sesión
  const userRole = user ? getUserRole(user) : null
  if (!user || userRole !== role) return <Navigate to="/" replace />
  return children
}

function FullScreenMessage({ children }) {
  return (
    <div className="screen-message">
      <span className="screen-message__text">{children}</span>
    </div>
  )
}

/**
 * Antes `/` y `*` redirigían al slug 'puerto-madero' escrito a mano. Si esa
 * sucursal cambiaba de slug o cerraba, la app apuntaba a una carta inexistente
 * y el cliente veía todo como disponible.
 *
 * Ahora resuelve contra las sucursales reales y respeta la última elegida.
 */
function BranchRedirect() {
  const { locale, branches, branchesLoading } = useContext(LanguageContext)
  const t = (obj) => obj[locale] || obj.es

  if (branchesLoading) return <FullScreenMessage>{t(COPY.loading)}</FullScreenMessage>

  const slug = resolveBranchSlug(branches)
  if (slug) return <Navigate to={`/menu/${slug}`} replace />

  return <FullScreenMessage>{t(COPY.noBranches)}</FullScreenMessage>
}

function MenuPage() {
  const { locale, user, branches, branchesLoading } = useContext(LanguageContext)
  const { branchSlug } = useParams()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(null)
  const [branch, setBranch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDish, setSelectedDish] = useState(null)
  const [openIds, setOpenIds] = useState(() => new Set())

  const role = user ? getUserRole(user) : null
  const categories = menu?.categories

  useEffect(() => {
    setLoading(true)
    ;(async () => {
      try {
        const data = await getMenuData(branchSlug)
        setMenu(data)
        setBranch(data.branch)
      } catch (err) {
        console.error('Failed to load menu:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [branchSlug])

  // Todas cerradas al entrar: el comensal escanea el QR y lo primero que ve es
  // la carta entera de un vistazo, para elegir por dónde entrar. Con una
  // categoría ya abierta aterrizaba dentro de Entradas y las otras ocho
  // quedaban empujadas fuera de pantalla.
  // Se resetea al cambiar de sucursal, que es cuando cambia `categories`.
  useEffect(() => {
    setOpenIds(new Set())
  }, [categories])

  /**
   * Abre una categoría y la deja anclada bajo el header + la nav.
   *
   * Si había otra abierta MÁS ARRIBA, al cerrarse todo lo de abajo sube y la
   * sección se escapa. Por eso esperamos a que termine el cierre (450ms, el
   * mismo tiempo que la transición del panel) antes de anclar: si scrolleamos
   * antes, el scroll suave pelea contra la animación de colapso.
   * Si no había ninguna abierta no hay nada que esperar, y medio segundo de
   * demora se sentiría como que la app no responde.
   */
  const revealCategory = useCallback((id) => {
    const waitForClose = openIds.size > 0 && !openIds.has(id)
    setOpenIds(new Set([id]))

    window.setTimeout(() => {
      const section = document.getElementById(`category-${id}`)
      if (!section) return
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      section.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    }, waitForClose ? 460 : 0)
  }, [openIds])

  // El banner alterna: si tocás la que ya está abierta, se cierra y volvés a
  // ver la carta completa.
  const toggleCategory = useCallback((id) => {
    if (openIds.has(id)) {
      setOpenIds(new Set())
      return
    }
    revealCategory(id)
  }, [openIds, revealCategory])

  // La nav NO alterna: tocar una pill siempre abre y lleva a esa sección.
  // Si alternara, tocar la categoría en la que ya estás la cerraría, que es
  // exactamente lo contrario de lo que espera alguien que usa una barra de
  // navegación.
  const activeCategoryId = useCategoryScrollSpy(categories)

  // Solo se recuerda una sucursal que la base confirmó como existente.
  useEffect(() => {
    if (branch?.slug) writePreferredBranch(branch.slug)
  }, [branch?.slug])

  const changeBranch = useCallback((slug) => {
    writePreferredBranch(slug)
    navigate(`/menu/${slug}`)
    window.scrollTo(0, 0)
  }, [navigate])

  const t = (obj) => obj[locale] || obj.es

  if (loading || branchesLoading) {
    return <FullScreenMessage>{t(COPY.loading)}</FullScreenMessage>
  }

  // El slug de la URL no existe (QR viejo, sucursal renombrada). No redirigimos
  // en silencio: mostrar la carta de otra sucursal sería peor que avisar.
  if (!branch && branches?.length > 0) {
    return (
      <div className="branch-fallback">
        <p className="branch-fallback__text">{t(COPY.unknownBranch)}</p>
        <ul className="branch-fallback__list">
          {branches.map((option) => (
            <li key={option.slug}>
              <button
                type="button"
                onClick={() => changeBranch(option.slug)}
                className="branch-sheet__option"
              >
                <span className="branch-sheet__name">{option.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <>
      <Header user={user} role={role} />
      <BranchSwitcher
        branches={branches}
        currentSlug={branch?.slug || branchSlug}
      />
      {/* La nav y la carta son hermanas dentro de un mismo contenedor para que
          en escritorio puedan ser las dos columnas de una grilla. En mobile
          `.menu-layout` es un bloque común y no cambia nada: la nav queda
          pegada arriba y la carta debajo.
          Va después del BranchSwitcher porque la etiqueta de sucursal es parte
          del encabezado y se va con el scroll; la nav se queda. */}
      <div className="menu-layout">
        <CategoryNav
          categories={categories}
          activeId={activeCategoryId}
          onSelect={revealCategory}
        />
        <main className="menu-main">
          {categories?.map((cat) => (
            <CategoryBanner
              key={cat.id}
              category={cat}
              onDishClick={setSelectedDish}
              open={openIds.has(String(cat.id))}
              onToggle={() => toggleCategory(String(cat.id))}
            />
          ))}
          <MenuActions />
          <FooterWatermark />
        </main>
      </div>
      <ChatWidget branchSlug={branchSlug} />
      {selectedDish && (
        <DishDetail dish={selectedDish} onClose={() => setSelectedDish(null)} />
      )}
    </>
  )
}

function LoginRoute() {
  const { user, authLoading } = useContext(LanguageContext)
  if (authLoading) return null // Esperar a que se resuelva la sesión
  if (user) {
    const role = getUserRole(user)
    if (role === 'admin') return <Navigate to="/admin" replace />
    if (role === 'staff') return <Navigate to="/staff" replace />
  }
  return <LoginPage />
}

export default function App() {
  const [locale, setLocale] = useState('es')
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [branches, setBranches] = useState([])
  const [branchesLoading, setBranchesLoading] = useState(true)

  useEffect(() => {
    const sub = onAuthChange((u) => {
      setUser(u)
      setAuthLoading(false)
      if (!u) invalidateCache()
    })
    getUser().then(({ data }) => {
      setUser(data?.user || null)
      setAuthLoading(false)
    })
    return () => sub?.unsubscribe?.()
  }, [])

  // Se cargan una sola vez acá arriba: las necesitan tanto el redirect de `/`
  // como el selector dentro del menú. La tabla es chica y de lectura pública.
  useEffect(() => {
    let cancelled = false
    getBranches()
      .then((data) => {
        if (!cancelled) setBranches(data)
      })
      .catch((err) => {
        console.error('Failed to load branches:', err)
        if (!cancelled) setBranches([])
      })
      .finally(() => {
        if (!cancelled) setBranchesLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const ctx = { locale, setLocale, user, setUser, authLoading, branches, branchesLoading }

  return (
    <LanguageContext.Provider value={ctx}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BranchRedirect />} />
          <Route path="/menu/:branchSlug" element={<MenuPage />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminPanel /></ProtectedRoute>
          } />
          <Route path="/staff" element={
            <ProtectedRoute role="staff"><StaffPanel /></ProtectedRoute>
          } />
          <Route path="*" element={<BranchRedirect />} />
        </Routes>
      </BrowserRouter>
    </LanguageContext.Provider>
  )
}
