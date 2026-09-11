/**
 * How a streak is rewarded: the tier it has reached and the next mark it is
 * heading for. Kept apart from the drawing so the numbers can be tuned in one
 * place.
 */

export type StreakTier = {
  /** Days needed to reach it. */
  from: number;
  /** Flame colour. Fixed rather than themed: the ramp is the reward. */
  color: string;
  /** Icon size in points, so the flame grows with the streak. */
  size: number;
};

/**
 * Cold ember to gold. The steps are close together early, where a streak is
 * fragile and a visible change is worth most, and far apart later.
 */
const TIERS: StreakTier[] = [
  { from: 1, color: '#8A8F98', size: 16 },
  { from: 3, color: '#E8A33D', size: 18 },
  { from: 7, color: '#F07B24', size: 20 },
  { from: 14, color: '#E8542B', size: 22 },
  { from: 30, color: '#D93A3A', size: 24 },
  { from: 60, color: '#C2185B', size: 26 },
  { from: 100, color: '#E0B33C', size: 28 },
];

/** Marks a streak is measured against, in days. */
const MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365];

export function tierFor(days: number): StreakTier | null {
  let reached: StreakTier | null = null;
  for (const tier of TIERS) if (days >= tier.from) reached = tier;
  return reached;
}

export type StreakProgress = {
  /** Days still to go, or null once every mark is behind. */
  remaining: number | null;
  /** The mark being worked towards, or null once every mark is behind. */
  next: number | null;
  /** How far along the current stretch is, 0 to 1. */
  ratio: number;
};

/**
 * Progress towards the next mark, measured from the previous one rather than
 * from zero: at 29 days of 30 the ring should read as nearly full, not as a
 * third of the way through a hundred.
 */
export function progressFor(days: number): StreakProgress {
  const next = MILESTONES.find((mark) => days < mark) ?? null;
  if (next === null) return { remaining: null, next: null, ratio: 1 };

  const previous = [...MILESTONES].reverse().find((mark) => mark <= days) ?? 0;
  const span = next - previous;

  return { remaining: next - days, next, ratio: span === 0 ? 0 : (days - previous) / span };
}
