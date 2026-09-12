import * as Application from 'expo-application';
import { Directory, File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

import type { Release } from '@/features/updates/updates';

/** Where downloaded APKs are kept. The cache: the file is useless once installed. */
const FOLDER = 'updates';

/** `Intent.FLAG_GRANT_READ_URI_PERMISSION`, so the installer can read our file. */
const FLAG_GRANT_READ_URI_PERMISSION = 0x00000001;

/** `Intent.FLAG_ACTIVITY_NEW_TASK`, required to start an activity from outside one. */
const FLAG_ACTIVITY_NEW_TASK = 0x10000000;

const APK_MIME = 'application/vnd.android.package-archive';

/** Only Android installs an APK; everywhere else the update can only be announced. */
export const canInstall = Platform.OS === 'android';

/**
 * Downloads the APK of a release and hands it to the system installer.
 *
 * Android shows its own confirmation, and refuses outright until the user has
 * allowed this app to install unknown apps. That switch lives in Settings and
 * cannot be read from here, so a refusal looks the same as a cancel: the
 * installer closes and nothing changes. `openInstallPermissionSettings` is the
 * way out of that.
 *
 * The new build must be signed with the same key as the installed one, which is
 * true while every release comes from the same workflow.
 */
export async function downloadAndInstall(
  release: Release,
  onProgress?: (ratio: number) => void
): Promise<void> {
  const file = await downloadApk(release, onProgress);
  const contentUri = await getContentUriAsync(file.uri);

  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: APK_MIME,
    flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
  });
}

/**
 * Fetches the APK into the cache, replacing an earlier attempt at the same
 * version: a download cut halfway leaves a file that would never install.
 */
async function downloadApk(
  release: Release,
  onProgress?: (ratio: number) => void
): Promise<File> {
  const folder = new Directory(Paths.cache, FOLDER);
  folder.create({ intermediates: true, idempotent: true });

  // Only the version being installed is worth keeping; older ones are dead weight.
  for (const entry of folder.list()) {
    if (entry instanceof File) entry.delete();
  }

  return File.downloadFileAsync(release.apkUrl, new File(folder, `bitacora-${release.version}.apk`), {
    idempotent: true,
    onProgress: onProgress
      ? ({ bytesWritten, totalBytes }) => {
          const total = totalBytes > 0 ? totalBytes : release.size;
          if (total > 0) onProgress(Math.min(1, bytesWritten / total));
        }
      : undefined,
  });
}

/** Opens the system screen where installing from this app is allowed. */
export async function openInstallPermissionSettings(): Promise<void> {
  await IntentLauncher.startActivityAsync(
    IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES,
    { data: `package:${Application.applicationId}` }
  );
}
