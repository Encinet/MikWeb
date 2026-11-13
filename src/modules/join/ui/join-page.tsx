import { ArrowUpRight, MessageCircle, MessagesSquare, ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { JoinPageData } from '@/modules/join/model/join-group';
import { JoinGroupRow } from '@/modules/join/ui/join-group-row';
import { Link } from '@/shared/i18n/navigation';

export function JoinPage({ groups, matrixUrl, captcha }: JoinPageData) {
  const t = useTranslations('join');
  return (
    <div className="join-page page-shell">
      <div className="join-container">
        <header className="join-intro">
          <h1>{t('title')}</h1>
          <p>{t('description')}</p>
        </header>
        <div className="join-methods">
          <section aria-labelledby="join-qq-title">
            <header className="join-method-heading">
              <h2 id="join-qq-title">
                <MessageCircle aria-hidden="true" />
                {t('qq.title')}
              </h2>
              {groups.length ? <p>{t('qq.description')}</p> : null}
            </header>
            {groups.length ? (
              <div className="join-groups">
                {groups.map((group) => (
                  <JoinGroupRow key={group.id} group={group} captcha={captcha} />
                ))}
              </div>
            ) : (
              <p className="join-unavailable">{t('qq.unavailable')}</p>
            )}
          </section>
          <section className="join-matrix" aria-labelledby="join-matrix-title">
            <header className="join-method-heading">
              <h2 id="join-matrix-title">
                <MessagesSquare aria-hidden="true" />
                {t('matrix.title')}
              </h2>
            </header>
            {matrixUrl ? (
              <a
                className="ui-action-button join-matrix-link"
                href={matrixUrl}
                target="_blank"
                rel="noopener noreferrer external"
              >
                {t('matrix.open')}
                <ArrowUpRight aria-hidden="true" />
              </a>
            ) : (
              <p className="join-unavailable">{t('matrix.unavailable')}</p>
            )}
          </section>
        </div>
        <Link className="join-rules-link" href="/wiki?section=rules">
          <ScrollText aria-hidden="true" />
          {t('rules')}
        </Link>
      </div>
    </div>
  );
}
