import { useState, useContext, useRef, useEffect, useCallback } from 'react'
import { LanguageContext } from '../App'
import { askDeepSeek } from '../lib/deepseekClient'

const EDGE_MARGIN = 16
const DRAG_THRESHOLD = 6

const HINT_TEXTS = {
  es: '👆 Tocame si tenés preguntas del menú',
  en: '👆 Tap me if you have questions about the menu',
  ru: '👆 Нажми, если есть вопросы по меню',
}

const PLACEHOLDER_TEXTS = {
  es: 'Preguntá sobre alérgenos o ingredientes...',
  en: 'Ask about allergens or ingredients...',
  ru: 'Спросите об аллергенах или ингредиентах...',
}

const WELCOME_MSGS = {
  es: '👋 Consultame sobre alérgenos e ingredientes de nuestros platos.',
  en: '👋 Ask me about allergens and ingredients in our dishes.',
  ru: '👋 Спросите меня об аллергенах и ингредиентах в наших блюдах.',
}

export default function ChatWidget({ branchSlug }) {
  const { locale } = useContext(LanguageContext)
  const [open, setOpen] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: WELCOME_MSGS[locale] },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const bubbleRef = useRef(null)
  const dragState = useRef(null)
  const suppressClick = useRef(false)

  const t = (obj) => obj[locale] || obj.es

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 2800)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 400)
  }, [open])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError(null)

    const userMsg = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)

    setLoading(true)
    try {
      const reply = await askDeepSeek(
        updated.map((m) => ({ role: m.role, content: m.content })),
        branchSlug
      )
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: getErrorMsg(locale) },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  /* ---- Drag & snap to edge ---- */

  const handlePointerDown = (e) => {
    const bubble = bubbleRef.current
    if (!bubble) return
    if (e.pointerType === 'mouse' && e.button !== 0) return

    const rect = bubble.getBoundingClientRect()
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      moved: false,
    }

    bubble.style.transition = 'none'
    bubble.style.cursor = 'grabbing'
    bubble.setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e) => {
    const s = dragState.current
    const bubble = bubbleRef.current
    if (!s || !bubble || e.pointerId !== s.pointerId) return

    if (!s.moved) {
      const dist = Math.hypot(e.clientX - s.startX, e.clientY - s.startY)
      if (dist < DRAG_THRESHOLD) return
      s.moved = true
    }

    const x = e.clientX - s.offsetX
    const y = e.clientY - s.offsetY
    bubble.style.left = `${x}px`
    bubble.style.top = `${y}px`
    bubble.style.right = 'auto'
    bubble.style.bottom = 'auto'
  }

  const handlePointerUp = (e) => {
    const s = dragState.current
    const bubble = bubbleRef.current
    if (!s || !bubble || e.pointerId !== s.pointerId) return

    dragState.current = null
    bubble.style.cursor = 'grab'

    // Sin arrastre real: se deja que onClick abra el chat.
    if (!s.moved) return

    suppressClick.current = true

    const rect = bubble.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    const bubbleCenter = rect.left + rect.width / 2
    const snapLeft = bubbleCenter < vw / 2

    const targetX = snapLeft ? EDGE_MARGIN : vw - rect.width - EDGE_MARGIN
    const targetY = Math.min(
      Math.max(rect.top, EDGE_MARGIN + 8),
      vh - rect.height - EDGE_MARGIN - 8,
    )

    bubble.style.transition = 'left 0.3s ease-out, top 0.3s ease-out'
    bubble.style.left = `${targetX}px`
    bubble.style.top = `${targetY}px`
    bubble.style.right = 'auto'
    bubble.style.bottom = 'auto'

    setTimeout(() => {
      if (bubble) bubble.style.transition = ''
    }, 350)
  }

  const handleBubbleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    setOpen(true)
  }

  return (
    <>
      {!open && showHint && (
        <div style={styles.hint}>
          {t(HINT_TEXTS)}
        </div>
      )}

      {!open && (
        <button
          ref={bubbleRef}
          type="button"
          onClick={handleBubbleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={styles.bubble}
          aria-label="Abrir chat"
        >
          💬
        </button>
      )}

      {open && (
        <>
          <div style={styles.backdrop} onClick={() => setOpen(false)} />

          <div style={styles.sheet}>
            <div style={styles.sheetHeader}>
              <span style={styles.sheetTitle}>
                {t({ es: 'Asistente La Catedral del Pisco', en: 'La Catedral del Pisco Assistant', ru: 'Ассистент La Catedral del Pisco' })}
              </span>
              <button onClick={() => setOpen(false)} style={styles.minBtn}>▼</button>
            </div>

            <div style={styles.chatBox}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  ...styles.message,
                  ...(msg.role === 'user' ? styles.userMsg : styles.botMsg),
                }}>
                  {msg.content}
                </div>
              ))}
              {loading && (
                <div style={{ ...styles.message, ...styles.botMsg, fontStyle: 'italic', opacity: 0.7 }}>
                  {t({ es: 'Escribiendo...', en: 'Typing...', ru: 'Печатает...' })}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div style={styles.inputRow}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={PLACEHOLDER_TEXTS[locale]}
                disabled={loading}
                style={styles.input}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                style={styles.sendBtn}
              >
                ➤
              </button>
            </div>
            {error && <p style={styles.error}>{t({
              es: 'Error de conexión. Revisá la consola del servidor.',
              en: 'Connection error. Check server console.',
              ru: 'Ошибка соединения. Проверьте консоль сервера.',
            })}</p>}
          </div>
        </>
      )}
    </>
  )
}

