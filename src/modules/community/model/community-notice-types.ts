export interface CommunityNotice {
  id: string;
  subject: string;
  relatedNoticeId: string | null;
  world: string;
  x: number;
  y: number;
  z: number;
  authorName: string;
  kind: 'notice' | 'objection';
  text: string;
  details?: {
    contact: string;
    scope: string;
    impact: string;
    proposal: string;
  } | null;
  status: 'open' | 'elapsed' | 'ruled' | 'withdrawn';
  createdAt: number;
  deadline: number;
  ruling: string | null;
}

export interface CommunityBoardResponse {
  notices: CommunityNotice[];
}
