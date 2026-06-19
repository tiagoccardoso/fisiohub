import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useSupabase() {
  const [client, setClient] = useState<typeof supabase | null>(null)

  useEffect(() => {
    setClient(supabase)
  }, [])

  return client
}
