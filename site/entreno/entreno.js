// Reads a session shared from the app and draws it, with nothing behind it: the
// whole session travels after the '#' of the link, the part a browser never
// sends to the server. Nobody's training reaches GitHub, and this page works
// just as well saved to disk.
//
// The format is the one written in src/features/workout/share.ts, and
// scripts/checks/workout-share.test.ts holds both ends to the same grammar.

import { CUENTA_VOLUMEN, DESCARGA, ENLACE_ENTRENO, INSIGNIA_SERIE, TIPOS_SERIE } from '../datos.js';
import {
  MAX_TEXT,
  decodePayload,
  isObject,
  isOptionalInt,
  isOptionalText,
  isText,
  parseSharedExercise,
} from '../enlace.js';
import { formatDuration, formatNumber } from '../formato.js';
import { element, exerciseCard, loadCatalogue } from '../tarjeta.js';

const SHARE_VERSION = 1;

/** Generous limits, only there so a hostile link cannot flood the page. */
const MAX_ENTRIES = 60;
const MAX_SETS = 60;

const DECIMAL = '\\d+(?:\\.\\d+)?';
const MEASURES = new RegExp(`^(?:(${DECIMAL})m)?(?:(\\d+)s)?$`);

/* ------------------------------------------------------------------ reading */

/**
 * One set written as `w60x8@8.5`, or null when it is not a set. See the grammar
 * in src/features/workout/share.ts.
 */
export function decodeSet(token) {
  let rest = String(token);

  const type = TIPOS_SERIE[rest[0]] ?? 'normal';
  if (type !== 'normal') rest = rest.slice(1);

  const set = { type, weight: null, reps: null, distanceM: null, durationS: null, rpe: null };

  const at = rest.indexOf('@');
  if (at !== -1) {
    set.rpe = decimal(rest.slice(at + 1), 0, 10);
    if (set.rpe === null) return null;
    rest = rest.slice(0, at);
  }

  // A set that was ticked off with nothing written down.
  if (rest === '-') return set;

  if (rest.includes('x')) {
    const sides = rest.split('x');
    if (sides.length !== 2 || (sides[0] === '' && sides[1] === '')) return null;

    set.weight = sides[0] === '' ? null : decimal(sides[0], 0, 2000);
    set.reps = sides[1] === '' ? null : whole(sides[1], 0, 1000);
    if ((sides[0] !== '' && set.weight === null) || (sides[1] !== '' && set.reps === null)) {
      return null;
    }

    return set;
  }

  const measures = MEASURES.exec(rest);
  if (!measures || (measures[1] === undefined && measures[2] === undefined)) return null;

  if (measures[1] !== undefined) {
    set.distanceM = decimal(measures[1], 0, 1000000);
    if (set.distanceM === null) return null;
  }

  if (measures[2] !== undefined) {
    set.durationS = whole(measures[2], 0, 86400);
    if (set.durationS === null) return null;
  }

  return set;
}

/** The sets of one exercise, `w20x10,60x8`, or null when any of them is not one. */
export function decodeSets(text) {
  if (typeof text !== 'string' || text === '') return null;
  if (text.length > MAX_TEXT * 4) return null;

  const tokens = text.split(',');
  if (tokens.length > MAX_SETS) return null;

  const sets = [];
  for (const token of tokens) {
    const set = decodeSet(token);
    if (!set) return null;
    sets.push(set);
  }

  return sets;
}

/**
 * A shared session, from the link or from the payload alone. Anything that is
 * not a session this version understands comes back as null: a link can say
 * anything, and every field here ends up on screen.
 */
export function parseSharedWorkout(input) {
  const encoded = input.startsWith(ENLACE_ENTRENO) ? input.slice(ENLACE_ENTRENO.length) : input;
  const value = decodePayload(encoded);

  if (!isObject(value) || value.v !== SHARE_VERSION) return null;
  if (!isText(value.n) || !isOptionalText(value.o)) return null;
  if (!Number.isInteger(value.t) || value.t < 0 || value.t > 4102444800) return null;
  if (!isOptionalInt(value.d, 0, 604800)) return null;
  if (!Array.isArray(value.e) || value.e.length > MAX_ENTRIES) return null;

  const entries = [];
  for (const raw of value.e) {
    if (!isObject(raw)) return null;

    const exercise = parseSharedExercise(raw.e);
    const sets = decodeSets(raw.s);
    if (!exercise || !sets) return null;
    if (!isOptionalInt(raw.g, 1, MAX_ENTRIES) || !isOptionalText(raw.o)) return null;

    entries.push({ e: exercise, sets, g: raw.g ?? null, o: raw.o ?? null });
  }

  return {
    v: SHARE_VERSION,
    n: value.n.trim(),
    t: value.t,
    d: value.d ?? null,
    o: value.o ?? null,
    e: entries,
  };
}

