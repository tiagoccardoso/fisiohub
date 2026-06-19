import { Metadata } from 'next'
import { BackupSystem } from '@/components/ui/backup-system'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'

export const metadata: Metadata = {
  title: 'Sistema de Cópias de Segurança - FisioSys',
  description: 'Gerencie cópias de segurança automáticas e manuais do sistema',
}

export default function BackupPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Sistema de Cópias de Segurança</h1>
          <p className="text-muted-foreground">
            Gerencie cópias de segurança automáticas e manuais para garantir a segurança dos seus dados
          </p>
        </div>
        
        <BackupSystem />
      </div>
    </DashboardLayout>
  )
} 