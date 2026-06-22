import OpenAI from 'openai'

export function getDeepSeekConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('deepseek_not_configured')

  return {
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    timeout: Number(process.env.DEEPSEEK_TIMEOUT_MS || 30000),
  }
}

export function createDeepSeekClient() {
  const config = getDeepSeekConfig()
  return new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: config.timeout, maxRetries: 1 })
}

export async function requestDeepSeek(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[], maxTokens = 900) {
  const config = getDeepSeekConfig()
  const completion = await createDeepSeekClient().chat.completions.create({
    model: config.model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.3,
  })
  const content = completion.choices[0]?.message?.content?.trim()
  if (!content) throw new Error('deepseek_empty_response')
  return { content, model: config.model }
}
