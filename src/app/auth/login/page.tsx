import { LoginForm } from '@/components/auth/login-form'

interface LoginPageProps {
  searchParams?: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  return <LoginForm initialErrorCode={resolvedSearchParams?.error} />
}
