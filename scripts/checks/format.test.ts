import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeSchedule, isScheduledOn, scheduleOf } from '@/features/routines/schedule';
import { formatDay, formatDuration, shiftIsoDay, toIsoDay } from '@/lib/format';

/** A day as a timestamp at midday, away from any daylight-saving edge. */
function at(day: string): number {
  return new Date(`${day}T12:00:00`).getTime();
}

test('the days around today are named rather than dated', () => {
  const today = toIsoDay();

  assert.equal(formatDay(at(today)), 'Hoy');
  assert.equal(formatDay(at(shiftIsoDay(today, -1))), 'Ayer');
  assert.equal(formatDay(at(shiftIsoDay(today, 1))), 'Manana');
  assert.notEqual(formatDay(at(shiftIsoDay(today, -3))), 'Hoy');
});

test('a day shifts across months and years', () => {
  assert.equal(shiftIsoDay('2026-09-01', -1), '2026-08-31');
  assert.equal(shiftIsoDay('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftIsoDay('2028-02-28', 1), '2028-02-29', 'ano bisiesto');
});

test('durations read as hours only when there are hours', () => {
  assert.equal(formatDuration(65_000), '1:05');
  assert.equal(formatDuration(3_723_000), '1:02:03');
  assert.equal(formatDuration(-5), '0:00');
});

test('a weekday schedule falls on its own days', () => {
  const routine = {
    scheduleType: 'weekdays' as const,
    scheduleWeekdays: [0, 3],
    scheduleIntervalDays: null,
    scheduleAnchor: null,
  };

  // 2026-09-07 is a Monday, 2026-09-10 a Thursday.
  assert.equal(isScheduledOn(scheduleOf(routine), '2026-09-07'), true);
  assert.equal(isScheduledOn(scheduleOf(routine), '2026-09-10'), true);
  assert.equal(isScheduledOn(scheduleOf(routine), '2026-09-08'), false);
  assert.ok(describeSchedule(scheduleOf(routine)).length > 0);
});

test('an interval schedule counts from its anchor and survives the clocks changing', () => {
  const routine = {
    scheduleType: 'interval' as const,
    scheduleWeekdays: null,
    scheduleIntervalDays: 3,
    scheduleAnchor: '2026-10-23',
  };

  const schedule = scheduleOf(routine);

  assert.equal(isScheduledOn(schedule, '2026-10-23'), true, 'el propio dia de inicio');
  assert.equal(isScheduledOn(schedule, '2026-10-26'), true);
  assert.equal(isScheduledOn(schedule, '2026-10-27'), false);
  // The clocks go back on 2026-10-25 in Spain; the count must not drift.
  assert.equal(isScheduledOn(schedule, '2026-10-29'), true);
  assert.equal(isScheduledOn(schedule, '2026-10-22'), false, 'antes del inicio');
});
