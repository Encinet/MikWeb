import Link from 'next/link';

interface NotFoundViewProps {
  description: string;
  homeHref: string;
  homeLabel: string;
  title: string;
}

export default function NotFoundView({
  description,
  homeHref,
  homeLabel,
  title,
}: NotFoundViewProps) {
  return (
    <section className="not-found-art-page">
      <div className="not-found-art-page__backdrop" aria-hidden="true" />
      <div className="art-guide-container not-found-art-page__layout">
        <strong className="not-found-art-page__watermark" aria-hidden="true">
          404
        </strong>
        <div className="not-found-art-page__copy">
          <h1>{title}</h1>
          <p>{description}</p>
          <Link href={homeHref} className="home-project-button not-found-art-page__action">
            <span>{homeLabel}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
