import { TriangleAlert } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/shared/i18n/routing';
import { ServerInsertedScript } from '@/shared/ui/server-inserted-script';
import { getBrowserSupportScript } from '@/site/browser-support/lib/browser-support-script';

// Keep fallback styles outside the CSS build: unsupported browsers may not understand its output.
const fallbackStyles = `
#browser-support-notice {
  display: none;
  --notice-background: var(--palette-dark-surface-modal, #242723);
  --notice-heading: #f4f5f2;
  --notice-copy: #c9cdc6;
  --notice-border: rgba(255, 255, 255, .16);
  --notice-button: rgba(255, 255, 255, .07);
  --notice-button-hover: rgba(255, 255, 255, .12);
  --notice-warning: #f2c883;
  --notice-warning-background: rgba(242, 200, 131, .1);
}
[data-theme="light"] #browser-support-notice {
  --notice-background: var(--palette-light-surface-modal, #fafbf8);
  --notice-heading: #252b24;
  --notice-copy: #50594d;
  --notice-border: rgba(37, 43, 36, .2);
  --notice-button: rgba(37, 43, 36, .04);
  --notice-button-hover: rgba(37, 43, 36, .08);
  --notice-warning: #80500b;
  --notice-warning-background: rgba(165, 106, 18, .1);
}
html[data-browser-warning="visible"] #browser-support-notice {
  display: block; position: fixed; z-index: 1100;
  left: 12px; right: 12px; bottom: 12px;
  left: calc(12px + env(safe-area-inset-left, 0px));
  right: calc(12px + env(safe-area-inset-right, 0px));
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box; max-width: 560px; max-height: 80vh; overflow: auto;
  margin: 0 auto; padding: 20px; border: 1px solid #52584f;
  border-color: var(--notice-border); border-radius: 20px;
  background: #242723; background: var(--notice-background);
  color: #f4f5f2; color: var(--notice-heading);
  font: 14px/1.65 system-ui, -apple-system, "Segoe UI", sans-serif;
  text-align: left; box-shadow: 0 12px 48px rgba(0, 0, 0, .24);
}
#browser-support-notice .browser-support-heading { display: flex; align-items: center; }
#browser-support-notice .browser-support-icon {
  display: flex; flex: 0 0 36px; align-items: center; justify-content: center;
  width: 36px; height: 36px; margin-right: 12px; border-radius: 12px;
  background: rgba(242, 200, 131, .1); background: var(--notice-warning-background);
  color: #f2c883; color: var(--notice-warning);
}
#browser-support-notice strong { font-size: 16px; line-height: 1.5; font-weight: 650; }
#browser-support-notice p {
  margin: 12px 0 0; color: #c9cdc6; color: var(--notice-copy);
}
#browser-support-notice .browser-support-requirements {
  padding-top: 12px; border-top: 1px solid #52584f;
  border-color: var(--notice-border); font-size: 13px; line-height: 1.6;
}
#browser-support-notice .browser-support-actions { margin-top: 16px; text-align: right; }
#browser-support-dismiss {
  display: inline-block; box-sizing: border-box; min-height: 44px; padding: 10px 18px;
  border: 1px solid #52584f; border-color: var(--notice-border); border-radius: 999px;
  background: rgba(255, 255, 255, .07); background: var(--notice-button);
  color: inherit; font: inherit; font-weight: 550; cursor: pointer;
}
#browser-support-dismiss:hover { background: rgba(255, 255, 255, .12); background: var(--notice-button-hover); }
#browser-support-dismiss:focus { outline: 2px solid currentColor; outline-offset: 3px; }
@media (max-width: 480px) {
  html[data-browser-warning="visible"] #browser-support-notice { padding: 16px; }
  #browser-support-dismiss { width: 100%; }
}
@media print { html[data-browser-warning="visible"] #browser-support-notice { display: none; } }
`;

export async function BrowserSupportNotice({ locale }: { locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: 'browserSupport' });

  return (
    <>
      <style>{fallbackStyles}</style>
      <aside id="browser-support-notice" aria-labelledby="browser-support-title">
        <div role="status">
          <div className="browser-support-heading">
            <span className="browser-support-icon" aria-hidden="true">
              <TriangleAlert size={20} />
            </span>
            <strong id="browser-support-title">{t('title')}</strong>
          </div>
          <p>{t('description')}</p>
          <p className="browser-support-requirements">{t('requirements')}</p>
        </div>
        <div className="browser-support-actions">
          <button id="browser-support-dismiss" type="button">
            {t('dismiss')}
          </button>
        </div>
      </aside>
      <ServerInsertedScript code={getBrowserSupportScript()} />
    </>
  );
}
