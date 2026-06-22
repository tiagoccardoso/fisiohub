import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { EnhancedButton } from '@/components/ui/enhanced-button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import {
  Home,
  BookOpen,
  Target,
  Users,
  Calendar,
  Settings,
  Search,
  Plus,
  Heart,
  LogOut,
  BarChart3,
  Activity,
  MessageSquare,
  ClipboardList,
  LayoutGrid,
  type LucideIcon
} from 'lucide-react'

interface NavigationItem {
  href: string
  label: string
  icon: LucideIcon
  badge: string | null
}

const navigationItems = [
  {
    href: '/',
    label: 'Painel',
    icon: Home,
    badge: null
  },
  {
    href: '/notebooks',
    label: 'Cadernos',
    icon: BookOpen,
    badge: null
  },
  {
    href: '/projects',
    label: 'Projetos',
    icon: Target,
    badge: '12'
  },
  {
    href: '/exercises',
    label: 'Exercícios',
    icon: Activity,
    badge: null
  },
  {
    href: '/team',
    label: 'Equipe',
    icon: Users,
    badge: '5'
  },
  {
    href: '/calendar',
    label: 'Calendário',
    icon: Calendar,
    badge: null
  },
  {
    href: '/analytics',
    label: 'Análises',
    icon: BarChart3,
    badge: null
  },
  {
    href: '/collaboration',
    label: 'Colaboração',
    icon: MessageSquare,
    badge: null
  },
  {
    href: '/tasks',
    label: 'Tarefas',
    icon: LayoutGrid,
    badge: null
  }
] as const satisfies readonly NavigationItem[]

const quickActions = [
  {
    href: '/notebooks',
    label: 'Novo Caderno',
    icon: BookOpen
  },
  {
    href: '/projects',
    label: 'Novo Projeto',
    icon: Target
  },
  {
    href: '/calendar',
    label: 'Agendar',
    icon: Calendar
  }
]

const mobileNavigationItems: NavigationItem[] = [
  { href: '/', label: 'Painel', icon: Home, badge: null },
  { href: '/calendar', label: 'Agenda', icon: Calendar, badge: null },
  { href: '/notebooks', label: 'Cadernos', icon: BookOpen, badge: null },
  { href: '/exercises', label: 'Exercicios', icon: Activity, badge: null },
  { href: '/support', label: 'Suporte', icon: MessageSquare, badge: null },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
    <aside className="sidebar sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-border/70 bg-white p-4 lg:flex">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8 animate-fade-in-up">
        <div className="relative">
          <Heart className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-xl font-bold text-primary">
          FisioHub
        </h1>
      </div>

      {/* Quick Search */}
      <Button variant="outline" className="w-full justify-start mb-6" size="sm">
        <Search className="mr-2 h-4 w-4" />
        Buscar...
        <kbd className="ml-auto text-xs text-muted-foreground">⌘K</kbd>
      </Button>

      {/* Navigation */}
      <nav className="flex-1 space-y-1" aria-label="Navegação principal">
        {navigationItems.map((item, index) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <EnhancedButton
                variant={isActive ? "medical" : "ghost"}
                className={cn(
                  "group w-full justify-start",
                  isActive && "bg-primary text-white shadow-sm"
                )}
                size="sm"
                animation="scale"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <item.icon className={cn(
                  "mr-2 h-4 w-4 transition-all duration-200",
                  isActive ? "text-white" : "text-muted-foreground group-hover:text-primary group-hover:scale-110"
                )} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <Badge
                    variant={isActive ? "secondary" : "outline"}
                    className={cn(
                      "ml-auto text-xs transition-all duration-200 animate-pulse-slow",
                      isActive && "bg-white/20 text-white border-white/30"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </EnhancedButton>
            </Link>
          )
        })}
      </nav>

      {/* Quick Actions */}
      <div className="mt-auto pt-4 border-t">
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">AÇÕES RÁPIDAS</h3>
        <div className="space-y-2">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* User Profile / Settings */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-medical-500 flex items-center justify-center text-white text-sm font-medium">
            {user?.full_name ? getUserInitials(user.full_name) : 'U'}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">
              {user?.full_name || 'Usuário'}
            </div>
            <div className="text-xs text-muted-foreground">
              {user?.role === 'admin' ? 'Administrador' :
               user?.role === 'mentor' ? 'Fisioterapeuta' :
               user?.role === 'intern' ? 'Estagiário' : 'Usuário'}
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <Link href="/settings">
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </aside>

    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-white/95 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-4px_18px_rgba(14,29,37,0.06)] backdrop-blur lg:hidden"
      aria-label="Navegação móvel"
    >
      {mobileNavigationItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors',
              isActive && 'bg-primary/10 text-primary'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="w-full truncate text-center">{item.label}</span>
          </Link>
        )
      })}
    </nav>
    </>
  )
}
