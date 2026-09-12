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

import { SPANISH_NAMES, SPANISH_NAMES_BY_ID } from './spanish-exercise-names.mjs';

const INPUT = process.argv[2];
const OUTPUT = resolve(process.cwd(), 'assets/data/exercises.json');

if (!INPUT) {
  console.error('usage: node scripts/build-exercise-catalog.mjs <exercises.json>');
  process.exit(1);
}

/** Primary target muscle, which is what the app groups the catalogue by. */
const TARGET_ES = {
  abductors: 'abductores',
  abs: 'abdominales',
  adductors: 'aductores',
  biceps: 'biceps',
  calves: 'gemelos',
  'cardiovascular system': 'cardio',
  delts: 'hombros',
  forearms: 'antebrazos',
  glutes: 'gluteos',
  hamstrings: 'femoral',
  lats: 'dorsales',
  'levator scapulae': 'cuello',
  pectorals: 'pecho',
  quads: 'cuadriceps',
  'serratus anterior': 'serrato',
  spine: 'lumbares',
  traps: 'trapecio',
  triceps: 'triceps',
  'upper back': 'espalda alta',
};

const EQUIPMENT_ES = {
  assisted: 'asistido',
  band: 'banda',
  barbell: 'barra',
  'body weight': 'peso corporal',
  'bosu ball': 'bosu',
  cable: 'polea',
  dumbbell: 'mancuerna',
  'elliptical machine': 'eliptica',
  'ez barbell': 'barra Z',
  hammer: 'maquina hammer',
  kettlebell: 'kettlebell',
  'leverage machine': 'maquina',
  'medicine ball': 'balon medicinal',
  'olympic barbell': 'barra olimpica',
  'resistance band': 'banda elastica',
  roller: 'rodillo',
  rope: 'cuerda',
  'skierg machine': 'skierg',
  'sled machine': 'prensa',
  'smith machine': 'multipower',
  'stability ball': 'fitball',
  'stationary bike': 'bicicleta estatica',
  'stepmill machine': 'escaladora',
  tire: 'neumatico',
  'trap bar': 'barra hexagonal',
  'upper body ergometer': 'ergometro de brazos',
  weighted: 'lastrado',
  'wheel roller': 'rueda abdominal',
};

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
  const cardioEquipment = new Set([
    'stationary bike',
    'elliptical machine',
    'skierg machine',
    'stepmill machine',
    'upper body ergometer',
  ]);

  if (exercise.body_part === 'cardio' || cardioEquipment.has(exercise.equipment)) {
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
