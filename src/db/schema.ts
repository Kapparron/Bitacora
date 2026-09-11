import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Conventions shared by every table:
 * - `id` is a UUID string generated on the device (see `newId` in ./ids).
 * - `createdAt` / `updatedAt` are epoch milliseconds.
 * - `deletedAt` is a soft delete so a future sync layer can replicate tombstones.
 * - Weights are always stored in kilograms; the unit preference only affects display.
 * - Dates that represent a calendar day (nutrition, body metrics) are `YYYY-MM-DD`
 *   strings in the device's local timezone, not timestamps.
 */
const now = sql`(unixepoch() * 1000)`;

const auditColumns = {
  createdAt: integer('created_at').notNull().default(now),
  updatedAt: integer('updated_at').notNull().default(now),
  deletedAt: integer('deleted_at'),
};

/* ------------------------------------------------------------------ training */

export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    /** Id in the upstream dataset. Null for exercises the user created. */
    externalId: text('external_id'),
    name: text('name').notNull(),
    /** Original English name, kept so search matches either language. */
    nameEn: text('name_en'),
    muscleGroup: text('muscle_group').notNull(),
    equipment: text('equipment').notNull(),
    bodyPart: text('body_part'),
    /** Technique steps in Spanish, one per array entry, stored as JSON. */
    steps: text('steps', { mode: 'json' }).$type<string[]>(),
    /** Repository-relative paths; the CDN URL is built in the app. */
    imagePath: text('image_path'),
    gifPath: text('gif_path'),
    /** How a set of this exercise is measured, which decides the set input fields. */
    trackingType: text('tracking_type')
      .$type<'weight_reps' | 'reps' | 'duration' | 'distance_duration'>()
      .notNull()
      .default('weight_reps'),
    notes: text('notes'),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    ...auditColumns,
  },
  (t) => [
    index('exercises_muscle_group_idx').on(t.muscleGroup),
    uniqueIndex('exercises_external_id_unique').on(t.externalId),
  ]
);

export const routines = sqliteTable(
  'routines',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    notes: text('notes'),
    position: integer('position').notNull().default(0),
    lastPerformedAt: integer('last_performed_at'),
    /** How the routine repeats. See src/features/routines/schedule.ts. */
    scheduleType: text('schedule_type')
      .$type<'none' | 'weekdays' | 'interval'>()
      .notNull()
      .default('none'),
    /** Days of the week it falls on, 0 = Monday, as JSON. Only for `weekdays`. */
    scheduleWeekdays: text('schedule_weekdays', { mode: 'json' }).$type<number[]>(),
    /** Only for `interval`: repeat every N days from `scheduleAnchor`. */
    scheduleIntervalDays: integer('schedule_interval_days'),
    /** `YYYY-MM-DD` the interval counts from. */
    scheduleAnchor: text('schedule_anchor'),
    ...auditColumns,
  },
  (t) => [index('routines_position_idx').on(t.position)]
);

export const routineExercises = sqliteTable(
  'routine_exercises',
  {
    id: text('id').primaryKey(),
    routineId: text('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    /** Exercises sharing a non-null group are performed as a superset. */
    supersetGroup: integer('superset_group'),
    targetSets: integer('target_sets'),
    /** Free text so ranges like "8-12" or "AMRAP" survive. */
    targetReps: text('target_reps'),
    restSeconds: integer('rest_seconds'),
    notes: text('notes'),
    ...auditColumns,
  },
  (t) => [index('routine_exercises_routine_idx').on(t.routineId, t.position)]
);

/** One performed session. A row exists while the session is still in progress. */
export const workouts = sqliteTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    routineId: text('routine_id').references(() => routines.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    startedAt: integer('started_at').notNull(),
    /** Null while the session is active. At most one session is active at a time. */
    finishedAt: integer('finished_at'),
    notes: text('notes'),
    ...auditColumns,
  },
  (t) => [index('workouts_started_idx').on(t.startedAt)]
);

export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    supersetGroup: integer('superset_group'),
    restSeconds: integer('rest_seconds'),
    notes: text('notes'),
    ...auditColumns,
  },
  (t) => [index('workout_exercises_workout_idx').on(t.workoutId, t.position)]
);

