/**
 * The Markdown a note is written in, read and edited without a library.
 *
 * Only what a notes app needs, one line at a time:
 *
 *   # Título, ## Subtítulo        headings
 *   - algo, * algo                a bullet
 *   1. algo                       a numbered item
 *   - [ ] algo, - [x] algo        a thing to tick off
 *
 * and inside a line: **negrita**, *cursiva*, ++subrayado++ and
 * [texto](https://...). A bare https:// address is a link too. `++` is not
 * standard Markdown, which has no underline; it is the usual extension for it.
 *
 * Every function here is pure, so the checks can hold it to its examples.
 */

export type Span = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  /** Where the span links to; only http, https and mailto are ever read as links. */
  href?: string;
};

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; spans: Span[] }
  | { kind: 'task'; line: number; checked: boolean; spans: Span[] }
  | { kind: 'bullet'; spans: Span[] }
  | { kind: 'numbered'; number: number; spans: Span[] }
  | { kind: 'paragraph'; spans: Span[] }
  | { kind: 'blank' };

const HEADING = /^(#{1,3})\s+(.*)$/;
const TASK = /^\s*[-*]\s+\[( |x|X)\]\s?(.*)$/;
const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/;

/* ------------------------------------------------------------------ reading */

export function parseNote(markdown: string): Block[] {
  return markdown.split('\n').map((line, index): Block => {
    let match = HEADING.exec(line);
    if (match) {
      return { kind: 'heading', level: match[1].length as 1 | 2 | 3, spans: parseInline(match[2]) };
    }

    match = TASK.exec(line);
    if (match) {
      return { kind: 'task', line: index, checked: match[1] !== ' ', spans: parseInline(match[2]) };
    }

    match = BULLET.exec(line);
    if (match) return { kind: 'bullet', spans: parseInline(match[1]) };

    match = NUMBERED.exec(line);
    if (match) return { kind: 'numbered', number: Number(match[1]), spans: parseInline(match[2]) };

    return line.trim() === '' ? { kind: 'blank' } : { kind: 'paragraph', spans: parseInline(line) };
  });
}

type Style = Omit<Span, 'text'>;

const INLINE: { pattern: RegExp; apply: (match: RegExpExecArray, style: Style) => Span[] }[] = [
  {
    pattern: /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/,
    apply: (match, style) => parseInline(match[1], { ...style, href: match[2] }),
  },
  { pattern: /\*\*(.+?)\*\*/, apply: (match, style) => parseInline(match[1], { ...style, bold: true }) },
  {
    pattern: /\+\+(.+?)\+\+/,
    apply: (match, style) => parseInline(match[1], { ...style, underline: true }),
  },
  {
    // One star each side, hugging the words: "2 * 3 * 4" stays as it is.
    pattern: /\*(?=\S)(.+?)(?<=\S)\*/,
    apply: (match, style) => parseInline(match[1], { ...style, italic: true }),
  },
  { pattern: /(?:https?:\/\/|mailto:)[^\s)]+/, apply: (match, style) => [{ ...style, text: match[0], href: match[0] }] },
];

/** The spans of one line, each with its style. */
export function parseInline(text: string, style: Style = {}): Span[] {
  const spans: Span[] = [];
  let rest = text;

  while (rest.length > 0) {
    let first: { match: RegExpExecArray; apply: (typeof INLINE)[number]['apply'] } | null = null;

    for (const { pattern, apply } of INLINE) {
      const match = pattern.exec(rest);
      if (match && (first === null || match.index < first.match.index)) first = { match, apply };
    }

    if (first === null) {
      spans.push({ ...style, text: rest });
      break;
    }

    if (first.match.index > 0) spans.push({ ...style, text: rest.slice(0, first.match.index) });
    spans.push(...first.apply(first.match, style));
    rest = rest.slice(first.match.index + first.match[0].length);
  }

  return spans;
}

