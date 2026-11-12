import type { Messages } from 'next-intl';
import { createTranslator } from 'next-intl';
import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import type { BanItem } from '@/modules/ban/model/ban-types';
import type { Building } from '@/modules/building/model/building-types';
import { getLocalizedText, sortBuildersByWeight } from '@/modules/building/model/building-types';
import type { EchoQuote } from '@/modules/pcl2/lib/echo-quote-types';
import { getEchoText } from '@/modules/pcl2/lib/echo-quote-types';
import { getPcl2HomepagePath } from '@/modules/pcl2/lib/pcl2-homepage-path';
import { formatPcl2Time, withPcl2TimeZone } from '@/modules/pcl2/lib/pcl2-time-zone';
import type { PlayerOnlinePayload } from '@/modules/player/model/player-types';
import { SITE_TRANSLATION_VALUES } from '@/shared/config/site-config';
import type { AppLocale } from '@/shared/i18n/routing';
import { absoluteUrl } from '@/shared/url/request-url';
import type { XamlAttributeList, XamlNode } from './xaml-builder';
import { attr, renderXamlFragment, xaml } from './xaml-builder';

const MAX_PCL2_PLAYERS = 12;
const MAX_PCL2_ANNOUNCEMENTS = 5;
const MAX_PCL2_BUILDINGS = 6;
const MAX_BUILDING_IMAGES = 3;

export interface Pcl2HomepageData {
  announcements: AnnouncementItem[];
  bans: BanItem[] | null;
  buildingCount: number | null;
  buildings: Building[] | null;
  buildingTypes: Messages['buildings']['types'];
  description: string;
  echoQuotes: EchoQuote[];
  locale: AppLocale;
  messages: Messages['pcl2']['homepage'];
  onlinePlayers: PlayerOnlinePayload;
  siteOrigin: string;
  serverAddress: string;
  displayAddress: string;
  timeZone: string;
}

type HomepageTranslator = ReturnType<typeof createTranslator<Messages['pcl2']['homepage']>>;

function hasAttr(attrs: XamlAttributeList, name: string): boolean {
  return attrs.some(([n]) => n === name);
}

function withDefault(attrs: XamlAttributeList, name: string, value: string): XamlAttributeList {
  return hasAttr(attrs, name) ? attrs : [attr(name, value), ...attrs];
}

function sp(attrs: XamlAttributeList = [], children: XamlNode[] = []): XamlNode {
  return xaml('StackPanel', attrs, children);
}

function tb(text: string, attrs: XamlAttributeList = []): XamlNode {
  return xaml('TextBlock', [attr('Text', text), ...withDefault(attrs, 'TextWrapping', 'Wrap')]);
}

function btn(text: string, attrs: XamlAttributeList = []): XamlNode {
  return xaml('local:MyButton', [attr('Text', text), ...attrs]);
}

function li(title: string, info: string, url: string): XamlNode {
  return xaml('local:MyListItem', [
    attr('EventData', url),
    attr('EventType', '打开网页'),
    attr('Info', info),
    attr('Margin', '-5,2,-5,5'),
    attr('Title', title),
    attr('Type', 'Clickable'),
  ]);
}

function card(
  title: string,
  children: XamlNode[],
  opts: { isSwapped?: boolean; margin?: string } = {},
): XamlNode {
  return xaml(
    'local:MyCard',
    [
      attr('CanSwap', true),
      attr('IsSwapped', opts.isSwapped),
      attr('Margin', opts.margin ?? '0,0,0,15'),
      attr('Title', title),
    ],
    [sp([attr('Margin', '25,40,23,15')], children)],
  );
}

function innerCard(title: string, children: XamlNode[]): XamlNode {
  return xaml(
    'local:MyCard',
    [
      attr('CanSwap', true),
      attr('IsSwapped', true),
      attr('Margin', '0,0,0,10'),
      attr('Title', title),
    ],
    [sp([attr('Margin', '25,40,23,15')], children)],
  );
}

