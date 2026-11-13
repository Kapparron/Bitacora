/** What is stored for an exercise note: trimmed, and nothing at all when blank. */
export function normalizeNote(text: string): string | null {
  const trimmed = text.trim();

  return trimmed === '' ? null : trimmed;
}
