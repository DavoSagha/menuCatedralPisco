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
    <header style={styles.header}>
      <div style={styles.spacer} />

      <img
        src="/logo-catedral.jpg"
        alt="La Catedral del Pisco"
        style={{ ...styles.logo, borderRadius: '50%' }}
      />

      <div style={styles.right}>
        {user ? (
          <button
            type="button"
            onClick={() => navigate(role === 'admin' ? '/admin' : '/staff')}
            style={styles.userBtn}
            aria-label={accountCopy[role === 'admin' ? 'admin' : 'staff']}
          >
            <Icon name={role === 'admin' ? 'gear' : 'clipboard'} size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={styles.userBtn}
            aria-label={accountCopy.guest}
          >
            <Icon name="lock" size={18} />
          </button>
        )}
        <div ref={dropdownRef} style={styles.dropdown}>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            style={styles.trigger}
            aria-label={LANGUAGE_LABEL[locale] || LANGUAGE_LABEL.es}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <span style={styles.triggerCode}>{current.short}</span>
            <Icon
              name="chevronDown"
              size={13}
              style={{
                color: 'var(--text-muted)',
                transition: 'transform 0.25s ease',
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {open && (
            <ul style={styles.menu} role="listbox">
              {LANGUAGES.map((lang) => (
                <li key={lang.code} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={locale === lang.code}
                    onClick={() => handleSelect(lang.code)}
                    style={{
                      ...styles.option,
                      ...(locale === lang.code ? styles.optionActive : {}),
                    }}
                  >
                    <span style={styles.optionCode}>{lang.short}</span>
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

const styles = {
  header: {
    background: 'var(--bg-secondary)', padding: '0 16px', height: '80px',
    position: 'sticky', top: 0, zIndex: 100,
    borderBottom: '1px solid var(--card-border)',
    display: 'flex', alignItems: 'center',
  },
  spacer: { flex: 1, minWidth: 0 },
  /* maxWidth + shrink: con los botones a 44px, en pantallas de 360px el logo
     y los controles se peleaban el ancho. Así el logo cede y nada se rompe. */
  logo: {
    height: '85%', width: 'auto', maxWidth: '55%', minWidth: 0,
    flexShrink: 1, objectFit: 'contain', display: 'block',
  },
  right: {
    flex: 1, flexShrink: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'flex-end', gap: '8px',
  },
  /* 44x44: mínimo de touch target recomendado para menús en mobile. */
  userBtn: {
    background: 'transparent', border: '1px solid var(--card-border)',
    color: 'var(--text-secondary)', width: '44px', height: '44px',
    borderRadius: '8px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, lineHeight: 1, padding: 0,
    transition: 'color 0.2s ease, border-color 0.2s ease',
  },
  dropdown: { position: 'relative' },
  trigger: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    background: 'transparent', border: '1px solid var(--card-border)',
    color: 'var(--text-secondary)', height: '44px', padding: '0 10px',
    borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-sans)',
    flexShrink: 0, transition: 'color 0.2s ease, border-color 0.2s ease',
  },
  triggerCode: {
    fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', lineHeight: 1,
  },
  /* Opacidad en vez de color fijo: así sigue legible sobre el ámbar del item activo. */
  optionCode: {
    minWidth: '24px', fontSize: '12px', fontWeight: 600,
    letterSpacing: '0.08em', opacity: 0.65,
  },
  menu: {
    position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
    listStyle: 'none', background: 'var(--bg-secondary)',
    border: '1px solid var(--card-border)', borderRadius: '8px',
    overflow: 'hidden', minWidth: '140px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'fadeIn 0.15s ease',
  },
  option: {
    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
    minHeight: '44px', padding: '10px 14px', border: 'none', background: 'transparent',
    color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer',
    fontFamily: 'var(--font-sans)', textAlign: 'left',
  },
  optionActive: { background: 'var(--accent-gold-dim)', color: '#fff' },
}
