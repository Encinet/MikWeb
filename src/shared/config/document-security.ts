import { getCapApiEndpoint, parseHttpsEndpoint } from './https-endpoints';
import { CHAT_TRANSPORT_URL, DATA_API_ORIGIN, MAP_ORIGIN } from './service-config';

export const CSP_NONCE_HEADER = 'x-mikweb-csp-nonce';
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const scriptExecution = isDevelopment ? "'unsafe-eval'" : "'wasm-unsafe-eval'";
const buildingImageOrigin =
  parseHttpsEndpoint(process.env.CSP_BUILDING_IMAGE_ORIGIN)?.origin ??
  'https://mcmik.s3.bitiful.net';
const connections = [
  "'self'",
  DATA_API_ORIGIN,
  new URL(CHAT_TRANSPORT_URL).origin,
  buildingImageOrigin,
  getCapApiEndpoint()?.origin,
  ...(isDevelopment ? ['ws:', 'wss:'] : []),
].filter(Boolean);
const staticDirectives = [
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  // Avatar providers can redirect to their image CDN. Images are never script sources.
  "img-src 'self' https: data: blob:",
  "font-src 'self'",
  `connect-src ${connections.join(' ')}`,
  `frame-src 'self' ${MAP_ORIGIN}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(!isDevelopment ? ['upgrade-insecure-requests'] : []),
].join('; ');
const reportEndpoint = isProduction
  ? parseHttpsEndpoint(process.env.CSP_REPORT_ENDPOINT)?.href
  : undefined;

export function documentCsp(nonce: string): string {
  return `default-src 'none'; script-src 'nonce-${nonce}' 'strict-dynamic' 'self' ${scriptExecution}; ${staticDirectives}`;
}

export function setDocumentResponseHeaders(headers: Headers, policy: string): void {
  headers.set('Content-Security-Policy', policy);
  headers.set('Cache-Control', 'private, no-store');
  if (!isProduction) return;

  const directive = "require-trusted-types-for 'script'";
  headers.set(
    'Content-Security-Policy-Report-Only',
    reportEndpoint ? `${directive}; report-to mikweb-csp` : directive,
  );
  if (reportEndpoint) headers.set('Reporting-Endpoints', `mikweb-csp="${reportEndpoint}"`);
}
