// Turns the upstream exercises-dataset dump into the trimmed catalogue that
// ships inside the app.
//
//   node scripts/build-exercise-catalog.mjs path/to/exercises.json
//
// The upstream file is 17 MB because it carries ten languages. We keep Spanish
// only, plus the fields the app actually reads, which brings it under 1 MB.
//
// Source: https://github.com/hasaneyldrm/exercises-dataset (data: MIT).
// Media stays on the CDN and belongs to Gym visual — see docs/PLAN.md.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { buildData, CATALOGUE as OUTPUT, ROOT } from './build-data.mjs';
import { SPANISH_NAMES, SPANISH_NAMES_BY_ID } from './spanish-exercise-names.mjs';

const INPUT = process.argv[2];

if (!INPUT) {
  console.error('usage: node scripts/build-exercise-catalog.mjs <exercises.json>');
  process.exit(1);
}

/**
 * How each upstream muscle and each piece of equipment is named in Spanish,
 * which pieces are variants of a broader one and which ones are cardio
 * machines: all of it in `data/vocabulary.json`, which the app's filters and
 * `scripts/checks/catalogue.test.mjs` read too.
 */
const VOCABULARY = JSON.parse(
  readFileSync(resolve(ROOT, 'data/vocabulary.json'), 'utf8')
);

const TARGET_ES = Object.fromEntries(VOCABULARY.muscles.map((m) => [m.en, m.es]));
const EQUIPMENT_ES = Object.fromEntries(VOCABULARY.equipment.map((e) => [e.en, e.es]));
const CARDIO_EQUIPMENT = new Set(
  VOCABULARY.equipment.filter((e) => e.cardio).map((e) => e.en)
);

/** Cyrillic leftovers from the upstream encoding of the degree sign. */
function cleanName(name) {
  return name.replace(/в°/g, '°').trim();
}

/**
 * How a set of this exercise is measured. The dataset has no such field, so it
 * is inferred; a wrong guess only changes which inputs a set row shows.
 */
function trackingTypeFor(exercise) {
  const name = exercise.name;
  if (exercise.body_part === 'cardio' || CARDIO_EQUIPMENT.has(exercise.equipment)) {
    return 'distance_duration';
  }

  if (/\b(plank|hold|stretch|hang|l-sit|v-sit|bridge v|lever|planche|flag)\b/.test(name)) {
    if (/\b(plank|hold|stretch|hang|l-sit|v-sit|planche|flag)\b/.test(name)) return 'duration';
  }

  if (exercise.equipment === 'body weight') return 'reps';

  return 'weight_reps';
}

const raw = JSON.parse(readFileSync(INPUT, 'utf8'));
const byName = new Map(raw.map((exercise) => [exercise.name, exercise]));
const byId = new Map(raw.map((exercise) => [exercise.id, exercise]));

const missing = [
  ...Object.keys(SPANISH_NAMES).filter((name) => !byName.has(name)),
  ...Object.keys(SPANISH_NAMES_BY_ID).filter((id) => !byId.has(id)),
];
if (missing.length > 0) {
  console.error('These Spanish aliases no longer match an upstream record:');
  for (const key of missing) console.error('  ' + key);
  process.exit(1);
}

const catalogue = raw.map((exercise) => {
  const spanish = SPANISH_NAMES_BY_ID[exercise.id] ?? SPANISH_NAMES[exercise.name];
  const english = cleanName(exercise.name);

  return {
    id: exercise.id,
    name: spanish ?? english,
    // Kept so search works for someone typing the English name, and so the
    // Spanish alias can be traced back to its source record.
    nameEn: english,
    muscleGroup: TARGET_ES[exercise.target] ?? exercise.target,
    equipment: EQUIPMENT_ES[exercise.equipment] ?? exercise.equipment,
    bodyPart: exercise.body_part,
    // Only the step array is kept: the upstream "instructions" field is the same
    // text joined into one paragraph, and shipping both doubled the file.
    steps: exercise.instruction_steps.es,
    image: exercise.image,
    gif: exercise.gif_url,
    tracking: trackingTypeFor(exercise),
  };
});

catalogue.sort((a, b) => a.id.localeCompare(b.id));

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(catalogue));

const translated = catalogue.filter((exercise) => exercise.name !== exercise.nameEn).length;
const bytes = Buffer.byteLength(JSON.stringify(catalogue));

console.log(`${catalogue.length} exercises, ${translated} with a Spanish name`);
console.log(`${(bytes / 1024 / 1024).toFixed(2)} MB written to ${OUTPUT}`);

// The pages name exercises by the same ids, so everything the web is served
// out of `data/` is regenerated here and never falls behind.
const web = buildData();
console.log(`${(web.bytes / 1024).toFixed(0)} KB written to the web catalogue`);
