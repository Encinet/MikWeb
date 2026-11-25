'use client';

import Image, { type ImageProps } from 'next/image';
import { type Ref, useState } from 'react';
import type { BuildingImageUrls } from '@/modules/building/model/building-types';

interface BuildingPictureProps extends Omit<ImageProps, 'src' | 'unoptimized'> {
  image: BuildingImageUrls;
  media?: 'print';
  pictureClassName?: string;
  ref?: Ref<HTMLImageElement>;
}

const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function BuildingPicture({
  image,
  media,
  pictureClassName,
  onError,
  ...props
}: BuildingPictureProps) {
  const [failedJxl, setFailedJxl] = useState<string>();
  return (
    <picture className={pictureClassName}>
      {!media && failedJxl !== image.jxl ? (
        <source type="image/jxl" srcSet={image.jxl} />
      ) : null}
      {media ? <source media={media} type="image/webp" srcSet={image.webp} /> : null}
      <Image
        {...props}
        src={media ? EMPTY_IMAGE : image.webp}
        unoptimized
        onError={(event) => {
          if (!media && failedJxl !== image.jxl && event.currentTarget.currentSrc === image.jxl) {
            setFailedJxl(image.jxl);
          } else {
            onError?.(event);
          }
        }}
      />
    </picture>
  );
}
