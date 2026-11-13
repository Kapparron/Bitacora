const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signs the release build with the project's own keystore.
 *
 * The Expo template signs a release with `debug.keystore`, whose key and
 * password are the same for everyone: any APK signed with it is accepted by
 * Android as an update of the installed app. The `android` folder is generated
 * on every build, so the fix cannot live in `build.gradle`; this rewrites it
 * after each prebuild.
 *
 * The keystore comes from the environment (see `release-apk.yml`):
 *
 *   BITACORA_KEYSTORE_FILE       absolute path of the keystore
 *   BITACORA_KEYSTORE_PASSWORD
 *   BITACORA_KEY_ALIAS
 *   BITACORA_KEY_PASSWORD
 *
 * Without `BITACORA_KEYSTORE_FILE` the release falls back to the debug key, so
 * `npx expo run:android --variant release` still works on a dev machine. The
 * workflow refuses to publish in that case.
 */
const RELEASE_CONFIG = `
        release {
            if (System.getenv('BITACORA_KEYSTORE_FILE')) {
                storeFile file(System.getenv('BITACORA_KEYSTORE_FILE'))
                storePassword System.getenv('BITACORA_KEYSTORE_PASSWORD')
                keyAlias System.getenv('BITACORA_KEY_ALIAS')
                keyPassword System.getenv('BITACORA_KEY_PASSWORD')
            }
        }`;

const RELEASE_USES =
  "signingConfig System.getenv('BITACORA_KEYSTORE_FILE') ? signingConfigs.release : signingConfigs.debug";

function applyReleaseSigning(gradle) {
  if (gradle.includes('BITACORA_KEYSTORE_FILE')) return gradle;

  // The `debug { ... }` block inside `signingConfigs`, to add `release` after it.
  const debugConfig = /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/;
  // The `signingConfig` line of the release build type, the second in the file.
  const releaseType = /(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/;

  if (!debugConfig.test(gradle) || !releaseType.test(gradle)) {
    throw new Error(
      'with-release-signing: build.gradle no tiene la forma esperada; la plantilla de Expo ha cambiado.'
    );
  }

  return gradle
    .replace(debugConfig, `$1${RELEASE_CONFIG}`)
    .replace(releaseType, `$1${RELEASE_USES}`);
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = applyReleaseSigning(gradleConfig.modResults.contents);
    return gradleConfig;
  });
};

module.exports.applyReleaseSigning = applyReleaseSigning;
