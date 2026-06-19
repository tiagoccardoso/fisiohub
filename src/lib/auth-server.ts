import { getSessionFromCookie } from '@/lib/auth-session'
import { queryOne } from '@/lib/db-neon'

export type User = {
  id: string
  auth_user_id?: string | null
  email: string
  full_name: string
  avatar_url?: string | null
  role: 'admin' | 'mentor' | 'intern' | 'guest' | 'professional' | 'therapist' | 'receptionist' | 'patient' | 'student'
  phone?: string | null
  crefito?: string | null
  specialty?: string | null
  university?: string | null
  semester?: number | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export async function getUser() {
  const session = await getSessionFromCookie()
  if (!session?.uid) return null

  return queryOne<User>(
    `select id,
            auth_user_id,
            email,
            full_name,
            avatar_url,
            role,
            phone,
            crefito,
            specialty,
            university,
            semester,
            is_active,
            created_at::text,
            updated_at::text
       from public.users
      where id = $1
        and is_active = true
      limit 1`,
    [session.uid]
  )
}


function createCompatQueryBuilder() {
  const emptyResult = Promise.resolve({ data: [], error: null, count: 0 })
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

export async function createServerAuthClient(): Promise<any> {
  const user = await getUser()

  return {
    auth: {
      getUser: async () => ({ data: { user }, error: user ? null : { message: 'Não autorizado' } }),
      getSession: async () => ({ data: { session: user ? { user } : null }, error: null }),
    },
    from: (..._args: unknown[]) => createCompatQueryBuilder(),
    rpc: (..._args: unknown[]) => Promise.resolve({ data: null, error: null }),
  }
}

export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    throw new Error('Não autorizado')
  }
  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Permissões insuficientes')
  }
  return user
}

export const isAdmin = (user: User | null) => user?.role === 'admin'
export const isMentor = (user: User | null) => user?.role === 'mentor' || user?.role === 'admin'
export const isIntern = (user: User | null) => user?.role === 'intern'

export const canManageUsers = (user: User | null) => isAdmin(user)
export const canManageNotebooks = (user: User | null) => isMentor(user)
export const canManageProjects = (user: User | null) => isMentor(user)
export const canSuperviseInterns = (user: User | null) => isMentor(user)
