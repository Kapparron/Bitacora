/**
 * Built-in exercise catalogue. Names are Spanish because the UI is Spanish; the
 * seeder matches on name, so renaming an entry here creates a new exercise
 * instead of updating the old one.
 */
export type SeedExercise = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  trackingType?: 'weight_reps' | 'reps' | 'duration' | 'distance_duration';
};

export type MuscleGroup =
  | 'pecho'
  | 'espalda'
  | 'hombros'
  | 'biceps'
  | 'triceps'
  | 'antebrazo'
  | 'cuadriceps'
  | 'femoral'
  | 'gluteo'
  | 'gemelo'
  | 'core'
  | 'cardio'
  | 'cuerpo completo';

export type Equipment =
  | 'barra'
  | 'mancuerna'
  | 'maquina'
  | 'polea'
  | 'peso corporal'
  | 'kettlebell'
  | 'banda'
  | 'otro';

export const SEED_EXERCISES: SeedExercise[] = [
  // pecho
  { name: 'Press banca', muscleGroup: 'pecho', equipment: 'barra' },
  { name: 'Press banca inclinado', muscleGroup: 'pecho', equipment: 'barra' },
  { name: 'Press banca declinado', muscleGroup: 'pecho', equipment: 'barra' },
  { name: 'Press banca con mancuernas', muscleGroup: 'pecho', equipment: 'mancuerna' },
  { name: 'Press inclinado con mancuernas', muscleGroup: 'pecho', equipment: 'mancuerna' },
  { name: 'Aperturas con mancuernas', muscleGroup: 'pecho', equipment: 'mancuerna' },
  { name: 'Aperturas en polea', muscleGroup: 'pecho', equipment: 'polea' },
  { name: 'Press en maquina', muscleGroup: 'pecho', equipment: 'maquina' },
  { name: 'Peck deck', muscleGroup: 'pecho', equipment: 'maquina' },
  { name: 'Fondos en paralelas', muscleGroup: 'pecho', equipment: 'peso corporal', trackingType: 'reps' },
  { name: 'Flexiones', muscleGroup: 'pecho', equipment: 'peso corporal', trackingType: 'reps' },
  { name: 'Pullover con mancuerna', muscleGroup: 'pecho', equipment: 'mancuerna' },

  // espalda
  { name: 'Dominadas', muscleGroup: 'espalda', equipment: 'peso corporal', trackingType: 'reps' },
  { name: 'Dominadas supinas', muscleGroup: 'espalda', equipment: 'peso corporal', trackingType: 'reps' },
  { name: 'Jalon al pecho', muscleGroup: 'espalda', equipment: 'polea' },
  { name: 'Jalon tras nuca', muscleGroup: 'espalda', equipment: 'polea' },
  { name: 'Remo con barra', muscleGroup: 'espalda', equipment: 'barra' },
  { name: 'Remo Pendlay', muscleGroup: 'espalda', equipment: 'barra' },
  { name: 'Remo con mancuerna', muscleGroup: 'espalda', equipment: 'mancuerna' },
  { name: 'Remo en polea baja', muscleGroup: 'espalda', equipment: 'polea' },
  { name: 'Remo en maquina', muscleGroup: 'espalda', equipment: 'maquina' },
  { name: 'Remo en T', muscleGroup: 'espalda', equipment: 'barra' },
  { name: 'Pull over en polea', muscleGroup: 'espalda', equipment: 'polea' },
  { name: 'Peso muerto', muscleGroup: 'espalda', equipment: 'barra' },
  { name: 'Peso muerto sumo', muscleGroup: 'espalda', equipment: 'barra' },
  { name: 'Rack pull', muscleGroup: 'espalda', equipment: 'barra' },
  { name: 'Encogimientos con barra', muscleGroup: 'espalda', equipment: 'barra' },
  { name: 'Encogimientos con mancuernas', muscleGroup: 'espalda', equipment: 'mancuerna' },
  { name: 'Hiperextensiones', muscleGroup: 'espalda', equipment: 'peso corporal', trackingType: 'reps' },
  { name: 'Face pull', muscleGroup: 'espalda', equipment: 'polea' },

  // hombros
  { name: 'Press militar', muscleGroup: 'hombros', equipment: 'barra' },
  { name: 'Press militar sentado', muscleGroup: 'hombros', equipment: 'barra' },
  { name: 'Press hombro con mancuernas', muscleGroup: 'hombros', equipment: 'mancuerna' },
  { name: 'Press Arnold', muscleGroup: 'hombros', equipment: 'mancuerna' },
  { name: 'Elevaciones laterales', muscleGroup: 'hombros', equipment: 'mancuerna' },
  { name: 'Elevaciones laterales en polea', muscleGroup: 'hombros', equipment: 'polea' },
  { name: 'Elevaciones frontales', muscleGroup: 'hombros', equipment: 'mancuerna' },
  { name: 'Pajaros', muscleGroup: 'hombros', equipment: 'mancuerna' },
  { name: 'Deltoide posterior en maquina', muscleGroup: 'hombros', equipment: 'maquina' },
  { name: 'Press hombro en maquina', muscleGroup: 'hombros', equipment: 'maquina' },
  { name: 'Remo al menton', muscleGroup: 'hombros', equipment: 'barra' },

  // biceps
  { name: 'Curl con barra', muscleGroup: 'biceps', equipment: 'barra' },
  { name: 'Curl con barra Z', muscleGroup: 'biceps', equipment: 'barra' },
  { name: 'Curl con mancuernas', muscleGroup: 'biceps', equipment: 'mancuerna' },
  { name: 'Curl alterno', muscleGroup: 'biceps', equipment: 'mancuerna' },
  { name: 'Curl martillo', muscleGroup: 'biceps', equipment: 'mancuerna' },
  { name: 'Curl concentrado', muscleGroup: 'biceps', equipment: 'mancuerna' },
  { name: 'Curl predicador', muscleGroup: 'biceps', equipment: 'barra' },
  { name: 'Curl en polea', muscleGroup: 'biceps', equipment: 'polea' },
  { name: 'Curl inclinado', muscleGroup: 'biceps', equipment: 'mancuerna' },

  // triceps
  { name: 'Press frances', muscleGroup: 'triceps', equipment: 'barra' },
  { name: 'Extension de triceps en polea', muscleGroup: 'triceps', equipment: 'polea' },
  { name: 'Extension de triceps con cuerda', muscleGroup: 'triceps', equipment: 'polea' },
  { name: 'Extension sobre la cabeza en polea', muscleGroup: 'triceps', equipment: 'polea' },
  { name: 'Patada de triceps', muscleGroup: 'triceps', equipment: 'mancuerna' },
  { name: 'Press cerrado', muscleGroup: 'triceps', equipment: 'barra' },
  { name: 'Fondos en banco', muscleGroup: 'triceps', equipment: 'peso corporal', trackingType: 'reps' },
  { name: 'Extension de triceps en maquina', muscleGroup: 'triceps', equipment: 'maquina' },

  // antebrazo
  { name: 'Curl de muneca', muscleGroup: 'antebrazo', equipment: 'barra' },
  { name: 'Curl de muneca inverso', muscleGroup: 'antebrazo', equipment: 'barra' },
  { name: 'Paseo del granjero', muscleGroup: 'antebrazo', equipment: 'mancuerna', trackingType: 'distance_duration' },

  // cuadriceps
  { name: 'Sentadilla', muscleGroup: 'cuadriceps', equipment: 'barra' },
  { name: 'Sentadilla frontal', muscleGroup: 'cuadriceps', equipment: 'barra' },
  { name: 'Sentadilla goblet', muscleGroup: 'cuadriceps', equipment: 'mancuerna' },
  { name: 'Sentadilla hack', muscleGroup: 'cuadriceps', equipment: 'maquina' },
  { name: 'Prensa de piernas', muscleGroup: 'cuadriceps', equipment: 'maquina' },
  { name: 'Extension de cuadriceps', muscleGroup: 'cuadriceps', equipment: 'maquina' },
  { name: 'Zancadas', muscleGroup: 'cuadriceps', equipment: 'mancuerna' },
  { name: 'Zancadas caminando', muscleGroup: 'cuadriceps', equipment: 'mancuerna' },
  { name: 'Sentadilla bulgara', muscleGroup: 'cuadriceps', equipment: 'mancuerna' },
  { name: 'Step up', muscleGroup: 'cuadriceps', equipment: 'mancuerna' },

  // femoral
  { name: 'Peso muerto rumano', muscleGroup: 'femoral', equipment: 'barra' },
  { name: 'Peso muerto piernas rigidas', muscleGroup: 'femoral', equipment: 'barra' },
  { name: 'Curl femoral tumbado', muscleGroup: 'femoral', equipment: 'maquina' },
  { name: 'Curl femoral sentado', muscleGroup: 'femoral', equipment: 'maquina' },
  { name: 'Buenos dias', muscleGroup: 'femoral', equipment: 'barra' },
  { name: 'Curl nordico', muscleGroup: 'femoral', equipment: 'peso corporal', trackingType: 'reps' },

  // gluteo
  { name: 'Hip thrust', muscleGroup: 'gluteo', equipment: 'barra' },
  { name: 'Puente de gluteos', muscleGroup: 'gluteo', equipment: 'peso corporal', trackingType: 'reps' },
  { name: 'Patada de gluteo en polea', muscleGroup: 'gluteo', equipment: 'polea' },
  { name: 'Abduccion de cadera en maquina', muscleGroup: 'gluteo', equipment: 'maquina' },

  // gemelo
  { name: 'Elevacion de talones de pie', muscleGroup: 'gemelo', equipment: 'maquina' },
  { name: 'Elevacion de talones sentado', muscleGroup: 'gemelo', equipment: 'maquina' },
  { name: 'Elevacion de talones en prensa', muscleGroup: 'gemelo', equipment: 'maquina' },

  // core
  { name: 'Plancha', muscleGroup: 'core', equipment: 'peso corporal', trackingType: 'duration' },
  { name: 'Plancha lateral', muscleGroup: 'core', equipment: 'peso corporal', trackingType: 'duration' },
  { name: 'Crunch abdominal', muscleGroup: 'core', equipment: 'peso corporal', trackingType: 'reps' },
  { name: 'Crunch en polea', muscleGroup: 'core', equipment: 'polea' },
  { name: 'Elevacion de piernas colgado', muscleGroup: 'core', equipment: 'peso corporal', trackingType: 'reps' },
  { name: 'Rueda abdominal', muscleGroup: 'core', equipment: 'otro', trackingType: 'reps' },
  { name: 'Russian twist', muscleGroup: 'core', equipment: 'mancuerna' },
  { name: 'Pallof press', muscleGroup: 'core', equipment: 'polea' },
  { name: 'Hollow hold', muscleGroup: 'core', equipment: 'peso corporal', trackingType: 'duration' },

  // cardio y cuerpo completo
  { name: 'Cinta de correr', muscleGroup: 'cardio', equipment: 'maquina', trackingType: 'distance_duration' },
  { name: 'Bicicleta estatica', muscleGroup: 'cardio', equipment: 'maquina', trackingType: 'distance_duration' },
  { name: 'Eliptica', muscleGroup: 'cardio', equipment: 'maquina', trackingType: 'distance_duration' },
  { name: 'Remo ergometro', muscleGroup: 'cardio', equipment: 'maquina', trackingType: 'distance_duration' },
  { name: 'Escaladora', muscleGroup: 'cardio', equipment: 'maquina', trackingType: 'distance_duration' },
  { name: 'Comba', muscleGroup: 'cardio', equipment: 'otro', trackingType: 'duration' },
  { name: 'Carrera exterior', muscleGroup: 'cardio', equipment: 'otro', trackingType: 'distance_duration' },
  { name: 'Burpees', muscleGroup: 'cuerpo completo', equipment: 'peso corporal', trackingType: 'reps' },
  { name: 'Swing con kettlebell', muscleGroup: 'cuerpo completo', equipment: 'kettlebell' },
  { name: 'Clean and jerk', muscleGroup: 'cuerpo completo', equipment: 'barra' },
  { name: 'Arrancada', muscleGroup: 'cuerpo completo', equipment: 'barra' },
  { name: 'Cargada de potencia', muscleGroup: 'cuerpo completo', equipment: 'barra' },
  { name: 'Thruster', muscleGroup: 'cuerpo completo', equipment: 'barra' },
];
