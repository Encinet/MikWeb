import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import type { BanItem } from '@/modules/ban/model/ban-types';
import type { Building } from '@/modules/building/model/building-types';
import type { EchoQuote } from '@/modules/pcl2/lib/echo-quote-types';
import { getEchoText } from '@/modules/pcl2/lib/echo-quote-types';
import type { PlayerOnlinePayload } from '@/modules/player/model/player-types';
import type { AppLocale } from '@/shared/i18n/routing';
import { absoluteUrl } from '@/shared/url/request-url';
import { getPcl2HomepagePath, SITE_NAME } from '@/site/config/site-config';
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
  echoQuotes: EchoQuote[];
  locale: AppLocale;
  onlinePlayers: PlayerOnlinePayload;
  siteOrigin: string;
  serverAddress: string;
  displayAddress: string;
}

const PCL2_COPY = {
  'zh-CN': {
    about: {
      body: `${SITE_NAME} 是高版本 Minecraft Java 版公益创造休闲服务器。`,
      title: '关于',
      updatedAt: '更新时间',
    },
    announcements: { empty: '暂无公告', title: '公告' },
    bans: {
      bannedAt: '执行者',
      empty: '暂无封禁记录',
      expired: '过期时间',
      permanent: '永久封禁',
      reason: '原因',
      title: '封禁列表',
    },
    buildings: {
      builders: '建设者',
      coordinates: '坐标',
      empty: '暂无建筑',
      original: '原创',
      replica: '复刻',
      title: '建筑收录',
    },
    description: `${SITE_NAME} 是高版本 Minecraft Java 版公益创造休闲服务器`,
    echo: { button: '回声洞', title: '回声洞', tooltip: '点击弹出随机语录' },
    hint: '点击下方按钮即可一键启动游戏并加入服务器。',
    anniversary: '🎉 Mik 五周年庆典 7.18 - 7.25  ·  定制钥匙扣/小挂件等 Mik Logo 周边等你拿！',
    links: {
      buildingsInfo: '查看所有建筑作品详情',
      buildingsTitle: '建筑展示',
      intro: '以下入口将在浏览器中打开对应页面。',
      mapInfo: '在线地图',
      mapTitle: '服务器地图',
      title: '网页入口',
      wikiInfo: '服务器帮助文档',
      wikiTitle: 'Wiki',
    },
    players: {
      empty: '暂无玩家在线',
      joinedAt: '上线于',
      noDetails: '已获取在线人数，但暂无详细玩家列表',
      title: '在线玩家',
    },
    server: {
      joinButton: '🚀 启动游戏并加入服务器',
      joinTooltip: (addr: string) => `使用当前选中的 Minecraft 版本启动，并自动进入 ${addr}`,
      refreshButton: '刷新',
      statusTitle: `${SITE_NAME} 服务器状态`,
    },
    status: {
      empty: '无人在线',
      offline: '服务器离线',
      online: (count: number) => `${count} 人在线`,
    },
  },
  'zh-TW': {
    about: {
      body: `${SITE_NAME} 是高版本 Minecraft Java 版公益創造休閒伺服器。`,
      title: '關於',
      updatedAt: '更新時間',
    },
    announcements: { empty: '暫無公告', title: '公告' },
    bans: {
      bannedAt: '執行者',
      empty: '暫無封禁記錄',
      expired: '過期時間',
      permanent: '永久封禁',
      reason: '原因',
      title: '封禁列表',
    },
    buildings: {
      builders: '建設者',
      coordinates: '座標',
      empty: '暫無建築',
      original: '原創',
      replica: '復刻',
      title: '建築收錄',
    },
    description: `${SITE_NAME} 是高版本 Minecraft Java 版公益創造休閒伺服器`,
    echo: { button: '回聲洞', title: '回聲洞', tooltip: '點選彈出隨機語錄' },
    hint: '點選下方按鈕即可一鍵啟動遊戲並加入伺服器。',
    anniversary: '🎉 Mik 五週年慶典 7.18 - 7.25  ·  定製鑰匙扣/小掛件等 Mik Logo 周邊等你拿！',
    links: {
      buildingsInfo: '檢視所有建築作品詳情',
      buildingsTitle: '建築展示',
      intro: '以下入口將在瀏覽器中開啟對應頁面。',
      mapInfo: '線上地圖',
      mapTitle: '伺服器地圖',
      title: '網頁入口',
      wikiInfo: '伺服器幫助文件',
      wikiTitle: 'Wiki',
    },
    players: {
      empty: '暫無玩家線上',
      joinedAt: '上線於',
      noDetails: '已獲取線上人數，但暫無詳細玩家列表',
      title: '線上玩家',
    },
    server: {
      joinButton: '🚀 啟動遊戲並加入伺服器',
      joinTooltip: (addr: string) => `使用目前選中的 Minecraft 版本啟動，並自動進入 ${addr}`,
      refreshButton: '重新整理',
      statusTitle: `${SITE_NAME} 伺服器狀態`,
    },
    status: {
      empty: '無人在線',
      offline: '伺服器離線',
      online: (count: number) => `${count} 人在線`,
    },
  },
  'zh-HK': {
    about: {
      body: `${SITE_NAME} 是高版本 Minecraft Java 版公益創造休閒伺服器。`,
      title: '關於',
      updatedAt: '更新時間',
    },
    announcements: { empty: '暫無公告', title: '公告' },
    bans: {
      bannedAt: '執行者',
      empty: '暫無封禁記錄',
      expired: '過期時間',
      permanent: '永久封禁',
      reason: '原因',
      title: '封禁列表',
    },
    buildings: {
      builders: '建設者',
      coordinates: '座標',
      empty: '暫無建築',
      original: '原創',
      replica: '復刻',
      title: '建築收錄',
    },
    description: `${SITE_NAME} 是高版本 Minecraft Java 版公益創造休閒伺服器`,
    echo: { button: '回聲洞', title: '回聲洞', tooltip: '點擊彈出隨機語錄' },
    hint: '點擊下方按鈕即可一鍵啟動遊戲並加入伺服器。',
    anniversary: '🎉 Mik 五週年慶典 7.18 - 7.25  ·  定製鎖匙扣/小掛件等 Mik Logo 周邊等你攞！',
    links: {
      buildingsInfo: '檢視所有建築作品詳情',
      buildingsTitle: '建築展示',
      intro: '以下入口將喺瀏覽器打開對應頁面。',
      mapInfo: '線上地圖',
      mapTitle: '伺服器地圖',
      title: '網頁入口',
      wikiInfo: '伺服器幫助文件',
      wikiTitle: 'Wiki',
    },
    players: {
      empty: '暫無玩家線上',
      joinedAt: '上線於',
      noDetails: '已獲取線上人數，但暫無詳細玩家列表',
      title: '線上玩家',
    },
    server: {
      joinButton: '🚀 啟動遊戲並加入伺服器',
      joinTooltip: (addr: string) => `使用目前選中嘅 Minecraft 版本啟動，並自動進入 ${addr}`,
      refreshButton: '重新整理',
      statusTitle: `${SITE_NAME} 伺服器狀態`,
    },
    status: {
      empty: '無人在線',
      offline: '伺服器離線',
      online: (count: number) => `${count} 人在線`,
    },
  },
  lzh: {
    about: {
      body: `${SITE_NAME} 者，高版 Minecraft Java 公益創造休閒之伺服也。`,
      title: '關於',
      updatedAt: '更新之時',
    },
    announcements: { empty: '尚無佈告', title: '佈告' },
    bans: {
      bannedAt: '行者',
      empty: '尚無禁錮之錄',
      expired: '逾期',
      permanent: '永錮',
      reason: '故',
      title: '禁錮之冊',
    },
    buildings: {
      builders: '造者',
      coordinates: '座標',
      empty: '尚無營造',
      original: '原創',
      replica: '摹刻',
      title: '營造之錄',
    },
    description: `${SITE_NAME} 者，高版 Minecraft Java 公益創造休閒之伺服也`,
    echo: { button: '回聲洞', title: '回聲洞', tooltip: '點之則彈出隨機語錄' },
    hint: '點下方之鈕，則一鍵啟戲而入伺服。',
    anniversary: '🎉 Mik 五載之慶 7.18 - 7.25  ·  定製鑰匙扣、小掛件諸 Mik Logo 之周邊待汝！',
    links: {
      buildingsInfo: '觀全數營造之詳',
      buildingsTitle: '營造之展',
      intro: '以下入口將於瀏覽器中啟對應之頁。',
      mapInfo: '線上輿圖',
      mapTitle: '伺服輿圖',
      title: '網頁入口',
      wikiInfo: '伺服說明之檔',
      wikiTitle: 'Wiki',
    },
    players: {
      empty: '尚無玩家在線',
      joinedAt: '上線於',
      noDetails: '已取在線之數，然尚無詳列',
      title: '在線玩家',
    },
    server: {
      joinButton: '🚀 啟戲而入伺服',
      joinTooltip: (addr: string) => `以今之所選 Minecraft 版啟之，自入 ${addr}`,
      refreshButton: '復新',
      statusTitle: `${SITE_NAME} 伺服之態`,
    },
    status: {
      empty: '無人於線',
      offline: '伺服離線',
      online: (count: number) => `${count} 人在線`,
    },
  },
  en: {
    about: {
      body: `${SITE_NAME} is a modern Minecraft Java creative casual server.`,
      title: 'About',
      updatedAt: 'Updated',
    },
    announcements: { empty: 'No announcements yet', title: 'Announcements' },
    bans: {
      bannedAt: 'Banned by',
      empty: 'No bans',
      expired: 'Expires',
      permanent: 'Permanent',
      reason: 'Reason',
      title: 'Ban list',
    },
    buildings: {
      builders: 'Builders',
      coordinates: 'Coords',
      empty: 'No buildings yet',
      original: 'Original',
      replica: 'Replica',
      title: 'Buildings',
    },
    description: `${SITE_NAME} is a modern Minecraft Java creative casual server`,
    echo: { button: 'Echo Cave', title: 'Echo Cave', tooltip: 'Click for a random quote' },
    hint: 'Use the button below to launch the game and join the server.',
    anniversary:
      '🎉 Mik 5th Anniversary 7.18 - 7.25  ·  Custom keychains, charms & Mik Logo merch!',
    links: {
      buildingsInfo: 'View all building showcases',
      buildingsTitle: 'Buildings',
      intro: 'These links will open in your browser.',
      mapInfo: 'Server map',
      mapTitle: 'Map',
      title: 'Web links',
      wikiInfo: 'Server help and documentation',
      wikiTitle: 'Wiki',
    },
    players: {
      empty: 'No players online',
      joinedAt: 'Joined at',
      noDetails: 'Online count is available, but the player list is empty',
      title: 'Online players',
    },
    server: {
      joinButton: '🚀 Launch and join server',
      joinTooltip: (addr: string) =>
        `Launch the currently selected Minecraft version and join ${addr}`,
      refreshButton: 'Refresh',
      statusTitle: `${SITE_NAME} server status`,
    },
    status: {
      empty: 'No players online',
      offline: 'Server offline',
      online: (count: number) => `${count} online`,
    },
  },
} satisfies Record<AppLocale, Record<string, unknown>>;

function fmtTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '?';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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

function getStatus(data: Pcl2HomepageData) {
  const online = data.onlinePlayers.online ?? -1;
  const copy = PCL2_COPY[data.locale].status;
  if (online < 0) return { color: '#E05555', text: copy.offline };
  if (online === 0) return { color: '#D4941E', text: copy.empty };
  return { color: '#2ECC40', text: copy.online(online) };
}

// Card builders

function buildStatusCard(data: Pcl2HomepageData): XamlNode {
  const copy = PCL2_COPY[data.locale];
  const status = getStatus(data);
  const quote = getEchoText(
    data.echoQuotes[Math.floor(Math.random() * data.echoQuotes.length)],
    data.locale,
  );

  return card(
    copy.server.statusTitle,
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
                tb(`  ·  历史峰值 ${data.onlinePlayers.peak_online} 人`, [
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
        attr('Text', copy.hint),
        attr('Theme', 'Blue'),
      ]),
      xaml('local:MyHint', [
        attr('Margin', '0,0,0,8'),
        attr('Text', copy.anniversary),
        attr('Theme', 'Yellow'),
      ]),
      sp(
        [attr('HorizontalAlignment', 'Center'), attr('Orientation', 'Horizontal')],
        [
          btn(copy.server.refreshButton, [
            attr('ColorType', 'Highlight'),
            attr('EventType', '刷新主页'),
            attr('Height', 36),
            attr('Margin', '0,0,10,0'),
            attr('Padding', '13,0,13,0'),
            attr('Width', 80),
          ]),
          btn(copy.server.joinButton, [
            attr('ColorType', 'Highlight'),
            attr('EventData', `\\current|${data.serverAddress}`),
            attr('EventType', '启动游戏'),
            attr('Height', 36),
            attr('Margin', '0,0,0,0'),
            attr('Padding', '20,0,20,0'),
            attr('ToolTip', copy.server.joinTooltip(data.serverAddress)),
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
              attr('Text', copy.echo.button),
              attr('ToolTip', copy.echo.tooltip),
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
                        attr('Data', `${copy.echo.title}|${quote}`),
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
      tb(copy.description, [
        attr('FontSize', 12),
        attr('Foreground', '#CCAA55'),
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
    return card(copy.title, [tb(text)], { isSwapped: false });
  }
  const visible = players.slice(0, MAX_PCL2_PLAYERS);
  return card(
    `${copy.title} (${players.length})`,
    visible.map((p) =>
      sp(
        [attr('Margin', '0,0,0,4')],
        [
          tb(p.name, [attr('FontWeight', 'Bold'), attr('TextWrapping', null)]),
          tb(`${copy.joinedAt} ${fmtTime(p.joined_at)}`, [
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

function buildAnnouncementCard(data: Pcl2HomepageData): XamlNode {
  const copy = PCL2_COPY[data.locale].announcements;
  const items = data.announcements.slice(0, MAX_PCL2_ANNOUNCEMENTS);
  if (items.length === 0) return card(copy.title, [tb(copy.empty)]);
  return card(
    `${copy.title} (${items.length})`,
    items.map((a, i) =>
      sp(
        [attr('Margin', `0,${i > 0 ? '14' : '0'},0,0`)],
        [
          tb(a.content),
          tb(fmtTime(a.timestamp), [
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

function buildBanCard(data: Pcl2HomepageData): XamlNode {
  const copy = PCL2_COPY[data.locale].bans;
  if (!data.bans || data.bans.length === 0) return card(copy.title, [tb(copy.empty)]);
  return card(
    `${copy.title} (${data.bans.length})`,
    data.bans.map((b, i) =>
      sp(
        [attr('Margin', `0,${i > 0 ? '14' : '0'},0,0`)],
        [
          tb(b.playerName ?? '?', [attr('FontWeight', 'Bold')]),
          tb(`${copy.reason}：${b.reason || '?'}`, [attr('Margin', '0,2,0,0')]),
          tb(`${copy.bannedAt}：${b.bannedBy ?? '?'}  ·  ${fmtTime(b.bannedAt)}`, [
            attr('FontSize', 11),
            attr('Foreground', '#888888'),
            attr('Margin', '0,2,0,0'),
          ]),
          tb(b.isPermanent ? copy.permanent : `${copy.expired}：${fmtTime(b.expiresAt)}`, [
            attr('FontSize', 11),
            attr('Foreground', b.isPermanent ? '#E05555' : '#D4941E'),
          ]),
        ],
      ),
    ),
    { isSwapped: true },
  );
}

function buildBuildingCard(data: Pcl2HomepageData): XamlNode {
  const copy = PCL2_COPY[data.locale].buildings;
  if (!data.buildings || data.buildings.length === 0) return card(copy.title, [tb(copy.empty)]);
  const visible = data.buildings.slice(0, MAX_PCL2_BUILDINGS);
  const innerCards = visible.map((b) => {
    const name = b.name?.[data.locale] || b.name?.['zh-CN'] || b.name?.en || '?';
    const description =
      b.description?.[data.locale] || b.description?.['zh-CN'] || b.description?.en || '';
    const builders = (b.builders ?? []).map((bd) => bd.name).join(', ');
    const isReplica = b.buildType === 'replica';
    const coordText = `${copy.coordinates}: [${b.coordinates?.x ?? '?'}, ${b.coordinates?.y ?? '?'}, ${b.coordinates?.z ?? '?'}]  ·  ${isReplica ? copy.replica : copy.original}`;

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
          tb(`${copy.builders}: ${builders}`, [
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
      attr('Title', `${copy.title} (${data.buildings.length})`),
    ],
    [sp([attr('Margin', '25,40,23,15')], innerCards)],
  );
}

function buildLinksCard(locale: AppLocale, siteOrigin: string): XamlNode {
  const copy = PCL2_COPY[locale].links;
  return card(
    copy.title,
    [
      tb(copy.intro, [attr('Margin', '0,0,0,8')]),
      li(copy.buildingsTitle, copy.buildingsInfo, absoluteUrl(`/${locale}/buildings`, siteOrigin)),
      li(copy.wikiTitle, copy.wikiInfo, absoluteUrl(`/${locale}/wiki`, siteOrigin)),
      li(copy.mapTitle, copy.mapInfo, absoluteUrl(`/${locale}/map`, siteOrigin)),
    ],
    { isSwapped: true },
  );
}

function buildAboutCard(locale: AppLocale, siteOrigin: string): XamlNode {
  const copy = PCL2_COPY[locale].about;
  return card(
    copy.title,
    [
      tb(copy.body, [attr('Margin', '0,0,0,6')]),
      tb(
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
    buildBanCard(data),
    buildBuildingCard(data),
    buildLinksCard(data.locale, data.siteOrigin),
    buildAboutCard(data.locale, data.siteOrigin),
  ]);
}
