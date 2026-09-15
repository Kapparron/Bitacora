import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import QRCode from 'qrcode';

import type { Exercise, WorkoutSet } from '@/db/schema';
import type { WorkoutContents } from '@/features/workout/queries';
import {
  SHARE_VERSION,
  encodeSets,
  toSharedWorkout,
  workoutLink,
  type SharedWorkout,
} from '@/features/workout/share';

// The page that reads what the app writes. Importing it here is the point of
// the file: one grammar, checked from both ends.
import {
  decodeSets,
  formatSet,
  parseSharedWorkout,
  setCountOf,
  volumeOf,
} from '../../site/entreno/entreno.js';
import { APP_CATALOGUE, WEB_CATALOGUE, webCatalogue } from '../build-web-catalog.mjs';

function set(fields: Partial<WorkoutSet>): WorkoutSet {
  return {
    id: 'set',
    workoutExerciseId: 'we',
    position: 0,
    type: 'normal',
    weight: null,
    reps: null,
    rpe: null,
    distanceM: null,
    durationS: null,
    completed: true,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    ...fields,
  };
}

function exercise(fields: Partial<Exercise>): Exercise {
  return {
    id: 'e',
    externalId: '0025',
    name: 'Press banca',
    nameEn: 'bench press',
    muscleGroup: 'pecho',
    equipment: 'barra',
    bodyPart: 'chest',
    steps: null,
    imagePath: null,
    gifPath: null,
    trackingType: 'weight_reps',
    notes: null,
    isCustom: false,
    ...fields,
  } as Exercise;
}

test('a set says exactly what was written down, and nothing more', () => {
  assert.equal(encodeSets([set({ weight: 60, reps: 8 })]), '60x8');
  assert.equal(encodeSets([set({ weight: 62.5, reps: 8, rpe: 8.5 })]), '62.5x8@8.5');
  assert.equal(encodeSets([set({ reps: 12, type: 'warmup' })]), 'wx12');
  assert.equal(encodeSets([set({ weight: 40, reps: 12, type: 'drop' })]), 'd40x12');
  assert.equal(encodeSets([set({ reps: 6, type: 'failure' })]), 'fx6');
  assert.equal(encodeSets([set({ durationS: 90 })]), '90s');
  assert.equal(encodeSets([set({ distanceM: 1000, durationS: 240 })]), '1000m240s');
  assert.equal(encodeSets([set({})]), '-');

  // A set left unchecked was never performed, so it does not travel.
  assert.equal(encodeSets([set({ weight: 60, reps: 8, completed: false })]), '');
});

test('the page reads back every set the app can write', () => {
  const written = encodeSets([
    set({ weight: 20, reps: 10, type: 'warmup' }),
    set({ weight: 60, reps: 8, rpe: 8 }),
    set({ weight: 62.5, reps: 6, type: 'failure' }),
    set({ durationS: 45 }),
    set({ distanceM: 1500.5, durationS: 300 }),
    set({}),
  ]);

  assert.equal(written, 'w20x10,60x8@8,f62.5x6,45s,1500.5m300s,-');
  assert.deepEqual(decodeSets(written), [
    { type: 'warmup', weight: 20, reps: 10, distanceM: null, durationS: null, rpe: null },
    { type: 'normal', weight: 60, reps: 8, distanceM: null, durationS: null, rpe: 8 },
    { type: 'failure', weight: 62.5, reps: 6, distanceM: null, durationS: null, rpe: null },
    { type: 'normal', weight: null, reps: null, distanceM: null, durationS: 45, rpe: null },
    { type: 'normal', weight: null, reps: null, distanceM: 1500.5, durationS: 300, rpe: null },
    { type: 'normal', weight: null, reps: null, distanceM: null, durationS: null, rpe: null },
  ]);
});

test('anything that is not a set is refused', () => {
  for (const written of ['', 'x', '60', '60x8x2', 'z60x8', '60x8@11', '-60x8', '60xocho', '@8']) {
    assert.equal(decodeSets(written), null, `deberia rechazar "${written}"`);
  }
});

