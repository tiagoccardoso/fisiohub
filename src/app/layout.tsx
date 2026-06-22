import './globals.css'
import type { Metadata, Viewport } from 'next'
import { AppProviders } from './providers'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fisiohub.vercel.app'

export const metadata: Metadata = {
  title: 'FisioHub - Sistema de Gestão Clínica',
  description: 'Sistema integrado de gestão para clínica de fisioterapia com funcionalidades de mentoria, projetos e colaboração.',
  metadataBase: new URL(siteUrl),
  keywords: ['fisioterapia', 'gestão', 'clínica', 'mentoria', 'projetos', 'colaboração', 'prontuário eletrônico'],
  authors: [{ name: 'FisioHub Team', url: siteUrl }],
  creator: 'FisioHub',
  publisher: 'FisioHub',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    title: 'FisioHub - Otimize sua Clínica de Fisioterapia',
    description: 'Sistema de gestão completo para fisioterapeutas. Gerencie pacientes, agendamentos, exercícios e finanças em um só lugar.',
    siteName: 'FisioHub',
    images: [
      {
        url: '/opengraph-image.png', // Placeholder image
        width: 1200,
        height: 630,
        alt: 'FisioHub - Sistema de Gestão para Clínicas de Fisioterapia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FisioHub - Otimize sua Clínica de Fisioterapia',
    description: 'Sistema de gestão completo para fisioterapeutas. Gerencie pacientes, agendamentos, exercícios e finanças em um só lugar.',
    images: ['/twitter-image.png'], // Placeholder image
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/icon-180x180.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FisioHub',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#f4faff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FisioHub',
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`,
  }

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
