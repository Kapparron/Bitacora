// Elige la version que ofrecen los botones de descarga de la portada.
//
// Las mismas reglas que `src/features/updates/updates.ts` sigue dentro de la
// app: se descarta lo que no traiga APK, las versiones se comparan por sus
// numeros y no por la fecha de publicacion, y las preliminares solo valen
// mientras no exista ninguna acabada. `scripts/checks/updates.test.ts` pasa los
// mismos casos por los dos lados.

import { RELEASES_API } from './datos.js';

/** Quita la `v` que llevan las etiquetas y no llevan las versiones. */
export function normalizeVersion(version) {
  return String(version).trim().replace(/^v/i, '');
}

/** Ordena dos versiones por sus numeros; lo que no se pueda leer cuenta como cero. */
export function compareVersions(left, right) {
  const parse = (version) =>
    normalizeVersion(version)
      .split(/[.\-+]/)
      .map((part) => Number.parseInt(part, 10))
      .map((part) => (Number.isFinite(part) ? part : 0));

  const a = parse(left);
  const b = parse(right);

  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }

  return 0;
}

/** Lo que interesa de una release, o null si no trae APK: sin APK no se instala. */
export function toRelease(payload) {
  if (typeof payload !== 'object' || payload === null) return null;
  if (payload.draft === true) return null;
  if (typeof payload.tag_name !== 'string' || payload.tag_name.trim() === '') return null;
  if (!Array.isArray(payload.assets)) return null;

  const apk = payload.assets.find(
    (asset) =>
      typeof asset?.name === 'string' &&
      asset.name.toLowerCase().endsWith('.apk') &&
      typeof asset.browser_download_url === 'string'
  );
  if (!apk) return null;

  return {
    version: normalizeVersion(payload.tag_name),
    tag: payload.tag_name,
    prerelease: payload.prerelease === true,
    url: apk.browser_download_url,
    size: typeof apk.size === 'number' ? apk.size : 0,
  };
}

/**
 * La mejor de una lista. Las preliminares solo entran mientras no haya ninguna
 * acabada: en cuanto existe una, es la que se ofrece a quien llega a la web.
 */
export function pickLatest(payloads) {
  const releases = (Array.isArray(payloads) ? payloads : []).map(toRelease).filter(Boolean);
  const finished = releases.filter((release) => !release.prerelease);
  const pool = finished.length > 0 ? finished : releases;

  return pool.reduce(
    (best, release) =>
      !best || compareVersions(release.version, best.version) > 0 ? release : best,
    null
  );
}

export function fetchLatest(signal) {
  return fetch(`${RELEASES_API}?per_page=30`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal,
  })
    .then((response) => {
      if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
      return response.json();
    })
    .then(pickLatest);
}
