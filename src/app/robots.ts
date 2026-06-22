import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fisiohub.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/settings/', '/api/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
