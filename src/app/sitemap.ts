import { MetadataRoute } from 'next'
import { makeAnalyzeSlug } from '../lib/slug'

const SITE_URL = 'https://www.tamjung.me'
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40'

async function getDiscoveryIds(): Promise<string[]> {
    try {
        const res = await fetch(`${BACKEND_URL}/api/land/detective/discovery/global`, {
            cache: 'no-store',
        })
        if (!res.ok) return []
        const data = await res.json()
        const list = data.list || data.discoveries || []
        return list.map((item: any) => String(item.id || item._id || '')).filter(Boolean)
    } catch {
        return []
    }
}

interface TimelineItem {
    id?: string;
    _id?: string;
    bldNm?: string;
}

async function getAnalyzeSlugs(): Promise<string[]> {
    try {
        const res = await fetch(`${BACKEND_URL}/api/land/detective/timeline?limit=5000`, {
            cache: 'no-store',
        })
        if (!res.ok) return []
        const data = await res.json()
        const list: TimelineItem[] = data.analyses || data.timeline || data.data || []
        const slugs = list
            .map((item) => {
                const id = String(item.id || item._id || '')
                if (!id) return ''
                return makeAnalyzeSlug(id, item.bldNm)
            })
            .filter(Boolean)
        return Array.from(new Set<string>(slugs))
    } catch {
        return []
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticPages: MetadataRoute.Sitemap = [
        { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
        { url: `${SITE_URL}/discover`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${SITE_URL}/analyze`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${SITE_URL}/reviews`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    ]

    const discoveryIds = await getDiscoveryIds()
    const discoveryPages: MetadataRoute.Sitemap = discoveryIds.map((id) => ({
        url: `${SITE_URL}/discover/${id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }))

    const analyzeSlugs = await getAnalyzeSlugs()
    const analyzePages: MetadataRoute.Sitemap = analyzeSlugs.map((slug) => ({
        url: `${SITE_URL}/analyze/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
    }))

    return [...staticPages, ...discoveryPages, ...analyzePages]
}
