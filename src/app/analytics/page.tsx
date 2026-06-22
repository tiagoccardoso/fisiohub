import { Metadata } from 'next';
import AnalyticsDashboard from './_components/analytics-dashboard';
import { AppPageShell } from '@/components/layouts/app-page-shell';

export const metadata: Metadata = {
  title: 'Análises e Relatórios - FisioSys',
  description: 'Visualize métricas de performance da clínica, acompanhe a evolução de pacientes e gere relatórios detalhados.',
  alternates: {
    canonical: '/analytics',
  },
};

export default function AnalyticsPage() {
  return <AppPageShell><AnalyticsDashboard /></AppPageShell>;
}
