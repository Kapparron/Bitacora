import assert from 'node:assert/strict';
import { test } from 'node:test';

import QRCode from 'qrcode';

import {
  SHARE_VERSION,
  parseSharedRoutine,
  routineLink,
  type SharedRoutine,
} from '@/features/routines/share';

const ROUTINE: SharedRoutine = {
  v: SHARE_VERSION,
  n: 'Pierna ñ',
  o: null,
  e: [
    { e: { x: '0043' }, s: 4, r: '8-12', d: 120, g: null, o: 'Bajar lento' },
    {
      e: { n: 'Sentadilla búlgara', m: 'piernas', q: 'mancuernas', t: 'weight_reps' },
      s: 3,
      r: null,
      d: 90,
      g: 1,
      o: null,
    },
  ],
};

/** What the other phone reads: the `r` parameter or the scanned text. */
function encoded(link: string): string {
  return link.slice(link.indexOf('?r=') + 3);
}

test('a shared routine survives the link, accents included', () => {
  const link = routineLink(ROUTINE);

  assert.match(link, /^bitacora:\/\/routine\/import\?r=[A-Za-z0-9_-]+$/);
  assert.deepEqual(parseSharedRoutine(link), ROUTINE);
  assert.deepEqual(parseSharedRoutine(encoded(link)), ROUTINE);
});

test('anything that is not a routine is refused', () => {
  const encode = (value: unknown) => encoded(routineLink(value as SharedRoutine));

  assert.equal(parseSharedRoutine('https://example.com'), null);
  assert.equal(parseSharedRoutine('8410076472632'), null);
  assert.equal(parseSharedRoutine(encode({ ...ROUTINE, v: 99 })), null);
  assert.equal(parseSharedRoutine(encode({ ...ROUTINE, e: [] })), null);
  assert.equal(
    parseSharedRoutine(encode({ ...ROUTINE, e: [{ ...ROUTINE.e[1], e: { ...ROUTINE.e[1].e, t: 'x' } }] })),
    null
  );
  assert.equal(parseSharedRoutine(encode({ ...ROUTINE, e: [{ ...ROUTINE.e[0], s: 1.5 }] })), null);
  assert.equal(parseSharedRoutine(encode({ ...ROUTINE, n: 'a'.repeat(1000) })), null);
});

test('a long routine still fits in a QR code', () => {
  const big: SharedRoutine = {
    ...ROUTINE,
    e: Array.from({ length: 15 }, (_, index) => ({
      e: index % 3 === 0
        ? { n: `Ejercicio propio ${index}`, m: 'espalda', q: 'polea', t: 'weight_reps' as const }
        : { x: String(1000 + index) },
      s: 4,
      r: '8-12',
      d: 90,
      g: null,
      o: null,
    })),
  };

  // Throws when the text is past what the largest QR code holds.
  assert.doesNotThrow(() => QRCode.create(routineLink(big), { errorCorrectionLevel: 'L' }));
});
