import { THREE_SEVEN_REPS, THREE_SEVEN_RESTS } from '@/features/workout/rest-after';
import type { SetType } from '@/constants/sets';

/**
 * The sets a routine plans for an exercise, in the order they are done. A
 * three-seven entry is a whole series: five sets once the routine is started.
 */
export const PLAN_KINDS = ['normal', 'drop', 'three_seven'] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

/** Generous limit, only there so a hostile link cannot flood the database. */
export const MAX_PLAN = 30;

/** What a routine plans when nothing was written down. */
export const DEFAULT_PLAN: readonly PlanKind[] = ['normal', 'normal', 'normal'];

const isKind = (value: string): value is PlanKind =>
  (PLAN_KINDS as readonly string[]).includes(value);

/** Reads the stored text; anything it does not know is dropped. */
export function parsePlan(text: string | null): PlanKind[] {
  if (!text) return [];

  return text.split(',').filter(isKind).slice(0, MAX_PLAN);
}

/** The text stored for a plan, or null when it is empty. */
export function formatPlan(plan: readonly PlanKind[]): string | null {
  return plan.length === 0 ? null : plan.join(',');
}

/** The letter each kind travels as in a shared link. */
const CODES: Record<PlanKind, string> = { normal: 'n', drop: 'd', three_seven: 't' };

export const codeOfKind = (kind: PlanKind): string => CODES[kind];

export function kindOfCode(code: string): PlanKind | null {
  return PLAN_KINDS.find((kind) => CODES[kind] === code) ?? null;
}

/**
 * The plan of a link from before plans existed: `s` normal sets and then the
 * extras `x` (set-type letters `d`, `t`).
 */
export function planOfLegacy(sets: number | null, extras: readonly string[]): PlanKind[] {
  const normal = Array.from({ length: sets ?? DEFAULT_PLAN.length }, (): PlanKind => 'normal');

  return [...normal, ...extras.flatMap((code) => (code === 'd' ? 'drop' : code === 't' ? 'three_seven' : []))];
}

/** Moves the entry at `index` one place, or leaves the plan alone at either end. */
export function movePlan(plan: readonly PlanKind[], index: number, by: -1 | 1): PlanKind[] {
  const target = index + by;
  if (target < 0 || target >= plan.length) return [...plan];

  const next = [...plan];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** How many sets of each kind a plan holds, for the summary line. */
export function summaryOfPlan(plan: readonly PlanKind[]): string {
  const count = (kind: PlanKind) => plan.filter((item) => item === kind).length;
  const parts = [
    `${count('normal')} ${count('normal') === 1 ? 'serie' : 'series'}`,
    count('drop') > 0 ? `${count('drop')} ${count('drop') === 1 ? 'drop' : 'drops'}` : null,
    count('three_seven') > 0 ? `${count('three_seven')} x 3/7` : null,
  ];

  return parts.filter(Boolean).join(' · ');
}

export type PlannedSet = { type: SetType; reps: number | null; restSeconds: number | null };

/** The sets a plan turns into when the routine is started; at least one. */
export function setsOfPlan(plan: readonly PlanKind[]): PlannedSet[] {
  const sets = plan.flatMap((kind): PlannedSet[] =>
    kind === 'normal'
      ? [{ type: 'normal', reps: null, restSeconds: null }]
      : kind === 'drop'
        ? [{ type: 'drop', reps: null, restSeconds: null }]
        : THREE_SEVEN_REPS.map((reps, index) => ({
            type: 'three_seven',
            reps,
            restSeconds: THREE_SEVEN_RESTS[index],
          }))
  );

  return sets.length > 0 ? sets : [{ type: 'normal', reps: null, restSeconds: null }];
}
