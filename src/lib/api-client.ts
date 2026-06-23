type ApiErrorPayload = {
  error?: unknown
  fieldErrors?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function errorMessages(value: unknown): string[] {
  if (typeof value === 'string') {
    const message = value.trim()
    return message ? [message] : []
  }

  if (Array.isArray(value)) {
    const messages: string[] = []
    for (const item of value) messages.push(...errorMessages(item))
    return messages
  }

  if (isRecord(value)) {
    const messages: string[] = []
    for (const key of Object.keys(value)) messages.push(...errorMessages(value[key]))
    return messages
  }

  return []
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: init?.cache ?? 'no-store',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  })
  const payload: unknown = await response.json().catch((): unknown => ({}))
  if (!response.ok) {
    const errorPayload: ApiErrorPayload = isRecord(payload) ? payload : {}
    const details = errorMessages(errorPayload.fieldErrors).join(' ')
    const generalError = errorMessages(errorPayload.error).join(' ')

    throw new Error(details || generalError || 'Erro de comunicação com o servidor.')
  }
  return payload as T
}
