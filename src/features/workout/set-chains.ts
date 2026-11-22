import type { SetType } from '@/constants/sets';
import { THREE_SEVEN_SERIES_REST_S } from './rest-after';

/**
 * Sets done one straight after another, which the card draws as one block:
 * the set a drop set falls from together with its drops, or the five sets of a
 * 3/7 series. Every other set is a chain of one. Each chain is a list of
 * indexes into `sets`, in order, and together they cover every set once.
 */
export function chainsOf(
  sets: readonly { type: SetType; restSeconds: number | null }[]
): number[][] {
  const chains: number[][] = [];

  sets.forEach((set, index) => {
    const previous = sets[index - 1];
    const joins =
      previous !== undefined &&
      ((set.type === 'drop' && previous.type !== 'three_seven') ||
        // The long rest is what ends a 3/7 series.
        (set.type === 'three_seven' &&
          previous.type === 'three_seven' &&
          previous.restSeconds !== THREE_SEVEN_SERIES_REST_S));

    if (joins) chains[chains.length - 1].push(index);
    else chains.push([index]);
  });

  return chains;
}
