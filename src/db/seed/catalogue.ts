import catalogue from '@/assets/data/exercises.json';

/**
 * Built-in exercise catalogue, generated from
 * https://github.com/hasaneyldrm/exercises-dataset by
 * `scripts/build-exercise-catalog.mjs`. The data is MIT licensed; the media it
 * points at belongs to Gym visual and is only referenced, never bundled.
 */
export type CatalogueExercise = {
  /** Upstream id, zero-padded to four digits. */
  id: string;
  /** Spanish name where one exists, otherwise the original English name. */
  name: string;
  nameEn: string;
  muscleGroup: string;
  equipment: string;
  bodyPart: string;
  steps: string[];
  image: string;
  gif: string;
  tracking: 'weight_reps' | 'reps' | 'duration' | 'distance_duration';
};

export const CATALOGUE = catalogue as CatalogueExercise[];
