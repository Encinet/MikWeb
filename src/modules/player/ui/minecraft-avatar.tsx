'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useState } from 'react';

interface MinecraftAvatarProps {
  uuid: string;
  name: string;
  size: number;
  className?: string;
  style?: CSSProperties;
}

const AVATAR_SERVICES = [
  (uuid: string, size: number) => `https://mineskin.eu/helm/${uuid}?size=${size}`,
  (uuid: string, size: number) => `https://minotar.net/avatar/${uuid}/${size}`,
  (uuid: string, size: number) => `https://mc-heads.net/avatar/${uuid}/${size}`,
];

export default function MinecraftAvatar({
  uuid,
  name,
  size,
  className = '',
  style = {},
}: MinecraftAvatarProps) {
  const [serviceIndex, setServiceIndex] = useState(0);

  const handleError = () => {
    setServiceIndex((currentIndex) => Math.min(currentIndex + 1, AVATAR_SERVICES.length));
  };

  const normalizedName = name.trim();
  const fallbackLabel = normalizedName ? normalizedName.charAt(0).toUpperCase() : '?';
  const hasFallback = serviceIndex >= AVATAR_SERVICES.length;

  if (hasFallback) {
    return (
      <div
        role="img"
        aria-label={`${name} avatar placeholder`}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
          background:
            'linear-gradient(135deg, var(--theme-surface-icon) 0%, rgba(255, 170, 0, 0.14) 100%)',
          border: '1px solid var(--theme-border-glass)',
          color: 'var(--theme-text-muted-strong)',
          fontSize: `${Math.max(12, Math.floor(size * 0.42))}px`,
          fontWeight: 700,
          lineHeight: 1,
          textTransform: 'uppercase',
          ...style,
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
        }}
      >
        {fallbackLabel}
      </div>
    );
  }

  const avatarUrl = AVATAR_SERVICES[serviceIndex](uuid, size);

  return (
    <Image
      src={avatarUrl}
      alt={name}
      width={size}
      height={size}
      className={className}
      style={{
        imageRendering: 'pixelated',
        ...style,
      }}
      onError={handleError}
    />
  );
}
