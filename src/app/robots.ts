import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/temp/', '/_next/static/media/'],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: ['/api/', '/temp/', '/_next/static/media/'],
            },
            {
                userAgent: 'Yeti', // Naver bot
                allow: '/',
                disallow: ['/api/', '/temp/', '/_next/static/media/'],
            },
        ],
        sitemap: 'https://www.tamjung.me/sitemap.xml',  // www 추가!
    }
}