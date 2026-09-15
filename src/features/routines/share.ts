import {
  parseSharedExercise,
  toSharedExercise,
  type SharedExercise,
} from '@/features/exercises/shared-exercise';
import {
  decodePayload,
  encodePayload,
  isObject,
  isOptionalInt,
  isOptionalText,
  isText,
} from '@/lib/link';

import type { RoutineContents } from './queries';

/**
 * A routine passed from one phone to another, with no server in between: the
 * whole routine travels inside a link, shown as a QR code or sent as text.
 *
 * The link is `https`, because WhatsApp and most chats only let a user tap on
 * web links. It points at a static page (site/rutina/index.html) that hands the
 * routine to the app through `bitacora://routine/import?r=...`, or offers the
 * download to someone who does not have the app. The routine sits after the
 * `#`, which browsers never send to the server. See `@/lib/link`.
 *
 * A QR code holds under 3 KB and a denser one is harder to scan, so the payload
 * uses one-letter keys and a catalogue exercise travels as its dataset id
 * alone.
 *
 * The schedule stays behind on purpose. When a routine falls is the sender's
 * week, not the receiver's.
 */
export const SHARE_VERSION = 1;

export type { SharedExercise };

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

const WEB_PREFIX = 'https://kapparron.github.io/Bitacora/rutina/#';

/** What the web page opens, and what links shared before the page existed use. */
const APP_PREFIX = 'bitacora://routine/import?r=';

/** Generous limit, only there so a hostile code cannot flood the database. */
const MAX_ENTRIES = 60;

export function toSharedRoutine({ routine, entries }: RoutineContents): SharedRoutine {
  return {
    v: SHARE_VERSION,
    n: routine.name,
    o: routine.notes,
    e: entries.map((entry) => ({
      e: toSharedExercise(entry.exercise),
      s: entry.targetSets,
      r: entry.targetReps,
      d: entry.restSeconds,
      g: entry.supersetGroup,
      o: entry.notes,
    })),
  };
}

export function routineLink(shared: SharedRoutine): string {
  return `${WEB_PREFIX}${encodePayload(shared)}`;
}

/**
 * Reads a scanned code, either link, or the `r` parameter of an opened link.
 * Anything that is not a routine this version understands comes back as null:
 * a QR code can say anything, so every field is checked before it gets near the
 * database.
 */
export function parseSharedRoutine(input: string): SharedRoutine | null {
  const prefix = [WEB_PREFIX, APP_PREFIX].find((candidate) => input.startsWith(candidate));
  const value = decodePayload(prefix ? input.slice(prefix.length) : input);

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
  if (!isObject(raw)) return null;

  const e = parseSharedExercise(raw.e);
  if (!e) return null;

  if (!isOptionalInt(raw.s, 1, 100) || !isOptionalInt(raw.d, 0, 3600)) return null;
  if (!isOptionalInt(raw.g, 1, MAX_ENTRIES)) return null;
  if (!isOptionalText(raw.r) || !isOptionalText(raw.o)) return null;

  return {
    e,
    s: raw.s ?? null,
    r: raw.r ?? null,
    d: raw.d ?? null,
    g: raw.g ?? null,
    o: raw.o ?? null,
  };
}
