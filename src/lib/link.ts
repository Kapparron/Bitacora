/**
 * What a shared link carries: a small JSON object, base64url so it survives a
 * URL, a QR code and a chat that underlines anything it takes for punctuation.
 *
 * Routines and finished sessions both travel this way, with no server in
 * between. The payload always sits after the `#` of an `https` link: browsers
 * never send a fragment, so nothing about a user's training reaches GitHub's
 * servers, and chats only make `https` links tappable.
 */

/** Generous, only there so a hostile code cannot flood the screen or database. */
export const MAX_TEXT = 500;

export function encodePayload(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * The object inside an encoded payload, or null when the text is not one. A QR
 * code can say anything, so the caller still checks every field it reads.
 */
export function decodePayload(encoded: string): unknown {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return null;

  try {
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_TEXT;
}

export function isOptionalText(value: unknown): value is string | null | undefined {
  return (
    value === null || value === undefined || (typeof value === 'string' && value.length <= MAX_TEXT)
  );
}

export function isOptionalInt(value: unknown, min: number, max: number): value is number | null {
  return (
    value === null ||
    value === undefined ||
    (Number.isInteger(value) && (value as number) >= min && (value as number) <= max)
  );
}
