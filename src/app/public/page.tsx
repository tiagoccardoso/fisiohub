'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  Users,
  Calendar,
  BookOpen,
  FolderKanban,
  Settings,
  ArrowRight,
  Shield,
  Zap,
  Globe
} from 'lucide-react'
import Link from 'next/link'

export default function PublicPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-primary" />
              <h1 className="font-display text-2xl font-bold text-primary">FisioSys</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                ✅ Sistema Online
              </Badge>
              <Link href="/auth/login">
                <Button>
                  Entrar no Sistema
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="mb-6 font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            Sistema de Gestão Integrado
            <span className="mt-2 block text-primary">para Clínica de Fisioterapia</span>
          </h2>
          <p className="mx-auto mb-8 max-w-3xl text-lg text-muted-foreground sm:text-xl">
            Plataforma completa para gestão de mentoria, projetos e colaboração em clínicas de fisioterapia.
            Desenvolvido com Next.js, TypeScript e Neon PostgreSQL.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg">
                Acessar Sistema
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Saber Mais
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h3 className="mb-12 text-center font-display text-3xl font-bold">
            Funcionalidades Principais
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <BookOpen className="h-8 w-8 text-blue-500 mb-2" />
                <CardTitle>Sistema de Cadernos</CardTitle>
                <CardDescription>
                  Editor rico para documentação e anotações clínicas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <FolderKanban className="h-8 w-8 text-green-500 mb-2" />
                <CardTitle>Gestão de Projetos</CardTitle>
                <CardDescription>
                  Kanban board para organização de tarefas e projetos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-purple-500 mb-2" />
                <CardTitle>Gestão de Equipe</CardTitle>
                <CardDescription>
                  Controle de mentores, estagiários e colaboradores
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Calendar className="h-8 w-8 text-orange-500 mb-2" />
                <CardTitle>Calendário</CardTitle>
                <CardDescription>
                  Agendamento de supervisões e eventos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-red-500 mb-2" />
                <CardTitle>Segurança LGPD</CardTitle>
                <CardDescription>
                  Conformidade com regulamentações de privacidade
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Settings className="h-8 w-8 text-cyan-500 mb-2" />
                <CardTitle>Configurações</CardTitle>
                <CardDescription>
                  Personalização completa do sistema
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="bg-surface-container-low py-16 px-4">
        <div className="container mx-auto">
          <h3 className="mb-12 text-center font-display text-3xl font-bold">
            Tecnologias Utilizadas
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="text-center">
                <Zap className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <CardTitle>Frontend Moderno</CardTitle>
                <CardDescription>
                  Next.js 14, TypeScript, Tailwind CSS, Radix UI
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Globe className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <CardTitle>Backend Robusto</CardTitle>
                <CardDescription>
                  Neon PostgreSQL, autenticação segura e APIs server-side
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <CardTitle>Deploy Seguro</CardTitle>
                <CardDescription>
                  Vercel, SSL/HTTPS, PWA, Deploy Automático
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-500 mb-2">100%</div>
              <div className="text-muted-foreground">Funcional</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-500 mb-2">12</div>
              <div className="text-muted-foreground">Páginas</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-500 mb-2">PWA</div>
              <div className="text-muted-foreground">Instalável</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-500 mb-2">24/7</div>
              <div className="text-muted-foreground">Online</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20 px-4 text-white">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-6">
            Pronto para começar?
          </h3>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Acesse o sistema completo e explore todas as funcionalidades disponíveis.
          </p>
          <Link href="/auth/login">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-slate-100">
              Entrar no Sistema
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Heart className="h-6 w-6 text-blue-500" />
            <span className="font-semibold text-primary">FisioSys</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Sistema de Gestão Integrado para Clínica de Fisioterapia
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Desenvolvido com Next.js + TypeScript + Neon PostgreSQL
          </p>
        </div>
      </footer>
    </div>
  )
}
