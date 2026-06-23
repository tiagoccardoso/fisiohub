import { Metadata } from 'next'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthGuard } from '@/components/auth/auth-guard'
import { CollaborationWorkspace } from './collaboration-workspace'

export const metadata: Metadata = { title: 'Colaboração - FisioHub', description: 'Comentários e versões dos documentos da clínica' }

export default function CollaborationPage() {
  return <AuthGuard><DashboardLayout><CollaborationWorkspace /></DashboardLayout></AuthGuard>
}
