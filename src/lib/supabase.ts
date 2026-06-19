// Camada de compatibilidade para importações antigas.
// Novas integrações devem usar '@/lib/db-neon' e endpoints server-side.
import { supabase, hasValidNeonCredentials, hasValidSupabaseBrowserCredentials } from '@/lib/supabase/client'

export { supabase, hasValidNeonCredentials, hasValidSupabaseBrowserCredentials }
export type SupabaseClient = typeof supabase

export const isMockMode = () => false
export const supabaseAdmin: any = supabase

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const signOut = async () => {
  await supabase.auth.signOut()
}

export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return Boolean(session?.user)
}

export const getCurrentUserPrincipal = getCurrentUser
export const signOutPrincipal = signOut
export const isAuthenticatedPrincipal = isAuthenticated
