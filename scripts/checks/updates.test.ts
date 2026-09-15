import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CHECK_INTERVAL_MS,
  compareVersions,
  isNewer,
  normalizeVersion,
  parseRelease,
  pickLatest,
  shouldCheck,
  shouldOffer,
} from '@/features/updates/updates';

test('a tag and an app version compare as the same number', () => {
  assert.equal(normalizeVersion('v1.2.0'), '1.2.0');
  assert.equal(compareVersions('v1.2.0', '1.2.0'), 0);
});

test('versions order by their parts, not as text', () => {
  // As text '1.10.0' sorts before '1.9.0', which would hide an update.
  assert.equal(compareVersions('1.10.0', '1.9.0'), 1);
  assert.equal(compareVersions('1.2.1', '1.2'), 1);
  assert.equal(compareVersions('2.0.0', '10.0.0'), -1);
});

test('only a higher version is offered', () => {
  assert.equal(isNewer('1.3.0', '1.2.0'), true);
  assert.equal(isNewer('1.2.0', '1.2.0'), false);
  assert.equal(isNewer('1.1.0', '1.2.0'), false);
  // Without a known installed version there is nothing to compare against.
  assert.equal(isNewer('1.3.0', null), false);
});

test('the check waits a day between attempts', () => {
  const now = 1_700_000_000_000;

  assert.equal(shouldCheck(null, now), true);
  assert.equal(shouldCheck(now - CHECK_INTERVAL_MS, now), true);
  assert.equal(shouldCheck(now - 60_000, now), false);
  // A clock moved backwards must not lock checking out until it catches up.
  assert.equal(shouldCheck(now + CHECK_INTERVAL_MS, now), true);
});

const RELEASE = {
  tag_name: 'v1.3.0',
  name: 'Bitacora v1.3.0',
  body: '  Notas  ',
  draft: false,
  assets: [
    { name: 'source.zip', browser_download_url: 'https://example.test/source.zip', size: 10 },
    {
      name: 'bitacora-v1.3.0.apk',
      browser_download_url: 'https://example.test/bitacora.apk',
      size: 46_595_114,
    },
  ],
};

test('the APK is picked out of the release assets', () => {
  const release = parseRelease(RELEASE);

  assert.deepEqual(release, {
    version: '1.3.0',
    name: 'Bitacora v1.3.0',
    notes: 'Notas',
    apkUrl: 'https://example.test/bitacora.apk',
    size: 46_595_114,
  });
});

test('a release with no APK is not an update', () => {
  assert.equal(parseRelease({ ...RELEASE, assets: [] }), null);
  assert.equal(parseRelease({ ...RELEASE, draft: true }), null);
  assert.equal(parseRelease({ message: 'Not Found' }), null);
  assert.equal(parseRelease(null), null);
});

test('the highest version wins, not the one published last', () => {
  const older = { ...RELEASE, tag_name: 'v1.9.0' };
  const newer = { ...RELEASE, tag_name: 'v1.10.0' };

  // A fix for an older line can be published after a newer version.
  assert.equal(pickLatest([older, newer])?.version, '1.10.0');
  assert.equal(pickLatest([newer, older])?.version, '1.10.0');
});

test('releases with no APK are skipped when picking the latest', () => {
  const withoutApk = { ...RELEASE, tag_name: 'v2.0.0', assets: [] };

  assert.equal(pickLatest([withoutApk, RELEASE])?.version, '1.3.0');
  assert.equal(pickLatest([]), null);
  assert.equal(pickLatest({ message: 'Not Found' }), null);
});

test('the same version is never offered, however the check was asked for', () => {
  // Both the card and the popup read this: saying 'disponible la 0.0.4' next to
  // 'ya tienes la ultima version' was the contradiction it prevents.
  assert.equal(shouldOffer('0.0.4', '0.0.4', true), false);
  assert.equal(shouldOffer('0.0.4', '0.0.4', false), false);
});

test('a manual check offers a version below the installed one', () => {
  // A preliminary build can sit under the release it followed, and asking by
  // hand is how it gets installed on purpose.
  assert.equal(shouldOffer('0.0.5', '1.0.0', true), true);
  assert.equal(shouldOffer('0.0.5', '1.0.0', false), false);
  assert.equal(shouldOffer('1.1.0', '1.0.0', false), true);
});

/**
 * La portada elige la version que ofrece con las mismas reglas, en su propio
 * modulo (`site/versiones.js`), porque la web no puede importar la app. Estas
 * son las mismas respuestas por los dos lados.
 */
test('la web elige la misma version que la app', async () => {
  const web = await import('../../site/versiones.js');

  const apk = (name = 'bitacora.apk') => ({
    name,
    browser_download_url: `https://example.test/${name}`,
    size: 42,
  });

  const releases = [
    { tag_name: 'v0.9.0', assets: [apk()] },
    { tag_name: 'v1.2.0', assets: [apk()] },
    { tag_name: 'v1.0.1', assets: [apk()] },
    // Sin APK no se instala, asi que no cuenta para ninguno de los dos.
    { tag_name: 'v2.0.0', assets: [{ name: 'notas.txt', browser_download_url: 'x' }] },
    { tag_name: 'v3.0.0', draft: true, assets: [apk()] },
  ];

  assert.equal(web.pickLatest(releases)?.version, pickLatest(releases)?.version);
  assert.equal(web.pickLatest(releases)?.version, '1.2.0');

  for (const [left, right] of [
    ['1.2.1', '1.2'],
    ['v1.2.0', '1.2.0'],
    ['0.0.5', '1.0.0'],
    ['1.10.0', '1.9.0'],
    ['nada', '0.0.1'],
  ]) {
    assert.equal(web.compareVersions(left, right), compareVersions(left, right), `${left} vs ${right}`);
  }

  assert.equal(web.toRelease(releases[0])?.version, parseRelease(releases[0])?.version);
  assert.equal(web.toRelease(releases[3]), null);
  assert.equal(parseRelease(releases[3]), null);

  // Una preliminar solo vale mientras no exista ninguna acabada.
  const beta = { tag_name: 'v1.3.0-beta', prerelease: true, assets: [apk()] };
  assert.equal(web.pickLatest([beta])?.version, '1.3.0-beta');
  assert.equal(web.pickLatest([...releases, beta])?.version, '1.2.0');
});
