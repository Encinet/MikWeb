import type { Messages } from 'next-intl';
import { createTranslator } from 'next-intl';
import { sortBuildersByWeight } from '@/modules/building/lib/building-builders';
import { getPcl2HomepagePath } from '@/modules/pcl2/lib/pcl2-homepage-path';
import { formatPcl2Time, withPcl2TimeZone } from '@/modules/pcl2/lib/pcl2-time-zone';
import { getEchoText } from '@/modules/pcl2/model/echo-quote';
import type { Pcl2HomepageData } from '@/modules/pcl2/model/pcl2-homepage';
import { SITE_TRANSLATION_VALUES } from '@/shared/config/site-config';
import { getLocalizedText } from '@/shared/i18n/localized-text';
import type { AppLocale } from '@/shared/i18n/routing';
import { absoluteUrl } from '@/shared/url/request-url';
import type { XamlAttributeList, XamlNode } from './xaml-builder';
import { attr, renderXamlFragment, xaml } from './xaml-builder';

const MAX_PCL2_PLAYERS = 12;
const MAX_PCL2_ANNOUNCEMENTS = 5;
const MAX_PCL2_BUILDINGS = 6;
const MAX_BUILDING_IMAGES = 3;

type HomepageTranslator = ReturnType<typeof createTranslator<Messages['pcl2']['homepage']>>;

function hasAttribute(attributes: XamlAttributeList, name: string): boolean {
  return attributes.some(([attributeName]) => attributeName === name);
}

function withDefaultAttribute(
  attributes: XamlAttributeList,
  name: string,
  value: string,
): XamlAttributeList {
  return hasAttribute(attributes, name) ? attributes : [attr(name, value), ...attributes];
}

function stackPanel(attributes: XamlAttributeList = [], children: XamlNode[] = []): XamlNode {
  return xaml('StackPanel', attributes, children);
}

function textBlock(text: string, attributes: XamlAttributeList = []): XamlNode {
  return xaml('TextBlock', [
    attr('Text', text),
    ...withDefaultAttribute(attributes, 'TextWrapping', 'Wrap'),
  ]);
}

function button(text: string, attributes: XamlAttributeList = []): XamlNode {
  return xaml('local:MyButton', [attr('Text', text), ...attributes]);
}

