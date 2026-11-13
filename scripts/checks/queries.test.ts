import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  loadDayEvents,
  loadEventsBetween,
  loadNote,
  loadNotes,
  loadTodayTasks,
  loadUpcomingEvents,
} from '@/features/agenda/queries';
import { getLastPerformance, loadTrainedDays, loadWeeklyVolume } from '@/features/workout/queries';

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

test('last time is the latest finished session, with only its completed sets in order', async () => {
  const db = migratedDatabase();
  seedOneOfEach(db);
  db.exec(`delete from workouts`);
  setDatabase(db);

  session(db, 'old', new Date(2026, 8, 1, 10));
  set(db, 'old-1', 'old-we', { weight: 50, reps: 10 });
  session(db, 'last', new Date(2026, 8, 8, 10));
  db.exec(
    `insert into sets (id, workout_exercise_id, position, weight, reps, completed) values
      ('last-2','last-we',1,62.5,8,1), ('last-1','last-we',0,60,10,1), ('last-3','last-we',2,65,5,0)`
  );
  // The session being trained now, and a deleted one, are never "last time".
  session(db, 'now', new Date(2026, 8, 15, 10));
  set(db, 'now-1', 'now-we', { weight: 70, reps: 5 });
  session(db, 'gone', new Date(2026, 8, 12, 10));
  set(db, 'gone-1', 'gone-we', { weight: 90, reps: 1 });
  db.exec(`update workouts set deleted_at = 1 where id = 'gone'`);

  assert.deepEqual(
    (await getLastPerformance('cat1', 'now')).map((row) => [row.id, row.weight, row.reps]),
    [
      ['last-1', 60, 10],
      ['last-2', 62.5, 8],
    ]
  );
  assert.deepEqual(await getLastPerformance('own1', 'now'), []);
});

test('notes come last edited first, and a deleted one is gone', async () => {
  const db = migratedDatabase();
  setDatabase(db);
  db.exec(
    `insert into notes (id, title, body, updated_at) values
      ('compra','Compra','- [ ] Leche',2000), ('ideas','Ideas','Pintar el salon',3000),
      ('vieja','Vieja','',1000)`
  );
  db.exec(`update notes set deleted_at = 1 where id = 'vieja'`);

  assert.deepEqual(
    (await loadNotes()).map((note) => note.id),
    ['ideas', 'compra']
  );
  assert.equal((await loadNote('compra'))?.body, '- [ ] Leche');
  assert.equal(await loadNote('vieja'), null);
});

test('upcoming events start today, soonest first, whole-day ones before timed ones', async () => {
  const db = migratedDatabase();
  setDatabase(db);
  db.exec(
    `insert into events (id, date, time, title) values
      ('ayer','2026-09-29',null,'Ayer'),
      ('tarde','2026-09-30','17:30','Dentista'),
      ('todo','2026-09-30',null,'Cumple'),
      ('manana','2026-09-30','09:00','Gimnasio'),
      ('luego','2026-10-02',null,'Cena'),
      ('borrado','2026-10-01',null,'Borrado')`
  );
  db.exec(`update events set deleted_at = 1 where id = 'borrado'`);

  assert.deepEqual(
    (await loadUpcomingEvents('2026-09-30')).map((event) => event.id),
    ['todo', 'manana', 'tarde', 'luego']
  );
  assert.deepEqual(
    (await loadDayEvents('2026-09-30')).map((event) => event.id),
    ['todo', 'manana', 'tarde']
  );
  // A week, both ends included: yesterday is in it, the deleted one is not.
  assert.deepEqual(
    (await loadEventsBetween('2026-09-28', '2026-10-01')).map((event) => event.id),
    ['ayer', 'todo', 'manana', 'tarde']
  );
});

test("today's tasks: carried ones, then the repeating ones due today, then today's own", async () => {
  const db = migratedDatabase();
  setDatabase(db);
  db.exec(
    `insert into tasks (id, date, text, done, created_at) values
      ('hoy','2026-09-30','Comprar pan',0,3000),
      ('hecha-hoy','2026-09-30','Llamar',1,4000),
      ('ayer','2026-09-29','Pagar luz',0,2000),
      ('hecha-ayer','2026-09-29','Recoger',1,1000),
      ('antes','2026-09-20','Banco',0,500),
      ('manana','2026-10-01','Mañana',0,100)`
  );
  // 2026-09-30 is a Wednesday (2); karate is on Tuesdays and Thursdays (1, 3).
  db.exec(
    `insert into tasks (id, date, text, schedule_type, schedule_weekdays, schedule_interval_days, schedule_anchor, created_at) values
      ('perro','2026-09-01','Sacar al perro','weekdays','[0,1,2,3,4,5,6]',null,null,10),
      ('karate','2026-09-01','Kárate','weekdays','[1,3]',null,null,20),
      ('riego','2026-09-28','Regar','interval',null,2,'2026-09-28',30),
      ('futuro','2026-10-05','Empieza el lunes','weekdays','[2]',null,null,40)`
  );
  // Walked today; karate was ticked yesterday, which says nothing about today.
  db.exec(`insert into task_checks (task_id, date) values ('perro','2026-09-30'), ('karate','2026-09-29')`);

  assert.deepEqual(
    (await loadTodayTasks('2026-09-30')).map((task) => [task.id, task.repeats, task.doneToday]),
    [
      ['antes', false, false],
      ['ayer', false, false],
      ['perro', true, true],
      ['riego', true, false],
      ['hoy', false, false],
      ['hecha-hoy', false, true],
    ]
  );
});
