import type { ReactNode } from 'react';

export interface ArtGuideStep {
  description: string;
  title: string;
}

interface ArtGuidePageProps {
  children: ReactNode;
  guideTitle: string;
  pageClassName?: string;
  steps: ArtGuideStep[];
  subtitle: string;
  title: string;
}

export function ArtGuidePage({
  children,
  guideTitle,
  pageClassName,
  steps,
  subtitle,
  title,
}: ArtGuidePageProps) {
  return (
    <div className={['art-guide-page', pageClassName].filter(Boolean).join(' ')}>
      <section className="art-guide-hero">
        <div className="art-guide-hero__backdrop" aria-hidden="true" />
        <div className="art-guide-container art-guide-hero__content">
          <header className="art-guide-hero__copy">
            <h1>{title}</h1>
            <p className="art-guide-hero__description">{subtitle}</p>
          </header>
          <div className="art-guide-hero__tools">{children}</div>
          <section className="art-guide-panel">
            <div className="art-guide-panel__header">
              <h2>{guideTitle}</h2>
            </div>
            <ol className="art-guide-panel__steps">
              {steps.map((step, index) => (
                <li className="art-guide-step" key={step.title}>
                  <span className="art-guide-step__number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="art-guide-step__copy">
                    <strong>{step.title}</strong>
                    <span>{step.description}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </section>
    </div>
  );
}
