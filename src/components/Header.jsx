import { useState, useContext, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LanguageContext } from '../App'
import Icon from './Icon'

/**
 * Sin banderas: una bandera representa un país, no un idioma. El código ISO
 * es lo estándar en producto multi-idioma y no deja afuera a nadie.
 */
const LANGUAGES = [
  { code: 'es', short: 'ES', label: 'Español' },
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'pt', short: 'PT', label: 'Português' },
  { code: 'ru', short: 'RU', label: 'Русский' },
]

const ACCOUNT_LABEL = {
  es: { admin: 'Panel de administración', staff: 'Panel de personal', guest: 'Iniciar sesión' },
  en: { admin: 'Admin panel', staff: 'Staff panel', guest: 'Log in' },
  pt: { admin: 'Painel de administração', staff: 'Painel de pessoal', guest: 'Entrar' },
  ru: { admin: 'Панель администратора', staff: 'Панель персонала', guest: 'Войти' },
}

const LANGUAGE_LABEL = {
  es: 'Cambiar idioma',
  en: 'Change language',
  pt: 'Mudar idioma',
  ru: 'Сменить язык',
}

export default function Header({ user, role }) {
  const { locale, setLocale } = useContext(LanguageContext)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  const current = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0]
  const accountCopy = ACCOUNT_LABEL[locale] || ACCOUNT_LABEL.es

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (code) => {
    setLocale(code)
    setOpen(false)
  }

  return (
    <header className="site-header">
      <div className="site-header__spacer" />

      <img
        className="site-header__logo"
        src="/logo-catedral-texto.png"
        alt="La Catedral del Pisco"
      />

      <div className="site-header__actions">
        {user ? (
          <button
            type="button"
            className="header-btn"
            onClick={() => navigate(role === 'admin' ? '/admin' : '/staff')}
            aria-label={accountCopy[role === 'admin' ? 'admin' : 'staff']}
          >
            <Icon name={role === 'admin' ? 'gear' : 'clipboard'} size={18} />
          </button>
        ) : (
          <button
            type="button"
            className="header-btn"
            onClick={() => navigate('/login')}
            aria-label={accountCopy.guest}
          >
            <Icon name="lock" size={18} />
          </button>
        )}
        <div ref={dropdownRef} className="lang-menu">
          <button
            type="button"
            className="lang-menu__trigger"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={LANGUAGE_LABEL[locale] || LANGUAGE_LABEL.es}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <span className="lang-menu__code">{current.short}</span>
            {/* El giro del chevron lo dispara `[aria-expanded="true"]` en CSS:
                el estado ya está en el DOM, no hace falta duplicarlo en JS. */}
            <Icon name="chevronDown" size={13} className="lang-menu__chevron" />
          </button>

          {open && (
            <ul className="lang-menu__list" role="listbox">
              {LANGUAGES.map((lang) => (
                <li key={lang.code} role="none">
                  <button
                    type="button"
                    role="option"
                    className="lang-menu__option"
                    aria-selected={locale === lang.code}
                    onClick={() => handleSelect(lang.code)}
                  >
                    <span className="lang-menu__option-code">{lang.short}</span>
                    <span>{lang.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  )
}
