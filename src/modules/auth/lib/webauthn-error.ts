export function webAuthnError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (code === 'ERROR_INVALID_DOMAIN' || code === 'ERROR_INVALID_RP_ID')
    return 'passkey_domain_mismatch';
  if (code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') return 'passkey_already_registered';
  if (
    code === 'ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT' ||
    code === 'ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT'
  )
    return 'passkey_unsupported_authenticator';
  if (error instanceof Error && error.message === 'WebAuthn is not supported in this browser')
    return 'passkey_browser_unsupported';
  const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : error;
  const name = cause && typeof cause === 'object' && 'name' in cause ? cause.name : undefined;
  if (code === 'ERROR_CEREMONY_ABORTED' || name === 'NotAllowedError' || name === 'AbortError')
    return 'cancelled';
  return 'request_failed';
}
