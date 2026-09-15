// Writes everything the website serves out of `data/`, which is the only place
// any of it is written down.
//
//   node scripts/build-data.mjs
//
// Three files come out of it, and none of them is edited by hand:
//
//   site/catalogo.json  the catalogue trimmed to what a page needs from it
//   site/datos.js       the constants the pages read: links, media, set types
//   site/estilo.css     the palette, as custom properties
//
// `scripts/checks/data.test.mjs` fails when any of the three has fallen behind
// its source, which is what says to run this again.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const CATALOGUE = resolve(ROOT, 'data/exercises.json');
export const PROJECT = resolve(ROOT, 'data/project.json');
export const SETS = resolve(ROOT, 'data/sets.json');
export const THEME = resolve(ROOT, 'data/theme.json');

export const WEB_CATALOGUE = resolve(ROOT, 'site/catalogo.json');
export const WEB_DATA = resolve(ROOT, 'site/datos.js');
export const WEB_STYLE = resolve(ROOT, 'site/estilo.css');

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));

const WARNING = '// Generado por `npm run build:data` desde data/. No se edita a mano.\n';

/* --------------------------------------------------------------- catalogue */

/**
 * `{ "0001": ["3/4 sit-up", "0001-2gPfomN"] }`.
 *
 * A shared session or routine names its exercises by their dataset id, exactly
 * as the app does, so the link stays short enough for a QR code. The pages
 * therefore need the catalogue too, but only the name and the media slug: 86 KB
 * against the 1 MB the app ships, and 25 once GitHub Pages gzips it.
 *
 * Both media files of an exercise are the same name under a different folder,
 * so a page rebuilds them from one slug. An exercise that ever breaks that
 * pattern stops the build rather than reaching a page with a picture that does
 * not load.
 */
export function webCatalogue(catalogue, media) {
  const entries = catalogue.map((exercise) => {
    const slug = (exercise.image ?? '').replace(new RegExp(`^${media.imageDir}/`), '').replace(/\.jpg$/, '');

    if (
      !slug ||
      exercise.image !== `${media.imageDir}/${slug}.jpg` ||
      exercise.gif !== `${media.gifDir}/${slug}.gif`
    ) {
      throw new Error(
        `${exercise.id} does not name its media as ${media.imageDir}/<slug>.jpg + ${media.gifDir}/<slug>.gif`
      );
    }

    return [exercise.id, [exercise.name, slug]];
  });

  return Object.fromEntries(entries);
}

/* ------------------------------------------------------------- constants */

const quote = (value) => JSON.stringify(value);

/** The module `site/` imports its constants from. */
export function webData(project, sets) {
  const base = project.web.base;

  const codes = Object.fromEntries(
    sets.setTypes.filter((type) => type.code !== '').map((type) => [type.code, type.id])
  );
  const badges = Object.fromEntries(
    sets.setTypes.filter((type) => type.badge !== '#').map((type) => [type.id, type.badge])
  );
  const volume = Object.fromEntries(sets.setTypes.map((type) => [type.id, type.countsForVolume]));

  return `${WARNING}
/** Donde se instala la app. */
export const DESCARGA = ${quote(base + project.web.downloadAnchor)};

/** Prefijo de un enlace de entreno compartido, y el de una rutina. */
export const ENLACE_ENTRENO = ${quote(`${base}${project.web.workoutPath}#`)};
export const ENLACE_RUTINA = ${quote(`${base}${project.web.routinePath}#`)};

/** Lo que abre la app, y el paquete que un enlace intent:// tiene que nombrar. */
export const APP_RUTINA = ${quote(project.app.routineImport)};
export const ESQUEMA = ${quote(project.scheme)};
export const PAQUETE = ${quote(project.package)};

/** Todas las versiones publicadas, y de donde salen las fotos y los gifs. */
export const RELEASES = ${quote(`${project.githubWeb}/${project.repo}/releases`)};
export const RELEASES_API = ${quote(`${project.githubApi}/${project.repo}/releases`)};
export const CDN = ${quote(project.media.cdn)};
export const IMAGENES = ${quote(project.media.imageDir)};
export const VIDEOS = ${quote(project.media.gifDir)};
export const ATRIBUCION = ${quote(project.media.attribution)};

/** La letra con la que viaja cada tipo de serie, y la que se enseña. */
export const TIPOS_SERIE = ${JSON.stringify(codes)};
export const INSIGNIA_SERIE = ${JSON.stringify(badges)};

/** Que tipos cuentan para el volumen: el calentamiento no. */
export const CUENTA_VOLUMEN = ${JSON.stringify(volume)};
`;
}

/* ----------------------------------------------------------------- palette */

/**
 * Which custom property each colour is. The app's own palette is on the left of
 * the ones it shares; the rest are the website's own, warmer black and off
 * white included, and live under `site` in `data/theme.json`.
 */
const VARIABLES = [
  ['--bg', (t) => t.site.bg],
  ['--bg-raised', (t) => t.site.bgRaised],
  ['--bg-line', (t) => t.site.bgLine],
  ['--bg-panel', (t) => t.site.bgPanel],
  ['--bg-section', (t) => t.site.bgSection],
  ['--shadow-ring', (t) => t.site.shadowRing],
  ['--surface', (t) => t.dark.backgroundElement],
  ['--surface-strong', (t) => t.dark.backgroundSelected],
  ['--border', (t) => t.dark.border],
  ['--text', (t) => t.site.text],
  ['--muted', (t) => t.site.muted],
  ['--accent', (t) => t.dark.accent],
  ['--accent-deep', (t) => t.light.accent],
  ['--accent-hover', (t) => t.site.accentHover],
  ['--on-accent', (t) => t.site.onAccent],
  ['--warm', (t) => t.site.warm],
  ['--brand', (t) => t.brand],
];

export function webStyle(theme) {
  const lines = VARIABLES.map(([name, pick]) => `  ${name}: ${pick(theme).toLowerCase()};`);

  return `/* Generado por \`npm run build:data\` desde data/theme.json. No se edita a mano. */
:root {
${lines.join('\n')}
}
`;
}

/* ------------------------------------------------------------------- write */

export function buildData() {
  const project = read(PROJECT);
  const catalogue = webCatalogue(read(CATALOGUE), project.media);
  const data = webData(project, read(SETS));
  const style = webStyle(read(THEME));

  mkdirSync(dirname(WEB_CATALOGUE), { recursive: true });
  writeFileSync(WEB_CATALOGUE, JSON.stringify(catalogue));
  writeFileSync(WEB_DATA, data);
  writeFileSync(WEB_STYLE, style);

  return {
    exercises: Object.keys(catalogue).length,
    bytes: Buffer.byteLength(JSON.stringify(catalogue)),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { exercises, bytes } = buildData();
  console.log(`${exercises} ejercicios, ${(bytes / 1024).toFixed(0)} KB en ${WEB_CATALOGUE}`);
  console.log(`${WEB_DATA} y ${WEB_STYLE} escritos`);
}
