/**
 * Client-side input validation and sanitization utilities.
 * Server-side validation in Edge Functions mirrors these rules.
 */

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value.trim());
}

// ---------------------------------------------------------------------------
// URLs — only http/https, no javascript: / data: / blob: schemes
// ---------------------------------------------------------------------------
const SAFE_SCHEMES = new Set(['http:', 'https:']);

export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true; // empty = allowed (field is optional)
  try {
    const u = new URL(value.trim());
    return SAFE_SCHEMES.has(u.protocol);
  } catch {
    return false;
  }
}

/** Normalise a URL: add https:// if the user omitted the scheme. */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// ---------------------------------------------------------------------------
// Social-media handles / URLs
// ---------------------------------------------------------------------------
export function sanitizeSocialHandle(value: string): string {
  // Strip leading @, trim whitespace, max 100 chars
  return value.replace(/^@+/, '').trim().slice(0, 100);
}

// ---------------------------------------------------------------------------
// CNPJ
// ---------------------------------------------------------------------------
export function isValidCNPJ(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false; // all same digit
  const calc = (d: string, weights: number[]) =>
    d
      .split('')
      .reduce((acc, n, i) => acc + parseInt(n) * weights[i], 0) % 11;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const r1 = calc(digits.slice(0, 12), w1);
  const d1 = r1 < 2 ? 0 : 11 - r1;
  if (d1 !== parseInt(digits[12])) return false;
  const r2 = calc(digits.slice(0, 13), w2);
  const d2 = r2 < 2 ? 0 : 11 - r2;
  return d2 === parseInt(digits[13]);
}

// ---------------------------------------------------------------------------
// CPF
// ---------------------------------------------------------------------------
export function isValidCPF(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  const calc = (d: string, len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return (
    calc(digits, 9) === parseInt(digits[9]) &&
    calc(digits, 10) === parseInt(digits[10])
  );
}

// ---------------------------------------------------------------------------
// Text sanitization — strip HTML tags and control chars
// ---------------------------------------------------------------------------
export function sanitizeText(value: string, maxLength = 500): string {
  return value
    .replace(/<[^>]*>/g, '')          // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars (keep \t \n \r)
    .trim()
    .slice(0, maxLength);
}

// ---------------------------------------------------------------------------
// Phone — allow digits, spaces, +, -, (, )
// ---------------------------------------------------------------------------
export function sanitizePhone(value: string): string {
  return value.replace(/[^\d\s+\-().]/g, '').trim().slice(0, 20);
}

// ---------------------------------------------------------------------------
// File validation
// ---------------------------------------------------------------------------
export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024,    // 5 MB
  document: 10 * 1024 * 1024, // 10 MB
  spreadsheet: 10 * 1024 * 1024,
  json: 5 * 1024 * 1024,
} as const;

export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

export const ALLOWED_SPREADSHEET_TYPES = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export function validateFile(
  file: File,
  type: keyof typeof FILE_SIZE_LIMITS,
  allowedMimes?: Set<string>,
): { valid: boolean; error?: string } {
  const limit = FILE_SIZE_LIMITS[type];
  if (file.size > limit) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${Math.round(limit / 1024 / 1024)} MB.`,
    };
  }
  if (allowedMimes && !allowedMimes.has(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type || 'unknown'}.`,
    };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Numeric range
// ---------------------------------------------------------------------------
export function clampNumber(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(Math.max(value, min), max);
}

export function isValidScore(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}