test('a session survives the link, accents included', () => {
  const contents = {
    workout: {
      id: 'w',
      routineId: null,
      name: 'Empuje · día ñ',
      startedAt: 1789469400000,
      finishedAt: 1789473720000,
      notes: 'Buenas sensaciones',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
    entries: [
      {
        workoutExerciseId: 'we1',
        position: 0,
        exercise: exercise({}),
        supersetGroup: 1,
        restSeconds: 120,
        notes: 'Bajar lento',
        sets: [set({ weight: 20, reps: 10, type: 'warmup' }), set({ weight: 60, reps: 8 })],
      },
      {
        workoutExerciseId: 'we2',
        position: 1,
        exercise: exercise({ externalId: null, isCustom: true, name: 'Remo en anillas' }),
        supersetGroup: null,
        restSeconds: null,
        notes: null,
        sets: [set({ reps: 12 })],
      },
      // Opened during the session and never performed: it is not part of it.
      {
        workoutExerciseId: 'we3',
        position: 2,
        exercise: exercise({ externalId: '0031' }),
        supersetGroup: null,
        restSeconds: null,
        notes: null,
        sets: [set({ weight: 80, reps: 5, completed: false })],
      },
    ],
  } as WorkoutContents;

  const shared = toSharedWorkout(contents);

  assert.deepEqual(shared, {
    v: SHARE_VERSION,
    n: 'Empuje · día ñ',
    // Seconds, not milliseconds, and the length of the session rather than its end.
    t: 1789469400,
    d: 4320,
    o: 'Buenas sensaciones',
    e: [
      { e: { x: '0025' }, s: 'w20x10,60x8', g: 1, o: 'Bajar lento' },
      {
        e: { n: 'Remo en anillas', m: 'pecho', q: 'barra', t: 'weight_reps' },
        s: 'x12',
        g: null,
        o: null,
      },
    ],
  } as SharedWorkout);

  const link = workoutLink(shared);
  assert.match(link, /^https:\/\/kapparron\.github\.io\/Bitacora\/entreno\/#[A-Za-z0-9_-]+$/);

  const read = parseSharedWorkout(link);
  assert.ok(read, 'el enlace tiene que volver a leerse');
  assert.equal(read.n, 'Empuje · día ñ');
  assert.equal(read.d, 4320);
  assert.equal(read.e[0].g, 1);
  assert.deepEqual(read.e[1].e, { n: 'Remo en anillas', m: 'pecho', q: 'barra' });

  // The page counts what the app's own summary counts: warm-ups are sets, but
  // they are not volume.
  assert.equal(volumeOf(read.e), 480);
  assert.equal(setCountOf(read.e), 3);
  assert.equal(formatSet(read.e[0].sets[1]), '60 kg × 8');
});

test('anything that is not a session is refused', () => {
  const link = (shared: unknown) => workoutLink(shared as SharedWorkout);
  const base: SharedWorkout = {
    v: SHARE_VERSION,
    n: 'Empuje',
    t: 1789469400,
    d: 4320,
    o: null,
    e: [{ e: { x: '0025' }, s: '60x8', g: null, o: null }],
  };

  assert.equal(parseSharedWorkout('https://example.com'), null);
  assert.equal(parseSharedWorkout(link({ ...base, v: 99 })), null);
  assert.equal(parseSharedWorkout(link({ ...base, t: 'ayer' })), null);
  assert.equal(parseSharedWorkout(link({ ...base, n: 'a'.repeat(1000) })), null);
  assert.equal(parseSharedWorkout(link({ ...base, e: [{ ...base.e[0], s: 'nope' }] })), null);
  assert.equal(parseSharedWorkout(link({ ...base, e: [{ ...base.e[0], e: {} }] })), null);
  assert.notEqual(parseSharedWorkout(link(base)), null);
});

test('a long session still fits in a QR code', () => {
  const shared: SharedWorkout = {
    v: SHARE_VERSION,
    n: 'Cuerpo entero',
    t: 1789469400,
    d: 5400,
    o: null,
    e: Array.from({ length: 12 }, (_, index) => ({
      e: { x: String(1000 + index) },
      s: 'w40x10,80x8@8,80x8,80x7,d60x10',
      g: null,
      o: null,
    })),
  };

  // Throws when the text is past what the largest QR code holds.
  assert.doesNotThrow(() => QRCode.create(workoutLink(shared), { errorCorrectionLevel: 'L' }));
});

test('the catalogue the page loads matches the one the app ships', () => {
  const app = JSON.parse(readFileSync(APP_CATALOGUE, 'utf8'));
  const published = JSON.parse(readFileSync(WEB_CATALOGUE, 'utf8'));

  // Run `npm run build:web-catalog` when this fails.
  assert.deepEqual(published, webCatalogue(app));
});
