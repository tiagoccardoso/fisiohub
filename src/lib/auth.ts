import { supabase } from '@/lib/supabase/client'

export const createClient = () => supabase
export const isMockMode = () => false
export const mockUser = null

/**
 * Arquivo seguro para importação em Client Components.
 *
 * A validação real de sessão no servidor fica em `@/lib/auth-request`,
 * para evitar que `next/headers` seja puxado para páginas marcadas com
 * `use client` por meio de imports indiretos.
 */
export function assertRealAuthEnabled() {
  return true
}
