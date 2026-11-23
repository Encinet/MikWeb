'use client';

import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { createSponsorWall } from '@/modules/sponsor/model/sponsor-wall-data';
import { useSponsors } from '@/modules/sponsor/model/use-sponsors';
import { AFDIAN_SUPPORT_URL, SITE_TRANSLATION_VALUES } from '@/shared/config/site-config';
import { LoadingState } from '@/shared/ui/feedback/loading-state';

import { SponsorsIndex, SponsorsWall } from './sponsors-wall';

export function SponsorsPage() {
  const t = useTranslations('sponsors');
  const commonT = useTranslations('common');
  const title = t('title');
  const errorMessage = t('states.error');
  const { state, retry } = useSponsors(errorMessage);
  const sponsors = useMemo(
    () => (state.status === 'success' ? createSponsorWall(state.data) : []),
    [state],
  );
  return (
    <div className="sponsors-page page-shell page-shell-stable" data-print-title={title}>
      <div className="sponsors-page__inner page-shell-content">
        <div className="sponsors-sidebar">
          <header className="sponsors-intro">
            <div>
              <h1 className="page-title">{title}</h1>
              <p>{t('subtitle', SITE_TRANSLATION_VALUES)}</p>
            </div>
            <a
              className="ui-action-button"
              href={AFDIAN_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('actions.supportServer')}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </header>
          {sponsors.length > 0 && <SponsorsIndex sponsors={sponsors} />}
        </div>

        <div>
          {state.status === 'success' ? (
            <SponsorsWall sponsors={sponsors} />
          ) : (
            <div className="page-state-region sponsors-state">
              {state.status === 'loading' ? (
                <LoadingState message={commonT('states.loading')} />
              ) : (
                <>
                  <p role="alert">{errorMessage}</p>
                  <button className="ui-action-button" type="button" onClick={retry}>
                    {commonT('actions.retry')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
