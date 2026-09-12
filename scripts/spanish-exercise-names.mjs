// Kept apart from the build script so scripts/checks can read the same list
// and prove the shipped catalogue still carries every name in it.

/**
 * Spanish names for the lifts a Spanish speaker would search for by that name.
 * Everything not listed keeps its English name from the dataset; the app
 * searches both, so nothing becomes unreachable either way.
 *
 * Keyed by the exact upstream name. A key that stops matching aborts the build
 * rather than silently dropping the translation.
 */
export const SPANISH_NAMES = {
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
  'lever bent over row': 'Remo inclinado con barra',
  'lever one arm bent over row': 'Remo a una mano con barra',
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
  'inverse leg curl (on pull-up cable machine)': 'Curl femoral inverso',
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

/**
 * Names for the exercises the upstream dataset gives the same name twice, which
 * would otherwise show up as two identical rows in the catalogue. They are
 * different variations, so each id gets the name its own image shows, and the
 * id is the only thing that tells them apart.
 *
 * Applied on top of SPANISH_NAMES. An id that is no longer in the dataset
 * aborts the build.
 */
export const SPANISH_NAMES_BY_ID = {
  // barbell seated calf raise
  '0088': 'Elevacion de talones sentado con barra',
  '1371': 'Elevacion de talones sentado con barra y disco',

  // ez barbell spider curl
  '0454': 'Curl spider con barra Z',
  '1628': 'Curl con barra Z de pie',

  // lever chest press
  '0576': 'Press de pecho en maquina de discos',
  '0577': 'Press de pecho en maquina',

  // push-up (on stability ball)
  '0655': 'Flexiones con manos en fitball',
  '0656': 'Flexiones con pies en fitball',

  // self assisted inverse leg curl
  '0697': 'Curl femoral inverso asistido',
  '1766': 'Curl nordico asistido',

  // smith reverse calf raises
  '0763': 'Elevacion de talones inversa en multipower con plataforma',
  '1394': 'Elevacion de talones inversa en multipower',
};