/** The text alone, marks set aside: what a card on the agenda shows. */
export function noteText(markdown: string): string {
  return parseNote(markdown)
    .map((block) => ('spans' in block ? block.spans.map((span) => span.text).join('') : ''))
    .filter((line) => line.trim() !== '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The things to tick off in a note, and how many are still unticked. */
export function noteTasks(markdown: string): { pending: number; total: number } {
  const tasks = parseNote(markdown).filter((block) => block.kind === 'task');
  return { pending: tasks.filter((task) => !task.checked).length, total: tasks.length };
}

/* ------------------------------------------------------------------ editing */

/** Ticks or unticks the thing to do on line `line`. */
export function toggleTask(markdown: string, line: number): string {
  const lines = markdown.split('\n');
  const match = TASK.exec(lines[line] ?? '');
  if (!match) return markdown;

  lines[line] = lines[line].replace(/\[( |x|X)\]/, match[1] === ' ' ? '[x]' : '[ ]');
  return lines.join('\n');
}

export type Selection = { start: number; end: number };
export type Edit = { text: string; selection: Selection };

export type InlineFormat = 'bold' | 'italic' | 'underline';
export type LineFormat = 'heading' | 'bullet' | 'task';

const MARKS: Record<InlineFormat, string> = { bold: '**', italic: '*', underline: '++' };
const PREFIXES: Record<LineFormat, string> = { heading: '# ', bullet: '- ', task: '- [ ] ' };

/**
 * Wraps the selection in the marks of a style. With nothing selected, the marks
 * go in with the cursor between them, ready to type.
 */
export function applyInline(text: string, selection: Selection, format: InlineFormat): Edit {
  const mark = MARKS[format];
  const { start, end } = selection;
  const wrapped = `${mark}${text.slice(start, end)}${mark}`;

  return {
    text: text.slice(0, start) + wrapped + text.slice(end),
    selection:
      start === end
        ? { start: start + mark.length, end: start + mark.length }
        : { start, end: start + wrapped.length },
  };
}

/** A link on the selection, or on the address itself when nothing is selected. */
export function applyLink(text: string, selection: Selection, url: string): Edit {
  const { start, end } = selection;
  const label = start === end ? url : text.slice(start, end);
  const link = `[${label}](${url})`;

  return {
    text: text.slice(0, start) + link + text.slice(end),
    selection: { start: start + link.length, end: start + link.length },
  };
}

/** Where the lines touched by the selection begin and end. */
function lineRange(text: string, { start, end }: Selection) {
  const from = text.lastIndexOf('\n', start - 1) + 1;
  const newline = text.indexOf('\n', end);
  return { from, to: newline === -1 ? text.length : newline };
}

/** Strips whatever list or heading prefix a line has. */
function bareLine(line: string): string {
  return line.replace(/^(#{1,3}\s+|\s*[-*]\s+\[( |x|X)\]\s?|\s*[-*]\s+|\s*\d+[.)]\s+)/, '');
}

/**
 * Turns the lines under the selection into headings, bullets or things to tick
 * off. Lines that already are so are turned back into plain text, the way a
 * toolbar button toggles.
 */
export function applyLine(text: string, selection: Selection, format: LineFormat): Edit {
  const { from, to } = lineRange(text, selection);
  const lines = text.slice(from, to).split('\n');
  const prefix = PREFIXES[format];
  const already = lines.every((line) =>
    format === 'task' ? TASK.test(line) : format === 'heading' ? HEADING.test(line) : BULLET.test(line) && !TASK.test(line)
  );

  const changed = lines
    .map((line) => (already ? bareLine(line) : prefix + bareLine(line)))
    .join('\n');
  const result = text.slice(0, from) + changed + text.slice(to);
  const shift = changed.length - (to - from);

  return {
    text: result,
    selection:
      selection.start === selection.end
        ? { start: from + changed.length, end: from + changed.length }
        : { start: from, end: selection.end + shift },
  };
}

/**
 * What pressing enter on a list line should add: the same kind of item on the
 * new line, the way notes apps continue a list. Enter on an item left empty
 * ends the list instead, removing it.
 *
 * `previous` is the text before the keystroke and `next` the text after. Where
 * the newline went is worked out from the two rather than taken from the
 * cursor, which platforms report before or after the text as they please.
 * Anything that is not a single newline typed on a list line comes back as null.
 */
export function continueList(previous: string, next: string): Edit | null {
  if (next.length !== previous.length + 1) return null;

  let inserted = 0;
  while (inserted < previous.length && previous[inserted] === next[inserted]) inserted++;
  if (next[inserted] !== '\n' || next.slice(inserted + 1) !== previous.slice(inserted)) return null;
  const cursor = inserted + 1;

  const lineStart = next.lastIndexOf('\n', cursor - 2) + 1;
  const line = next.slice(lineStart, cursor - 1);

  const task = /^(\s*[-*]\s+)\[(?: |x|X)\]\s?(.*)$/.exec(line);
  const bullet = /^(\s*[-*]\s+)(.*)$/.exec(line);
  const numbered = /^(\s*)(\d+)([.)]\s+)(.*)$/.exec(line);

  let prefix: string;
  let content: string;
  if (task) [prefix, content] = [`${task[1]}[ ] `, task[2]];
  else if (numbered) [prefix, content] = [`${numbered[1]}${Number(numbered[2]) + 1}${numbered[3]}`, numbered[4]];
  else if (bullet) [prefix, content] = [bullet[1], bullet[2]];
  else return null;

  // An empty item: the list is over, so the item goes and the newline with it.
  if (content.trim() === '') {
    const text = next.slice(0, lineStart) + next.slice(cursor);
    return { text, selection: { start: lineStart, end: lineStart } };
  }

  const text = next.slice(0, cursor) + prefix + next.slice(cursor);
  const at = cursor + prefix.length;
  return { text, selection: { start: at, end: at } };
}
