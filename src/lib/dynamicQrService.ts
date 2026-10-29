/**
 * Dynamic 30-Second Rotating QR Code Service (TOTP / Anti-Proxy Mechanism)
 *
 * Prevents unauthorized external access to the auditorium by rotating the join
 * QR code token every 30 seconds. Screenshots or forwarded links expire
 * automatically within 30-60 seconds.
 */

export const ROTATING_INTERVAL_SECONDS = 30;
const DYNAMIC_SALT = 'smartmic_auditorium_totp_salt_v1';

/**
 * Deterministic hash combining sessionId, timeBucket and secret salt.
 * Generates an 8-character alphanumeric token (e.g. "8K2M-9F4D").
 */
export function generateTokenForBucket(sessionId: string, bucket: number): string {
  const input = `${sessionId}:${bucket}:${DYNAMIC_SALT}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x5bd1e995);
  }

  const p1 = Math.abs(h1).toString(36).toUpperCase().padStart(4, '0').slice(-4);
  const p2 = Math.abs(h2).toString(36).toUpperCase().padStart(4, '0').slice(-4);
  return `${p1}-${p2}`;
}

/**
 * Current 30-second time bucket index
 */
export function getCurrentTimeBucket(timestamp: number = Date.now()): number {
  return Math.floor(timestamp / (ROTATING_INTERVAL_SECONDS * 1000));
}

/**
 * Seconds remaining until next QR rotation (0 - 30)
 */
export function getSecondsRemaining(timestamp: number = Date.now()): number {
  const elapsedInBucket = Math.floor((timestamp % (ROTATING_INTERVAL_SECONDS * 1000)) / 1000);
  return Math.max(1, ROTATING_INTERVAL_SECONDS - elapsedInBucket);
}

/**
 * Generates the full dynamic join URL with rotating token
 */
export function buildDynamicSessionUrl(sessionId: string, origin?: string): {
  url: string;
  token: string;
  secondsRemaining: number;
} {
  const baseOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const bucket = getCurrentTimeBucket();
  const token = generateTokenForBucket(sessionId, bucket);
  const secondsRemaining = getSecondsRemaining();

  const url = `${baseOrigin}/session/${sessionId}?dqr=${token}&t=${Date.now()}`;
  return { url, token, secondsRemaining };
}

export type DynamicQrValidationResult = {
  isValid: boolean;
  status: 'valid' | 'expired' | 'missing' | 'invalid';
  message: string;
};

/**
 * Validates a dynamic QR token against the current time bucket with ±1 grace bucket (30-60s window)
 */
export function validateDynamicQrToken(
  sessionId: string,
  token: string | null | undefined,
  timestamp?: number
): DynamicQrValidationResult {
  if (!token || !token.trim()) {
    return {
      isValid: false,
      status: 'missing',
      message: 'No live verification token provided. Please scan the QR code displayed on the auditorium screen.',
    };
  }

  const cleanToken = token.trim().toUpperCase();
  const currentBucket = getCurrentTimeBucket(timestamp);

  // Check current bucket
  if (cleanToken === generateTokenForBucket(sessionId, currentBucket)) {
    return { isValid: true, status: 'valid', message: 'Token verified successfully.' };
  }

  // Check previous bucket (grace window for camera scan + page load)
  if (cleanToken === generateTokenForBucket(sessionId, currentBucket - 1)) {
    return { isValid: true, status: 'valid', message: 'Token verified in grace period.' };
  }

  // Check next bucket (minor clock skew)
  if (cleanToken === generateTokenForBucket(sessionId, currentBucket + 1)) {
    return { isValid: true, status: 'valid', message: 'Token verified in advance.' };
  }

  // Check if it belongs to an older bucket from the last 15 minutes (expired screenshot)
  for (let i = 2; i <= 30; i++) {
    if (cleanToken === generateTokenForBucket(sessionId, currentBucket - i)) {
      return {
        isValid: false,
        status: 'expired',
        message: 'This QR code has expired! For security, please scan the current live QR code from the auditorium screen.',
      };
    }
  }

  return {
    isValid: false,
    status: 'invalid',
    message: 'Invalid auditorium security token. Please scan the live QR code on the auditorium screen.',
  };
}

const STORAGE_PREFIX = 'smartmic_dqr_verified_';

/**
 * Check if the user has already been verified in this session
 */
export function isSessionVerified(sessionId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const sessionFlag = sessionStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
    if (sessionFlag === 'true') return true;

    // Check localStorage with 12-hour session lifetime
    const localTimestamp = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
    if (localTimestamp) {
      const verifiedTime = parseInt(localTimestamp, 10);
      const twelveHours = 12 * 60 * 60 * 1000;
      if (Date.now() - verifiedTime < twelveHours) {
        return true;
      }
    }
  } catch {}
  return false;
}

/**
 * Mark this device as verified for the session so they don't have to scan again
 */
export function markSessionVerified(sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, 'true');
    localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, Date.now().toString());
  } catch {}
}

/**
 * Clear verification (e.g. on logout or leave)
 */
export function clearSessionVerification(sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
    localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
  } catch {}
}
