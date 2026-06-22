'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth-fixed'
import { Loading } from '@/components/ui/loading'
import { LoginForm } from '@/components/auth/login-form'

interface AuthGuardProps {
  children: React.ReactNode
  requireRole?: string[]
  fallback?: React.ReactNode
}

export function AuthGuard({ children, requireRole, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user && pathname !== '/auth/login') {
      router.replace('/auth/login')
    }
  }, [loading, user, router, pathname])

  if (loading) {
    return <Loading />
  }

  if (!user) {
    return fallback || <LoginForm />
  }

  if (requireRole && !requireRole.includes(user.role ?? '')) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-destructive/20 bg-white p-6 text-center shadow-clinical">
          <h2 className="font-display text-xl font-semibold text-destructive">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
          <p className="text-sm text-muted-foreground">
            Seu nível de acesso: {user.role}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
