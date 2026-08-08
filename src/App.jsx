import { useState, createContext, useEffect, useContext, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import Header from './components/Header'
import FooterWatermark from './components/FooterWatermark'
import CategoryBanner from './components/CategoryBanner'
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
  const { user } = useContext(LanguageContext)
  const userRole = user ? getUserRole(user) : null
  if (!user || userRole !== role) return <Navigate to="/" replace />
  return children
}

function FullScreenMessage({ children }) {
  return (
    <div style={styles.loading}>
      <span style={styles.loadingText}>{children}</span>
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

  // La primera categoría arranca abierta: si están todas cerradas, el cliente
  // escanea el QR y no ve un solo plato hasta que toca algo.
  useEffect(() => {
    const first = categories?.[0]
    setOpenIds(first ? new Set([String(first.id)]) : new Set())
  }, [categories])

  const toggleCategory = useCallback((id) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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
      <div style={styles.unknownBranch}>
        <p style={styles.unknownBranchText}>{t(COPY.unknownBranch)}</p>
        <ul style={styles.unknownBranchList}>
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
      <main style={styles.main}>
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
      <ChatWidget branchSlug={branchSlug} />
      {selectedDish && (
        <DishDetail dish={selectedDish} onClose={() => setSelectedDish(null)} />
      )}
    </>
  )
}

function LoginRoute() {
  const { user } = useContext(LanguageContext)
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
  const [branches, setBranches] = useState([])
  const [branchesLoading, setBranchesLoading] = useState(true)

  useEffect(() => {
    const sub = onAuthChange((u) => {
      setUser(u)
      if (!u) invalidateCache()
    })
    getUser().then(({ data }) => setUser(data?.user || null))
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

  const ctx = { locale, setLocale, user, setUser, branches, branchesLoading }

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

const styles = {
  main: {
    flex: '0 0 auto',
    height: 'auto',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 0,
  },
  loading: {
    height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', background: 'var(--bg-primary)',
  },
  loadingText: {
    color: 'var(--accent-gold)', fontSize: '14px', textAlign: 'center',
    fontFamily: 'var(--font-sans)', lineHeight: 1.5,
  },
  unknownBranch: {
    minHeight: '100dvh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '18px',
    padding: '24px', background: 'var(--bg-primary)',
  },
  unknownBranchText: {
    color: 'var(--text-secondary)', fontSize: '15px', textAlign: 'center',
    fontFamily: 'var(--font-sans)', lineHeight: 1.5, maxWidth: '340px',
  },
  unknownBranchList: {
    listStyle: 'none', width: '100%', maxWidth: '340px', padding: 0, margin: 0,
  },
}
