'use client';

import React, { useState, useEffect } from 'react';
import { Building2, MapPin, User, Bell, CheckCircle, Copy, Search, SlidersHorizontal } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import ScrollReveal from '@/components/ScrollReveal';
import Masonry from 'react-masonry-css';
import InfiniteScroll from 'react-infinite-scroll-component';

interface Builder {
  name: string;
  uuid: string;
  weight: number;
}

interface Building {
  id: number;
  name: {
    [locale: string]: string;
  };
  description: {
    [locale: string]: string;
  };
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
  builders: Builder[];
  buildType: 'original' | 'derivative' | 'replica';
  imageUrl: string;
  buildDate: string;
  tags?: string[];
  source?: {
    originalAuthor?: string;
    originalLink?: string;
    notes?: {
      [locale: string]: string;
    };
  } | null;
}

export default function BuildingsPage() {
  const t = useTranslations('buildings');
  const locale = useLocale();
  const [playerCount, setPlayerCount] = useState(0);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [displayedCount, setDisplayedCount] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/players');
        const data = await response.json();
        setPlayerCount(data.count);
      } catch (error) {
        console.error('Failed to fetch player count:', error);
      }
    };

    fetchPlayers();
    const interval = setInterval(fetchPlayers, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const response = await fetch('/api/buildings');
        const data = await response.json();
        setBuildings(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch buildings:', error);
        setIsLoading(false);
      }
    };

    fetchBuildings();
  }, []);

  const formatDate = (timestamp: any) => {
    const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredBuildings = buildings
    .filter(building => {
      // Type filter
      if (buildingFilter === 'original') return building.buildType === 'original';
      if (buildingFilter === 'derivative') return building.buildType === 'derivative';
      if (buildingFilter === 'non-original') return building.buildType === 'replica';
      return true;
    })
    .filter(building => {
      // Search filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const name = (building.name[locale] || building.name['en'] || Object.values(building.name)[0] || '').toLowerCase();
      const description = (building.description[locale] || building.description['en'] || Object.values(building.description)[0] || '').toLowerCase();
      const builders = building.builders.map(b => b.name.toLowerCase()).join(' ');
      const tags = (building.tags || []).map(tag => tag.toLowerCase()).join(' ');
      return name.includes(query) || description.includes(query) || builders.includes(query) || tags.includes(query);
    })
    .sort((a, b) => {
      // Sort
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.buildDate).getTime() - new Date(a.buildDate).getTime();
        case 'date-asc':
          return new Date(a.buildDate).getTime() - new Date(b.buildDate).getTime();
        case 'name-asc':
          const nameA = (a.name[locale] || a.name['en'] || Object.values(a.name)[0] || '').toLowerCase();
          const nameB = (b.name[locale] || b.name['en'] || Object.values(b.name)[0] || '').toLowerCase();
          return nameA.localeCompare(nameB);
        case 'name-desc':
          const nameA2 = (a.name[locale] || a.name['en'] || Object.values(a.name)[0] || '').toLowerCase();
          const nameB2 = (b.name[locale] || b.name['en'] || Object.values(b.name)[0] || '').toLowerCase();
          return nameB2.localeCompare(nameA2);
        default:
          return 0;
      }
    });

  const displayedBuildings = filteredBuildings.slice(0, displayedCount);
  const hasMore = displayedCount < filteredBuildings.length;

  const loadMore = () => {
    setDisplayedCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredBuildings.length));
  };

  const handleFilterChange = (filterId: string) => {
    setBuildingFilter(filterId);
    setDisplayedCount(ITEMS_PER_PAGE);
  };

  const breakpointColumns = {
    default: 3,
    1536: 3,
    1280: 3,
    1024: 2,
    640: 1
  };

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 animate-fadeIn">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-linear-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm border border-purple-400/30 shadow-lg">
              <Building2 className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black" style={{ color: 'var(--text-secondary)' }}>{t('title')}</h1>
          </div>
          <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-muted-light)' }}>
            {t('description')}
          </p>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Search Box */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 z-10 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={t('search') || 'Search buildings...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDisplayedCount(ITEMS_PER_PAGE);
              }}
              className="w-full pl-12 pr-4 py-3 rounded-lg backdrop-blur-md bg-white/5 border border-white/10 focus:border-purple-400/50 focus:outline-none transition-all relative z-0"
              style={{
                color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Sort Selector */}
          <div className="relative sm:w-64">
            <SlidersHorizontal className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 z-10 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setDisplayedCount(ITEMS_PER_PAGE);
              }}
              className="w-full pl-12 pr-10 py-3 rounded-lg backdrop-blur-md bg-white/5 border border-white/10 focus:border-purple-400/50 focus:outline-none transition-all appearance-none cursor-pointer relative z-0"
              style={{
                color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
            >
              <option value="date-desc">{t('sort.dateDesc') || 'Newest First'}</option>
              <option value="date-asc">{t('sort.dateAsc') || 'Oldest First'}</option>
              <option value="name-asc">{t('sort.nameAsc') || 'Name A-Z'}</option>
              <option value="name-desc">{t('sort.nameDesc') || 'Name Z-A'}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-12 px-2">
          {[
            { id: 'all', label: t('filters.all') },
            { id: 'original', label: t('filters.original') },
            { id: 'derivative', label: t('filters.derivative') },
            { id: 'non-original', label: t('filters.replica') }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => handleFilterChange(filter.id)}
              style={{
                color: buildingFilter === filter.id ? '#a78bfa' : 'var(--text-muted-light)'
              }}
              className={`px-4 sm:px-6 py-2.5 rounded-lg backdrop-blur-md transition-all duration-300 text-xs sm:text-sm font-medium ${
                buildingFilter === filter.id
                  ? 'bg-purple-500/30 border border-purple-400/50 shadow-lg scale-105'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-6 text-lg" style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
          </div>
        ) : filteredBuildings.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-very-dimmed)' }} />
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>{t('empty')}</p>
          </div>
        ) : (
          <InfiniteScroll
            dataLength={displayedBuildings.length}
            next={loadMore}
            hasMore={hasMore}
            loader={
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            }
            endMessage={
              <div className="text-center py-8">
                <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                  {t('noMore') || 'No more buildings to load'}
                </p>
              </div>
            }
            style={{ overflow: 'visible' }}
            className="infinite-scroll-component"
          >
          <Masonry
            breakpointCols={breakpointColumns}
            className="flex -ml-6 w-auto"
            columnClassName="pl-6 bg-clip-padding"
          >
            {displayedBuildings.map((building, i) => (
              <ScrollReveal key={building.id} delay={i * 0.05} direction="up">
              <div
                className="backdrop-blur-lg bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-purple-400/30 transition-all duration-300 overflow-hidden group cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20 mb-6"
              >
                <div className="relative h-56 bg-linear-to-br from-purple-900/20 to-blue-900/20 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Building2 className="w-20 h-20" style={{ color: 'var(--text-very-dimmed)' }} />
                  </div>
                  <div className="absolute top-3 right-3 px-3 py-1.5 backdrop-blur-md bg-black/50 rounded-full border border-white/20 flex items-center gap-1.5">
                    {building.buildType === 'original' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400 font-medium">{t('labels.original')}</span>
                      </>
                    ) : building.buildType === 'derivative' ? (
                      <>
                        <Copy className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-blue-400 font-medium">{t('labels.derivative')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-amber-400 font-medium">{t('labels.replica')}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3 group-hover:text-purple-300 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    {building.name[locale] || building.name['en'] || Object.values(building.name)[0]}
                  </h3>

                  {building.tags && building.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {building.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 text-xs font-medium rounded-full backdrop-blur-md bg-purple-500/20 text-purple-300 border border-purple-400/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-sm leading-relaxed mb-4 line-clamp-3" style={{ color: 'var(--text-muted-light)' }}>
                    {building.description[locale] || building.description['en'] || Object.values(building.description)[0]}
                  </p>

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                      <span style={{ color: 'var(--text-muted)' }}>{t('labels.coordinates')}</span>
                      <code style={{ background: 'var(--code-bg)' }} className="text-amber-400 font-mono px-2 py-1 rounded text-xs">
                        {building.coordinates.x}, {building.coordinates.y}, {building.coordinates.z}
                      </code>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <User className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span style={{ color: 'var(--text-muted)' }}>{building.builders.length > 1 ? t('labels.builders') : t('labels.builder')}</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(() => {
                            const sortedBuilders = [...building.builders].sort((a, b) => b.weight - a.weight);
                            const maxWeight = sortedBuilders[0]?.weight || 100;

                            return sortedBuilders.map((builder, idx) => {
                              const isMainContributor = builder.weight === maxWeight;
                              const contributionLevel = builder.weight / maxWeight;

                              return (
                                <span
                                  key={idx}
                                  className="text-green-400 transition-all"
                                  style={{
                                    fontWeight: isMainContributor ? 600 : 500,
                                    fontSize: isMainContributor ? '0.875rem' : '0.8125rem',
                                    opacity: 0.5 + (contributionLevel * 0.5)
                                  }}
                                >
                                  {builder.name}
                                  {idx < building.builders.length - 1 && ','}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Bell className="w-4 h-4 text-blue-400 shrink-0" />
                      <span style={{ color: 'var(--text-muted)' }}>{t('labels.buildDate')}</span>
                      <span className="text-blue-400">{formatDate(building.buildDate)}</span>
                    </div>

                    {building.source && (
                      <>
                        {building.source.originalAuthor && (
                          <div className="flex items-start gap-2 text-sm pt-2 border-t" style={{ borderColor: 'var(--glass-border-light)' }}>
                            <User className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span style={{ color: 'var(--text-muted)' }}>{t('labels.originalAuthor')}</span>
                              <p className="text-purple-400 font-medium">{building.source.originalAuthor}</p>
                            </div>
                          </div>
                        )}
                        {building.source.originalLink && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span style={{ color: 'var(--text-muted)' }}>{t('labels.source')}</span>
                              <a
                                href={building.source.originalLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300 underline block truncate"
                              >
                                {building.source.originalLink}
                              </a>
                            </div>
                          </div>
                        )}
                        {building.source.notes && (
                          <div className="text-xs italic pt-1" style={{ color: 'var(--text-muted)' }}>
                            {building.source.notes[locale] || building.source.notes['en'] || Object.values(building.source.notes)[0]}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              </ScrollReveal>
            ))}
          </Masonry>
          </InfiniteScroll>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 1s ease-out;
        }

        input::placeholder {
          color: var(--text-muted);
        }

        select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a78bfa' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
        }

        select option {
          background: var(--bg-base);
          color: var(--text-primary);
          padding: 0.5rem;
        }

        :global(.infinite-scroll-component) {
          overflow: visible !important;
        }

        :global(.infinite-scroll-component__outerdiv) {
          overflow: visible !important;
        }
      `}</style>
    </div>
  );
}
