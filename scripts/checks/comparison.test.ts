import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DINOSAURS, compareVolume, describeComparison } from '@/features/workout/comparison';

test('the ladder climbs, and no rung is ten times the one below', () => {
  for (let index = 1; index < DINOSAURS.length; index++) {
    const ratio = DINOSAURS[index].kg / DINOSAURS[index - 1].kg;
    assert.ok(ratio > 1, `${DINOSAURS[index].id} no pesa mas que el anterior`);
    assert.ok(ratio < 10, `${DINOSAURS[index].id} deja un salto en el que caben diez del anterior`);
  }
});

test('every dinosaur has a name, a plural, a silhouette and where it came from', () => {
  const ids = new Set<string>();

  for (const dinosaur of DINOSAURS) {
    assert.ok(!ids.has(dinosaur.id), `${dinosaur.id} repetido`);
    ids.add(dinosaur.id);

    assert.ok(dinosaur.name && dinosaur.plural, dinosaur.id);
    assert.match(dinosaur.viewBox, /^0 0 \d+ \d+$/, dinosaur.id);
    assert.match(dinosaur.path, /^[Mm]/, dinosaur.id);
    // Only silhouettes nobody has to be credited for: see data/comparisons.json.
    assert.equal(dinosaur.source.license, 'CC0 1.0', dinosaur.id);
    assert.match(dinosaur.source.phylopic, /^[0-9a-f-]{36}$/, dinosaur.id);
  }
});

function say(kilograms: number): string | null {
  const comparison = compareVolume(kilograms);
  return comparison && describeComparison(comparison);
}

test('the volume is told as the biggest dinosaur that fits, and how many', () => {
  assert.equal(say(1055), 'un ceratosaurio');
  assert.equal(say(7700), 'casi dos estegosaurios');
  assert.equal(say(8000), 'un tiranosaurio');
  assert.equal(say(12000), 'un tiranosaurio');
  assert.equal(say(13000), 'un tiranosaurio');
  assert.equal(say(14000), 'casi dos tiranosaurios');
  assert.equal(say(60), 'tres velocirraptores');
  assert.equal(say(19), 'seis compsognathus');
  // Past the top the count keeps growing, in figures once words run out.
  assert.equal(say(840000), '12 alamosaurios');
});

test('below the smallest there is nothing to compare', () => {
  assert.equal(compareVolume(0), null);
  assert.equal(compareVolume(2.5), null);
});
