import type { ReactNode } from 'react';

interface ContentBrowserHeaderProps {
  title: string;
  search: ReactNode;
  children?: ReactNode;
}

export function ContentBrowserHeader({ title, search, children }: ContentBrowserHeaderProps) {
  return (
    <header className="content-browser-header">
      <h1 className="content-browser-header__title">{title}</h1>
      <div className="content-browser-header__search">{search}</div>
      {children ? <div className="content-browser-header__controls">{children}</div> : null}
    </header>
  );
}
