import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import type { PlayerOnlinePayload } from '@/modules/player/model/player-types';
import type { AppLocale } from '@/shared/i18n/routing';
import { absoluteUrl } from '@/shared/url/request-url';
import { getPcl2HomepagePath, SITE_NAME } from '@/site/config/site-config';
import type { XamlAttributeList, XamlNode } from './xaml-builder';
import { attr, renderXamlFragment, xaml } from './xaml-builder';

const MAX_PCL2_PLAYERS = 12;
const MAX_PCL2_ANNOUNCEMENTS = 5;

interface Pcl2HomepageData {
  announcements: AnnouncementItem[];
  buildingCount: number | null;
  locale: AppLocale;
  onlinePlayers: PlayerOnlinePayload;
  siteOrigin: string;
  serverAddress: string;
}

interface StatItem {
  label: string;
  value: string;
}

const PCL2_COPY = {
  'zh-CN': {
    about: {
      body: `${SITE_NAME} 是高版本 Minecraft Java 版公益创造休闲服务器。`,
      title: '关于',
      updatedAt: '更新时间',
    },
    announcements: {
      empty: '暂无公告',
      title: '公告',
    },
    description: 'Mik Casual 是高版本 Minecraft Java 版公益创造休闲服务器',
    hint: '点击下方按钮即可一键启动游戏并加入服务器。',
    links: {
      buildingsInfo: '查看所有建筑作品详情',
      buildingsTitle: '建筑展示',
      officialInfo: '打开 Mik Casual 官网',
      officialTitle: '官网',
      title: '网页入口',
      wikiInfo: '服务器帮助文档',
      wikiTitle: 'Wiki',
      intro: '以下入口将在浏览器中打开对应页面。',
    },
    players: {
      empty: '暂无玩家在线',
      joinedAt: '上线于',
      noDetails: '已获取在线人数，但暂无详细玩家列表',
      title: '在线玩家',
    },
    server: {
      addressCopiedButton: '复制 IP',
      joinButton: '启动游戏并加入服务器',
      joinTooltip: (serverAddress: string) =>
        `使用当前选中的 Minecraft 版本启动，并自动进入 ${serverAddress}`,
      refreshButton: '刷新',
      statusTitle: `${SITE_NAME} 服务器状态`,
    },
    stats: {
      averageOnline: '平均在线',
      buildings: '建筑作品',
      empty: '暂无法获取统计数据',
      peakOnline: '历史峰值',
      playersUnit: '人',
      title: '服务器数据',
      totalPlayers: '独立玩家',
    },
    status: {
      empty: '无人在线',
      offline: '服务器离线',
      online: (count: number) => `${count} 人在线`,
    },
  },
  en: {
    about: {
      body: `${SITE_NAME} is a modern Minecraft Java creative casual server.`,
      title: 'About',
      updatedAt: 'Updated',
    },
    announcements: {
      empty: 'No announcements yet',
      title: 'Announcements',
    },
    description: 'Mik Casual is a modern Minecraft Java creative casual server',
    hint: 'Use the button below to launch the game and join the server.',
    links: {
      buildingsInfo: 'View all building showcases',
      buildingsTitle: 'Buildings',
      officialInfo: 'Open the Mik Casual website',
      officialTitle: 'Website',
      title: 'Web links',
      wikiInfo: 'Server help and documentation',
      wikiTitle: 'Wiki',
      intro: 'These links will open in your browser.',
    },
    players: {
      empty: 'No players online',
      joinedAt: 'Joined at',
      noDetails: 'Online count is available, but the player list is empty',
      title: 'Online players',
    },
    server: {
      addressCopiedButton: 'Copy IP',
      joinButton: 'Launch and join server',
      joinTooltip: (serverAddress: string) =>
        `Launch the currently selected Minecraft version and join ${serverAddress}`,
      refreshButton: 'Refresh',
      statusTitle: `${SITE_NAME} server status`,
    },
    stats: {
      averageOnline: 'Average online',
      buildings: 'Buildings',
      empty: 'Server stats are unavailable',
      peakOnline: 'Peak online',
      playersUnit: 'players',
      title: 'Server stats',
      totalPlayers: 'Unique players',
    },
    status: {
      empty: 'No players online',
      offline: 'Server offline',
      online: (count: number) => `${count} online`,
    },
  },
} satisfies Record<AppLocale, Record<string, unknown>>;

