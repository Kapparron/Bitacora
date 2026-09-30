// Lee una rutina compartida desde la app y la dibuja, con un boton para
// importarla. Como en un entreno, la rutina viaja detras del '#', que el
// navegador nunca manda al servidor.
//
// El formato es el de src/features/routines/share.ts, y
// scripts/checks/share.test.ts obliga a los dos extremos a entenderse.

import { APP_RUTINA, DESCARGA, ENLACE_RUTINA, ESQUEMA, PAQUETE } from '../datos.js';
import {
  decodePayload,
  isObject,
  isOptionalInt,
  isOptionalText,
  isText,
  parseSharedExercise,
} from '../enlace.js';
import { formatRest } from '../formato.js';
import { element, exerciseCard, loadCatalogue } from '../tarjeta.js';

const SHARE_VERSION = 1;

/** Generoso, solo para que un enlace hostil no inunde la pagina. */
const MAX_ENTRIES = 60;

/** Las series que la app enseña cuando una rutina no las fija. */
const DEFAULT_SETS = 3;

/* ------------------------------------------------------------------ lectura */

/**
 * Una rutina compartida, desde el enlace o desde el payload solo. Lo que no sea
 * una rutina que esta version entienda vuelve como null.
 */
export function parseSharedRoutine(input) {
  const encoded = input.startsWith(ENLACE_RUTINA) ? input.slice(ENLACE_RUTINA.length) : input;
  const value = decodePayload(encoded);

  if (!isObject(value) || value.v !== SHARE_VERSION) return null;
  if (!isText(value.n) || !isOptionalText(value.o)) return null;
  if (!Array.isArray(value.e) || value.e.length === 0 || value.e.length > MAX_ENTRIES) return null;

  const entries = [];
  for (const raw of value.e) {
    if (!isObject(raw)) return null;

    const e = parseSharedExercise(raw.e);
    if (!e) return null;
    if (!isOptionalInt(raw.s, 1, 100) || !isOptionalInt(raw.d, 0, 3600)) return null;
    if (!isOptionalInt(raw.g, 1, MAX_ENTRIES)) return null;
    if (!isOptionalText(raw.r) || !isOptionalText(raw.o)) return null;

    entries.push({
      e,
      s: raw.s ?? null,
      r: raw.r ?? null,
      d: raw.d ?? null,
      g: raw.g ?? null,
      o: raw.o ?? null,
    });
  }

  return { v: SHARE_VERSION, n: value.n.trim(), o: value.o ?? null, e: entries };
}

/** `4 × 8-12`, o `4 series` cuando no hay repeticiones objetivo. */
export function formatTarget(entry) {
  const sets = entry.s ?? DEFAULT_SETS;
  const reps = entry.r?.trim();

  if (reps) return `${sets} × ${reps}`;
  return sets === 1 ? '1 serie' : `${sets} series`;
}

/* ------------------------------------------------------------------- dibujo */

function entryCard(entry, catalogue) {
  const card = exerciseCard(entry.e, entry.g, entry.o, catalogue);

  const targets = element('div', 'targets');
  targets.append(element('span', 'target', formatTarget(entry)));
  targets.append(element('span', 'muted', `Descanso: ${formatRest(entry.d)}`));
  card.append(targets);

  return card;
}

/** Un movil, que es donde puede estar la app. iPadOS se hace pasar por un Mac. */
function isPhone() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

/** Lo que abre la app. En Android, un intent manda a la descarga a quien no la tenga. */
function importLink(encoded) {
  return /Android/i.test(navigator.userAgent)
    ? 'intent://routine/import?r=' + encoded +
      '#Intent;scheme=' + ESQUEMA + ';package=' + PAQUETE +
      ';S.browser_fallback_url=' + encodeURIComponent(DESCARGA) + ';end'
    : APP_RUTINA + encoded;
}

/** El codigo QR como un solo path SVG, negro sobre blanco como en la app. */
async function qrCode(text) {
  const { create } = await import('../vendor/qrcode.js');
  const { modules } = create(text, { errorCorrectionLevel: 'L' });
  const quiet = 4;
  const size = modules.size + quiet * 2;

  let path = '';
  for (let row = 0; row < modules.size; row++) {
    for (let column = 0; column < modules.size; column++) {
      if (modules.get(row, column)) path += `M${column + quiet} ${row + quiet}h1v1h-1z`;
    }
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'qr');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Código QR de esta rutina');
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.innerHTML = `<rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/>`;
  return svg;
}

async function drawImport(encoded) {
  const box = document.getElementById('import');

  if (isPhone()) {
    const button = element('a', 'button', 'Importar en Bitácora');
    button.href = importLink(encoded);
    box.append(element('p', null, 'Guárdala en la app para entrenarla.'), button);
  } else {
    // En el escritorio no hay app que abrir: el mismo enlace, pero en el movil.
    box.append(
      element('p', null, 'Bitácora es una app para el móvil. Escanea este código con él para importar la rutina.'),
      await qrCode(ENLACE_RUTINA + encoded)
    );
  }

  const download = element('a', 'download', '¿No tienes la app? Descárgala');
  download.href = '../#descargar';
  box.append(download);
}

function fail(message) {
  document.getElementById('title').textContent = 'Enlace incompleto';
  document.getElementById('subtitle').textContent = message;
  document.getElementById('routine').hidden = true;
}

export async function render() {
  const encoded = location.hash.slice(1);
  const routine = parseSharedRoutine(encoded);

  if (!routine) {
    fail('Este enlace no lleva una rutina, o llegó cortado. Pide que te lo vuelvan a enviar.');
    return;
  }

  const count = routine.e.length;
  document.title = `${routine.n} · Bitácora`;
  document.getElementById('title').textContent = routine.n;
  document.getElementById('subtitle').textContent =
    count === 1 ? '1 ejercicio' : `${count} ejercicios`;

  if (routine.o) {
    const notes = document.getElementById('notes');
    notes.textContent = routine.o;
    notes.hidden = false;
  }

  await drawImport(encoded);

  const catalogue = await loadCatalogue();
  const list = document.getElementById('exercises');
  for (const entry of routine.e) list.append(entryCard(entry, catalogue));
}
