import assert from 'node:assert/strict';
import { test } from 'node:test';

import { equipmentFamily, filterCounts, matchesFilters } from '@/features/exercises/filters';

const exercise = (muscleGroup: string, equipment: string) => ({ muscleGroup, equipment });

const catalogue = [
  exercise('dorsales', 'polea'),
  exercise('dorsales', 'maquina hammer'),
  exercise('dorsales', 'barra'),
  exercise('pecho', 'barra olimpica'),
  exercise('pecho', 'mancuerna'),
];

test('equipment variants fall under their broader name', () => {
  assert.equal(equipmentFamily('barra olimpica'), 'barra');
  assert.equal(equipmentFamily('banda elastica'), 'banda');
  assert.equal(equipmentFamily('barra Z'), 'barra Z');
});

test('muscle and equipment filters combine', () => {
  const found = catalogue.filter((one) =>
    matchesFilters(one, { muscleGroup: 'pecho', equipment: 'barra' })
  );

  assert.deepEqual(found, [exercise('pecho', 'barra olimpica')]);
  assert.equal(
    catalogue.filter((one) => matchesFilters(one, { muscleGroup: null, equipment: null })).length,
    catalogue.length
  );
});

test('counts follow the other filter but ignore their own', () => {
  assert.deepEqual(
    filterCounts(catalogue, 'equipment', { muscleGroup: 'dorsales', equipment: 'polea' }),
    [
      ['barra', 1],
      ['mancuerna', 0],
      ['maquina', 1],
      ['polea', 1],
    ]
  );
  assert.deepEqual(
    filterCounts(catalogue, 'muscleGroup', { muscleGroup: null, equipment: 'barra' }),
    [
      ['dorsales', 1],
      ['pecho', 1],
    ]
  );
});
