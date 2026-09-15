// Guards the shipped catalogue against the ways the automatic translation of
// the upstream dataset goes wrong: a name that claims one piece of equipment
// while `equipment` says another, two exercises sharing a name, and entries
// that never got a Spanish name.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { SPANISH_NAMES, SPANISH_NAMES_BY_ID } from '../spanish-exercise-names.mjs';

const CATALOGUE = JSON.parse(
  readFileSync(new URL('../../assets/data/exercises.json', import.meta.url), 'utf8')
);

/**
 * How a name refers to each piece of equipment, in the Spanish we write and in
 * the English the dataset ships. A name that matches one of these and carries a
 * different `equipment` is contradictory — that is how "Remo en maquina" (id
 * 0574, a barbell row) was found.
 *
 * The exclusions are names where the word does not mean the equipment it looks
 * like: an EZ or olympic bar is not a straight bar, a V-bar or a rope is a
 * cable attachment, and a front or back lever is a calisthenics hold, not a
 * machine.
 */
const NAME_SAYS = {
  barra: /\bcon barra\b(?! [VZ]\b)|(?<!ez[- ])(?<!olympic )\bbarbell\b/i,
  'barra Z': /\bcon barra Z\b|\bez[- ]barbell\b/i,
  'barra olimpica': /\bolympic barbell\b/i,
  mancuerna: /\bcon mancuernas?\b|\bdumbbell\b/i,
  polea: /\ben polea\b|\bcon cuerda\b|\bcon barra V\b|\bcable\b/i,
  maquina: /\ben maquina\b|(?<!front )(?<!back )\blever\b/i,
  multipower: /\ben multipower\b|\bsmith\b/i,
  kettlebell: /\bkettlebell\b/i,
  banda: /\bcon banda\b|(?<!resistance )\bband\b/i,
  prensa: /\bprensa\b|\bsled\b/i,
  'peso corporal': /\bpeso corporal\b|\bbody weight\b/i,
};

/**
 * Exercises still carrying their English name. Translating one lowers this; the
 * check only stops it from growing, since the dataset is far too big to
 * translate whole.
 */
const MAX_UNTRANSLATED = 1207;

/** The name the rebuild would write, with the precedence the build script uses. */
function rebuiltName(exercise) {
  return SPANISH_NAMES_BY_ID[exercise.id] ?? SPANISH_NAMES[exercise.nameEn] ?? exercise.nameEn;
}

test('no exercise name names equipment other than its own', () => {
  const wrong = CATALOGUE.flatMap((exercise) => {
    const says = Object.entries(NAME_SAYS)
      .filter(([, pattern]) => pattern.test(exercise.name))
      .map(([equipment]) => equipment);

    if (says.length === 0 || says.includes(exercise.equipment)) return [];

    return [`${exercise.id} "${exercise.name}" dice ${says.join('/')} y es ${exercise.equipment}`];
  });

  assert.deepEqual(wrong, [], `nombre y material no cuadran:\n  ${wrong.join('\n  ')}`);
});

test('the corrected names survive a catalogue rebuild', () => {
  // A name fixed only in the JSON is lost on the next build; this catches it.
  const drifted = CATALOGUE.filter((exercise) => exercise.name !== rebuiltName(exercise)).map(
    (exercise) => `${exercise.id} "${exercise.name}" volveria a ser "${rebuiltName(exercise)}"`
  );

  assert.deepEqual(drifted, [], `el rebuild los renombraria:\n  ${drifted.join('\n  ')}`);
});

test('no two exercises share a name', () => {
  const byName = new Map();
  for (const exercise of CATALOGUE) {
    byName.set(exercise.name, [...(byName.get(exercise.name) ?? []), exercise.id]);
  }

  // Two identical rows in a list are unusable. The dataset repeats a name across
  // variations, so each one is renamed by id in SPANISH_NAMES_BY_ID.
  const repeated = [...byName]
    .filter(([, ids]) => ids.length > 1)
    .map(([name, ids]) => `"${name}" en ${ids.join(', ')}`);

  assert.deepEqual(repeated, [], `nombres repetidos:\n  ${repeated.join('\n  ')}`);
});

test('the untranslated exercises are listed and do not grow', () => {
  const untranslated = CATALOGUE.filter((exercise) => exercise.name === exercise.nameEn);

  console.log(`${untranslated.length} de ${CATALOGUE.length} ejercicios siguen en ingles:`);
  for (const exercise of untranslated) {
    console.log(`  ${exercise.id} ${exercise.nameEn} (${exercise.equipment})`);
  }

  assert.ok(
    untranslated.length <= MAX_UNTRANSLATED,
    `sin traducir ${untranslated.length}, el maximo es ${MAX_UNTRANSLATED}`
  );
});
