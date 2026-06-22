import { DashboardLayout } from '@/components/layouts/dashboard-layout'

interface AppPageShellProps {
  children: React.ReactNode
}

export function AppPageShell({ children }: AppPageShellProps) {
  return <DashboardLayout>{children}</DashboardLayout>
}
