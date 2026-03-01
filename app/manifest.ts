import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mik Casual - 创造休闲 Minecraft 服务器',
    short_name: 'Mik Casual',
    description: 'Mik Casual 是由 Encinet 团队管理的创造休闲向 Minecraft 服务器，允许任意 Mod，专注于建筑创作',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#8b5cf6',
    icons: [
      {
        src: '/mik-standard-rounded.webp',
        sizes: 'any',
        type: 'image/webp',
      },
    ],
  }
}
