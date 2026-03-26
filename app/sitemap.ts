import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://mik.noctiro.moe'
  
  // Static pages
  const staticPages = [
    '',
    '/buildings',
    '/wiki',
    '/bans',
  ]
  
  const locales = ['zh-CN', 'en']
  
  // Generate URLs for all locales
  const urls: MetadataRoute.Sitemap = []
  
  for (const locale of locales) {
    for (const page of staticPages) {
      urls.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1 : 0.8,
      })
    }
  }
  
  // Fetch buildings for dynamic pages
  try {
    const response = await fetch(`${baseUrl}/api/buildings`)
    const buildings = await response.json()
    
    for (const locale of locales) {
      buildings.forEach((building: { id?: string; name?: { en?: string }; buildDate?: string }) => {
        const buildingId = building.id || building.name?.en || '';
        const buildDate = building.buildDate ? new Date(building.buildDate) : new Date();
        urls.push({
          url: `${baseUrl}/${locale}/buildings#${buildingId}`,
          lastModified: buildDate,
          changeFrequency: 'monthly',
          priority: 0.6,
        })
      })
    }
  } catch (error) {
    console.error('Failed to fetch buildings for sitemap:', error)
  }
  
  return urls
}
