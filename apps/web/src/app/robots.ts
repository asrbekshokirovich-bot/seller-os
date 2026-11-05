import type { MetadataRoute } from 'next';

/** Qidiruv tizimlari (ikkinchi koʻrik, 19-taklif): ichki va hali ishlamaydigan sahifalar indekslanmaydi. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/kirish', '/olchov', '/taqqos'] }],
    sitemap: 'https://zumsavdo.vercel.app/sitemap.xml',
  };
}