function decimal(text, min, max) {
  if (!new RegExp(`^${DECIMAL}$`).test(text)) return null;
  const value = Number(text);
  return value >= min && value <= max ? value : null;
}

function whole(text, min, max) {
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return value >= min && value <= max ? value : null;
}

/* ---------------------------------------------------------------- measuring */

/**
 * Only working sets count towards volume, warm-ups never, which is the rule the
 * app's own summary follows. Every set that travelled was completed.
 */
export function volumeOf(entries) {
  let total = 0;

  for (const entry of entries) {
    for (const set of entry.sets) {
      if (!CUENTA_VOLUMEN[set.type] || set.weight === null || set.reps === null) continue;
      total += set.weight * set.reps;
    }
  }

  return total;
}

export function setCountOf(entries) {
  return entries.reduce((count, entry) => count + entry.sets.length, 0);
}

/** Warm-ups carry a letter, so the set after them is still set 1. */
function badgeFor(sets, index) {
  const { type } = sets[index];
  if (type !== 'normal') return INSIGNIA_SERIE[type];

  const uncounted = sets.slice(0, index).filter((set) => !CUENTA_VOLUMEN[set.type]).length;
  return String(index + 1 - uncounted);
}

/* ---------------------------------------------------------------- formatting */

export { formatDuration };

/**
 * The day it was trained, spelled out. The app says "Hoy" or "Ayer", which a
 * link read next week would turn into a lie.
 */
function formatDate(epochSeconds) {
  const date = new Date(epochSeconds * 1000);
  const day = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  const time = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  return `${day} · ${time}`;
}

/** What one set reads as, decided by what was written down, not by its type. */
export function formatSet(set) {
  if (set.weight !== null && set.reps !== null) {
    return `${formatNumber(set.weight)} kg × ${set.reps}`;
  }
  if (set.weight !== null) return `${formatNumber(set.weight)} kg`;
  if (set.reps !== null) return `${set.reps} reps`;

  const parts = [];
  if (set.distanceM !== null) parts.push(`${formatNumber(set.distanceM)} m`);
  if (set.durationS !== null) parts.push(formatDuration(set.durationS));

  return parts.length > 0 ? parts.join(' · ') : 'Hecha';
}

/* ------------------------------------------------------------------ drawing */

function entryCard(entry, catalogue) {
  const card = exerciseCard(entry.e, entry.g, entry.o, catalogue);

  const list = element('ol', 'sets');
  entry.sets.forEach((set, index) => {
    const row = element('li', CUENTA_VOLUMEN[set.type] ? 'set' : 'set warmup');
    row.append(element('span', 'badge', badgeFor(entry.sets, index)));
    row.append(element('span', 'measures', formatSet(set)));
    row.append(element('span', 'rpe', set.rpe === null ? '' : `RPE ${formatNumber(set.rpe)}`));
    list.append(row);
  });
  card.append(list);

  return card;
}

function fail(message) {
  document.getElementById('title').textContent = 'Enlace incompleto';
  document.getElementById('subtitle').textContent = message;
  document.getElementById('session').hidden = true;
}

export async function render() {
  const workout = parseSharedWorkout(location.hash.slice(1));

  if (!workout) {
    fail('Este enlace no lleva un entreno, o llegó cortado. Pide que te lo vuelvan a enviar.');
    return;
  }

  document.title = `${workout.n} · Bitacora`;
  document.getElementById('title').textContent = workout.n;
  document.getElementById('subtitle').textContent = formatDate(workout.t);

  document.getElementById('duration').textContent =
    workout.d === null ? '-' : formatDuration(workout.d);
  document.getElementById('volume').textContent = `${formatNumber(volumeOf(workout.e), 0)} kg`;
  document.getElementById('sets').textContent = String(setCountOf(workout.e));

  if (workout.o) {
    const notes = document.getElementById('notes');
    notes.textContent = workout.o;
    notes.hidden = false;
  }

  const catalogue = await loadCatalogue();
  const list = document.getElementById('exercises');

  if (workout.e.length === 0) {
    list.append(element('p', 'muted', 'Este entreno no tiene ninguna serie completada.'));
    return;
  }

  for (const entry of workout.e) list.append(entryCard(entry, catalogue));
}

export { DESCARGA as DOWNLOAD };
