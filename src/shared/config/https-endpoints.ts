export function parseHttpsEndpoint(value: string | undefined): URL | undefined {
  if (!value) return;
  try {
    const url = new URL(value.trim());
    // CSP origins must be literal hosts without wildcards or policy delimiters.
    if (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !/[#"\\]/.test(url.href) &&
      !/[\s;,*']/.test(url.origin)
    ) {
      return url;
    }
  } catch {
    // Invalid optional endpoint configuration is ignored.
  }
}

export function getCapApiEndpoint(): URL | undefined {
  const url = parseHttpsEndpoint(process.env.CAP_API_ENDPOINT);
  if (!url || url.pathname === '/' || url.href.includes('?')) return;
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}
