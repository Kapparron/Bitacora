// Trims the app's exercise catalogue down to what the shared-session page needs
// to turn an id into a name and a picture.
//
//   node scripts/build-web-catalog.mjs
//
// A shared session names its exercises by their dataset id, exactly as a shared
// routine does, so the link stays short enough for a QR code. The page therefore
// needs the catalogue too, but only the name and the media slug: 86 KB, and 25
// once GitHub Pages gzips it, against the 1 MB the app ships.
//
// scripts/checks/workout-share.test.ts fails if the published file falls behind
// assets/data/exercises.json, which is what says to run this again.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const APP_CATALOGUE = resolve(ROOT, 'assets/data/exercises.json');
export const WEB_CATALOGUE = resolve(ROOT, 'site/entreno/catalogo.json');

/**
 * `{ "0001": ["3/4 sit-up", "0001-2gPfomN"] }`.
 *
 * Both media files of an exercise are the same name under a different folder,
 * so the page rebuilds `images/<slug>.jpg` and `videos/<slug>.gif` from one
 * slug. An exercise that ever breaks that pattern stops the build rather than
 * reaching the page with a picture that does not load.
 */
export function webCatalogue(catalogue) {
  const entries = catalogue.map((exercise) => {
    const slug = (exercise.image ?? '').replace(/^images\//, '').replace(/\.jpg$/, '');

    if (!slug || exercise.image !== `images/${slug}.jpg` || exercise.gif !== `videos/${slug}.gif`) {
      throw new Error(
        `${exercise.id} does not name its media as images/<slug>.jpg + videos/<slug>.gif`
      );
    }

    return [exercise.id, [exercise.name, slug]];
  });

  return Object.fromEntries(entries);
}

export function writeWebCatalogue(catalogue = JSON.parse(readFileSync(APP_CATALOGUE, 'utf8'))) {
  const json = JSON.stringify(webCatalogue(catalogue));

  mkdirSync(dirname(WEB_CATALOGUE), { recursive: true });
  writeFileSync(WEB_CATALOGUE, json);

  return { count: catalogue.length, bytes: Buffer.byteLength(json) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { count, bytes } = writeWebCatalogue();
  console.log(`${count} exercises, ${(bytes / 1024).toFixed(0)} KB written to ${WEB_CATALOGUE}`);
}