function formatPclTime(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return '?';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function hasAttribute(attributes: XamlAttributeList, name: string): boolean {
  return attributes.some(([attributeName]) => attributeName === name);
}

function withDefaultAttribute(
  attributes: XamlAttributeList,
  name: string,
  value: string,
): XamlAttributeList {
  if (hasAttribute(attributes, name)) {
    return attributes;
  }

  return [attr(name, value), ...attributes];
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

function listItem(title: string, info: string, url: string): XamlNode {
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
  options: { isSwapped?: boolean } = {},
): XamlNode {
  return xaml(
    'local:MyCard',
    [
      attr('CanSwap', true),
      attr('IsSwapped', options.isSwapped),
      attr('Margin', '0,0,0,15'),
      attr('Title', title),
    ],
    [stackPanel([attr('Margin', '25,40,23,15')], children)],
  );
}

function separatedRow(
  children: XamlNode[],
  isLast: boolean,
  paddingBottom: number,
  marginBottom: number,
): XamlNode {
  return xaml(
    'Border',
    [
      attr('BorderBrush', '#18FFFFFF'),
      attr('BorderThickness', `0,0,0,${isLast ? 0 : 1}`),
      attr('Margin', `0,0,0,${isLast ? 0 : marginBottom}`),
      attr('Padding', `0,0,0,${isLast ? 0 : paddingBottom}`),
    ],
    [stackPanel([], children)],
  );
}

function buildStatsGrid(items: StatItem[]): XamlNode {
  const rowCount = Math.ceil(items.length / 2);

  return xaml(
    'Grid',
    [],
    [
      xaml(
        'Grid.ColumnDefinitions',
        [],
        [
          xaml('ColumnDefinition', [attr('Width', '*')]),
          xaml('ColumnDefinition', [attr('Width', '*')]),
        ],
      ),
      xaml(
        'Grid.RowDefinitions',
        [],
        Array.from({ length: rowCount }, () => xaml('RowDefinition', [attr('Height', 'Auto')])),
      ),
      ...items.map((item, index) => {
        const row = Math.floor(index / 2);
        const column = index % 2;
        const leftMargin = column === 1 ? 6 : 0;
        const rightMargin = column === 0 ? 6 : 0;
        const bottomMargin = row < rowCount - 1 ? 10 : 0;

        return xaml(
          'Border',
          [
            attr('Background', '#0DFFFFFF'),
            attr('CornerRadius', 4),
            attr('Grid.Column', column),
            attr('Grid.Row', row),
            attr('Margin', `${leftMargin},0,${rightMargin},${bottomMargin}`),
            attr('Padding', '12,8,12,10'),
          ],
          [
            stackPanel(
              [],
              [
                textBlock(item.label, [
                  attr('FontSize', 11),
                  attr('Foreground', '#888888'),
                  attr('Margin', '0,0,0,3'),
                  attr('TextWrapping', null),
                ]),
                textBlock(item.value, [
                  attr('FontSize', 18),
                  attr('FontWeight', 'Bold'),
                  attr('TextWrapping', null),
                ]),
              ],
            ),
          ],
        );
      }),
    ],
  );
}

function getServerStatus(data: Pcl2HomepageData) {
  const onlineCount = data.onlinePlayers.online ?? -1;
  const copy = PCL2_COPY[data.locale].status;

  if (onlineCount < 0) {
    return { color: '#E05555', text: copy.offline };
  }

  if (onlineCount === 0) {
    return { color: '#D4941E', text: copy.empty };
  }

  return { color: '#2ECC40', text: copy.online(onlineCount) };
}

function buildStatusCard(data: Pcl2HomepageData): XamlNode {
  const copy = PCL2_COPY[data.locale];
  const status = getServerStatus(data);

  return card(
    copy.server.statusTitle,
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
          textBlock(data.serverAddress, [
            attr('FontSize', 13),
            attr('Foreground', '#888888'),
            attr('Margin', '12,0,0,0'),
            attr('TextWrapping', null),
            attr('VerticalAlignment', 'Center'),
          ]),
        ],
      ),
      xaml('local:MyHint', [
        attr('Margin', '0,0,0,12'),
        attr('Text', copy.hint),
        attr('Theme', 'Blue'),
      ]),
      stackPanel(
        [attr('HorizontalAlignment', 'Center')],
        [
          button(copy.server.joinButton, [
            attr('ColorType', 'Highlight'),
            attr('EventData', `\\current|${data.serverAddress}`),
            attr('EventType', '启动游戏'),
            attr('Height', 42),
            attr('Margin', '0,0,0,0'),
            attr('Padding', '20,0,20,0'),
            attr('ToolTip', copy.server.joinTooltip(data.serverAddress)),
            attr('Width', 260),
          ]),
        ],
      ),
      stackPanel(
        [
          attr('HorizontalAlignment', 'Center'),
          attr('Margin', '0,12,0,0'),
          attr('Orientation', 'Horizontal'),
        ],
        [
          button(copy.server.refreshButton, [
            attr('EventType', '刷新主页'),
            attr('Height', 42),
            attr('Margin', '0,0,10,0'),
            attr('Padding', '13,0,13,0'),
            attr('Width', 125),
          ]),
          button(copy.server.addressCopiedButton, [
            attr('EventData', data.serverAddress),
            attr('EventType', '复制文本'),
            attr('Height', 42),
            attr('Margin', '0,0,0,0'),
            attr('Padding', '13,0,13,0'),
            attr('Width', 125),
          ]),
        ],
      ),
      textBlock(copy.description, [
        attr('FontSize', 12),
        attr('Foreground', '#888888'),
        attr('Margin', '0,14,0,0'),
        attr('TextAlignment', 'Center'),
      ]),
    ],
    { isSwapped: false },
  );
}

