import type { ReactNode } from 'react';

interface ContentBrowserHeaderProps {
  title: string;
  titleAside?: ReactNode;
  search: ReactNode;
  children?: ReactNode;
}

export function ContentBrowserHeader({
  title,
  titleAside,
  search,
  children,
}: ContentBrowserHeaderProps) {
  const heading = <h1 className="content-browser-header__title">{title}</h1>;

  return (
    <header className="content-browser-header">
      {titleAside ? (
        <div className="content-browser-header__heading">
          {heading}
          {titleAside}
        </div>
      ) : (
        heading
      )}
      <div className="content-browser-header__search">{search}</div>
      {children ? <div className="content-browser-header__controls">{children}</div> : null}
    </header>
  );
}
