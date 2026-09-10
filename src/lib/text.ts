/**
 * Lowercases and strips accents, so "biceps" matches "bíceps" and "platano"
 * matches "plátano". Used by every local search box.
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
