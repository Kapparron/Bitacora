/**
 * Turning body data into a daily calorie target.
 *
 * Mifflin-St Jeor for the resting rate, an activity factor for what the day
 * adds, and 7700 kcal per kilogram of body mass for the weekly gain or loss the
 * user is after. Those are the usual figures behind every calculator of this
 * kind; they are an estimate to start from, not a measurement.
 */

export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete';

/** Multipliers applied to the resting rate, from the Harris-Benedict tables. */
const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  athlete: 1.9,
};

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: 'Sedentario', description: 'Trabajo sentado, sin ejercicio' },
  { value: 'light', label: 'Ligero', description: '1-3 entrenos por semana' },
  { value: 'moderate', label: 'Moderado', description: '3-5 entrenos por semana' },
  { value: 'high', label: 'Alto', description: '6-7 entrenos por semana' },
  { value: 'athlete', label: 'Muy alto', description: 'Trabajo fisico o dos sesiones al dia' },
];

/** Kilocalories in a kilogram of body mass, the figure these targets assume. */
const KCAL_PER_KG = 7700;

/**
 * Floor for the target, as a share of the resting rate. Eating under the resting
 * rate for long is how a diet stops working, so an aggressive weekly loss is
 * clamped rather than obeyed.
 */
const FLOOR_FACTOR = 1.1;

export type GoalInput = {
  sex: Sex;
  /** Years. */
  age: number;
  /** Centimetres. */
  heightCm: number;
  /** Kilograms. */
  weightKg: number;
  activity: ActivityLevel;
  /** Kilograms per week: negative to lose, positive to gain, 0 to maintain. */
  weeklyChangeKg: number;
};

export type GoalEstimate = {
  /** Resting rate, Mifflin-St Jeor. */
  bmr: number;
  /** What the day burns, resting rate times the activity factor. */
  maintenance: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** True when the weekly change asked for would have taken the target too low. */
  clamped: boolean;
};

/** Mifflin-St Jeor resting metabolic rate, in kilocalories per day. */
export function restingRate({ sex, age, heightCm, weightKg }: GoalInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

/**
 * The daily target and a split of it into macros.
 *
 * Protein is 2 g per kilogram of body weight and fat 0.9 g, both held whatever
 * the target is, because a deficit is where they matter most; carbohydrate takes
 * what is left.
 */
export function estimateGoal(input: GoalInput): GoalEstimate {
  const bmr = restingRate(input);
  const maintenance = bmr * ACTIVITY_FACTOR[input.activity];
  const target = maintenance + (input.weeklyChangeKg * KCAL_PER_KG) / 7;

  const floor = bmr * FLOOR_FACTOR;
  const clamped = target < floor;
  const kcal = Math.round(clamped ? floor : target);

  const protein = Math.round(input.weightKg * 2);
  const fat = Math.round(input.weightKg * 0.9);
  // Whatever the two above leave, at 4 kcal per gram, never negative.
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return {
    bmr: Math.round(bmr),
    maintenance: Math.round(maintenance),
    kcal,
    protein,
    carbs,
    fat,
    clamped,
  };
}
