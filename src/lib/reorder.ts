/**
 * Splits a list into the blocks that move together when reordering. Consecutive
 * items sharing a superset group are one block, so dragging never leaves a group
 * split around another exercise. Everything else is a block of its own.
 */
export function reorderBlocks<T extends { supersetGroup: number | null }>(items: readonly T[]): T[][] {
  const blocks: T[][] = [];

  for (const item of items) {
    const last = blocks.at(-1);

    if (last && item.supersetGroup !== null && last[0].supersetGroup === item.supersetGroup) {
      last.push(item);
    } else {
      blocks.push([item]);
    }
  }

  return blocks;
}

/** Copy of the list with the item at `from` moved so it ends up at `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const moved = [...list];
  const [item] = moved.splice(from, 1);
  moved.splice(to, 0, item);
  return moved;
}
