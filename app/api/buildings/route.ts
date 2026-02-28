import { NextResponse } from 'next/server';

const BUILDINGS_SERVER = process.env.BUILDINGS_SERVER_URL || process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080';
const API_KEY = process.env.BUILDINGS_API_KEY || process.env.MINECRAFT_API_KEY || '';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('X-API-Key');

    const response = await fetch(`${BUILDINGS_SERVER}/api/buildings`, {
      headers: {
        'X-API-Key': authHeader || API_KEY,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch buildings:', error);

    // 返回模拟数据
    return NextResponse.json(
      [
        // {
        //   name: {
        //     'zh-CN': '主城大教堂',
        //     'en': 'Main Cathedral'
        //   },
        //   description: {
        //     'zh-CN': '位于主城中心的宏伟建筑，采用哥特式风格，高达80格，内部装饰精美，是服务器的地标性建筑。',
        //     'en': 'A magnificent building in the center of the main city, featuring Gothic style, 80 blocks tall, beautifully decorated inside, and a landmark of the server.'
        //   },
        //   coordinates: { x: 100, y: 64, z: -200 },
        //   builders: [
        //     {
        //       name: 'Steve',
        //       uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5',
        //       weight: 100
        //     },
        //     {
        //       name: 'Alex',
        //       uuid: '8667ba71-b85a-4004-af54-457a9734eed7',
        //       weight: 50
        //     }
        //   ],
        //   buildType: 'original',
        //   imageUrl: '/buildings/cathedral.png',
        //   buildDate: '2024-01-15',
        //   tags: ['religious', 'large', 'landmark'],
        //   source: null
        // },
        // {
        //   name: {
        //     'zh-CN': '海滨别墅',
        //     'en': 'Coastal Villa'
        //   },
        //   description: {
        //     'zh-CN': '坐落在海边的现代风格别墅，拥有私人码头和无边泳池，视野开阔。',
        //     'en': 'A modern-style villa by the sea with a private dock and infinity pool, offering open views.'
        //   },
        //   coordinates: { x: -450, y: 70, z: 320 },
        //   builders: [
        //     {
        //       name: 'Alex',
        //       uuid: '8667ba71-b85a-4004-af54-457a9734eed7',
        //       weight: 100
        //     }
        //   ],
        //   buildType: 'original',
        //   imageUrl: '/buildings/villa.png',
        //   buildDate: '2024-02-03',
        //   tags: ['residential', 'modern', 'coastal'],
        //   source: null
        // },
        // {
        //   name: {
        //     'zh-CN': '艾菲尔铁塔复刻',
        //     'en': 'Eiffel Tower Replica'
        //   },
        //   description: {
        //     'zh-CN': '1:1还原的艾菲尔铁塔，高度324格，使用了大量铁栏杆和石英块。',
        //     'en': 'A 1:1 replica of the Eiffel Tower, 324 blocks tall, using numerous iron bars and quartz blocks.'
        //   },
        //   coordinates: { x: 800, y: 64, z: -600 },
        //   builders: [
        //     {
        //       name: 'Builder123',
        //       uuid: 'f84c6a79-0a4e-45e0-879b-cd49ebd4c4e2',
        //       weight: 80
        //     },
        //     {
        //       name: 'Helper456',
        //       uuid: 'b0c69a0b-4e9a-4726-a5be-fca90e38aaf5',
        //       weight: 80
        //     },
        //     {
        //       name: 'Assistant789',
        //       uuid: 'd1e79f4-44e9-4726-a5be-fca90e38aaf5',
        //       weight: 40
        //     }
        //   ],
        //   buildType: 'replica',
        //   imageUrl: '/buildings/eiffel.png',
        //   buildDate: '2024-01-28',
        //   tags: ['landmark', 'large', 'historical'],
        //   source: {
        //     originalAuthor: 'Gustave Eiffel',
        //     originalLink: 'https://www.planetminecraft.com/project/eiffel-tower-example',
        //     notes: {
        //       'zh-CN': '基于真实艾菲尔铁塔的1:1复刻',
        //       'en': 'Based on the real Eiffel Tower, 1:1 scale replica'
        //     }
        //   }
        // },
        // {
        //   name: {
        //     'zh-CN': '地下矿场',
        //     'en': 'Underground Mine'
        //   },
        //   description: {
        //     'zh-CN': '精心设计的地下采矿基地，包含自动化分类系统和矿车运输网络。',
        //     'en': 'A carefully designed underground mining base with automated sorting systems and minecart transport networks.'
        //   },
        //   coordinates: { x: 250, y: 12, z: 450 },
        //   builders: [
        //     {
        //       name: 'Miner99',
        //       uuid: 'c06f8906-4c8a-4911-9c29-ea1dbd1aab82',
        //       weight: 100
        //     }
        //   ],
        //   buildType: 'original',
        //   imageUrl: '/buildings/mine.png',
        //   buildDate: '2024-02-10',
        //   tags: ['industrial', 'underground', 'functional'],
        //   source: null
        // },
        // {
        //   name: {
        //     'zh-CN': '天空之城改版',
        //     'en': 'Sky Castle Reimagined'
        //   },
        //   description: {
        //     'zh-CN': '基于宫崎骏《天空之城》的二次创作，融入了更多现代元素和个人风格，悬浮在云端的梦幻城堡。',
        //     'en': 'A derivative work based on Miyazaki\'s Castle in the Sky, incorporating more modern elements and personal style, a dreamy castle floating in the clouds.'
        //   },
        //   coordinates: { x: -100, y: 180, z: -100 },
        //   builders: [
        //     {
        //       name: 'SkyBuilder',
        //       uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        //       weight: 100
        //     }
        //   ],
        //   buildType: 'derivative',
        //   imageUrl: '/buildings/sky-castle.png',
        //   buildDate: '2024-01-20',
        //   tags: ['fantasy', 'large', 'floating', 'anime'],
        //   source: {
        //     originalAuthor: 'Studio Ghibli / 宫崎骏',
        //     originalLink: 'https://www.planetminecraft.com/project/laputa-castle-in-the-sky',
        //     notes: {
        //       'zh-CN': '基于《天空之城》的二次创作，添加了个人设计元素',
        //       'en': 'Derivative work based on Castle in the Sky with personal design elements'
        //     }
        //   }
        // },
        // {
        //   name: {
        //     'zh-CN': '中式园林',
        //     'en': 'Chinese Garden'
        //   },
        //   description: {
        //     'zh-CN': '传统中式园林设计，包含亭台楼阁、假山流水，充满东方韵味。',
        //     'en': 'Traditional Chinese garden design with pavilions, rockeries, and flowing water, full of Eastern charm.'
        //   },
        //   coordinates: { x: 600, y: 68, z: 200 },
        //   builders: [
        //     {
        //       name: 'DragonMaster',
        //       uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        //       weight: 100
        //     }
        //   ],
        //   buildType: 'original',
        //   imageUrl: '/buildings/chinese-garden.png',
        //   buildDate: '2024-02-15',
        //   tags: ['cultural', 'traditional', 'garden'],
        //   source: null
        // }
      ],
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
}
