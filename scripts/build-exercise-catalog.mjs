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

/**
 * Spanish names for the lifts a Spanish speaker would search for by that name.
 * Everything not listed keeps its English name from the dataset; the app
 * searches both, so nothing becomes unreachable either way.
 *
 * Keyed by the exact upstream name. A key that stops matching aborts the build
 * rather than silently dropping the translation.
 */
const SPANISH_NAMES = {
  // pecho
  'barbell bench press': 'Press banca con barra',
  'barbell incline bench press': 'Press banca inclinado con barra',
  'barbell decline bench press': 'Press banca declinado con barra',
  'barbell close-grip bench press': 'Press cerrado con barra',
  'dumbbell bench press': 'Press banca con mancuernas',
  'dumbbell incline bench press': 'Press inclinado con mancuernas',
  'dumbbell decline bench press': 'Press declinado con mancuernas',
  'dumbbell fly': 'Aperturas con mancuernas',
  'dumbbell incline fly': 'Aperturas inclinadas con mancuernas',
  'cable cross-over variation': 'Cruces en polea',
  'lever chest press': 'Press de pecho en maquina',
  'lever seated fly': 'Contractor de pecho',
  'chest dip': 'Fondos en paralelas',
  'push-up': 'Flexiones',
  'close-grip push-up': 'Flexiones cerradas',
  'decline push-up': 'Flexiones declinadas',
  'diamond push-up': 'Flexiones diamante',
  'barbell pullover': 'Pullover con barra',
  'dumbbell pullover': 'Pullover con mancuerna',

  // espalda
  'pull-up': 'Dominadas',
  'chin-up': 'Dominadas supinas',
  'assisted pull-up': 'Dominadas asistidas',
  'cable bar lateral pulldown': 'Jalon al pecho',
  'cable lat pulldown full range of motion': 'Jalon al pecho completo',
  'barbell bent over row': 'Remo con barra',
  'barbell reverse grip bent over row': 'Remo con barra supino',
  'dumbbell bent over row': 'Remo con mancuerna',
  'cable seated row': 'Remo sentado en polea',
  'cable low seated row': 'Remo bajo en polea',
  'lever bent over row': 'Remo en maquina',
  'barbell deadlift': 'Peso muerto',
  'barbell romanian deadlift': 'Peso muerto rumano',
  'barbell sumo deadlift': 'Peso muerto sumo',
  'barbell straight leg deadlift': 'Peso muerto piernas rigidas',
  'barbell rack pull': 'Rack pull',
  'barbell shrug': 'Encogimientos con barra',
  'dumbbell shrug': 'Encogimientos con mancuernas',
  'lever reverse hyperextension': 'Hiperextensiones',

  // hombros
  'barbell seated overhead press': 'Press militar sentado con barra',
  'barbell standing close grip military press': 'Press militar de pie',
  'dumbbell standing overhead press': 'Press militar con mancuernas',
  'dumbbell seated shoulder press': 'Press hombro sentado con mancuernas',
  'dumbbell arnold press': 'Press Arnold',
  'dumbbell lateral raise': 'Elevaciones laterales',
  'cable lateral raise': 'Elevaciones laterales en polea',
  'dumbbell front raise': 'Elevaciones frontales',
  'dumbbell reverse fly': 'Pajaros',
  'lever seated reverse fly': 'Deltoide posterior en maquina',
  'lever shoulder press': 'Press hombro en maquina',
  'barbell upright row': 'Remo al menton',

  // biceps
  'barbell curl': 'Curl con barra',
  'dumbbell biceps curl': 'Curl con mancuernas',
  'dumbbell alternate biceps curl': 'Curl alterno con mancuernas',
  'dumbbell hammer curl': 'Curl martillo',
  'dumbbell concentration curl': 'Curl concentrado',
  'barbell preacher curl': 'Curl predicador con barra',
  'dumbbell preacher curl': 'Curl predicador con mancuerna',
  'cable curl': 'Curl en polea',
  'dumbbell incline curl': 'Curl inclinado',
  'barbell reverse curl': 'Curl inverso',

  // triceps
  'barbell lying triceps extension': 'Press frances',
  'cable pushdown': 'Extension de triceps en polea',
  'cable pushdown (with rope attachment)': 'Extension de triceps con cuerda',
  'cable triceps pushdown (v-bar)': 'Extension de triceps con barra V',
  'dumbbell kickback': 'Patada de triceps',
  'bench dip on floor': 'Fondos en banco',
  'assisted triceps dip (kneeling)': 'Fondos de triceps asistidos',

  // antebrazo
  'barbell wrist curl': 'Curl de muneca',
  'barbell reverse wrist curl': 'Curl de muneca inverso',

  // pierna
  'barbell full squat': 'Sentadilla con barra',
  'barbell front squat': 'Sentadilla frontal',
  'barbell hack squat': 'Sentadilla hack',
  'dumbbell squat': 'Sentadilla con mancuernas',
  'smith squat': 'Sentadilla en multipower',
  'sled 45 degrees one leg press': 'Prensa a una pierna',
  'lever leg extension': 'Extension de cuadriceps',
  'lever lying leg curl': 'Curl femoral tumbado',
  'lever seated leg curl': 'Curl femoral sentado',
  'barbell good morning': 'Buenos dias',
  'glute-ham raise': 'Curl nordico',
  'barbell glute bridge': 'Puente de gluteos con barra',
  'barbell lunge': 'Zancadas con barra',
  'dumbbell lunge': 'Zancadas con mancuernas',
  'walking lunge': 'Zancadas caminando',
  'dumbbell single leg split squat': 'Sentadilla bulgara',
  'dumbbell step-up': 'Step up con mancuernas',
  'lever seated hip abduction': 'Abduccion de cadera en maquina',
  'barbell standing calf raise': 'Elevacion de talones de pie',
  'lever seated calf raise': 'Elevacion de talones sentado',

  // core
  'crunch floor': 'Crunch abdominal',
  'cable kneeling crunch': 'Crunch en polea',
  'hanging leg raise': 'Elevacion de piernas colgado',
  'russian twist': 'Russian twist',
  'barbell rollerout': 'Rueda abdominal con barra',
  'dead bug': 'Dead bug',
  'reverse crunch': 'Crunch inverso',

  // cuerpo completo y cardio
  burpee: 'Burpees',
  'kettlebell swing': 'Swing con kettlebell',
  'power clean': 'Cargada de potencia',
  'barbell thruster': 'Thruster',
  run: 'Carrera',
  'walking on incline treadmill': 'Cinta de correr',
  'walk elliptical cross trainer': 'Eliptica',
  'stationary bike run v. 3': 'Bicicleta estatica',
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

const missing = Object.keys(SPANISH_NAMES).filter((name) => !byName.has(name));
if (missing.length > 0) {
  console.error('These Spanish aliases no longer match an upstream name:');
  for (const name of missing) console.error('  ' + name);
  process.exit(1);
}

const catalogue = raw.map((exercise) => {
  const spanish = SPANISH_NAMES[exercise.name];
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
