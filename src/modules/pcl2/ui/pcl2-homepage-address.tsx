'use client';

import { useEffect, useState } from 'react';

import {
  DEFAULT_PCL2_TIME_ZONE,
  normalizePcl2TimeZone,
  withPcl2TimeZone,
} from '@/modules/pcl2/lib/pcl2-time-zone';
import { CopyButton } from '@/shared/ui/action/copy-button';

interface Pcl2HomepageAddressProps {
  baseUrl: string;
  copyLabel: string;
  detectingLabel: string;
  label: string;
}

export function Pcl2HomepageAddress({
  baseUrl,
  detectingLabel,
  label,
  copyLabel,
}: Pcl2HomepageAddressProps) {
  const [homepageUrl, setHomepageUrl] = useState<string | null>(null);

  useEffect(() => {
    let timeZone = DEFAULT_PCL2_TIME_ZONE;

    try {
      timeZone = normalizePcl2TimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      // Keep UTC when the browser does not expose Intl time-zone data.
    }

    setHomepageUrl(withPcl2TimeZone(new URL(baseUrl, window.location.origin).href, timeZone));
  }, [baseUrl]);

  return (
    <div className="art-guide-address">
      <h2>{label}</h2>
      <div className="art-guide-address__bar" aria-busy={homepageUrl === null}>
        <code>{homepageUrl ?? detectingLabel}</code>
        <CopyButton
          className="art-guide-address__copy"
          label={copyLabel}
          showLabel
          disabled={homepageUrl === null}
          value={homepageUrl ?? ''}
        />
      </div>
    </div>
  );
}
