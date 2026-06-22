import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fisiohub.vercel.app';

  const staticRoutes = [
    '/',
    '/analytics',
    '/calendar',
    '/collaboration',
    '/dashboard-pro',
    '/exercises',
    '/notebooks',
    '/patients',
    '/projects',
    '/settings',
    '/support',
    '/tasks',
    '/team',
    '/auth/login'
  ];

  return staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '/' ? 1 : 0.8,
  }));
}
