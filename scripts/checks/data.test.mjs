// Vigila la carpeta `data/`, que es de donde sale todo lo que la app y la web
// dicen sobre si mismas.
//
// Dos cosas se comprueban aqui: que lo que la web sirve siga siendo lo que
// `npm run build:data` escribiria hoy, y que lo que no se puede generar —los
// tipos de TypeScript, los colores de app.json— siga coincidiendo con el dato.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  CATALOGUE,
  PROJECT,
  SETS,
  THEME,
  WEB_CATALOGUE,
  WEB_DATA,
  WEB_STYLE,
  webCatalogue,
  webData,
  webStyle,
} from '../build-data.mjs';
import { SET_TYPE_IDS, TRACKING_TYPE_IDS } from '@/constants/sets';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const text = (path) => readFileSync(path, 'utf8');

/** Un fichero del repositorio, por su ruta relativa a este. */
const repo = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

const project = read(PROJECT);
const sets = read(SETS);
const theme = read(THEME);

/* ------------------------------------------------ lo generado, al dia */

test('el catalogo que carga la web es el que lleva la app', () => {
  // Ejecuta `npm run build:data` cuando esto falle.
  assert.deepEqual(read(WEB_CATALOGUE), webCatalogue(read(CATALOGUE), project.media));
});

test('las constantes de la web son las de data/project.json y data/sets.json', () => {
  assert.equal(text(WEB_DATA), webData(project, sets));
});

test('la hoja de estilo de la web es la paleta de data/theme.json', () => {
  assert.equal(text(WEB_STYLE), webStyle(theme));
});

/* --------------------------------------- lo que no se puede generar */

test('los tipos de serie de TypeScript son los de data/sets.json', () => {
  assert.deepEqual([...SET_TYPE_IDS], sets.setTypes.map((type) => type.id));
});

test('los tipos de seguimiento de TypeScript son los de data/sets.json', () => {
  assert.deepEqual([...TRACKING_TYPE_IDS], sets.trackingTypes.map((type) => type.id));
});

test('app.json pinta el icono y el splash con el verde de marca', () => {
  const app = read(repo('app.json'));
  const splash = app.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
  );

  assert.equal(app.expo.android.adaptiveIcon.backgroundColor, theme.brand);
  assert.equal(splash[1].backgroundColor, theme.brand);
});

test('app.json y data/project.json nombran la app igual', () => {
  const app = read(repo('app.json'));

  assert.equal(app.expo.android.package, project.package);
  assert.equal(app.expo.scheme, project.scheme);
});

test('la barra del navegador usa el fondo de la web', () => {
  for (const page of ['site/index.html', 'site/entreno/index.html']) {
    const html = text(repo(page));
    const declared = /<meta name="theme-color" content="([^"]+)">/.exec(html);

    assert.ok(declared, `${page} no declara theme-color`);
    assert.equal(declared[1].toLowerCase(), theme.site.bg.toLowerCase());
  }
});

test('la app no vuelve a escribir su propia version', () => {
  const pkg = read(repo('package.json'));

  // La version vive en app.json, que es lo que compara `features/updates`.
  assert.equal(pkg.version, undefined);
  assert.equal(pkg.private, true);
});

/* ----------------------------------------- las tablas del respaldo */

test('el respaldo y sus comprobaciones listan las mismas tablas', async () => {
  const { BACKUP_TABLES } = await import('./database.mjs');
  const backup = text(repo('src/features/backup/backup.ts'));

  const listed = [...backup.matchAll(/^\s*\['([a-zA-Z]+)', [a-zA-Z]+\],$/gm)].map(
    (match) => match[1]
  );
  const snake = listed.map((name) => name.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase()));

  assert.deepEqual(snake, BACKUP_TABLES);
});
