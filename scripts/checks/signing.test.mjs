import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);

// The shape of the Expo template's build.gradle, cut down to what the plugin reads.
const TEMPLATE = `
android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}
`;

test('the release build is signed with the project keystore, the debug one stays debug', () => {
  const { applyReleaseSigning } = require('../../plugins/with-release-signing.js');
  const gradle = applyReleaseSigning(TEMPLATE);

  const release = gradle.slice(gradle.lastIndexOf('release {'));
  assert.match(release, /signingConfigs\.release/);
  assert.match(gradle, /storeFile file\(System\.getenv\('BITACORA_KEYSTORE_FILE'\)\)/);

  const debugType = gradle.slice(gradle.indexOf('buildTypes'), gradle.lastIndexOf('release {'));
  assert.match(debugType, /signingConfig signingConfigs\.debug/);
  assert.doesNotMatch(debugType, /signingConfigs\.release/);

  assert.equal(applyReleaseSigning(gradle), gradle, 'aplicarlo dos veces no cambia nada');
});

test('a template the plugin does not recognise stops the build instead of shipping the debug key', () => {
  const { applyReleaseSigning } = require('../../plugins/with-release-signing.js');

  assert.throws(() => applyReleaseSigning('android { }'));
});
