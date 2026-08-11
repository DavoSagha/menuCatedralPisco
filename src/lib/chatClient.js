/**
 * Cliente del asistente de la carta.
 *
 * No habla con ningún proveedor de IA: le pega a `/api/chat`, el endpoint de
 * nuestro propio Express, que es quien guarda la API key y llama al modelo.
 * Ese es el punto — la clave nunca viaja al navegador.
 *
 * Antes este archivo se llamaba `deepseekClient.js` y exportaba `askDeepSeek`,
 * de cuando el backend usaba DeepSeek. Hoy usa Gemini, y mañana puede cambiar
 * otra vez: el nombre del proveedor no tiene por qué estar acá.
 */
export async function askChat(messages, branchSlug) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, branchSlug }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `Server error: ${response.status}`)
  }

  const data = await response.json()
  return data.content
}
