export default function StructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Mik Casual',
    description: 'Mik Casual 是由 Encinet 团队管理的创造休闲向 Minecraft 服务器，允许任意 Mod，专注于建筑创作',
    url: 'https://mik.noctiro.moe',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://mik.noctiro.moe/buildings?search={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    },
    inLanguage: ['zh-CN', 'en'],
  };

  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Encinet',
    alternateName: 'Mik',
    url: 'https://encinet.netlify.app/',
    logo: 'https://avatars.githubusercontent.com/u/102745297?s=200&v=4',
    description: 'Encinet 团队管理的 Mik 品牌 Minecraft 服务器社区',
    sameAs: [
      'https://github.com/Encinet',
      'https://space.bilibili.com/650182011',
      // Add more social media links here
      // 'https://twitter.com/yourhandle',
      // 'https://discord.gg/yourinvite',
    ],
    subOrganization: {
      '@type': 'Organization',
      name: 'Mik Casual',
      url: 'https://mik.noctiro.moe',
      logo: 'https://mik.noctiro.moe/mik-standard-rounded.webp',
      description: 'Mik Casual 创造休闲 Minecraft 服务器',
      parentOrganization: {
        '@type': 'Organization',
        name: 'Encinet',
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
    </>
  );
}
