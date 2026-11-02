export function authenticationErrorKey(code: string | null): string | null {
  return code === 'invalid_browser_nonce' || code === 'invalid_challenge'
    ? 'verificationInvalid'
    : code;
}
