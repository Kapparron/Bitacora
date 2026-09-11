import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';

const MIGRATIONS = new URL('../../drizzle/', import.meta.url);

/**
 * An in-memory database with every migration applied, in order, exactly as the
 * app applies them. Foreign keys are on, as they are in the app.
 */
export function migratedDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');

  for (const file of migrationFiles()) {
    const sql = readFileSync(new URL(file, MIGRATIONS), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) db.exec(statement.trim());
    }
  }

  return db;
}

export function migrationFiles() {
  return readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

/** The tables a backup carries, in the order it writes and restores them. */
export const BACKUP_TABLES = [
  'exercises',
  'routines',
  'routine_exercises',
  'workouts',
  'workout_exercises',
  'sets',
  'personal_records',
  'foods',
  'food_entries',
  'nutrition_goals',
  'body_metrics',
  'rest_days',
  'settings',
];

/** One row in every table, enough to prove the foreign keys hold. */
export function seedOneOfEach(db, now = Date.now()) {
  db.exec(
    `insert into exercises (id, external_id, name, muscle_group, equipment, is_custom) values ('cat1','0001','Press banca','pecho','barra',0)`
  );
  db.exec(
    `insert into exercises (id, name, muscle_group, equipment, is_custom) values ('own1','Press banda','pecho','banda',1)`
  );
  db.exec(`insert into routines (id, name, position) values ('r1','Torso',0)`);
  db.exec(
    `insert into routine_exercises (id, routine_id, exercise_id, position) values ('re1','r1','cat1',0)`
  );
  db.exec(
    `insert into workouts (id, name, started_at, finished_at) values ('w1','Torso',${now},${now})`
  );
  db.exec(
    `insert into workout_exercises (id, workout_id, exercise_id, position) values ('we1','w1','cat1',0)`
  );
  db.exec(
    `insert into sets (id, workout_exercise_id, position, weight, reps, completed) values ('s1','we1',0,60,10,1)`
  );
  db.exec(
    `insert into personal_records (id, exercise_id, type, value, achieved_at, workout_id) values ('p1','cat1','heaviest_weight',60,${now},'w1')`
  );
  db.exec(`insert into foods (id, name, kcal_per_100g, source) values ('f1','Avena',380,'custom')`);
  db.exec(
    `insert into food_entries (id, food_id, date, meal, grams, kcal, name) values ('fe1','f1','2026-09-11','breakfast',60,228,'Avena')`
  );
  db.exec(`insert into nutrition_goals (id, effective_from, kcal) values ('g1','2026-09-01',2500)`);
  db.exec(`insert into body_metrics (id, date, weight) values ('b1','2026-09-11',80)`);
  db.exec(`insert into rest_days (day) values ('2026-09-10')`);
  db.exec(`insert into settings (key, value) values ('target_weight','75')`);
}

export function countRows(db, table) {
  return db.prepare(`select count(*) as n from ${table}`).get().n;
}
