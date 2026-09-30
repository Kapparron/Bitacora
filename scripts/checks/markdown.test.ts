import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyInline,
  applyLine,
  applyLink,
  continueList,
  noteTasks,
  noteText,
  parseInline,
  parseNote,
  toggleTask,
} from '@/features/agenda/markdown';

const NOTE = [
  '# Compra',
  'Para el **finde**, ver [receta](https://example.com)',
  '- [ ] Leche',
  '- [x] Pan',
  '- Tienda de la esquina',
  '1. Primero',
  '',
  'Sin nada',
].join('\n');

test('a note reads as blocks, one per line', () => {
  assert.deepEqual(
    parseNote(NOTE).map((block) => block.kind),
    ['heading', 'paragraph', 'task', 'task', 'bullet', 'numbered', 'blank', 'paragraph']
  );

  const [, , leche, pan] = parseNote(NOTE);
  assert.deepEqual(leche, { kind: 'task', line: 2, checked: false, spans: [{ text: 'Leche' }] });
  assert.equal(pan.kind === 'task' && pan.checked, true);
});

test('inside a line: bold, italic, underline and links, nested too', () => {
  assert.deepEqual(parseInline('a **b** *c* ++d++'), [
    { text: 'a ' },
    { text: 'b', bold: true },
    { text: ' ' },
    { text: 'c', italic: true },
    { text: ' ' },
    { text: 'd', underline: true },
  ]);
  assert.deepEqual(parseInline('[la **receta**](https://example.com)'), [
    { text: 'la ', href: 'https://example.com' },
    { text: 'receta', href: 'https://example.com', bold: true },
  ]);
  assert.deepEqual(parseInline('mira https://example.com/a hoy'), [
    { text: 'mira ' },
    { text: 'https://example.com/a', href: 'https://example.com/a' },
    { text: ' hoy' },
  ]);
});

test('what only looks like a mark stays as text', () => {
  assert.deepEqual(parseInline('2 * 3 * 4'), [{ text: '2 * 3 * 4' }]);
  assert.deepEqual(parseInline('**sin cerrar'), [{ text: '**sin cerrar' }]);
  // Only web and mail addresses are links: nothing else can be opened from a note.
  assert.deepEqual(parseInline('[x](javascript:alert(1))'), [{ text: '[x](javascript:alert(1))' }]);
});

test('the agenda shows the text alone and counts what is left to do', () => {
  assert.equal(
    noteText(NOTE),
    'Compra Para el finde, ver receta Leche Pan Tienda de la esquina Primero Sin nada'
  );
  assert.deepEqual(noteTasks(NOTE), { pending: 1, total: 2 });
  assert.equal(noteText(''), '');
  assert.equal(noteText('\n\n  \n'), '');
});

test('a tick on the view flips that line and only that one', () => {
  const ticked = toggleTask(NOTE, 2);
  assert.equal(ticked.split('\n')[2], '- [x] Leche');
  assert.equal(toggleTask(ticked, 2), NOTE);
  assert.equal(toggleTask(NOTE, 1), NOTE);
});

test('the toolbar wraps the selection, or leaves the cursor between the marks', () => {
  assert.deepEqual(applyInline('hola mundo', { start: 5, end: 10 }, 'bold'), {
    text: 'hola **mundo**',
    selection: { start: 5, end: 14 },
  });
  assert.deepEqual(applyInline('hola ', { start: 5, end: 5 }, 'underline'), {
    text: 'hola ++++',
    selection: { start: 7, end: 7 },
  });
  assert.deepEqual(applyLink('ver receta', { start: 4, end: 10 }, 'https://x.es'), {
    text: 'ver [receta](https://x.es)',
    selection: { start: 26, end: 26 },
  });
});

test('line buttons turn the lines under the cursor into a list, and back', () => {
  const tasks = applyLine('Leche\nPan', { start: 0, end: 9 }, 'task');
  assert.equal(tasks.text, '- [ ] Leche\n- [ ] Pan');
  assert.equal(applyLine(tasks.text, { start: 0, end: tasks.text.length }, 'task').text, 'Leche\nPan');
  // A bullet becomes a task rather than a bullet inside a bullet.
  assert.equal(applyLine('- Leche', { start: 3, end: 3 }, 'task').text, '- [ ] Leche');
  assert.equal(applyLine('Título', { start: 2, end: 2 }, 'heading').text, '# Título');
});

test('enter continues a list, and on an empty item ends it', () => {
  const typed = (before: string, cursor: number) => {
    const next = before.slice(0, cursor) + '\n' + before.slice(cursor);
    return continueList(before, next);
  };

  assert.deepEqual(typed('- [x] Leche', 11), {
    text: '- [x] Leche\n- [ ] ',
    selection: { start: 18, end: 18 },
  });
  assert.equal(typed('- Pan', 5)?.text, '- Pan\n- ');
  assert.equal(typed('1. Primero', 10)?.text, '1. Primero\n2. ');
  assert.deepEqual(typed('- [ ] Leche\n- [ ] ', 18), {
    text: '- [ ] Leche\n',
    selection: { start: 12, end: 12 },
  });
  assert.equal(typed('Texto normal', 12), null);
  // Pasting is not pressing enter, and neither is typing a letter.
  assert.equal(continueList('- a', '- a\nb'), null);
  assert.equal(continueList('- a', '- ab'), null);
  // Enter in the middle of an item splits it and starts the new one as an item.
  assert.equal(typed('- [ ] Lechuga', 9)?.text, '- [ ] Lec\n- [ ] huga');
});
