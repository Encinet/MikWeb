import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import type {
  PlayerOnlinePayload,
  PlayersHistorySummary,
} from '@/modules/player/model/player-types';
import {
  PCL2_HOMEPAGE_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from '@/site/config/site-config';
import type { XamlAttributeList, XamlNode } from './xaml-builder';
import { attr, renderXamlFragment, xaml } from './xaml-builder';

const MAX_PCL2_PLAYERS = 12;
const MAX_PCL2_ANNOUNCEMENTS = 5;

interface Pcl2HomepageData {
  announcements: AnnouncementItem[];
  buildingCount: number | null;
  historySummary: PlayersHistorySummary | null;
  onlinePlayers: PlayerOnlinePayload;
  serverAddress: string;
}

interface StatItem {
  label: string;
  value: string;
}

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

  if (onlineCount < 0) {
    return { color: '#E05555', text: '服务器离线' };
  }

  if (onlineCount === 0) {
    return { color: '#D4941E', text: '无人在线' };
  }

  return { color: '#2ECC40', text: `${onlineCount} 人在线` };
}

function buildStatusCard(data: Pcl2HomepageData): XamlNode {
  const status = getServerStatus(data);

  return card(
    `${SITE_NAME} 服务器状态`,
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
        attr('Text', '点击下方按钮即可一键启动游戏并加入服务器。'),
        attr('Theme', 'Blue'),
      ]),
      stackPanel(
        [attr('HorizontalAlignment', 'Center')],
        [
          button('启动游戏并加入服务器', [
            attr('ColorType', 'Highlight'),
            attr('EventData', `\\current|${data.serverAddress}`),
            attr('EventType', '启动游戏'),
            attr('Height', 42),
            attr('Margin', '0,0,0,0'),
            attr('Padding', '20,0,20,0'),
            attr('ToolTip', `使用当前选中的 Minecraft 版本启动，并自动进入 ${data.serverAddress}`),
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
          button('刷新', [
            attr('EventType', '刷新主页'),
            attr('Height', 42),
            attr('Margin', '0,0,10,0'),
            attr('Padding', '13,0,13,0'),
            attr('Width', 125),
          ]),
          button('复制 IP', [
            attr('EventData', data.serverAddress),
            attr('EventType', '复制文本'),
            attr('Height', 42),
            attr('Margin', '0,0,0,0'),
            attr('Padding', '13,0,13,0'),
            attr('Width', 125),
          ]),
        ],
      ),
      textBlock(SITE_DESCRIPTION, [
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
  const players = data.onlinePlayers.players ?? [];

  if (players.length === 0) {
    const text =
      data.onlinePlayers.online > 0 ? '已获取在线人数，但暂无详细玩家列表' : '暂无玩家在线';
    return card('在线玩家', [textBlock(text)], { isSwapped: false });
  }

  const visiblePlayers = players.slice(0, MAX_PCL2_PLAYERS);

  return card(
    `在线玩家 (${players.length})`,
    visiblePlayers.map((player, index) =>
      separatedRow(
        [
          textBlock(player.name, [attr('FontWeight', 'Bold'), attr('TextWrapping', null)]),
          textBlock(`上线于 ${formatPclTime(player.joined_at)}`, [
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

function buildAnnouncementCard(announcements: AnnouncementItem[]): XamlNode {
  if (announcements.length === 0) {
    return card('公告', [textBlock('暂无公告')]);
  }

  const visibleAnnouncements = announcements.slice(0, MAX_PCL2_ANNOUNCEMENTS);

  return card(
    `公告 (${visibleAnnouncements.length})`,
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
  const stats: StatItem[] = [];

  if (data.historySummary) {
    stats.push({ label: '历史峰值', value: `${data.historySummary.peak_online} 人` });
    stats.push({ label: '平均在线', value: `${data.historySummary.avg_online.toFixed(1)} 人` });
    stats.push({ label: '独立玩家', value: `${data.historySummary.total_unique_players} 人` });
  }

  if (data.buildingCount !== null) {
    stats.push({ label: '建筑作品', value: `${data.buildingCount} 个` });
  }

  if (stats.length === 0) {
    return card('服务器数据', [textBlock('暂无法获取统计数据')]);
  }

  return card('服务器数据', [buildStatsGrid(stats)], { isSwapped: false });
}

function buildLinksCard(): XamlNode {
  return card(
    '网页入口',
    [
      textBlock('以下入口将在浏览器中打开对应页面。', [attr('Margin', '0,0,0,8')]),
      listItem('官网', '打开 Mik Casual 官网', SITE_URL),
      listItem('建筑展示', '查看所有建筑作品详情', `${SITE_URL}/zh-CN/buildings`),
      listItem('Wiki', '服务器帮助文档', `${SITE_URL}/zh-CN/wiki`),
    ],
    { isSwapped: true },
  );
}

function buildAboutCard(): XamlNode {
  return card(
    '关于',
    [
      textBlock(`${SITE_NAME} 是高版本 Minecraft Java 版公益创造休闲服务器。`, [
        attr('Margin', '0,0,0,6'),
      ]),
      textBlock(`更新时间: {time}  ·  PCL {pcl_version}  ·  ${PCL2_HOMEPAGE_URL}`, [
        attr('FontSize', 11),
        attr('Foreground', '#666666'),
        attr('HorizontalAlignment', 'Center'),
        attr('Margin', '0,10,0,0'),
      ]),
    ],
    { isSwapped: true },
  );
}

export function buildPcl2HomepageXml(data: Pcl2HomepageData): string {
  return renderXamlFragment([
    buildStatusCard(data),
    buildPlayerCard(data),
    buildAnnouncementCard(data.announcements),
    buildSummaryCard(data),
    buildLinksCard(),
    buildAboutCard(),
  ]);
}
