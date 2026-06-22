'use client'

import { Sidebar } from '@/components/navigation/sidebar'
import { Button } from '@/components/ui/button'
import { EnhancedButton } from '@/components/ui/enhanced-button'
import { Input } from '@/components/ui/input'
import { EnhancedInput } from '@/components/ui/enhanced-input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { GlobalSearch, useGlobalSearch } from '@/components/ui/global-search'
import { KeyboardShortcuts, useKeyboardShortcuts } from '@/components/ui/keyboard-shortcuts'
import { AIAssistant } from '@/components/ui/ai-assistant'
import { AIAssistant as NewAIAssistant, AIAssistantToggle } from '@/components/AIAssistant'
import { ThemeCustomizer } from '@/components/ui/theme-customizer'
import { PerformanceMonitor } from '@/components/ui/performance-monitor'
import { NotificationsPanel } from '@/components/ui/notifications-panel'
import { useAuth } from '@/hooks/use-auth'
import {
  Search,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Keyboard,
  HelpCircle
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
  const router = useRouter()

  // Hooks para sistemas avançados
  const { isOpen: searchOpen, openSearch, closeSearch } = useGlobalSearch()
  const { isOpen: shortcutsOpen, openShortcuts, closeShortcuts } = useKeyboardShortcuts()

  // Navegação por atalhos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Não processar se estiver em um input
      const activeElement = document.activeElement
      if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
        return
      }

      // Atalhos de navegação com G + letra
      if (e.key === 'g' || e.key === 'G') {
        const handleSecondKey = (e2: KeyboardEvent) => {
          switch (e2.key.toLowerCase()) {
            case 'h':
              router.push('/')
              break
            case 'n':
              router.push('/notebooks')
              break
            case 'p':
              router.push('/projects')
              break
            case 't':
              router.push('/team')
              break
            case 'c':
              router.push('/calendar')
              break
            case 's':
              router.push('/settings')
              break
          }
          document.removeEventListener('keydown', handleSecondKey)
        }
        document.addEventListener('keydown', handleSecondKey)

        // Remove listener após 2 segundos
        setTimeout(() => {
          document.removeEventListener('keydown', handleSecondKey)
        }, 2000)
      }

      // Atalho para mostrar shortcuts
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        openShortcuts()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [router, openShortcuts])

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { label: 'Administrador', variant: 'default' as const },
      mentor: { label: 'Mentor', variant: 'secondary' as const },
      intern: { label: 'Estagiário', variant: 'outline' as const },
      guest: { label: 'Visitante', variant: 'destructive' as const },
    }

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.guest
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="app-shell flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/70 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
            <div className="font-display text-base font-bold text-primary lg:hidden">FisioHub</div>
            {/* Search */}
            <div className="hidden max-w-md flex-1 sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar... (⌘K)"
                  className="min-h-10 cursor-pointer bg-surface-container-lowest pl-10 pr-20"
                  onClick={openSearch}
                  readOnly
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  <kbd className="rounded bg-surface-container px-1.5 py-0.5 text-xs text-muted-foreground">⌘</kbd>
                  <kbd className="rounded bg-surface-container px-1.5 py-0.5 text-xs text-muted-foreground">K</kbd>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <NotificationsPanel className="h-10 w-10" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/support')}
                className="text-muted-foreground"
                title="Central de suporte"
                aria-label="Abrir central de suporte"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
              {/* Keyboard Shortcuts */}
              <Button
                variant="ghost"
                size="icon"
                onClick={openShortcuts}
                className="hidden text-muted-foreground md:inline-flex"
                title="Atalhos de teclado (?)"
              >
                <Keyboard className="h-5 w-5" />
              </Button>

              {/* Settings */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/settings')}
                className="text-muted-foreground"
              >
                <Settings className="h-5 w-5" />
              </Button>

              {/* User Menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-1.5 text-foreground sm:px-3"
                >
                  <div className="h-8 w-8 rounded-full bg-medical-500 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
                    {user?.full_name || user?.email?.split('@')[0] || 'Usuário'}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 sm:block" />
                </Button>

                {/* User Dropdown */}
                {showUserMenu && (
                  <Card className="absolute right-0 top-full z-50 mt-2 w-56 shadow-clinical-lg">
                    <CardContent className="p-2">
                      <div className="space-y-1">
                        <div className="truncate px-3 py-2 text-sm text-muted-foreground">
                          {user?.email}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/settings')}
                          className="w-full justify-start"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Perfil
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/settings')}
                          className="w-full justify-start"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configurações
                        </Button>
                        <hr className="my-1 border-border" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={signOut}
                          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sair
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:pb-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>

      {/* AI Assistant Integration */}
      <AIAssistantToggle
        isOpen={isAIAssistantOpen}
        onClick={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
        hasNewInsights={false} // TODO: Implementar lógica de novos insights
      />

      <NewAIAssistant
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
      />

      {/* Existing overlays */}
      <GlobalSearch isOpen={searchOpen} onClose={closeSearch} />
      <KeyboardShortcuts isOpen={shortcutsOpen} onClose={closeShortcuts} />
      <AIAssistant />
      <ThemeCustomizer />
      <PerformanceMonitor />
    </div>
  )
}
