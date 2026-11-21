import { verifyAuthSession } from '@/modules/auth/server/auth-bff';

export const GET = verifyAuthSession;
