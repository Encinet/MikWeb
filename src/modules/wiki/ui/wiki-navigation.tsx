'use client';

import { BookOpen } from 'lucide-react';
import { getWikiSectionHref } from '@/modules/wiki/lib/wiki-outline';
import type {
  WikiSectionGroupDefinition,
  WikiSectionId,
} from '@/modules/wiki/model/wiki-section-types';
import { iconMap } from '@/modules/wiki/ui/wiki-icons';

interface WikiNavigationProps {
  activeSection: WikiSectionId;
  isSearching: boolean;
  navigationLabel: string;
  onSectionChange: (id: WikiSectionId) => void;
  sectionGroups: WikiSectionGroupDefinition[];
}

export function WikiNavigation({
  activeSection,
  isSearching,
  navigationLabel,
  onSectionChange,
  sectionGroups,
}: WikiNavigationProps) {
  return (
    <nav aria-label={navigationLabel} className="wiki-navigation__groups">
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
                }}
                className="ui-sidebar-link"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{section.label}</span>
              </a>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
