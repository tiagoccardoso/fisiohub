import React from 'react'
import { render, waitFor } from '@testing-library/react'
import Dashboard from './page'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/hooks/use-auth-fixed'
import { AIAssistantProvider } from '@/contexts/AIAssistantContext'

jest.mock('@/lib/supabase/client', () => {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve({ data: [], count: 0, error: null })),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    insert: jest.fn(() => chain),
    update: jest.fn(() => chain),
    delete: jest.fn(() => chain),
  }
  return {
    supabase: {
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      },
      from: jest.fn(() => chain),
      channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn(), unsubscribe: jest.fn() })),
      removeChannel: jest.fn(),
    },
  }
})

test('renders dashboard in mock auth mode without throwing', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
  render(
    <AIAssistantProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </QueryClientProvider>
    </AIAssistantProvider>
  )
  await waitFor(() => expect(spy).not.toHaveBeenCalled())
  spy.mockRestore()
})
