'use client';

import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';

import { usePlayerAvatar } from '@/modules/player/model/use-player-avatar';

interface MinecraftAvatarProps {
  /** Preferred player identity. Legacy records may fall back to the raw name. */
  uuid?: string;
  name: string;
  size: number;
  className?: string;
  style?: CSSProperties;
  fallback?: ReactNode;
}

/** Size controls the display; all placements of a player share one image resource. */
export default function MinecraftAvatar({
  uuid,
  name,
  size,
  className = '',
  style = {},
  fallback,
}: MinecraftAvatarProps) {
  const avatar = usePlayerAvatar({ uuid, name });
  if (!avatar.src) {
    if (fallback !== undefined) return fallback;
    const normalizedName = name.trim();
    const fallbackLabel = normalizedName ? normalizedName.charAt(0).toUpperCase() : '?';
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

  return (
    <Image
      key={avatar.src}
      src={avatar.src}
      alt={name}
      width={size}
      height={size}
      className={className}
      data-loaded={avatar.loaded}
      style={{
        imageRendering: 'pixelated',
        ...style,
      }}
      unoptimized
      loading={avatar.loaded ? 'eager' : 'lazy'}
      onLoad={avatar.onLoad}
      onError={avatar.onError}
    />
  );
}
