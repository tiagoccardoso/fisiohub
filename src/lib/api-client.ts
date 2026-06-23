export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: init?.cache ?? 'no-store',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const details = payload?.fieldErrors
      ? Object.values(details).flat().filter(Boolean).join(' ')
      : ''
    throw new Error(details || payload?.error || 'Erro de comunicação com o servidor.')
  }
  return payload as T
}
