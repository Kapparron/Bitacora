import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CHECK_INTERVAL_MS,
  compareVersions,
  isNewer,
  normalizeVersion,
  parseRelease,
  shouldCheck,
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
