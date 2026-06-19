// Compatibilidade temporária para arquivos antigos do projeto.
// O backend real agora é Neon/PostgreSQL via DATABASE_URL e endpoints /api/*.

const emptyResult = Promise.resolve({ data: [], error: null, count: 0 })

const createDisabledQueryBuilder = () => {
  const builder: any = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    upsert: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    in: () => builder,
    is: () => builder,
    not: () => builder,
    or: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (value: unknown) => unknown, reject?: (reason?: unknown) => unknown) => emptyResult.then(resolve, reject),
    catch: (reject: (reason?: unknown) => unknown) => emptyResult.catch(reject),
    finally: (onFinally?: () => void) => emptyResult.finally(onFinally),
  }
  return builder
}

export const hasValidSupabaseBrowserCredentials = () => false
export const hasValidNeonCredentials = () => Boolean(process.env.DATABASE_URL)

export const supabase: any = {
  auth: {
    getUser: async () => {
      const response = await fetch('/api/auth/session', { cache: 'no-store' }).catch(() => null)
      if (!response?.ok) return { data: { user: null }, error: null }
      const payload = await response.json().catch(() => ({}))
      return { data: { user: payload?.user ?? null }, error: null }
    },
    getSession: async () => {
      const response = await fetch('/api/auth/session', { cache: 'no-store' }).catch(() => null)
      if (!response?.ok) return { data: { session: null }, error: null }
      const payload = await response.json().catch(() => ({}))
      return { data: { session: payload?.user ? { user: payload.user } : null }, error: null }
    },
    signOut: async () => {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
      return { error: null }
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
  },
  from: () => createDisabledQueryBuilder(),
  rpc: () => emptyResult,
  channel: () => ({
    on: function () { return this },
    subscribe: () => ({ unsubscribe: () => undefined }),
    unsubscribe: () => Promise.resolve('ok'),
  }),
  removeChannel: () => Promise.resolve('ok'),
  removeAllChannels: () => Promise.resolve([]),
}
