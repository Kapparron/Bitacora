import { badgeOf, type SetType } from '@/constants/sets';

/** Types that take no number: warm-ups, and the sets chained onto another. */
const UNNUMBERED: SetType[] = ['warmup', 'drop', 'three_seven'];

/**
 * Badge shown in the set-number column; normal sets keep their number. Sets of
 * the types above are not counted here either, so the first set after a warm-up
 * is set 1 and a set after its drops is the next number. This is not the volume
 * rule: drops and 3/7 sets do count there.
 */
export function badgeFor(sets: readonly { type: SetType }[], index: number): string {
  const { type } = sets[index];
  if (type !== 'normal') return badgeOf(type);

  const unnumbered = sets.slice(0, index).filter((set) => UNNUMBERED.includes(set.type)).length;
  return String(index + 1 - unnumbered);
}
