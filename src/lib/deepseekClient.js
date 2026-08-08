export async function askDeepSeek(messages, branchSlug) {
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
