import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadTrainedDays, loadWeeklyVolume } from '@/features/workout/queries';

import { setDatabase } from './database-client';
import { migratedDatabase, seedOneOfEach } from './database.mjs';

// The app's own queries, run against a database with every migration applied.
// `@/db/client` is swapped for ./database-client.ts by register.mjs.

/** A finished session on a given local day and time, with one exercise. */
function session(db: ReturnType<typeof migratedDatabase>, id: string, startedAt: Date) {
  const at = startedAt.getTime();
  db.exec(
    `insert into workouts (id, name, started_at, finished_at) values ('${id}','${id}',${at},${at + 3600000})`
  );
  db.exec(
    `insert into workout_exercises (id, workout_id, exercise_id, position) values ('${id}-we','${id}','cat1',0)`
  );
}

function set(
  db: ReturnType<typeof migratedDatabase>,
  id: string,
  workoutExerciseId: string,
  fields: { weight: number; reps: number; completed?: boolean; type?: string }
) {
  db.exec(
    `insert into sets (id, workout_exercise_id, position, type, weight, reps, completed)
     values ('${id}','${workoutExerciseId}',0,'${fields.type ?? 'normal'}',${fields.weight},${fields.reps},${fields.completed === false ? 0 : 1})`
  );
}

test('weekly volume counts completed working sets, never warm-ups or unchecked ones', async () => {
  const db = migratedDatabase();
  seedOneOfEach(db, new Date(2026, 8, 9, 18).getTime());
  setDatabase(db);

  // The seeded session already holds one completed 60x10 set.
  set(db, 's2', 'we1', { weight: 60, reps: 10 });
  set(db, 's3', 'we1', { weight: 40, reps: 10, type: 'warmup' });
  set(db, 's4', 'we1', { weight: 60, reps: 10, completed: false });

  assert.deepEqual(
    (await loadWeeklyVolume()).map((row) => ({ ...row })),
    [{ week: '2026-09-07', volume: 1200, workouts: 1 }]
  );
});

test('weeks are anchored to their Monday, and Sunday closes the week before', async () => {
  const db = migratedDatabase();
  seedOneOfEach(db);
  db.exec(`delete from workouts`);
  setDatabase(db);

  session(db, 'mon', new Date(2026, 8, 7, 10));
  session(db, 'sun', new Date(2026, 8, 13, 10));
  session(db, 'next', new Date(2026, 8, 14, 10));

  assert.deepEqual(
    (await loadWeeklyVolume()).map((row) => [row.week, row.workouts]),
    [
      ['2026-09-07', 2],
      ['2026-09-14', 1],
    ]
  );
});

test('a session is filed under the local day it started on', async () => {
  const db = migratedDatabase();
  seedOneOfEach(db);
  db.exec(`delete from workouts`);
  setDatabase(db);

  session(db, 'late', new Date(2026, 8, 11, 23, 30));
  session(db, 'early', new Date(2026, 8, 12, 0, 30));
  session(db, 'again', new Date(2026, 8, 12, 19, 0));
  session(db, 'deleted', new Date(2026, 8, 13, 10, 0));
  db.exec(`update workouts set deleted_at = 1 where id = 'deleted'`);
  db.exec(`insert into workouts (id, name, started_at) values ('open','open',${Date.now()})`);

  // Two sessions on one day make one day; unfinished and deleted ones are none.
  assert.deepEqual(
    (await loadTrainedDays()).map((row) => [row.day, row.sessions]).sort(),
    [
      ['2026-09-11', 1],
      ['2026-09-12', 2],
    ]
  );
});
