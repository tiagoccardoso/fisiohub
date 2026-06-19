'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Heart, Mail, Lock, Eye, EyeOff } from 'lucide-react'
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

    if (!fullName.trim()) {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Heart className="h-8 w-8 text-medical-500" />
            <h1 className="text-2xl font-bold">FisioSys</h1>
          </div>
          <div>
            <CardTitle className="text-xl">
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

        <CardContent className="space-y-4">
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
              <div className="space-y-2">
                <label htmlFor="full_name" className="text-sm font-medium">
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
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seuemail@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
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
                <label htmlFor="confirm_password" className="text-sm font-medium">
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
                className="w-full btn-medical"
                disabled={loading}
              >
                {loading 
                  ? (isSignUp ? 'Criando conta...' : 'Entrando...') 
                  : (isSignUp ? 'Criar Conta' : 'Entrar')
                }
              </Button>

              {!isSignUp && (
                <div className="flex justify-between text-sm">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-medical-600 hover:text-medical-700"
                    onClick={handleForgotPassword}
                    disabled={loading}
                  >
                    Esqueci minha senha
                  </Button>
                </div>
              )}
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
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

          <div className="text-center text-xs text-muted-foreground">
            <p>Sistema de Gestão Clínica</p>
            <p>Para fisioterapeutas e estagiários</p>
            <p className="mt-2 text-slate-500">
              Acesso permitido apenas para usuários cadastrados
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