function getStatus(data: Pcl2HomepageData, t: HomepageTranslator) {
  const online = data.onlinePlayers.online ?? -1;
  if (online < 0) return { color: '#E05555', text: t('status.offline') };
  if (online === 0) return { color: '#D4941E', text: t('status.empty') };
  return { color: '#2ECC40', text: t('status.online', { count: online }) };
}

// Card builders

function buildStatusCard(data: Pcl2HomepageData, t: HomepageTranslator): XamlNode {
  const status = getStatus(data, t);
  const quote = getEchoText(
    data.echoQuotes[Math.floor(Math.random() * data.echoQuotes.length)],
    data.locale,
  );

  return card(
    t('server.statusTitle', SITE_TRANSLATION_VALUES),
    [
      sp(
        [attr('Margin', '0,0,0,8'), attr('Orientation', 'Horizontal')],
        [
          tb('●', [
            attr('FontSize', 14),
            attr('Foreground', status.color),
            attr('Margin', '0,0,6,0'),
            attr('TextWrapping', null),
            attr('VerticalAlignment', 'Center'),
          ]),
          tb(status.text, [
            attr('FontSize', 16),
            attr('Foreground', status.color),
            attr('TextWrapping', null),
            attr('VerticalAlignment', 'Center'),
          ]),
          tb(`   ${data.displayAddress}`, [
            attr('FontSize', 13),
            attr('Foreground', '#888888'),
            attr('Margin', '8,0,0,0'),
            attr('TextWrapping', null),
            attr('VerticalAlignment', 'Center'),
          ]),
          ...(data.onlinePlayers.peak_online != null
            ? [
                tb(`  ·  ${t('players.peak', { count: data.onlinePlayers.peak_online })}`, [
                  attr('FontSize', 13),
                  attr('Foreground', '#888888'),
                  attr('Margin', '4,0,0,0'),
                  attr('TextWrapping', null),
                  attr('VerticalAlignment', 'Center'),
                ]),
              ]
            : []),
        ],
      ),
      xaml('local:MyHint', [
        attr('Margin', '0,0,0,12'),
        attr('Text', t('hint')),
        attr('Theme', 'Blue'),
      ]),
      sp(
        [attr('HorizontalAlignment', 'Center'), attr('Orientation', 'Horizontal')],
        [
          btn(t('server.refreshButton'), [
            attr('ColorType', 'Highlight'),
            attr('EventType', '刷新主页'),
            attr('Height', 36),
            attr('Margin', '0,0,10,0'),
            attr('Padding', '13,0,13,0'),
            attr('Width', 80),
          ]),
          btn(t('server.joinButton'), [
            attr('ColorType', 'Highlight'),
            attr('EventData', `\\current|${data.serverAddress}`),
            attr('EventType', '启动游戏'),
            attr('Height', 36),
            attr('Margin', '0,0,0,0'),
            attr('Padding', '20,0,20,0'),
            attr('ToolTip', t('server.joinTooltip', { address: data.serverAddress })),
            attr('Width', 190),
          ]),
          // Echo cave button — multi-event: popup + auto-refresh for new random quote
          xaml(
            'local:MyButton',
            [
              attr('ColorType', 'Highlight'),
              attr('Height', 36),
              attr('Margin', '10,0,0,0'),
              attr('Padding', '0'),
              attr('Text', t('echo.button')),
              attr('ToolTip', t('echo.tooltip')),
              attr('Width', 80),
            ],
            [
              xaml(
                'local:CustomEventService.Events',
                [],
                [
                  xaml(
                    'local:CustomEventCollection',
                    [],
                    [
                      xaml('local:CustomEvent', [
                        attr('Data', `${t('echo.title')}|${quote}`),
                        attr('Type', '弹出窗口'),
                      ]),
                      xaml('local:CustomEvent', [attr('Data', '-'), attr('Type', '刷新主页')]),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      tb(data.description, [
        attr('FontSize', 12),
        attr('Foreground', '#CCAA55'),
        attr('Margin', '0,14,0,0'),
        attr('TextAlignment', 'Center'),
      ]),
    ],
    { isSwapped: false },
  );
}

function buildPlayerCard(data: Pcl2HomepageData, t: HomepageTranslator): XamlNode {
  const players = data.onlinePlayers.players ?? [];
  if (players.length === 0) {
    const text = data.onlinePlayers.online > 0 ? t('players.noDetails') : t('players.empty');
    return card(t('players.title'), [tb(text)], { isSwapped: false });
  }
  const visible = players.slice(0, MAX_PCL2_PLAYERS);
  return card(
    `${t('players.title')} (${players.length})`,
    visible.map((p) =>
      sp(
        [attr('Margin', '0,0,0,4')],
        [
          tb(p.name, [attr('FontWeight', 'Bold'), attr('TextWrapping', null)]),
          tb(`${t('players.joinedAt')} ${formatPcl2Time(p.joined_at, data.timeZone)}`, [
            attr('FontSize', 11),
            attr('Foreground', '#888888'),
            attr('Margin', '0,2,0,0'),
            attr('TextWrapping', null),
          ]),
        ],
      ),
    ),
    { isSwapped: false },
  );
}

function buildAnnouncementCard(data: Pcl2HomepageData, t: HomepageTranslator): XamlNode {
  const items = data.announcements.slice(0, MAX_PCL2_ANNOUNCEMENTS);
  if (items.length === 0) return card(t('announcements.title'), [tb(t('announcements.empty'))]);
  return card(
    `${t('announcements.title')} (${items.length})`,
    items.map((a, i) =>
      sp(
        [attr('Margin', `0,${i > 0 ? '14' : '0'},0,0`)],
        [
          tb(a.content),
          tb(formatPcl2Time(a.timestamp, data.timeZone), [
            attr('FontSize', 11),
            attr('Foreground', '#888888'),
            attr('Margin', '0,4,0,0'),
          ]),
        ],
      ),
    ),
    { isSwapped: false },
  );
}

function buildBanCard(data: Pcl2HomepageData, t: HomepageTranslator): XamlNode {
  if (!data.bans || data.bans.length === 0) return card(t('bans.title'), [tb(t('bans.empty'))]);
  return card(
    `${t('bans.title')} (${data.bans.length})`,
    data.bans.map((b, i) =>
      sp(
        [attr('Margin', `0,${i > 0 ? '14' : '0'},0,0`)],
        [
          tb(b.playerName ?? '?', [attr('FontWeight', 'Bold')]),
          tb(t('bans.reason', { reason: b.reason || '?' }), [attr('Margin', '0,2,0,0')]),
          tb(
            t('bans.bannedBy', {
              name: b.bannedBy ?? '?',
              time: formatPcl2Time(b.bannedAt, data.timeZone),
            }),
            [attr('FontSize', 11), attr('Foreground', '#888888'), attr('Margin', '0,2,0,0')],
          ),
          tb(
            b.isPermanent
              ? t('bans.permanent')
              : t('bans.expiresAt', { time: formatPcl2Time(b.expiresAt, data.timeZone) }),
            [attr('FontSize', 11), attr('Foreground', b.isPermanent ? '#E05555' : '#D4941E')],
          ),
        ],
      ),
    ),
    { isSwapped: true },
  );
}

function buildBuildingCard(data: Pcl2HomepageData, t: HomepageTranslator): XamlNode {
  if (!data.buildings || data.buildings.length === 0)
    return card(t('buildings.title'), [tb(t('buildings.empty'))]);
  const visible = data.buildings.slice(0, MAX_PCL2_BUILDINGS);
  const innerCards = visible.map((b) => {
    const name = getLocalizedText(b.name, data.locale) || '?';
    const description = getLocalizedText(b.description, data.locale);
    const builders = sortBuildersByWeight(b.builders)
      .map((builder) => builder.name)
      .join(', ');
    const coordText = `${t('buildings.coordinates')}: ${b.coordinates.world} [${b.coordinates.x}, ${b.coordinates.y}, ${b.coordinates.z}]  ·  ${data.buildingTypes[b.buildType]}`;

    const imageNodes: XamlNode[] = [];
    const imgs = b.images ?? [];
    for (let i = 0; i < Math.min(imgs.length, MAX_BUILDING_IMAGES); i++) {
      imageNodes.push(
        xaml('local:MyImage', [
          attr('Height', 150),
          attr('HorizontalAlignment', 'Center'),
          attr('Margin', i > 0 ? '0,6,0,0' : '0,0,0,0'),
          attr('Source', imgs[i]),
        ]),
      );
    }

    return innerCard(name, [
      ...imageNodes,
      sp(
        [attr('Margin', '10,10,10,4')],
        [
          tb(description, [attr('FontSize', 12), attr('Foreground', '#BBBBBB')]),
          tb(coordText, [
            attr('FontSize', 11),
            attr('Foreground', '#888888'),
            attr('Margin', '0,6,0,0'),
          ]),
          tb(`${t('buildings.builders')}: ${builders}`, [
            attr('FontSize', 11),
            attr('Foreground', '#888888'),
          ]),
        ],
      ),
    ]);
  });

  return xaml(
    'local:MyCard',
    [
      attr('CanSwap', true),
      attr('Margin', '0,0,0,15'),
      attr('Title', `${t('buildings.title')} (${data.buildings.length})`),
    ],
    [sp([attr('Margin', '25,40,23,15')], innerCards)],
  );
}

function buildLinksCard(
  locale: AppLocale,
  siteOrigin: string,
  mapTitle: string,
  t: HomepageTranslator,
): XamlNode {
  return card(
    t('links.title'),
    [
      tb(t('links.intro'), [attr('Margin', '0,0,0,8')]),
      li(
        t('links.buildingsTitle'),
        t('links.buildingsInfo'),
        absoluteUrl(`/${locale}/buildings`, siteOrigin),
      ),
      li(t('links.wikiTitle'), t('links.wikiInfo'), absoluteUrl(`/${locale}/wiki`, siteOrigin)),
      li(mapTitle, t('links.mapInfo'), absoluteUrl(`/${locale}/map`, siteOrigin)),
    ],
    { isSwapped: true },
  );
}

function buildAboutCard(
  locale: AppLocale,
  siteOrigin: string,
  timeZone: string,
  description: string,
  t: HomepageTranslator,
): XamlNode {
  const homepageUrl = withPcl2TimeZone(
    absoluteUrl(getPcl2HomepagePath(locale), siteOrigin),
    timeZone,
  );
  return card(
    t('about.title'),
    [
      tb(description, [attr('Margin', '0,0,0,6')]),
      tb(`${t('about.updatedAt')}: {time}  ·  PCL {pcl_version}  ·  ${homepageUrl}`, [
        attr('FontSize', 11),
        attr('Foreground', '#666666'),
        attr('HorizontalAlignment', 'Center'),
        attr('Margin', '0,10,0,0'),
      ]),
    ],
    { isSwapped: true },
  );
}

export function buildPcl2HomepageXml(data: Pcl2HomepageData, mapTitle: string): string {
  const t = createTranslator({ locale: data.locale, messages: data.messages });

  return renderXamlFragment([
    buildStatusCard(data, t),
    buildPlayerCard(data, t),
    buildAnnouncementCard(data, t),
    buildBanCard(data, t),
    buildBuildingCard(data, t),
    buildLinksCard(data.locale, data.siteOrigin, mapTitle, t),
    buildAboutCard(data.locale, data.siteOrigin, data.timeZone, data.description, t),
  ]);
}
