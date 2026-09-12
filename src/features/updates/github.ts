import {
  LATEST_RELEASE_URL,
  RELEASES_URL,
  parseRelease,
  pickLatest,
  type Release,
} from '@/features/updates/updates';

/**
 * Asks GitHub for the newest release worth offering.
 *
 * The repository is public, so this goes out without a token; unauthenticated
 * callers get 60 requests an hour per address, and the app makes one a day.
 *
 * With `prereleases` off the question goes to `releases/latest`, which GitHub
 * already filters down to finished versions. With it on the whole list is read
 * instead and the highest version wins, preliminary or not.
 *
 * A release with no APK attached, a repository with no finished release yet,
 * and no connection all come back as null. None of them is worth an error on
 * screen: the app works the same either way.
 */
export async function fetchLatestRelease(
  prereleases: boolean,
  signal?: AbortSignal
): Promise<Release | null> {
  const response = await fetch(prereleases ? RELEASES_URL : LATEST_RELEASE_URL, {
    headers: { Accept: 'application/vnd.github+json' },
    signal,
  });

  if (!response.ok) return null;

  const payload: unknown = await response.json();

  return prereleases ? pickLatest(payload) : parseRelease(payload);
}
