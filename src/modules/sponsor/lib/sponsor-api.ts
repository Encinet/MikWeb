import { isSponsorArray } from '@/modules/sponsor/model/sponsor-validation';
import { dataApiUrl } from '@/shared/api/data-api-url';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';

export function loadSponsors(errorMessage: string, force: boolean) {
  const origin = process.env.NEXT_PUBLIC_MIKDATA_ORIGIN?.trim().replace(/\/+$/, '');
  return fetchValidatedJson({
    url: origin ? `${origin}/api/sponsors` : dataApiUrl('/sponsors'),
    validate: isSponsorArray,
    validateHeaders: (headers) => headers.get('X-Sponsor-Data') !== 'partial',
    timeoutMs: 25_000,
    browserCache: { ttlMs: 30_000, force },
    fallbackErrorMessage: errorMessage,
    invalidDataMessage: errorMessage,
  });
}
