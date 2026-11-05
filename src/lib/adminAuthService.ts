/**
 * Admin Access Control & Whitelist Service
 * Manages authorized email addresses permitted to sign in to the platform.
 */

const STORAGE_KEY = 'smartmic_allowed_admin_emails';

// Default initial whitelist: can be preconfigured via env or fallback defaults
export function getDefaultAllowedEmails(): string[] {
  const envList = (import.meta as any).env?.VITE_ALLOWED_ADMIN_EMAILS;
  if (envList && typeof envList === 'string') {
    return envList
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  // Safe initial default: if empty, the first admin who signs in becomes owner/allowed
  return [];
}

/**
 * Returns list of allowed emails from localStorage and environment
 */
export function getAllowedAdminEmails(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean);
      }
    }
  } catch {}

  const defaults = getDefaultAllowedEmails();
  return defaults;
}

/**
 * Save list of allowed emails
 */
export function setAllowedAdminEmails(emails: string[]): void {
  try {
    const cleaned = Array.from(
      new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {}
}

/**
 * Add a new email to the allowed list
 */
export function addAllowedAdminEmail(email: string): boolean {
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes('@')) return false;

  const current = getAllowedAdminEmails();
  if (current.includes(clean)) return true;

  setAllowedAdminEmails([...current, clean]);
  return true;
}

/**
 * Remove an email from the allowed list
 */
export function removeAllowedAdminEmail(email: string): void {
  const clean = email.trim().toLowerCase();
  const current = getAllowedAdminEmails();
  setAllowedAdminEmails(current.filter((e) => e !== clean));
}

/**
 * Checks if a given email is authorized to access the admin portal.
 * If the whitelist has entries, the email MUST be present in the whitelist.
 * If the whitelist is completely empty, the very first user is allowed and automatically registered as the first allowed admin.
 */
export function isEmailAuthorized(email: string): boolean {
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes('@')) return false;

  const allowed = getAllowedAdminEmails();

  // If no whitelist configured yet, allow first login and register them
  if (allowed.length === 0) {
    addAllowedAdminEmail(clean);
    return true;
  }

  return allowed.includes(clean);
}
