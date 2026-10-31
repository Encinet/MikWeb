'use client';

import { BookOpen, ChevronDown, ListTree, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useRef } from 'react';
import type { WikiNavigationPanel } from '@/modules/wiki/model/use-wiki-navigation-panel';
import { useWikiNavigationPanel } from '@/modules/wiki/model/use-wiki-navigation-panel';
import type {
  WikiSectionGroupDefinition,
  WikiSectionOutlineItem,
} from '@/modules/wiki/model/wiki-section-types';
import { WikiNavigation } from '@/modules/wiki/ui/wiki-navigation';
import { WikiOutlineLinks } from '@/modules/wiki/ui/wiki-outline-links';

interface WikiReadingToolbarProps {
  activeSection: string;
  activeSlug: string;
  isSearching: boolean;
  items: WikiSectionOutlineItem[];
  navigationLabel: string;
  outlineLabel: string;
  sectionGroups: WikiSectionGroupDefinition[];
  panel: WikiNavigationPanel;
  onPanelChange: (panel: WikiNavigationPanel) => void;
  onSectionChange: (id: string) => void;
  onOutlineOpen: (item: WikiSectionOutlineItem) => void;
}

export function WikiReadingToolbar({
  activeSection,
  activeSlug,
  isSearching,
  items,
  navigationLabel,
  outlineLabel,
  sectionGroups,
  panel,
  onPanelChange,
  onSectionChange,
  onOutlineOpen,
}: WikiReadingToolbarProps) {
  const t = useTranslations('common');
  const panelId = useId();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const sectionsButtonRef = useRef<HTMLButtonElement>(null);
  const outlineButtonRef = useRef<HTMLButtonElement>(null);
  const dismissPanel = useWikiNavigationPanel({
    panel,
    onPanelChange,
    dialogRef,
    toolbarRef,
    sectionsButtonRef,
    outlineButtonRef,
  });
  const activeLabel = sectionGroups
    .flatMap((group) => group.sections)
    .find((section) => section.id === activeSection)?.label;
  const currentHeading = items.find((item) => item.slug === activeSlug)?.heading;
  const hasOutline = !isSearching && items.length > 0;
  const togglePanel = (nextPanel: Exclude<WikiNavigationPanel, null>) => {
    if (panel === nextPanel) dismissPanel();
    else onPanelChange(nextPanel);
  };

  return (
    <div
      ref={toolbarRef}
      className="wiki-reading-toolbar"
      data-has-outline={hasOutline}
      data-panel={panel ?? undefined}
    >
      <div className="wiki-reading-toolbar__controls">
        <button
          ref={sectionsButtonRef}
          type="button"
          className="wiki-reading-toolbar__button wiki-reading-toolbar__sections"
          aria-label={`${navigationLabel}: ${activeLabel ?? ''}`}
          aria-expanded={panel === 'sections'}
          aria-controls={panelId}
          aria-haspopup="dialog"
          onClick={() => togglePanel('sections')}
        >
          <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="wiki-reading-toolbar__section-title">{activeLabel}</span>
          <ChevronDown className="wiki-reading-toolbar__chevron h-4 w-4" aria-hidden="true" />
        </button>
        {hasOutline ? (
          <button
            ref={outlineButtonRef}
            type="button"
            className="wiki-reading-toolbar__button wiki-reading-toolbar__outline"
            aria-expanded={panel === 'outline'}
            aria-controls={panelId}
            aria-haspopup="dialog"
            onClick={() => togglePanel('outline')}
          >
            <ListTree className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="wiki-reading-toolbar__outline-label">{outlineLabel}</span>
            <span className="wiki-reading-toolbar__current">{currentHeading}</span>
            <ChevronDown className="wiki-reading-toolbar__chevron h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <dialog id={panelId} ref={dialogRef} className="wiki-reading-panel" aria-labelledby={titleId}>
        <header className="wiki-reading-panel__header">
          <div className="wiki-reading-panel__heading">
            <h2 id={titleId}>{panel === 'sections' ? navigationLabel : outlineLabel}</h2>
            <p>{activeLabel}</p>
          </div>
          <button
            type="button"
            className="wiki-reading-panel__close"
            aria-label={t('actions.close')}
            onClick={() => dismissPanel()}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="wiki-reading-panel__body" data-wiki-panel-viewport>
          {panel === 'sections' ? (
            <WikiNavigation
              activeSection={activeSection}
              isSearching={isSearching}
              navigationLabel={navigationLabel}
              sectionGroups={sectionGroups}
              onSectionChange={(id) => {
                dismissPanel(false);
                onSectionChange(id);
              }}
            />
          ) : panel === 'outline' ? (
            <WikiOutlineLinks
              activeSlug={activeSlug}
              sectionId={activeSection}
              items={items}
              label={outlineLabel}
              onOpen={(item) => {
                dismissPanel(false);
                onOutlineOpen(item);
              }}
            />
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
