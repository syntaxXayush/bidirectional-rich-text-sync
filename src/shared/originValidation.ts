import { TRUSTED_ORIGINS } from './protocol';

/**
 * Validates postMessage origin before processing.
 * In production, extend TRUSTED_ORIGINS or derive from env config.
 */
export function isTrustedOrigin(origin: string): boolean {
  if (origin === 'null') {
    // file:// protocol — reject in production builds
    return false;
  }

  return TRUSTED_ORIGINS.includes(origin) || origin === window.location.origin;
}

export function assertTrustedOrigin(origin: string): void {
  if (!isTrustedOrigin(origin)) {
    throw new Error(`Rejected postMessage from untrusted origin: ${origin}`);
  }
}
