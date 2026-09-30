/**
 * Reads the time typed in the event form: "17:30", "17.30", "17h" or "9", as
 * `HH:MM`. Null when it is not a time of day. Pure, so the checks can hold it
 * to its examples.
 */
export function parseTime(text: string): string | null {
  const match = /^(\d{1,2})(?:[:.](\d{2})|h)?$/i.exec(text.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
