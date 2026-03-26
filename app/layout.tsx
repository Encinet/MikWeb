import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL('https://mik.noctiro.moe'),
  title: {
    default: "Mik Casual - 创造休闲 Minecraft 服务器",
    template: "%s | Mik Casual"
  },
  description: "Mik Casual 是由 Encinet 团队管理的创造休闲向 Minecraft 服务器，允许任意 Mod，专注于建筑创作与社区交流",
  keywords: ["Minecraft", "Server", "Mik", "Mik Casual", "Encinet", "创造服务器", "建筑", "Community", "Builds", "Creative"],
  authors: [{ name: "Encinet Team" }],
  creator: "Encinet",
  publisher: "Mik",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: ['en_US'],
    url: 'https://mik.noctiro.moe',
    siteName: 'Mik Casual',
    title: 'Mik Casual - 创造休闲 Minecraft 服务器',
    description: 'Mik Casual 是由 Encinet 团队管理的创造休闲向 Minecraft 服务器，允许任意 Mod，专注于建筑创作与社区交流',
    images: [
      {
        url: '/mik-standard-rounded.webp',
        width: 512,
        height: 512,
        alt: 'Mik Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Mik Casual - 创造休闲 Minecraft 服务器',
    description: 'Mik Casual 是由 Encinet 团队管理的创造休闲向 Minecraft 服务器，允许任意 Mod，专注于建筑创作',
    images: ['/mik-standard-rounded.webp'],
  },
  verification: {
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
