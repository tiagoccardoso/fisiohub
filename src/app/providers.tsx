'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/hooks/use-auth-fixed'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from 'sonner'
import { AIAssistantProvider } from '@/contexts/AIAssistantContext'
import ErrorBoundary from '@/components/ui/error-boundary'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV !== 'production'}>
      <AIAssistantProvider>
        <QueryProvider>
          <AuthProvider>
            <div id="root" className="min-h-screen bg-background text-foreground">
              {children}
            </div>
            <Toaster
              position="top-right"
              richColors
              closeButton
            />
          </AuthProvider>
        </QueryProvider>
      </AIAssistantProvider>
    </ErrorBoundary>
  )
}
