import { MetadataRoute } from 'next'
import { makeAnalyzeSlug } from '../lib/slug'

const SITE_URL = 'https://www.tamjung.me'
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticPages: MetadataRoute.Sitemap = [
        { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
        { url: `${SITE_URL}/discover`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${SITE_URL}/analyze`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${SITE_URL}/reviews`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    ]

    try {
        const res = await fetch(`${BACKEND_URL}/api/land/detective/sitemap-slugs`, {
            cache: 'no-store',
        })
        if (!res.ok) return staticPages

        const data = await res.json()

        const analyzePages = (data.analyses || [])
            .map((item: { id: number; bldNm?: string }) => {
                const slug = makeAnalyzeSlug(String(item.id), item.bldNm)
                if (!slug) return null
                return {
                    url: `${SITE_URL}/analyze/${slug}`,
                    lastModified: new Date(),
                    changeFrequency: 'weekly' as const,
                    priority: 0.7,
                }
            })
            .filter(Boolean) as MetadataRoute.Sitemap

        const discoveryPages: MetadataRoute.Sitemap = (data.discoveries || [])
            .map((item: { id: number }) => ({
                url: `${SITE_URL}/discover/${item.id}`,
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            }))

        return [...staticPages, ...discoveryPages, ...analyzePages]

    } catch {
        return staticPages
    }
}