function buildPlayerCard(data: Pcl2HomepageData): XamlNode {
  const copy = PCL2_COPY[data.locale].players;
  const players = data.onlinePlayers.players ?? [];

  if (players.length === 0) {
    const text = data.onlinePlayers.online > 0 ? copy.noDetails : copy.empty;
    return card(copy.title, [textBlock(text)], { isSwapped: false });
  }

  const visiblePlayers = players.slice(0, MAX_PCL2_PLAYERS);

  return card(
    `${copy.title} (${players.length})`,
    visiblePlayers.map((player, index) =>
      separatedRow(
        [
          textBlock(player.name, [attr('FontWeight', 'Bold'), attr('TextWrapping', null)]),
          textBlock(`${copy.joinedAt} ${formatPclTime(player.joined_at)}`, [
            attr('FontSize', 11),
            attr('Foreground', '#888888'),
            attr('Margin', '0,2,0,0'),
            attr('TextWrapping', null),
          ]),
        ],
        index === visiblePlayers.length - 1,
        8,
        8,
      ),
    ),
    { isSwapped: false },
  );
}

function buildAnnouncementCard(data: Pcl2HomepageData): XamlNode {
  const copy = PCL2_COPY[data.locale].announcements;
  const { announcements } = data;

  if (announcements.length === 0) {
    return card(copy.title, [textBlock(copy.empty)]);
  }

  const visibleAnnouncements = announcements.slice(0, MAX_PCL2_ANNOUNCEMENTS);

  return card(
    `${copy.title} (${visibleAnnouncements.length})`,
    visibleAnnouncements.map((announcement, index) =>
      separatedRow(
        [
          textBlock(announcement.content),
          textBlock(formatPclTime(announcement.timestamp), [
            attr('FontSize', 11),
            attr('Foreground', '#888888'),
            attr('Margin', '0,3,0,0'),
          ]),
        ],
        index === visibleAnnouncements.length - 1,
        10,
        10,
      ),
    ),
    { isSwapped: false },
  );
}

function buildSummaryCard(data: Pcl2HomepageData): XamlNode {
  const copy = PCL2_COPY[data.locale].stats;
  const stats: StatItem[] = [];

  if (data.buildingCount !== null) {
    stats.push({
      label: copy.buildings,
      value: data.locale === 'zh-CN' ? `${data.buildingCount} 个` : String(data.buildingCount),
    });
  }

  if (stats.length === 0) {
    return card(copy.title, [textBlock(copy.empty)]);
  }

  return card(copy.title, [buildStatsGrid(stats)], { isSwapped: false });
}

function buildLinksCard(locale: AppLocale, siteOrigin: string): XamlNode {
  const copy = PCL2_COPY[locale].links;

  return card(
    copy.title,
    [
      textBlock(copy.intro, [attr('Margin', '0,0,0,8')]),
      listItem(copy.officialTitle, copy.officialInfo, absoluteUrl(`/${locale}`, siteOrigin)),
      listItem(
        copy.buildingsTitle,
        copy.buildingsInfo,
        absoluteUrl(`/${locale}/buildings`, siteOrigin),
      ),
      listItem(copy.wikiTitle, copy.wikiInfo, absoluteUrl(`/${locale}/wiki`, siteOrigin)),
    ],
    { isSwapped: true },
  );
}

function buildAboutCard(locale: AppLocale, siteOrigin: string): XamlNode {
  const copy = PCL2_COPY[locale].about;

  return card(
    copy.title,
    [
      textBlock(copy.body, [attr('Margin', '0,0,0,6')]),
      textBlock(
        `${copy.updatedAt}: {time}  ·  PCL {pcl_version}  ·  ${absoluteUrl(getPcl2HomepagePath(locale), siteOrigin)}`,
        [
          attr('FontSize', 11),
          attr('Foreground', '#666666'),
          attr('HorizontalAlignment', 'Center'),
          attr('Margin', '0,10,0,0'),
        ],
      ),
    ],
    { isSwapped: true },
  );
}

export function buildPcl2HomepageXml(data: Pcl2HomepageData): string {
  return renderXamlFragment([
    buildStatusCard(data),
    buildPlayerCard(data),
    buildAnnouncementCard(data),
    buildSummaryCard(data),
    buildLinksCard(data.locale, data.siteOrigin),
    buildAboutCard(data.locale, data.siteOrigin),
  ]);
}
