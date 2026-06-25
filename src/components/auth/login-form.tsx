'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Heart, Mail, Lock, Eye, EyeOff, CheckCircle2, Sparkles, ShieldCheck, CalendarDays } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LoginFormProps {
  initialErrorCode?: string
  initialMode?: 'login' | 'signup'
}

export function LoginForm({ initialErrorCode, initialMode = 'login' }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup')
  const [fullName, setFullName] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [clinicDocument, setClinicDocument] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [clinicEmail, setClinicEmail] = useState('')
  const [clinicAddress, setClinicAddress] = useState('')

  const { signIn, signUp, resetPassword, loading, user } = useAuth()
  const router = useRouter()
  useEffect(() => {
    if (initialErrorCode === 'config_auth') {
      setError('Serviço de autenticação indisponível no momento.')
    }
  }, [initialErrorCode])

  // Redirecionar automaticamente se o usuário já estiver logado
  useEffect(() => {
    if (user && !loading) {
      const timer = setTimeout(() => {
        router.replace('/')
      }, 600)

      return () => clearTimeout(timer)
    }
    return () => {} // Return empty cleanup function when condition is not met
  }, [user, loading, router])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    const { error } = await signIn(email, password)

    if (error) {

      if (error.message.toLowerCase().includes('invalid login credentials')) {
        setError('E-mail ou senha inválidos. Verifique suas credenciais.')
      } else {
        setError(error.message)
      }
    } else {
      setMessage('Login realizado com sucesso! Redirecionando...')
      router.replace('/')
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())) {
      setError('Informe um e-mail válido.')
      return
    }

    if (!fullName.trim() || !clinicName.trim() || !clinicDocument.trim() || !clinicPhone.trim() || !clinicEmail.trim() || !clinicAddress.trim()) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }

    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }

    if (!isSignUp || !confirmPassword.trim()) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.')
      return
    }

    const { error } = await signUp(email, password, {
      full_name: fullName.trim(),
      role: 'admin', // Primeiro usuário/conta criada com acesso ao sistema
      passwordConfirmation: confirmPassword,
      clinicName: clinicName.trim(),
      clinicDocument: clinicDocument.trim(),
      clinicPhone: clinicPhone.trim(),
      clinicEmail: clinicEmail.trim().toLowerCase(),
      clinicAddress: clinicAddress.trim(),
    })

    if (error) {
      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('duplicate')) {
        setError('Este e-mail já está cadastrado. Faça login ou recupere sua senha.')
      } else {
        setError(error.message)
      }
    } else {
      setMessage('Conta criada com sucesso! Faça login para continuar.')
      setIsSignUp(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Digite seu email primeiro')
      return
    }

    setError(null)

    const { error } = await resetPassword(email)

    if (error) {
      setError(error.message)
    } else {
      setMessage('Instruções enviadas para seu email!')
    }
  }

  return (
    <div className="min-h-dvh bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6 rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-white to-emerald-50 p-6 shadow-clinical-lg sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-primary shadow-sm">
            <Sparkles className="h-4 w-4" />
            FisioHub para clínicas de fisioterapia
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-3xl font-bold leading-tight text-primary sm:text-4xl">
              Gestão completa, inteligente e organizada para sua clínica
            </h2>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Organize pacientes, acompanhe atendimentos, controle informações clínicas e aproveite recursos inteligentes da plataforma em um único sistema. Todos os planos liberam acesso completo às funcionalidades.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              'Gestão completa da clínica',
              'Organização de pacientes',
              'Acompanhamento de atendimentos',
              'Controle de informações clínicas',
              'Recursos inteligentes da plataforma',
              'Acesso completo em todos os planos',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-2xl bg-white/85 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                {item}
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Teste grátis</p>
              <p className="mt-1 text-sm text-muted-foreground">7 dias com acesso completo.</p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <CalendarDays className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Mensal</p>
              <p className="mt-1 text-sm text-muted-foreground">R$ 79,90 por mês.</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <Sparkles className="mb-3 h-5 w-5 text-emerald-700" />
              <p className="text-sm font-semibold text-emerald-900">Anual</p>
              <p className="mt-1 text-sm text-emerald-800">R$ 59,90/mês e economia de R$ 240,00 ao ano.</p>
            </div>
          </div>
        </section>

        <Card className="w-full border-border/80 px-1 py-3 shadow-clinical-lg sm:px-5 sm:py-6">
        <CardHeader className="space-y-5 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
            <h1 className="font-display text-3xl font-bold text-primary">FisioHub</h1>
          </div>
          <div>
            <CardTitle className="text-xl text-foreground sm:text-2xl">
              {isSignUp ? 'Criar Conta' : 'Acesso ao Sistema'}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? 'Crie sua conta para acessar o sistema'
                : 'Entre com suas credenciais para acessar o sistema de gestão clínica'
              }
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <AlertDescription className="text-emerald-800">{message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {isSignUp && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-primary">Responsavel pela conta</p>
                <div className="space-y-2">
                <label htmlFor="full_name" className="text-sm font-semibold">
                  Nome completo
                </label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={isSignUp}
                />
                </div>
                <div className="border-t pt-4">
                  <p className="mb-3 text-sm font-semibold text-primary">Dados da clinica</p>
                  <div className="space-y-3">
                    <Input aria-label="Nome da clinica" placeholder="Nome da clinica" value={clinicName} onChange={(event) => setClinicName(event.target.value)} required={isSignUp} />
                    <Input aria-label="CPF ou CNPJ da clinica" placeholder="CPF ou CNPJ" value={clinicDocument} onChange={(event) => setClinicDocument(event.target.value)} required={isSignUp} />
                    <Input aria-label="Telefone da clinica" placeholder="Telefone da clinica" value={clinicPhone} onChange={(event) => setClinicPhone(event.target.value)} required={isSignUp} />
                    <Input aria-label="E-mail da clinica" type="email" placeholder="E-mail da clinica" value={clinicEmail} onChange={(event) => setClinicEmail(event.target.value)} required={isSignUp} />
                    <Input aria-label="Endereco da clinica" placeholder="Endereco completo" value={clinicAddress} onChange={(event) => setClinicAddress(event.target.value)} required={isSignUp} />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seuemail@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm font-semibold">Senha</label>
                {!isSignUp && (
                  <button
                    type="button"
                    className="text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={handleForgotPassword}
                    disabled={loading}
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>


            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="confirm_password" className="text-sm font-semibold">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm_password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading
                  ? (isSignUp ? 'Criando conta...' : 'Entrando...')
                  : (isSignUp ? 'Criar Conta' : 'Entrar')
                }
              </Button>

            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                {isSignUp ? 'Já tem conta?' : 'Não tem conta?'}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
              setMessage(null)
              setConfirmPassword('')
            }}
            disabled={loading}
          >
            {isSignUp ? 'Fazer Login' : 'Criar nova conta'}
          </Button>

          <div className="text-center text-xs leading-5 text-muted-foreground">
            <p>Sistema de Gestão Clínica</p>
            <p>Para fisioterapeutas e estagiários</p>
            <p className="mt-2 text-slate-500">
              Acesso permitido apenas para usuários cadastrados
            </p>
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  )
}
