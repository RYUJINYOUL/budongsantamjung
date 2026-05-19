import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/temp/'],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: ['/api/', '/temp/'],
            },
            {
                userAgent: 'Yeti', // Naver bot
                allow: '/',
                disallow: ['/api/', '/temp/'],
            },
        ],
        sitemap: 'https://route-test-fe6fc.web.app/sitemap.xml',
    }
}
