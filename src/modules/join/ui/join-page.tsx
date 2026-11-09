import { ArrowUpRight, BookOpen, FileText, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { JoinPageData } from '@/modules/join/model/join-group';
import { JoinGroupRow } from '@/modules/join/ui/join-group-row';
import { Link } from '@/shared/i18n/routing';

export function JoinPage({ groups, formUrl, captcha }: JoinPageData) {
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
          <section className="join-form" aria-labelledby="join-form-title">
            <header className="join-method-heading">
              <h2 id="join-form-title">
                <FileText aria-hidden="true" />
                {t('form.title')}
              </h2>
              {formUrl ? <p>{t('form.description')}</p> : null}
            </header>
            {formUrl ? (
              <>
                <a
                  className="ui-action-button join-form-link"
                  href={formUrl}
                  target="_blank"
                  rel="noopener noreferrer external"
                >
                  {t('form.open')}
                  <ArrowUpRight aria-hidden="true" />
                </a>
                <p className="join-form-note">{t('form.note')}</p>
              </>
            ) : (
              <p className="join-unavailable">{t('form.unavailable')}</p>
            )}
          </section>
        </div>
        <Link className="join-rules-link" href="/wiki?section=rules">
          <BookOpen aria-hidden="true" />
          {t('rules')}
        </Link>
      </div>
    </div>
  );
}
