import { useState, useContext, useRef, useEffect } from 'react'
import { LanguageContext } from '../App'
import { askChat } from '../lib/chatClient'
import Icon from './Icon'

const EDGE_MARGIN = 16
const DRAG_THRESHOLD = 6

const COPY = {
  hint: {
    es: 'Tocame si tenés preguntas del menú',
    en: 'Tap me if you have questions about the menu',
    pt: 'Toque em mim se tiver dúvidas sobre o menu',
    ru: 'Нажмите, если есть вопросы по меню',
  },
  placeholder: {
    es: 'Preguntá sobre alérgenos o ingredientes...',
    en: 'Ask about allergens or ingredients...',
    pt: 'Pergunte sobre alérgenos ou ingredientes...',
    ru: 'Спросите об аллергенах или ингредиентах...',
  },
  welcome: {
    es: 'Consultame sobre alérgenos e ingredientes de nuestros platos.',
    en: 'Ask me about allergens and ingredients in our dishes.',
    pt: 'Pergunte-me sobre alérgenos e ingredientes dos nossos pratos.',
    ru: 'Спросите меня об аллергенах и ингредиентах в наших блюдах.',
  },
  title: {
    es: 'Asistente La Catedral del Pisco',
    en: 'La Catedral del Pisco Assistant',
    pt: 'Assistente La Catedral del Pisco',
    ru: 'Ассистент La Catedral del Pisco',
  },
  open: {
    es: 'Abrir el asistente',
    en: 'Open the assistant',
    pt: 'Abrir o assistente',
    ru: 'Открыть ассистента',
  },
  close: {
    es: 'Cerrar el asistente',
    en: 'Close the assistant',
    pt: 'Fechar o assistente',
    ru: 'Закрыть ассистента',
  },
  send: {
    es: 'Enviar mensaje',
    en: 'Send message',
    pt: 'Enviar mensagem',
    ru: 'Отправить сообщение',
  },
  typing: {
    es: 'Escribiendo...',
    en: 'Typing...',
    pt: 'Escrevendo...',
    ru: 'Печатает...',
  },
  unreachable: {
    es: 'No pude conectarme. Consultá con el mozo.',
    en: "I couldn't connect. Please ask your waiter.",
    pt: 'Não consegui conectar. Fale com o garçom.',
    ru: 'Не удалось подключиться. Обратитесь к официанту.',
  },
  connectionError: {
    es: 'Error de conexión.',
    en: 'Connection error.',
    pt: 'Erro de conexão.',
    ru: 'Ошибка соединения.',
  },
}

export default function ChatWidget({ branchSlug }) {
  const { locale } = useContext(LanguageContext)
  const [open, setOpen] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [kbOffset, setKbOffset] = useState(0)
  const [kbMaxHeight, setKbMaxHeight] = useState(null)
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const bubbleRef = useRef(null)
  const dragState = useRef(null)
  const suppressClick = useRef(false)

  const t = (obj) => obj[locale] || obj.es

  /**
   * El saludo se deriva, no se guarda en el estado.
   *
   * Antes se metía como primer mensaje al montar el componente, así que
   * quedaba congelado en el idioma que estuviera activo en ese momento: si el
   * comensal después pasaba la carta a portugués, el saludo seguía en
   * castellano. Derivándolo, sigue siempre al idioma actual, y además no se
   * manda al modelo como historial (no aporta contexto y gasta tokens).
   */
  const transcript = messages.length > 0
    ? messages
    : [{ role: 'assistant', content: t(COPY.welcome) }]

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

  /**
   * Teclado en pantalla: en el celular (sobre todo iOS) el teclado NO achica el
   * layout viewport, así que la hoja con `bottom: 0` queda tapada por abajo.
   * El Visual Viewport API sí mide el área realmente visible: con esos valores
   * subimos la hoja (bottom) y recortamos su altura (max-height) para que el
   * chat quede arriba del teclado, como un chat de mensajería.
   *
   * En Android moderno el browser ya achica el viewport al abrir el teclado,
   * así que la superposición calculada da 0 y no cambia nada.
   */
  useEffect(() => {
    if (!open) return
    const vv = window.visualViewport
    if (!vv) return

    const sync = () => {
      const overlap = Math.max(0, window.innerHeight - (vv.offsetTop + vv.height))
      setKbOffset(overlap)
      setKbMaxHeight(vv.height)
    }

    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)
    sync()

    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [open])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError(null)

    const updated = [...messages, { role: 'user', content: text }]
    setMessages(updated)

    setLoading(true)
    try {
      const reply = await askChat(
        updated.map((m) => ({ role: m.role, content: m.content })),
        branchSlug,
      )
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t(COPY.unreachable) },
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
      {!open && showHint && <div className="chat-hint">{t(COPY.hint)}</div>}

      {!open && (
        <button
          ref={bubbleRef}
          type="button"
          className="chat-bubble"
          onClick={handleBubbleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label={t(COPY.open)}
        >
          <Icon name="chat" size={24} />
        </button>
      )}

      {open && (
        <>
          <div className="chat-backdrop" onClick={() => setOpen(false)} />

          <div
            className="chat-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t(COPY.title)}
            style={{
              '--chat-kb': `${kbOffset}px`,
              '--chat-kb-max': kbMaxHeight ? `${kbMaxHeight}px` : undefined,
            }}
          >
            <div className="chat-sheet__head">
              <span className="chat-sheet__title">{t(COPY.title)}</span>
              <button
                type="button"
                className="chat-sheet__close"
                onClick={() => setOpen(false)}
                aria-label={t(COPY.close)}
              >
                <Icon name="chevronDown" size={18} />
              </button>
            </div>

            {/* `aria-live`: las respuestas llegan solas, sin que el lector de
                pantalla mueva el foco. Sin esto, quien no ve la pantalla no se
                entera de que el asistente contestó. */}
            <div className="chat-log" aria-live="polite">
              {transcript.map((msg, i) => (
                <div
                  key={i}
                  className={`chat-msg chat-msg--${msg.role === 'user' ? 'user' : 'bot'}`}
                >
                  {msg.content}
                </div>
              ))}
              {loading && (
                <div className="chat-msg chat-msg--bot chat-msg--typing">
                  {t(COPY.typing)}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="chat-compose">
              <input
                ref={inputRef}
                type="text"
                className="chat-compose__input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t(COPY.placeholder)}
                disabled={loading}
                aria-label={t(COPY.placeholder)}
              />
              <button
                type="button"
                className="chat-compose__send"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                aria-label={t(COPY.send)}
              >
                <Icon name="send" size={18} />
              </button>
            </div>
            {error && <p className="chat-error">{t(COPY.connectionError)}</p>}
          </div>
        </>
      )}
    </>
  )
}
