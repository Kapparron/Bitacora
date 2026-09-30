import assert from 'node:assert/strict';
import { test } from 'node:test';

import QRCode from 'qrcode';

import {
  SHARE_VERSION,
  parseSharedRoutine,
  routineLink,
  type SharedRoutine,
} from '@/features/routines/share';

// The page that shows a shared routine and offers to import it. Importing it
// here holds both ends to the same format.
import { formatTarget, parseSharedRoutine as parseOnWeb } from '../../site/rutina/rutina.js';

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

/** The routine part of a link, which the web page passes on as `r`. */
function encoded(link: string): string {
  return link.slice(link.indexOf('#') + 1);
}

test('a shared routine survives the link, accents included', () => {
  const link = routineLink(ROUTINE);

  // WhatsApp only makes https links tappable.
  assert.match(link, /^https:\/\/kapparron\.github\.io\/Bitacora\/rutina\/#[A-Za-z0-9_-]+$/);
  assert.deepEqual(parseSharedRoutine(link), ROUTINE);
  assert.deepEqual(parseSharedRoutine(encoded(link)), ROUTINE);
  // What the page opens, and what links sent before it used.
  assert.deepEqual(parseSharedRoutine(`bitacora://routine/import?r=${encoded(link)}`), ROUTINE);
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

test('the web page reads a shared routine as the app does', () => {
  const link = routineLink(ROUTINE);
  // The page has no use for how a custom exercise is tracked, so it drops it.
  const expected = {
    ...ROUTINE,
    e: ROUTINE.e.map((entry) => {
      if ('x' in entry.e) return entry;
      const { t: _tracking, ...exercise } = entry.e;
      return { ...entry, e: exercise };
    }),
  };

  assert.deepEqual(parseOnWeb(link), expected);
  assert.deepEqual(parseOnWeb(encoded(link)), expected);
});

test('the web page refuses what the app refuses', () => {
  const encode = (value: unknown) => encoded(routineLink(value as SharedRoutine));

  for (const bad of [
    'https://example.com',
    encode({ ...ROUTINE, v: 99 }),
    encode({ ...ROUTINE, e: [] }),
    encode({ ...ROUTINE, e: [{ ...ROUTINE.e[0], s: 1.5 }] }),
    encode({ ...ROUTINE, e: [{ ...ROUTINE.e[0], d: 7200 }] }),
    encode({ ...ROUTINE, n: 'a'.repeat(1000) }),
  ]) {
    assert.equal(parseSharedRoutine(bad), null);
    assert.equal(parseOnWeb(bad), null);
  }
});

test('the web page writes targets the way the app shows them', () => {
  assert.equal(formatTarget({ s: 4, r: '8-12' }), '4 × 8-12');
  // The app shows three sets when a routine leaves them unset.
  assert.equal(formatTarget({ s: null, r: '10' }), '3 × 10');
  assert.equal(formatTarget({ s: 1, r: null }), '1 serie');
  assert.equal(formatTarget({ s: 5, r: '  ' }), '5 series');
});
