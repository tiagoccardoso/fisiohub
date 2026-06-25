import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AppPageShell } from '@/components/layouts/app-page-shell'
import { SubscriptionPageClient } from '@/components/billing/subscription-page-client'
import { Loading } from '@/components/ui/loading'
import { getUser } from '@/lib/auth-server'

export default async function SubscriptionPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  return (
    <AppPageShell>
      <Suspense fallback={<Loading />}>
        <SubscriptionPageClient />
      </Suspense>
    </AppPageShell>
  )
}
