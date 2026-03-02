import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mineskin.eu',
      },
      {
        protocol: 'https',
        hostname: 'minotar.net',
      },
      {
        protocol: 'https',
        hostname: 'mc-heads.net',
      },
    ],
    minimumCacheTTL: 864000, // 10 days cache for player avatars
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default withNextIntl(nextConfig);