function linkItem(title: string, info: string, url: string): XamlNode {
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
  options: { isSwapped?: boolean; margin?: string } = {},
): XamlNode {
  return xaml(
    'local:MyCard',
    [
      attr('CanSwap', true),
      attr('IsSwapped', options.isSwapped),
      attr('Margin', options.margin ?? '0,0,0,15'),
      attr('Title', title),
    ],
    [stackPanel([attr('Margin', '25,40,23,15')], children)],
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
    [stackPanel([attr('Margin', '25,40,23,15')], children)],
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
      stackPanel(
        [attr('Margin', '0,0,0,8'), attr('Orientation', 'Horizontal')],
        [
          textBlock('●', [
            attr('FontSize', 14),
            attr('Foreground', status.color),
            attr('Margin', '0,0,6,0'),
            attr('TextWrapping', null),
            attr('VerticalAlignment', 'Center'),
          ]),
          textBlock(status.text, [
            attr('FontSize', 16),
            attr('Foreground', status.color),
            attr('TextWrapping', null),
            attr('VerticalAlignment', 'Center'),
          ]),
          textBlock(`   ${data.displayAddress}`, [
            attr('FontSize', 13),
            attr('Foreground', '#888888'),
            attr('Margin', '8,0,0,0'),
            attr('TextWrapping', null),
            attr('VerticalAlignment', 'Center'),
          ]),
          ...(data.onlinePlayers.peakOnline != null
            ? [
                textBlock(`  ·  ${t('players.peak', { count: data.onlinePlayers.peakOnline })}`, [
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
      stackPanel(
        [attr('HorizontalAlignment', 'Center'), attr('Orientation', 'Horizontal')],
        [
          button(t('server.refreshButton'), [
            attr('ColorType', 'Highlight'),
            attr('EventType', '刷新主页'),
            attr('Height', 36),
            attr('Margin', '0,0,10,0'),
            attr('Padding', '13,0,13,0'),
            attr('Width', 80),
          ]),
          button(t('server.joinButton'), [
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
      textBlock(data.description, [
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
    return card(t('players.title'), [textBlock(text)], { isSwapped: false });
  }
  const visible = players.slice(0, MAX_PCL2_PLAYERS);
  return card(
    `${t('players.title')} (${players.length})`,
    visible.map((player) =>
      stackPanel(
        [attr('Margin', '0,0,0,4')],
        [
          textBlock(player.name, [attr('FontWeight', 'Bold'), attr('TextWrapping', null)]),
          textBlock(`${t('players.joinedAt')} ${formatPcl2Time(player.joinedAt, data.timeZone)}`, [
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
  if (items.length === 0)
    return card(t('announcements.title'), [textBlock(t('announcements.empty'))]);
  return card(
    `${t('announcements.title')} (${items.length})`,
    items.map((announcement, index) =>
      stackPanel(
        [attr('Margin', `0,${index > 0 ? '14' : '0'},0,0`)],
        [
          textBlock(announcement.content),
          textBlock(formatPcl2Time(announcement.timestamp, data.timeZone), [
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
  if (!data.bans || data.bans.length === 0)
    return card(t('bans.title'), [textBlock(t('bans.empty'))]);
  return card(
    `${t('bans.title')} (${data.bans.length})`,
    data.bans.map((ban, index) =>
      stackPanel(
        [attr('Margin', `0,${index > 0 ? '14' : '0'},0,0`)],
        [
          textBlock(ban.playerName ?? '?', [attr('FontWeight', 'Bold')]),
          textBlock(t('bans.reason', { reason: ban.reason || '?' }), [attr('Margin', '0,2,0,0')]),
          textBlock(
            t('bans.bannedBy', {
              name: ban.bannedBy ?? '?',
              time: formatPcl2Time(ban.bannedAt, data.timeZone),
            }),
            [attr('FontSize', 11), attr('Foreground', '#888888'), attr('Margin', '0,2,0,0')],
          ),
          textBlock(
            ban.isPermanent
              ? t('bans.permanent')
              : t('bans.expiresAt', { time: formatPcl2Time(ban.expiresAt, data.timeZone) }),
            [attr('FontSize', 11), attr('Foreground', ban.isPermanent ? '#E05555' : '#D4941E')],
          ),
        ],
      ),
    ),
    { isSwapped: true },
  );
}

function buildBuildingCard(data: Pcl2HomepageData, t: HomepageTranslator): XamlNode {
  if (!data.buildings || data.buildings.length === 0)
    return card(t('buildings.title'), [textBlock(t('buildings.empty'))]);
  const visible = data.buildings.slice(0, MAX_PCL2_BUILDINGS);
  const innerCards = visible.map((building) => {
    const name = getLocalizedText(building.name, data.locale) || '?';
    const description = getLocalizedText(building.description, data.locale);
    const builders = sortBuildersByWeight(building.builders)
      .map((builder) => builder.name)
      .join(', ');
    const coordinateText = `${t('buildings.coordinates')}: ${building.coordinates.world} [${building.coordinates.x}, ${building.coordinates.y}, ${building.coordinates.z}]  ·  ${data.buildingTypes[building.buildType]}`;

    const imageNodes: XamlNode[] = [];
    const images = building.images ?? [];
    for (
      let imageIndex = 0;
      imageIndex < Math.min(images.length, MAX_BUILDING_IMAGES);
      imageIndex++
    ) {
      imageNodes.push(
        xaml('local:MyImage', [
          attr('Height', 150),
          attr('HorizontalAlignment', 'Center'),
          attr('Margin', imageIndex > 0 ? '0,6,0,0' : '0,0,0,0'),
          attr('Source', images[imageIndex]),
        ]),
      );
    }

    return innerCard(name, [
      ...imageNodes,
      stackPanel(
        [attr('Margin', '10,10,10,4')],
        [
          textBlock(description, [attr('FontSize', 12), attr('Foreground', '#BBBBBB')]),
          textBlock(coordinateText, [
            attr('FontSize', 11),
            attr('Foreground', '#888888'),
            attr('Margin', '0,6,0,0'),
          ]),
          textBlock(`${t('buildings.builders')}: ${builders}`, [
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
    [stackPanel([attr('Margin', '25,40,23,15')], innerCards)],
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
      textBlock(t('links.intro'), [attr('Margin', '0,0,0,8')]),
      linkItem(
        t('links.buildingsTitle'),
        t('links.buildingsInfo'),
        absoluteUrl(`/${locale}/buildings`, siteOrigin),
      ),
      linkItem(
        t('links.wikiTitle'),
        t('links.wikiInfo'),
        absoluteUrl(`/${locale}/wiki`, siteOrigin),
      ),
      linkItem(mapTitle, t('links.mapInfo'), absoluteUrl(`/${locale}/map`, siteOrigin)),
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
      textBlock(description, [attr('Margin', '0,0,0,6')]),
      textBlock(`${t('about.updatedAt')}: {time}  ·  PCL {pcl_version}  ·  ${homepageUrl}`, [
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
