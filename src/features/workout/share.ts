import type { WorkoutSet } from '@/db/schema';
import { toSharedExercise, type SharedExercise } from '@/features/exercises/shared-exercise';
import { encodePayload } from '@/lib/link';

import type { WorkoutContents } from './queries';

/**
 * A finished session shown to someone who does not have the app: the whole
 * session travels inside a link that opens a web page (site/entreno/) drawing
 * it much like the app does.
 *
 * Unlike a routine, the page is the destination and not a bridge, so nothing
 * gets imported anywhere. The link still carries everything after the `#`, the
 * part a browser never sends: reading a shared session takes no server, and no
 * one's training is logged by GitHub. See `@/lib/link`.
 *
 * Only completed sets travel. A set left unchecked was not performed, and an
 * exercise without a single completed set is left out altogether.
 *
 * Sets are numbers and there are many of them, so they travel as one compact
 * string instead of as objects, which keeps a session of six exercises around
 * half a kilobyte:
 *
 *     w20x10,60x8,60x8@8,d40x12
 *
 * - `60x8` is 60 kg by 8 reps; either side may be missing (`x8`, `60x`).
 * - `90s` is a 90 second set, `1000m90s` a 1000 metre one in 90 seconds.
 * - `-` is a set that was completed with nothing written down.
 * - A leading `w`, `d` or `f` marks a warm-up, a drop set or a set to failure.
 * - A trailing `@8.5` is the RPE.
 *
 * `site/entreno/entreno.js` reads this back; scripts/checks/workout-share.test.ts
 * holds both ends to the same grammar.
 */
export const SHARE_VERSION = 1;

export type SharedWorkoutEntry = {
  e: SharedExercise;
  /** Completed sets, in order, in the compact form described above. */
  s: string;
  /** Superset group. */
  g: number | null;
  /** Notes. */
  o: string | null;
};

export type SharedWorkout = {
  v: typeof SHARE_VERSION;
  /** Name. */
  n: string;
  /** When it started, in epoch seconds: milliseconds would spend three digits
   *  on a precision nobody reads. */
  t: number;
  /** How long it lasted, in seconds. Null for a session that never finished. */
  d: number | null;
  /** Notes. */
  o: string | null;
  /** Exercises, in order. */
  e: SharedWorkoutEntry[];
};

const WEB_PREFIX = 'https://kapparron.github.io/Bitacora/entreno/#';

const TYPE_CODE: Record<WorkoutSet['type'], string> = {
  normal: '',
  warmup: 'w',
  drop: 'd',
  failure: 'f',
};

export function toSharedWorkout({ workout, entries }: WorkoutContents): SharedWorkout {
  return {
    v: SHARE_VERSION,
    n: workout.name,
    t: Math.round(workout.startedAt / 1000),
    d:
      workout.finishedAt === null
        ? null
        : Math.round((workout.finishedAt - workout.startedAt) / 1000),
    o: workout.notes,
    e: entries
      .map((entry) => ({
        e: toSharedExercise(entry.exercise),
        s: encodeSets(entry.sets),
        g: entry.supersetGroup,
        o: entry.notes,
      }))
      // An exercise opened and never performed is not part of what was trained.
      .filter((entry) => entry.s !== ''),
  };
}

export function workoutLink(shared: SharedWorkout): string {
  return `${WEB_PREFIX}${encodePayload(shared)}`;
}

/** The sets of one exercise as the compact string the format described above. */
export function encodeSets(sets: readonly WorkoutSet[]): string {
  return sets
    .filter((set) => set.completed)
    .map(encodeSet)
    .join(',');
}

function encodeSet(set: WorkoutSet): string {
  const rpe = set.rpe === null ? '' : `@${number(set.rpe)}`;
  return `${TYPE_CODE[set.type]}${measures(set)}${rpe}`;
}

/** What was written down in a set, in the shortest form that keeps it all. */
function measures(set: WorkoutSet): string {
  if (set.weight !== null || set.reps !== null) {
    return `${number(set.weight)}x${number(set.reps)}`;
  }

  if (set.distanceM !== null || set.durationS !== null) {
    const distance = set.distanceM === null ? '' : `${number(set.distanceM)}m`;
    const duration = set.durationS === null ? '' : `${number(set.durationS)}s`;
    return `${distance}${duration}`;
  }

  return '-';
}

/** Always a plain `62.5`, never a locale's comma nor `6.25e+1`. */
function number(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '';
  return String(Math.round(value * 100) / 100);
}
