'use client';

import Image from 'next/image';
import { useState } from 'react';

interface MinecraftAvatarProps {
  uuid: string;
  name: string;
  size: number;
  className?: string;
  style?: React.CSSProperties;
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
  style = {}
}: MinecraftAvatarProps) {
  const [serviceIndex, setServiceIndex] = useState(0);

  const handleError = () => {
    if (serviceIndex < AVATAR_SERVICES.length - 1) {
      setServiceIndex(serviceIndex + 1);
    }
  };

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
        ...style
      }}
      onError={handleError}
      unoptimized
    />
  );
}
