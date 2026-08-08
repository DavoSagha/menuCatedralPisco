import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { LanguageContext } from '../App'
import { login, getUserRole } from '../lib/auth'

export default function LoginPage() {
  const { locale, setUser } = useContext(LanguageContext)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const t = (obj) => obj[locale] || obj.es

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { user } = await login(email, password)
      setUser(user)
      const role = getUserRole(user)
      if (role === 'admin') navigate('/admin', { replace: true })
      else if (role === 'staff') navigate('/staff', { replace: true })
      else navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          {t({ es: 'Acceso La Catedral del Pisco', en: 'La Catedral del Pisco Access', ru: 'Доступ La Catedral del Pisco' })}
        </h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder={t({ es: 'Email', en: 'Email', ru: 'Email' })}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder={t({ es: 'Contraseña', en: 'Password', ru: 'Пароль' })}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading
              ? t({ es: 'Cargando...', en: 'Loading...', ru: 'Загрузка...' })
              : t({ es: 'Ingresar', en: 'Sign In', ru: 'Войти' })}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.hint}>
          {t({
            es: 'Las credenciales serán proporcionadas por el gerente a cargo',
            en: 'Credentials will be provided by the manager in charge',
            ru: 'Учетные данные будут предоставлены ответственным менеджером',
          })}
        </p>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', background: 'var(--bg-primary)',
  },
  card: {
    background: 'var(--bg-secondary)', borderRadius: '12px', padding: '32px 24px',
    width: '100%', maxWidth: '360px', border: '1px solid var(--card-border)',
  },
  title: {
    fontFamily: 'var(--font-serif)', fontSize: '24px', color: 'var(--accent-gold)',
    textAlign: 'center', marginBottom: '24px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: {
    padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--card-border)',
    background: 'var(--bg-primary)', color: 'var(--text-primary)',
    fontSize: '14px', fontFamily: 'var(--font-sans)', outline: 'none',
  },
  btn: {
    padding: '12px', borderRadius: '8px', border: 'none',
    background: 'var(--accent-gold)', color: 'var(--bg-primary)',
    fontSize: '16px', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font-sans)', marginTop: '8px',
  },
  error: { fontSize: '13px', color: 'var(--danger)', textAlign: 'center', marginTop: '12px' },
  hint: {
    fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px',
    lineHeight: 1.4, fontStyle: 'italic',
  },
}
