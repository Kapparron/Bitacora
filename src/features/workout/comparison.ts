import comparisons from '@/data/comparisons.json';

/**
 * The ladder the summary measures a session's volume against: dinosaurs from a
 * few kilos to seventy tonnes, two to three times heavier at every step, so a
 * normal session lands in the middle and a good one climbs a rung. Kept in
 * data/comparisons.json with each one's silhouette.
 */
export const DINOSAURS = comparisons.dinosaurs;

export type Dinosaur = (typeof DINOSAURS)[number];

export type Comparison = {
  dinosaur: Dinosaur;
  /** How many of it the volume comes to. */
  count: number;
  /** True when the count was rounded up: "casi dos". */
  almost: boolean;
};

/** Past this share of the next one, the count is rounded up and said as "casi". */
const ALMOST = 0.75;

/**
 * The biggest dinosaur the volume can lift and how many of it, or null below
 * the smallest, which is not a session worth boasting about.
 *
 * Picking the biggest that fits also keeps the count low: no rung is ten times
 * the one below it (the checks hold the ladder to that), so a count past nine
 * only happens beyond the top.
 */
export function compareVolume(kilograms: number): Comparison | null {
  let index = -1;
  DINOSAURS.forEach((dinosaur, position) => {
    if (kilograms >= dinosaur.kg) index = position;
  });
  if (index === -1) return null;

  const dinosaur = DINOSAURS[index];
  const ratio = kilograms / dinosaur.kg;
  const whole = Math.floor(ratio);
  const almost = ratio - whole >= ALMOST;

  return { dinosaur, count: almost ? whole + 1 : whole, almost };
}

const NUMBERS = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];

/** "un ceratosaurio", "casi dos estegosaurios", "12 alamosaurios". */
export function describeComparison({ dinosaur, count, almost }: Comparison): string {
  const amount = NUMBERS[count] ?? String(count);
  const name = count === 1 ? dinosaur.name : dinosaur.plural;
  return `${almost ? 'casi ' : ''}${amount} ${name}`;
}
