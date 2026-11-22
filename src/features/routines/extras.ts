import {
  THREE_SEVEN_REPS,
  THREE_SEVEN_RESTS,
} from '@/features/workout/rest-after';
import { codeOf, typeOfCode, type SetType } from '@/constants/sets';

/** What a routine can plan after its normal sets. */
export const EXTRA_KINDS = ['drop', 'three_seven'] as const;
export type RoutineExtra = (typeof EXTRA_KINDS)[number];

/** Generous limit, only there so a hostile link cannot flood the database. */
export const MAX_EXTRAS = 10;

const isExtra = (value: string): value is RoutineExtra =>
  (EXTRA_KINDS as readonly string[]).includes(value);

/** Reads the stored text; anything it does not know is dropped. */
export function parseExtras(text: string | null): RoutineExtra[] {
  if (!text) return [];

  return text.split(',').filter(isExtra).slice(0, MAX_EXTRAS);
}

/** The text stored for a list, or null when there is none. */
export function formatExtras(extras: readonly RoutineExtra[]): string | null {
  return extras.length === 0 ? null : extras.join(',');
}

/** The letter an extra travels as in a shared link: the one of its set type. */
export function codeOfExtra(extra: RoutineExtra): string {
  return codeOf(extra);
}

/** The extra a link letter stands for, or null when it is not one. */
export function extraOfCode(code: string): RoutineExtra | null {
  const type = typeOfCode(code);

  return isExtra(type) ? type : null;
}

export type PlannedSet = { type: SetType; reps: number | null; restSeconds: number | null };

/** The sets a list of extras turns into when the routine is started. */
export function setsOfExtras(extras: readonly RoutineExtra[]): PlannedSet[] {
  return extras.flatMap((extra): PlannedSet[] =>
    extra === 'drop'
      ? [{ type: 'drop', reps: null, restSeconds: null }]
      : THREE_SEVEN_REPS.map((reps, index) => ({
          type: 'three_seven',
          reps,
          restSeconds: THREE_SEVEN_RESTS[index],
        }))
  );
}
