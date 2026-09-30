import assert from 'node:assert/strict';
import { test } from 'node:test';

import catalogue from '@/data/exercises.json';
import vocabulary from '@/data/vocabulary.json';
import type { WorkoutSet } from '@/db/schema';
import { MUSCLE_AXES, axisOf, bodyLoad, bodyPartOf, muscleLoad } from '@/features/workout/muscles';

// The part names react-native-body-highlighter draws. Checked here so a typo in
// the vocabulary is caught before it silently paints nothing.
const BODY_PARTS = [
  'abs', 'adductors', 'biceps', 'calves', 'chest', 'deltoids', 'forearm', 'gluteal',
  'hamstring', 'lower-back', 'neck', 'obliques', 'quadriceps', 'trapezius', 'triceps', 'upper-back',
];

const AXIS_IDS = MUSCLE_AXES.map((axis) => axis.id);

test('the chart has six axes, with chest opposite back', () => {
  assert.equal(AXIS_IDS.length, 6);
  assert.equal(AXIS_IDS.indexOf('espalda') - AXIS_IDS.indexOf('pecho'), 3);
});

test('every muscle group of the vocabulary names an axis, or none on purpose', () => {
  for (const muscle of vocabulary.muscles) {
    assert.ok('axis' in muscle, `${muscle.es} no dice a que eje va`);
    assert.ok(
      muscle.axis === null || AXIS_IDS.includes(muscle.axis),
      `${muscle.es} va a un eje que no existe: ${muscle.axis}`
    );
  }

  const left = vocabulary.muscles.filter((muscle) => muscle.axis === null).map((m) => m.es);
  assert.deepEqual(left.sort(), ['cardio', 'cuello']);
});

test('every axis lights up for part of the catalogue', () => {
  const counts = new Map<string, number>();
  for (const exercise of catalogue) {
    const axis = axisOf(exercise.muscleGroup);
    if (axis) counts.set(axis, (counts.get(axis) ?? 0) + 1);
  }

  for (const axis of AXIS_IDS) assert.ok((counts.get(axis) ?? 0) > 50, `${axis} casi no tiene ejercicios`);
});

test('arms, back and legs gather the groups the issue decided', () => {
  assert.equal(axisOf('biceps'), 'brazos');
  assert.equal(axisOf('triceps'), 'brazos');
  assert.equal(axisOf('lumbares'), 'espalda');
  assert.equal(axisOf('trapecio'), 'espalda');
  assert.equal(axisOf('serrato'), 'pecho');
  assert.equal(axisOf('gluteos'), 'pierna');
  // A group typed by hand for a custom exercise is not guessed at.
  assert.equal(axisOf('anillas'), null);
  assert.equal(axisOf(' Pecho '), 'pecho');
});

function sets(...types: (WorkoutSet['type'] | 'unchecked')[]) {
  return types.map((type) =>
    type === 'unchecked' ? { completed: false, type: 'normal' as const } : { completed: true, type }
  );
}

test('the load counts working sets per axis, never warm-ups or unchecked ones', () => {
  const load = muscleLoad([
    { exercise: { muscleGroup: 'pecho' }, sets: sets('warmup', 'normal', 'normal', 'unchecked') },
    { exercise: { muscleGroup: 'triceps' }, sets: sets('normal', 'drop') },
    { exercise: { muscleGroup: 'biceps' }, sets: sets('failure') },
    { exercise: { muscleGroup: 'cardio' }, sets: sets('normal') },
    { exercise: { muscleGroup: 'anillas' }, sets: sets('normal') },
  ]);

  assert.deepEqual(load, { pecho: 2, hombro: 0, brazos: 3, espalda: 0, pierna: 0, core: 0 });
});

test('every muscle group sits on a part of the drawn body, except cardio', () => {
  for (const muscle of vocabulary.muscles) {
    assert.ok('body' in muscle, `${muscle.es} no dice donde va en el cuerpo`);
    if (muscle.es === 'cardio') assert.equal(muscle.body, null);
    else assert.ok(BODY_PARTS.includes(muscle.body as string), `${muscle.es}: ${muscle.body}`);
  }

  assert.equal(bodyPartOf('dorsales'), bodyPartOf('espalda alta'));
  assert.equal(bodyPartOf('anillas'), null);
});

test('the body shades each part by its working sets, adding up groups that share it', () => {
  const load = bodyLoad([
    { exercise: { muscleGroup: 'dorsales' }, sets: sets('normal', 'normal', 'normal') },
    { exercise: { muscleGroup: 'espalda alta' }, sets: sets('normal', 'warmup') },
    { exercise: { muscleGroup: 'pecho' }, sets: sets(...Array(8).fill('normal')) },
    { exercise: { muscleGroup: 'biceps' }, sets: sets('normal') },
    { exercise: { muscleGroup: 'gemelos' }, sets: sets('warmup', 'unchecked') },
    { exercise: { muscleGroup: 'cardio' }, sets: sets('normal') },
  ]);

  assert.deepEqual(
    load.map(({ part, sets: count, shade }) => [part, count, shade]).sort(),
    [
      ['biceps', 1, 1],
      ['chest', 8, 3],
      ['upper-back', 4, 2],
    ]
  );
});
