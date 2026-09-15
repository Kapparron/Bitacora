import type { Exercise } from '@/db/schema';

import type { RoutineContents } from './queries';

/**
 * A routine passed from one phone to another, with no server in between: the
 * whole routine travels inside a `bitacora://routine/import?r=...` link, shown
 * as a QR code or sent as text. Scanning the code, in the app or with the
 * phone's own camera, opens the import screen.
 *
 * A QR code holds under 3 KB and a denser one is harder to scan, so the payload
 * uses one-letter keys and a catalogue exercise travels as its dataset id alone:
 * both phones ship the same catalogue. Only an exercise the user created goes
 * with its name and fields, so the other phone can create it too.
 *
 * The schedule stays behind on purpose. When a routine falls is the sender's
 * week, not the receiver's.
 */
export const SHARE_VERSION = 1;

type TrackingType = Exercise['trackingType'];

const TRACKING_TYPES: readonly TrackingType[] = [
  'weight_reps',
  'reps',
  'duration',
  'distance_duration',
];

export type SharedExercise =
  /** A catalogue exercise, by its id in the dataset. */
  | { x: string }
  /** A custom exercise: name, muscle group, equipment, tracking type. */
  | { n: string; m: string; q: string; t: TrackingType };

export type SharedEntry = {
  e: SharedExercise;
  /** Target sets. */
  s: number | null;
  /** Target reps, free text such as "8-12". */
  r: string | null;
  /** Rest in seconds. */
  d: number | null;
  /** Superset group. */
  g: number | null;
  /** Notes. */
  o: string | null;
};

export type SharedRoutine = {
  v: typeof SHARE_VERSION;
  /** Name. */
  n: string;
  /** Notes. */
  o: string | null;
  /** Exercises, in order. */
  e: SharedEntry[];
};

const LINK_PREFIX = 'bitacora://routine/import?r=';

/** Generous limits, only there so a hostile code cannot flood the database. */
const MAX_ENTRIES = 60;
const MAX_TEXT = 500;

export function toSharedRoutine({ routine, entries }: RoutineContents): SharedRoutine {
  return {
    v: SHARE_VERSION,
    n: routine.name,
    o: routine.notes,
    e: entries.map((entry) => ({
      e:
        entry.exercise.externalId && !entry.exercise.isCustom
          ? { x: entry.exercise.externalId }
          : {
              n: entry.exercise.name,
              m: entry.exercise.muscleGroup,
              q: entry.exercise.equipment,
              t: entry.exercise.trackingType,
            },
      s: entry.targetSets,
      r: entry.targetReps,
      d: entry.restSeconds,
      g: entry.supersetGroup,
      o: entry.notes,
    })),
  };
}

export function routineLink(shared: SharedRoutine): string {
  const bytes = new TextEncoder().encode(JSON.stringify(shared));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);

  const base64url = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${LINK_PREFIX}${base64url}`;
}

/**
 * Reads a scanned code or the `r` parameter of an opened link. Anything that is
 * not a routine this version understands comes back as null: a QR code can say
 * anything, so every field is checked before it gets near the database.
 */
export function parseSharedRoutine(input: string): SharedRoutine | null {
  const encoded = input.startsWith(LINK_PREFIX) ? input.slice(LINK_PREFIX.length) : input;
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return null;

  let value: unknown;
  try {
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  }

  if (!isObject(value) || value.v !== SHARE_VERSION) return null;
  if (!isText(value.n) || !isOptionalText(value.o)) return null;
  if (!Array.isArray(value.e) || value.e.length === 0 || value.e.length > MAX_ENTRIES) return null;

  const entries: SharedEntry[] = [];
  for (const raw of value.e) {
    const entry = parseEntry(raw);
    if (!entry) return null;
    entries.push(entry);
  }

  return { v: SHARE_VERSION, n: value.n.trim(), o: value.o ?? null, e: entries };
}

function parseEntry(raw: unknown): SharedEntry | null {
  if (!isObject(raw) || !isObject(raw.e)) return null;

  const exercise = raw.e;
  let e: SharedExercise;
  if ('x' in exercise) {
    if (!isText(exercise.x)) return null;
    e = { x: exercise.x };
  } else {
    if (!isText(exercise.n) || !isText(exercise.m) || !isText(exercise.q)) return null;
    if (!TRACKING_TYPES.includes(exercise.t as TrackingType)) return null;
    e = { n: exercise.n.trim(), m: exercise.m, q: exercise.q, t: exercise.t as TrackingType };
  }

  if (!isOptionalInt(raw.s, 1, 100) || !isOptionalInt(raw.d, 0, 3600)) return null;
  if (!isOptionalInt(raw.g, 1, MAX_ENTRIES)) return null;
  if (!isOptionalText(raw.r) || !isOptionalText(raw.o)) return null;

  return { e, s: raw.s ?? null, r: raw.r ?? null, d: raw.d ?? null, g: raw.g ?? null, o: raw.o ?? null };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_TEXT;
}

function isOptionalText(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || (typeof value === 'string' && value.length <= MAX_TEXT);
}

function isOptionalInt(value: unknown, min: number, max: number): value is number | null | undefined {
  return (
    value === null ||
    value === undefined ||
    (Number.isInteger(value) && (value as number) >= min && (value as number) <= max)
  );
}
