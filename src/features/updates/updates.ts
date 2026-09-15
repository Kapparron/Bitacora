import { RELEASES_API, REPO } from '@/constants/project';

/**
 * Deciding whether a newer build exists, with no network and no database.
 *
 * Bitacora is not on any store: a version is a GitHub release with the APK
 * attached, published by the `Publicar APK` workflow. The same workflow writes
 * the version it was given into `app.json` before compiling, so the tag of a
 * release and the version of the installed app are the same string.
 *
 * Everything here is pure so the checks can exercise it.
 */

/** Repository the releases are read from; see `data/project.json`. */
export { REPO };

/**
 * Where the newest published release is described. Public, so no token.
 *
 * This endpoint answers with the newest release that is neither a draft nor a
 * prerelease: GitHub applies that filter itself, and a repository whose
 * releases are all preliminary answers 404 here.
 */
export const LATEST_RELEASE_URL = `${RELEASES_API}/latest`;

/**
 * Every release, newest first, preliminary ones included. Used only when the
 * user has asked for test versions, because picking among them is then up to
 * the app.
 */
export const RELEASES_URL = `${RELEASES_API}?per_page=20`;

/**
 * How long a check stays good for.
 *
 * Versions are published by hand every few days, so asking more often finds
 * nothing and costs network on every launch.
 */
export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type Release = {
  /** Tag without its leading `v`, which is what versions are compared as. */
  version: string;
  /** Release title, for the popup. */
  name: string;
  /** Release notes, already trimmed. */
  notes: string;
  /** Direct download of the attached APK. */
  apkUrl: string;
  /** Size of that APK in bytes, for the progress bar. */
  size: number;
};

/** Drops the `v` that tags carry and app versions do not. */
export function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '');
}

/**
 * Orders two versions by their numeric parts, longest first on a tie so `1.2.1`
 * beats `1.2`. Anything unparseable counts as zero rather than throwing: a
 * malformed tag should not crash the app, it should just not look newer.
 */
export function compareVersions(left: string, right: string): number {
  const parse = (version: string) =>
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

/** Whether the release is worth offering over what is installed. */
export function isNewer(release: string, installed: string | null): boolean {
  if (!installed) return false;
  return compareVersions(release, installed) > 0;
}

/**
 * Whether a release is worth putting in front of the user.
 *
 * On its own the app only offers a higher version. A check asked for by hand
 * offers any version other than the one running, which is how a preliminary
 * build gets installed on purpose: it can sit below the release it followed.
 *
 * Nothing offerable means nothing to show, popup and card alike. Saying both
 * "disponible la 0.0.4" and "ya tienes la ultima" is the bug this prevents.
 */
export function shouldOffer(release: string, installed: string | null, manual: boolean): boolean {
  if (isNewer(release, installed)) return true;
  if (!manual) return false;

  return compareVersions(release, installed ?? '') !== 0;
}

/**
 * Whether enough time has passed to ask GitHub again. A check that never ran
 * runs now.
 */
export function shouldCheck(lastCheckedAt: number | null, now: number): boolean {
  if (lastCheckedAt === null) return true;
  // A clock moved backwards would otherwise lock checking out until it caught up.
  if (lastCheckedAt > now) return true;

  return now - lastCheckedAt >= CHECK_INTERVAL_MS;
}

/**
 * Reads the fields used out of the release payload, or null when the release
 * carries no APK. A release without one is not installable, so it is not an
 * update; that happens while a build is still running.
 */
export function parseRelease(payload: unknown): Release | null {
  if (typeof payload !== 'object' || payload === null) return null;

  const release = payload as {
    tag_name?: unknown;
    name?: unknown;
    body?: unknown;
    draft?: unknown;
    assets?: unknown;
  };

  if (release.draft === true) return null;
  if (typeof release.tag_name !== 'string' || release.tag_name.trim() === '') return null;
  if (!Array.isArray(release.assets)) return null;

  const apk = release.assets.find(
    (asset: { name?: unknown; browser_download_url?: unknown }) =>
      typeof asset?.name === 'string' &&
      asset.name.toLowerCase().endsWith('.apk') &&
      typeof asset.browser_download_url === 'string'
  ) as { name: string; browser_download_url: string; size?: unknown } | undefined;

  if (!apk) return null;

  const version = normalizeVersion(release.tag_name);

  return {
    version,
    name: typeof release.name === 'string' && release.name.trim() !== '' ? release.name : version,
    notes: typeof release.body === 'string' ? release.body.trim() : '',
    apkUrl: apk.browser_download_url,
    size: typeof apk.size === 'number' ? apk.size : 0,
  };
}

/**
 * Highest version among a list of releases, skipping the ones with no APK.
 *
 * The list arrives in publication order, which is not version order: a fix
 * published for an older line would otherwise look like the newest build.
 * Drafts never reach an unauthenticated caller, and are dropped by
 * `parseRelease` anyway.
 */
export function pickLatest(payloads: unknown): Release | null {
  if (!Array.isArray(payloads)) return null;

  let best: Release | null = null;

  for (const payload of payloads) {
    const release = parseRelease(payload);
    if (!release) continue;
    if (!best || compareVersions(release.version, best.version) > 0) best = release;
  }

  return best;
}

/** Keys the update state is stored under in `settings`. */
export const LAST_CHECKED_KEY = 'update_last_checked';
export const DISMISSED_KEY = 'update_dismissed';
export const PRERELEASES_KEY = 'update_prereleases';
