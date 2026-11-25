/** Public Cap endpoints only; the site secret must stay on the server. */
export interface JoinCaptchaConfig {
  /** HTTPS site endpoint with a trailing slash. */
  apiEndpoint: string;
}

export function isCapToken(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= 2048 && /^\S+$/.test(value)
  );
}
