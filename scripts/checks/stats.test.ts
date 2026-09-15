import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  averageInMonth,
  countInMonth,
  currentStreak,
  longestStreakInMonth,
  monthOf,
} from '@/features/progress/stats';
import type { RestPlan } from '@/features/rest/rest';

/** A Friday, so the weekday rules below are easy to read. */
const TODAY = '2026-09-11';

const NO_REST: RestPlan = { weekdays: new Set(), cycle: null, days: new Set() };
/** 2 is Wednesday, counting from Monday as the calendar does. */
const WEDNESDAYS: RestPlan = { weekdays: new Set([2]), cycle: null, days: new Set() };

test('a streak counts the days in a row behind today', () => {
  const trained = new Set(['2026-09-11', '2026-09-10', '2026-09-09']);
  assert.equal(currentStreak(trained, TODAY, NO_REST), 3);
});

test('a streak survives today being empty, since the day is young', () => {
  const trained = new Set(['2026-09-10', '2026-09-09']);
  assert.equal(currentStreak(trained, TODAY, NO_REST), 2);
});

test('a gap that is not a rest day ends the streak', () => {
  const trained = new Set(['2026-09-11', '2026-09-09']);
  assert.equal(currentStreak(trained, TODAY, NO_REST), 1);
});

test('a rest day neither adds to the streak nor ends it', () => {
  // Wednesday the 9th is rest; the streak reaches over it.
  const trained = new Set(['2026-09-11', '2026-09-10', '2026-09-08', '2026-09-07']);
  assert.equal(currentStreak(trained, TODAY, WEDNESDAYS), 4);
});

test('two rest days in a row end the streak', () => {
  const wednesdayAndThursday: RestPlan = { weekdays: new Set([2, 3]), cycle: null, days: new Set() };
  const trained = new Set(['2026-09-11', '2026-09-08']);
  assert.equal(currentStreak(trained, TODAY, wednesdayAndThursday), 1);
});

test('a day marked by hand rests like a weekly one', () => {
  const marked: RestPlan = { weekdays: new Set(), cycle: null, days: new Set(['2026-09-09']) };
  const trained = new Set(['2026-09-11', '2026-09-10', '2026-09-08']);
  assert.equal(currentStreak(trained, TODAY, marked), 3);
});

test('a rest cycle keeps a streak alive over its rest days', () => {
  // Every third day from Tuesday the 8th: the 8th and the 11th rest.
  const cycle: RestPlan = {
    weekdays: new Set(),
    cycle: { everyDays: 3, anchor: '2026-09-08' },
    days: new Set(),
  };
  const trained = new Set(['2026-09-10', '2026-09-09', '2026-09-07']);
  assert.equal(currentStreak(trained, TODAY, cycle), 3);
});

test('a streak of nothing is zero', () => {
  assert.equal(currentStreak(new Set(), TODAY, WEDNESDAYS), 0);
});

test('the best run of a month is cut at its edges', () => {
  const trained = new Set([
    '2026-08-29',
    '2026-08-30',
    '2026-08-31',
    '2026-09-01',
    '2026-09-02',
    '2026-09-05',
    '2026-09-06',
    '2026-09-07',
    '2026-09-08',
  ]);

  assert.equal(longestStreakInMonth(trained, '2026-09', NO_REST), 4);
  assert.equal(longestStreakInMonth(trained, '2026-08', NO_REST), 3);
  assert.equal(longestStreakInMonth(trained, '2026-07', NO_REST), 0);
});

test('the best run of a month reaches over a rest day', () => {
  // The 9th is a Wednesday, so the two halves join into one run of four.
  const trained = new Set(['2026-09-07', '2026-09-08', '2026-09-10', '2026-09-11']);
  assert.equal(longestStreakInMonth(trained, '2026-09', WEDNESDAYS), 4);
  assert.equal(longestStreakInMonth(trained, '2026-09', NO_REST), 2);
});

test('the monthly average only counts the days that were logged', () => {
  const kcal = new Map([
    ['2026-09-01', 2000],
    ['2026-09-02', 2500],
    ['2026-08-31', 1000],
  ]);

  assert.equal(averageInMonth(kcal, '2026-09'), 2250);
  assert.equal(averageInMonth(kcal, '2026-07'), null);
});

test('days are counted inside their own month', () => {
  const days = new Set(['2026-09-11', '2026-09-02', '2026-08-30']);
  assert.equal(countInMonth(days, '2026-09'), 2);
  assert.equal(monthOf('2026-09-11'), '2026-09');
});
