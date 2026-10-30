'use client';

import { BookOpen, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { getWikiSectionHref } from '@/modules/wiki/lib/wiki-outline';
import type {
  WikiSectionGroupDefinition,
  WikiSectionId,
} from '@/modules/wiki/model/wiki-section-types';
import { iconMap } from '@/modules/wiki/ui/wiki-icons';

interface WikiNavigationProps {
  activeSection: WikiSectionId;
  isSearching: boolean;
  isSidebarOpen: boolean;
  navigationLabel: string;
  onSectionChange: (id: WikiSectionId) => void;
  onSidebarOpenChange: (isOpen: boolean) => void;
  sectionGroups: WikiSectionGroupDefinition[];
}

export function WikiNavigation({
  activeSection,
  isSearching,
  isSidebarOpen,
  navigationLabel,
  onSectionChange,
  onSidebarOpenChange,
  sectionGroups,
}: WikiNavigationProps) {
  const navigationId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const activeLabel = sectionGroups
    .flatMap((group) => group.sections)
    .find((section) => section.id === activeSection)?.label;

  useEffect(() => {
    if (!isSidebarOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onSidebarOpenChange(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isSidebarOpen, onSidebarOpenChange]);

  return (
    <aside className="wiki-navigation">
      <button
        ref={toggleRef}
        type="button"
        className="wiki-navigation__toggle"
        aria-expanded={isSidebarOpen}
        aria-controls={navigationId}
        onClick={() => onSidebarOpenChange(!isSidebarOpen)}
      >
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        <span>{navigationLabel}</span>
        <span className="wiki-navigation__current">{activeLabel}</span>
        <ChevronDown className="wiki-navigation__chevron h-4 w-4" aria-hidden="true" />
      </button>
      <nav
        id={navigationId}
        aria-label={navigationLabel}
        className={`wiki-navigation__groups ${isSidebarOpen ? 'is-open' : ''}`}
      >
        {sectionGroups.map((group) => (
          <div key={group.id} className="wiki-navigation__group">
            <p className="wiki-navigation__group-label">{group.label}</p>
            {group.sections.map((section) => {
              const Icon = iconMap.get(section.icon) ?? BookOpen;
              const isActive = !isSearching && activeSection === section.id;
              return (
                <a
                  key={section.id}
                  href={getWikiSectionHref(section.id)}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(event) => {
                    if (
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    event.preventDefault();
                    onSectionChange(section.id);
                    if (isSidebarOpen) toggleRef.current?.focus({ preventScroll: true });
                  }}
                  className={`wiki-navigation__item ${isActive ? 'is-active' : ''}`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{section.label}</span>
                </a>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
