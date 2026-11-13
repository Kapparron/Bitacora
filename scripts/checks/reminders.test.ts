import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_REMINDERS,
  dayAt,
  parseReminderSettings,
  planReminders,
  type PlanInput,
} from '@/features/reminders/plan';

/** A Wednesday, at eight in the morning. */
const TODAY = '2026-09-30';
const NOW = dayAt(TODAY, '08:00');

const KARATE = { name: 'Kárate', schedule: { type: 'weekdays' as const, weekdays: [1, 3] } };
const PIERNA = { name: 'Pierna', schedule: { type: 'weekdays' as const, weekdays: [2] } };
const EMPUJE = { name: 'Empuje', schedule: { type: 'weekdays' as const, weekdays: [2] } };

function plan(input: Partial<PlanInput>) {
  return planReminders({
    now: NOW,
    today: TODAY,
    settings: DEFAULT_REMINDERS,
    routines: [],
    trainedToday: false,
    events: [],
    days: 3,
    ...input,
  }).map((reminder) => [reminder.id, new Date(reminder.at).toTimeString().slice(0, 5), reminder.title, reminder.text]);
}

test('the morning reminder names the routines due that day', () => {
  assert.deepEqual(plan({ routines: [KARATE, PIERNA, EMPUJE] }), [
    // Wednesday: two routines, one reminder.
    ['routine:2026-09-30', '09:00', 'Hoy toca Pierna y Empuje', 'Abre Bitácora para empezar el entreno.'],
    // Thursday: karate.
    ['routine:2026-10-01', '09:00', 'Hoy toca Kárate', 'Abre Bitácora para empezar el entreno.'],
  ]);
});

test('no morning reminder once today was trained, once its time is gone, or when switched off', () => {
  assert.deepEqual(
    plan({ routines: [PIERNA], trainedToday: true, days: 1 }),
    []
  );
  assert.deepEqual(plan({ routines: [PIERNA], now: dayAt(TODAY, '10:00'), days: 1 }), []);
  assert.deepEqual(
    plan({ routines: [PIERNA], settings: { ...DEFAULT_REMINDERS, morning: false } }),
    []
  );
});

test('events: timed ones ahead of time, whole-day ones on the morning', () => {
  const events = [
    { id: 'dentista', date: TODAY, time: '17:30', title: 'Dentista' },
    { id: 'cumple', date: '2026-10-01', time: null, title: 'Cumple de Ana' },
    { id: 'pasado', date: TODAY, time: '08:30', title: 'Ya casi' },
    { id: 'lejos', date: '2026-10-10', time: '10:00', title: 'Fuera de plazo' },
  ];

  assert.deepEqual(plan({ events }), [
    ['event:dentista', '16:30', 'Dentista', 'Hoy a las 17:30'],
    ['event:cumple', '09:00', 'Cumple de Ana', 'Hoy, todo el día'],
  ]);

  // With a quarter of an hour, the one at 8:30 is still ahead, at 8:15.
  assert.deepEqual(
    plan({ events, settings: { ...DEFAULT_REMINDERS, eventAdvance: 15 } }).map(([id, time]) => [id, time]),
    // In time order: the whole-day one is tomorrow morning.
    [
      ['event:pasado', '08:15'],
      ['event:dentista', '17:15'],
      ['event:cumple', '09:00'],
    ]
  );
});

test('the day before, at the morning time', () => {
  const events = [{ id: 'itv', date: '2026-10-01', time: '12:00', title: 'ITV' }];

  assert.deepEqual(plan({ events, settings: { ...DEFAULT_REMINDERS, eventAdvance: 'day' } }), [
    ['event:itv', '09:00', 'ITV', 'Mañana a las 12:00'],
  ]);
  assert.deepEqual(plan({ events, settings: { ...DEFAULT_REMINDERS, events: false } }), []);
});

test('stored settings read back, and anything odd falls back to the default', () => {
  assert.deepEqual(parseReminderSettings({}), DEFAULT_REMINDERS);
  assert.deepEqual(
    parseReminderSettings({ morning: 'off', morningTime: '07:30', events: 'on', eventAdvance: 'day' }),
    { morning: false, morningTime: '07:30', events: true, eventAdvance: 'day' }
  );
  assert.equal(parseReminderSettings({ eventAdvance: '45' }).eventAdvance, 60);
  assert.equal(parseReminderSettings({ morningTime: 'pronto' }).morningTime, '09:00');
});
