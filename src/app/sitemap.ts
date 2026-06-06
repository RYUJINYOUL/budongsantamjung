import { MetadataRoute } from 'next'

const SITE_URL = 'https://tamjung.me'
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

async function getAnalyzeIds(): Promise<string[]> {
    try {
        const res = await fetch(`${BACKEND_URL}/api/land/detective/timeline?limit=500`, {
            cache: 'no-store',
        })
        if (!res.ok) return []
        const data = await res.json()
        const list = data.analyses || data.timeline || data.data || []
        const ids = list
            .map((item: any) => String(item.id || item._id || ''))
            .filter(Boolean)
        // 중복 제거
        return Array.from(new Set<string>(ids))
    } catch {
        return []
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 정적 페이지
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: SITE_URL,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${SITE_URL}/discover`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${SITE_URL}/analyze`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/reviews`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${SITE_URL}/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${SITE_URL}/signup`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
        },
    ]

    // 동적 페이지: 투자처 발견 상세
    const discoveryIds = await getDiscoveryIds()
    const discoveryPages: MetadataRoute.Sitemap = discoveryIds.map((id) => ({
        url: `${SITE_URL}/discover/${id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }))

    // 동적 페이지: 분석 리포트 상세
    const analyzeIds = await getAnalyzeIds()
    const analyzePages: MetadataRoute.Sitemap = analyzeIds.map((id) => ({
        url: `${SITE_URL}/analyze/${id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
    }))

    return [...staticPages, ...discoveryPages, ...analyzePages]
}
