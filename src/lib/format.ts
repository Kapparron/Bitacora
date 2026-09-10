/** Formatting helpers shared by every screen. All input is already in SI units. */

/** `1:05:03` when there are hours, `5:03` otherwise. */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => value.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Drops trailing zeros so 60 kg reads "60 kg" and 62.5 kg reads "62,5 kg". */
export function formatWeight(kilograms: number | null): string {
  if (kilograms === null) return '-';
  return `${formatNumber(kilograms)} kg`;
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits }).format(value);
}

/** The same calendar day shifted by `delta` days, through a local Date. */
function shiftDays(date: Date, delta: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + delta);
  return shifted;
}

/**
 * `Hoy`, `Ayer`, `Manana`, or `mié, 12 mar` for anything further out: short
 * enough for a history row and unambiguous within a year.
 *
 * Which day counts as today is read at every call, so a screen left open past
 * midnight only needs to re-render to say the right thing.
 */
export function formatDay(timestamp: number): string {
  const day = toIsoDay(new Date(timestamp));
  const now = new Date();

  if (day === toIsoDay(now)) return 'Hoy';
  if (day === toIsoDay(shiftDays(now, -1))) return 'Ayer';
  if (day === toIsoDay(shiftDays(now, 1))) return 'Manana';

  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp));
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(timestamp)
  );
}

/** Local calendar day as `YYYY-MM-DD`, the format used by nutrition tables. */
export function toIsoDay(date: Date = new Date()): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
