import { notFound } from 'next/navigation';

// This fallback only returns 404 and has no instant navigation content.
export const instant = false;

export default function LocaleNotFoundCatchAllPage() {
  notFound();
}
