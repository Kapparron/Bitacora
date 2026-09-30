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
