import type { MetadataRoute } from 'next';

/** Ochiq sahifalar (ikkinchi koʻrik, 19-taklif). */
export default function sitemap(): MetadataRoute.Sitemap {
  const sayt = 'https://zumsavdo.vercel.app';
  return [
    { url: `${sayt}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${sayt}/usta`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${sayt}/maxfiylik`, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
