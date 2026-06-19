import { query, queryOne, execute } from '@/lib/db-neon'

export const createClient = () => ({
  query,
  queryOne,
  execute,
})
