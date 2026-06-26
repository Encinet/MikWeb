import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ArtGuideStep {
  description: string;
  icon: LucideIcon;
  title: string;
}

interface ArtGuidePageProps {
  badge: string;
  children: ReactNode;
  guideTitle: string;
  pageClassName?: string;
  panelClassName?: string;
  steps: ArtGuideStep[];
  subtitle: string;
  title: string;
}

export function ArtGuidePage({
  badge,
  children,
  guideTitle,
  pageClassName,
  panelClassName,
  steps,
  subtitle,
  title,
}: ArtGuidePageProps) {
  return (
    <main className={['art-guide-page', pageClassName].filter(Boolean).join(' ')}>
      <section className="art-guide-hero">
        <div className="art-guide-hero__backdrop" aria-hidden="true" />
        <div className="art-guide-container art-guide-hero__content">
          <div className="art-guide-hero__copy">
            <p className="home-project-kicker">{badge}</p>
            <h1>{title}</h1>
            <p className="art-guide-hero__description">{subtitle}</p>
            {children}
          </div>

          <section className={['art-guide-panel', panelClassName].filter(Boolean).join(' ')}>
            <div className="art-guide-panel__chrome" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="art-guide-panel__header">
              <strong>{guideTitle}</strong>
            </div>
            <div className="art-guide-panel__steps">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div className="art-guide-step" key={step.title}>
                    <span className="art-guide-step__number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="art-guide-step__icon">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="art-guide-step__copy">
                      <strong>{step.title}</strong>
                      <span>{step.description}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
