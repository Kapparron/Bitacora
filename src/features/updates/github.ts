import { LATEST_RELEASE_URL, parseRelease, type Release } from '@/features/updates/updates';

/**
 * Asks GitHub for the newest release.
 *
 * The repository is public, so this goes out without a token; unauthenticated
 * callers get 60 requests an hour per address, and the app makes one a day.
 *
 * A release with no APK attached, a 404 on a repository with no releases yet,
 * and no connection all come back as null. None of them is worth an error on
 * screen: the app works the same either way.
 */
export async function fetchLatestRelease(signal?: AbortSignal): Promise<Release | null> {
  const response = await fetch(LATEST_RELEASE_URL, {
    headers: { Accept: 'application/vnd.github+json' },
    signal,
  });

  if (!response.ok) return null;

  return parseRelease(await response.json());
}
