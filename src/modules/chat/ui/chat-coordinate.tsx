'use client';

import { ExternalLink, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import type { ChatCoordinates } from '@/modules/chat/lib/chat-coordinates';
import { ChatActionMenu } from '@/modules/chat/ui/chat-action-menu';
import { loadMapWorlds } from '@/modules/map/lib/load-map-worlds';
import type { MapWorld } from '@/modules/map/model/map-world';
import { coordinateMapWorld, mapPositionUrl } from '@/modules/map/model/map-world';
import { CopyButton } from '@/shared/ui/action/copy-button';

export function ChatCoordinate({ coordinate }: { coordinate: ChatCoordinates }) {
  const t = useTranslations('chat.coordinates');
  const id = useId();
  const [worlds, setWorlds] = useState<MapWorld[] | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const load = () => {
    if (busy.current) return;
    busy.current = true;
    setFailed(false);
    void loadMapWorlds()
      .then(setWorlds)
      .catch(() => setFailed(true))
      .finally(() => {
        busy.current = false;
      });
  };
  const selected =
    worlds && choice !== null
      ? worlds.some((world) => world.name === choice)
        ? choice
        : ''
      : (coordinateMapWorld(worlds ?? [], coordinate.world) ?? '');
  const text = `${coordinate.x} ${coordinate.y} ${coordinate.z}`;
  return (
    <ChatActionMenu
      label={t('actions', { coordinates: coordinate.label.trim() })}
      trigger={
        <>
          {coordinate.label}
          <MapPin size={12} aria-hidden="true" />
        </>
      }
      className="chat-coordinate"
      onOpen={load}
    >
      <CopyButton value={text} label={t('copy')} showLabel className="chat-popover-action" />
      <label className="chat-coordinate-world" htmlFor={id}>
        <span>{t('world')}</span>
        <select
          id={id}
          value={selected}
          disabled={!worlds}
          onChange={(event) => setChoice(event.target.value)}
        >
          <option value="">
            {worlds ? t('chooseWorld') : failed ? t('unavailable') : t('loading')}
          </option>
          {worlds?.map((world) => (
            <option value={world.name} key={world.name}>
              {world.displayName}
            </option>
          ))}
        </select>
      </label>
      {failed ? (
        <button type="button" className="chat-popover-action" onClick={load}>
          {t('retry')}
        </button>
      ) : null}
      {worlds && coordinate.world && !selected ? (
        <span className="chat-popover-hint" role="status">
          {t('chooseWorldHint')}
        </span>
      ) : null}
      {selected ? (
        <a
          href={mapPositionUrl(selected, coordinate.x, coordinate.z)}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          className="chat-popover-action"
        >
          <ExternalLink size={16} aria-hidden="true" />
          {t('viewMap')}
        </a>
      ) : null}
    </ChatActionMenu>
  );
}
