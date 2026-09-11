import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BACKUP_TABLES,
  countRows,
  migratedDatabase,
  migrationFiles,
  seedOneOfEach,
} from './database.mjs';

test('every migration applies in order', () => {
  const db = migratedDatabase();
  const tables = db
    .prepare(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%'`)
    .all()
    .map((row) => row.name);

  assert.ok(migrationFiles().length > 0, 'no hay migraciones');
  for (const table of BACKUP_TABLES) assert.ok(tables.includes(table), `falta ${table}`);
});

test('a backup restores every table, foreign keys included', () => {
  const db = migratedDatabase();
  seedOneOfEach(db);

  const snapshot = Object.fromEntries(
    BACKUP_TABLES.map((table) => [table, db.prepare(`select * from ${table}`).all()])
  );

  // What restoreBackup does: delete backwards, insert forwards, in one go.
  db.exec('BEGIN');
  for (const table of [...BACKUP_TABLES].reverse()) db.exec(`delete from ${table}`);

  for (const table of BACKUP_TABLES) {
    for (const row of snapshot[table]) {
      const columns = Object.keys(row);
      db.prepare(
        `insert into ${table} (${columns.join(', ')}) values (${columns.map(() => '?').join(', ')})`
      ).run(...columns.map((column) => row[column]));
    }
  }
  db.exec('COMMIT');

  for (const table of BACKUP_TABLES) {
    assert.equal(countRows(db, table), snapshot[table].length, `${table} no volvio igual`);
  }
});

test('wiping the data keeps the catalogue and drops the rest', () => {
  const db = migratedDatabase();
  seedOneOfEach(db);

  db.exec('BEGIN');
  for (const table of [...BACKUP_TABLES].reverse()) {
    if (table === 'exercises') continue;
    db.exec(`delete from ${table}`);
  }
  db.exec('delete from exercises where is_custom = 1');
  db.exec('COMMIT');

  for (const table of BACKUP_TABLES) {
    if (table === 'exercises') continue;
    assert.equal(countRows(db, table), 0, `${table} deberia quedar vacia`);
  }

  // Mapped rather than compared whole: node:sqlite rows have a null prototype.
  const kept = db.prepare('select id, is_custom from exercises').all().map((row) => row.id);
  assert.deepEqual(kept, ['cat1']);
});

test('volume counts every completed set except the ones marked as warm-up', () => {
  const db = migratedDatabase();
  seedOneOfEach(db);

  // A second working set and a warm-up, on the same exercise.
  db.exec(
    `insert into sets (id, workout_exercise_id, position, weight, reps, completed) values ('s2','we1',1,60,10,1)`
  );
  db.exec(
    `insert into sets (id, workout_exercise_id, position, type, weight, reps, completed) values ('s3','we1',2,'warmup',40,10,1)`
  );
  db.exec(
    `insert into sets (id, workout_exercise_id, position, weight, reps, completed) values ('s4','we1',3,60,10,0)`
  );

  const { volume } = db
    .prepare(
      `select coalesce(sum(case when s.completed = 1 and s.type <> 'warmup' then s.weight * s.reps else 0 end), 0) as volume
       from workouts w
       join workout_exercises we on we.workout_id = w.id
       join sets s on s.workout_exercise_id = we.id`
    )
    .get();

  // Two completed working sets of 60x10; the warm-up and the unchecked set are out.
  assert.equal(volume, 1200);
  assert.equal(db.prepare(`select type from sets where id = 's1'`).get().type, 'normal');
});

test('a session is filed under the local day it started on', () => {
  const db = migratedDatabase();
  const lateNight = new Date(2026, 8, 11, 23, 30).getTime();
  db.exec(
    `insert into workouts (id, name, started_at, finished_at) values ('late','Noche',${lateNight},${lateNight})`
  );

  const { day } = db
    .prepare(
      `select date(started_at / 1000, 'unixepoch', 'localtime') as day from workouts where id = 'late'`
    )
    .get();

  assert.equal(day, '2026-09-11');
});

test('weeks are anchored to their Monday', () => {
  const db = migratedDatabase();
  const week = (day) =>
    db.prepare(`select date(?, 'weekday 0', '-6 days') as week`).get(day).week;

  assert.equal(week('2026-09-07'), '2026-09-07', 'un lunes es su propia semana');
  assert.equal(week('2026-09-10'), '2026-09-07');
  assert.equal(week('2026-09-13'), '2026-09-07', 'el domingo cierra la semana anterior');
  assert.equal(week('2026-09-14'), '2026-09-14');
});

test('a day holds one measurement and one rest mark', () => {
  const db = migratedDatabase();
  db.exec(`insert into body_metrics (id, date, weight) values ('m1','2026-09-11',80)`);

  assert.throws(
    () => db.exec(`insert into body_metrics (id, date, weight) values ('m2','2026-09-11',79)`),
    /UNIQUE/
  );

  db.exec(`insert into rest_days (day) values ('2026-09-11')`);
  assert.throws(() => db.exec(`insert into rest_days (day) values ('2026-09-11')`), /UNIQUE/);
});