function getErrorMsg(locale) {
  const msgs = {
    es: '⚠️ No pude conectar con el asistente. Revisá la consola del servidor.',
    en: '⚠️ Could not reach the assistant. Check the server console.',
    ru: '⚠️ Не удалось связаться с ассистентом. Проверьте консоль сервера.',
  }
  return msgs[locale] || msgs.en
}

const styles = {
  hint: {
    position: 'fixed', bottom: '78px', right: '16px', zIndex: 9998,
    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
    padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
    fontFamily: 'var(--font-sans)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    maxWidth: '240px',
    animation: 'hintFade 2.8s ease forwards',
    pointerEvents: 'none',
  },
  bubble: {
    position: 'fixed',
    bottom: '20px',
    right: '16px',
    zIndex: 9999,
    width: '56px', height: '56px', borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
    color: '#fff', fontSize: '26px',
    cursor: 'grab',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    animation: 'pulse 2s ease 2',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    padding: 0,
    lineHeight: 1,
  },
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 45,
    background: 'rgba(0,0,0,0.4)',
    animation: 'fadeIn 0.2s ease',
  },
  sheet: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '480px', zIndex: 50,
    background: 'var(--bg-primary)',
    borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
    maxHeight: '70dvh',
    display: 'flex', flexDirection: 'column',
    animation: 'bottomSheetUp 0.35s ease',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
  },
  sheetHeader: {
    display: 'flex', alignItems: 'center',
    padding: '14px 16px', gap: '8px',
    borderBottom: '1px solid var(--card-border)',
    background: 'var(--bg-secondary)',
    borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
  },
  sheetTitle: {
    fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 600,
    color: 'var(--accent-gold)', flex: 1,
  },
  minBtn: {
    background: 'transparent', border: '1px solid var(--card-border)',
    color: 'var(--accent-gold)', width: '32px', height: '32px',
    borderRadius: '6px', fontSize: '14px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  chatBox: {
    flex: 1, overflowY: 'auto', padding: '12px 16px',
    display: 'flex', flexDirection: 'column', gap: '10px',
    minHeight: '120px',
  },
  message: {
    padding: '10px 14px', borderRadius: '12px',
    fontSize: '14px', lineHeight: 1.4, maxWidth: '85%', wordWrap: 'break-word',
  },
  userMsg: {
    background: 'var(--accent-gold-dim)', color: '#fff',
    alignSelf: 'flex-end', borderBottomRightRadius: '4px',
  },
  botMsg: {
    background: 'var(--card-bg)', color: 'var(--text-primary)',
    alignSelf: 'flex-start', borderBottomLeftRadius: '4px',
    border: '1px solid var(--card-border)',
  },
  inputRow: {
    display: 'flex', gap: '8px', padding: '12px 16px',
    borderTop: '1px solid var(--card-border)',
  },
  input: {
    flex: 1, padding: '10px 14px', borderRadius: '8px',
    border: '1px solid var(--card-border)', background: 'var(--bg-secondary)',
    color: 'var(--text-primary)', fontSize: '14px',
    fontFamily: 'var(--font-sans)', outline: 'none',
  },
  sendBtn: {
    width: '42px', height: '42px', borderRadius: '50%', border: 'none',
    background: 'var(--accent-gold)', color: 'var(--bg-primary)',
    fontSize: '18px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'opacity 0.2s',
  },
  error: { fontSize: '12px', color: 'var(--danger)', padding: '0 16px 12px' },
}
