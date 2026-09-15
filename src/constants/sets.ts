import setsData from '@/data/sets.json';

/**
 * What a set can be and how an exercise is measured, read from `data/sets.json`
 * so the app, the shared link and the web page all say the same thing.
 *
 * The ids are written twice on purpose: TypeScript widens a string in an
 * imported JSON file to `string`, so a union cannot be derived from it. They are
 * declared here once as a tuple, and `scripts/checks/data.test.mjs` fails if
 * they ever stop matching the file.
 */
export const SET_TYPE_IDS = ['normal', 'warmup', 'drop', 'failure'] as const;
export type SetType = (typeof SET_TYPE_IDS)[number];

export const TRACKING_TYPE_IDS = [
  'weight_reps',
  'reps',
  'duration',
  'distance_duration',
] as const;
export type TrackingType = (typeof TRACKING_TYPE_IDS)[number];

export type SetTypeDefinition = {
  id: SetType;
  /** Letter this type travels as inside a shared link; a normal set has none. */
  code: string;
  /** Letter shown in the set-number column, where a normal set shows its number. */
  badge: string;
  label: string;
  description: string;
  /** Warm-ups are the reason this exists: they are not part of the volume. */
  countsForVolume: boolean;
};

export type TrackingTypeDefinition = { id: TrackingType; label: string };

export const SET_TYPES = setsData.setTypes as readonly SetTypeDefinition[];

export const TRACKING_TYPES = setsData.trackingTypes as readonly TrackingTypeDefinition[];

function definitionOf(type: SetType): SetTypeDefinition {
  const found = SET_TYPES.find((definition) => definition.id === type);
  if (!found) throw new Error(`set type without a definition: ${type}`);
  return found;
}

/** The letter a set of this type travels as; empty for a normal set. */
export function codeOf(type: SetType): string {
  return definitionOf(type).code;
}

/** The type a letter stands for, or `normal` when it is not one. */
export function typeOfCode(code: string): SetType {
  return SET_TYPES.find((definition) => definition.code !== '' && definition.code === code)?.id ?? 'normal';
}

export function badgeOf(type: SetType): string {
  return definitionOf(type).badge;
}

export function countsForVolume(type: SetType): boolean {
  return definitionOf(type).countsForVolume;
}

/**
 * Types a working set is never one of, which is what the volume rule and the
 * set numbering both turn on. Exported as a list so the SQL aggregates can name
 * it too, instead of each one spelling out `<> 'warmup'`.
 */
export const UNCOUNTED_SET_TYPES: SetType[] = SET_TYPES.filter(
  (type) => !type.countsForVolume
).map((type) => type.id);
