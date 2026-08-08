import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LanguageContext } from '../App'
import { getUser, getUserBranchId, logout } from '../lib/auth'
import { BranchAvailabilityNavigator } from './AdminBranchDetail'
import './admin.css'

export default function StaffPanel() {
  const navigate = useNavigate()
  const { locale } = useContext(LanguageContext)
  const [branchId, setBranchId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const t = (messages) => messages[locale] || messages.es

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const { data, error: userError } = await getUser()
        if (userError) throw userError
        const assignedBranchId = getUserBranchId(data?.user)
        if (!assignedBranchId) throw new Error(t({ es: 'Tu usuario no tiene una sucursal asignada.', en: 'Your user has no assigned branch.', ru: 'Вашему пользователю не назначен филиал.' }))
        if (active) setBranchId(assignedBranchId)
      } catch (loadError) {
        if (active) setError(loadError?.message || 'No se pudo cargar la sucursal asignada.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <main className="admin-shell">
      <div className="admin-container">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">Operación diaria</p>
            <h1>{t({ es: 'Staff La Catedral del Pisco', en: 'La Catedral del Pisco Staff', ru: 'Персонал La Catedral del Pisco' })}</h1>
          </div>
          <button type="button" onClick={handleLogout} className="admin-button admin-button--secondary">
            {t({ es: 'Salir', en: 'Logout', ru: 'Выйти' })}
          </button>
        </header>

        <p className="admin-intro">
          {t({
            es: 'Gestioná visibilidad y disponibilidad por categoría y subcategoría.',
            en: 'Manage visibility and availability by category and subcategory.',
            ru: 'Управляйте видимостью и наличием по категориям и подкатегориям.',
          })}
        </p>

        {loading && <div className="admin-status" role="status">Cargando sucursal…</div>}
        {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}
        {!loading && !error && branchId && <BranchAvailabilityNavigator branchId={branchId} />}
      </div>
    </main>
  )
}