export const sets = sqliteTable(
  'sets',
  {
    id: text('id').primaryKey(),
    workoutExerciseId: text('workout_exercise_id')
      .notNull()
      .references(() => workoutExercises.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    type: text('type')
      .$type<'normal' | 'warmup' | 'drop' | 'failure'>()
      .notNull()
      .default('normal'),
    /** Kilograms. */
    weight: real('weight'),
    reps: integer('reps'),
    /** Rate of perceived exertion, 1-10 in half points. */
    rpe: real('rpe'),
    distanceM: real('distance_m'),
    durationS: integer('duration_s'),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
    ...auditColumns,
  },
  (t) => [index('sets_workout_exercise_idx').on(t.workoutExerciseId, t.position)]
);

/**
 * Derived from `sets`, but stored so history screens and the "new PR" banner do
 * not have to scan every set ever recorded.
 */
export const personalRecords = sqliteTable(
  'personal_records',
  {
    id: text('id').primaryKey(),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    type: text('type')
      .$type<'heaviest_weight' | 'estimated_1rm' | 'best_set_volume' | 'session_volume'>()
      .notNull(),
    value: real('value').notNull(),
    workoutId: text('workout_id').references(() => workouts.id, { onDelete: 'cascade' }),
    achievedAt: integer('achieved_at').notNull(),
    ...auditColumns,
  },
  (t) => [uniqueIndex('personal_records_exercise_type_unique').on(t.exerciseId, t.type)]
);

/* ----------------------------------------------------------------- nutrition */

/**
 * Local cache of Open Food Facts products plus user-created foods. Values are
 * per 100 g (or per 100 ml for liquids); the serving fields are optional extras.
 */
export const foods = sqliteTable(
  'foods',
  {
    id: text('id').primaryKey(),
    barcode: text('barcode'),
    name: text('name').notNull(),
    brand: text('brand'),
    source: text('source').$type<'openfoodfacts' | 'custom'>().notNull(),
    kcalPer100g: real('kcal_per_100g').notNull(),
    proteinPer100g: real('protein_per_100g'),
    carbsPer100g: real('carbs_per_100g'),
    fatPer100g: real('fat_per_100g'),
    fiberPer100g: real('fiber_per_100g'),
    sugarPer100g: real('sugar_per_100g'),
    saltPer100g: real('salt_per_100g'),
    servingSizeG: real('serving_size_g'),
    imageUrl: text('image_url'),
    /** When the Open Food Facts payload was fetched, for cache refreshing. */
    fetchedAt: integer('fetched_at'),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    ...auditColumns,
  },
  (t) => [uniqueIndex('foods_barcode_unique').on(t.barcode), index('foods_name_idx').on(t.name)]
);

/**
 * A logged food. Macros are frozen at log time on purpose: Open Food Facts is
 * crowd-sourced, and a later correction upstream must not rewrite past days.
 */
export const foodEntries = sqliteTable(
  'food_entries',
  {
    id: text('id').primaryKey(),
    /** Local calendar day, `YYYY-MM-DD`. */
    date: text('date').notNull(),
    meal: text('meal').$type<'breakfast' | 'lunch' | 'dinner' | 'snack'>().notNull(),
    foodId: text('food_id').references(() => foods.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    brand: text('brand'),
    grams: real('grams').notNull(),
    kcal: real('kcal').notNull(),
    protein: real('protein'),
    carbs: real('carbs'),
    fat: real('fat'),
    ...auditColumns,
  },
  (t) => [index('food_entries_date_idx').on(t.date, t.meal)]
);

/** Goals are versioned by start date so past days keep the goal they were judged against. */
export const nutritionGoals = sqliteTable('nutrition_goals', {
  id: text('id').primaryKey(),
  effectiveFrom: text('effective_from').notNull(),
  kcal: real('kcal').notNull(),
  protein: real('protein'),
  carbs: real('carbs'),
  fat: real('fat'),
  ...auditColumns,
});

export const bodyMetrics = sqliteTable(
  'body_metrics',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    /** Kilograms. */
    weight: real('weight'),
    /**
     * No longer asked for or shown. The column stays so the measurements taken
     * while it was still offered are not thrown away, and so backups written
     * before it went keep restoring.
     */
    bodyFatPct: real('body_fat_pct'),
    notes: text('notes'),
    ...auditColumns,
  },
  (t) => [uniqueIndex('body_metrics_date_unique').on(t.date)]
);

/**
 * Days marked as rest by hand, one row per day. The weekly rest days live in
 * `settings`; this table is what overrides them for a single date.
 */
export const restDays = sqliteTable('rest_days', {
  /** Local calendar day as `YYYY-MM-DD`. */
  day: text('day').primaryKey(),
  ...auditColumns,
});

/**
 * Single values that belong to the app rather than to a day or a row: the weight
 * being aimed for and the weekdays kept for rest. Keyed rather than columned so
 * one more such value does not need a migration of its own.
 */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  ...auditColumns,
});

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Routine = typeof routines.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSet = typeof sets.$inferSelect;
export type Food = typeof foods.$inferSelect;
export type FoodEntry = typeof foodEntries.$inferSelect;
export type BodyMetric = typeof bodyMetrics.$inferSelect;
export type RestDay = typeof restDays.$inferSelect;
