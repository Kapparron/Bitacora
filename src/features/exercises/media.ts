/**
 * Exercise media lives in the upstream repository and is served from jsDelivr
 * rather than bundled: the 1.324 GIFs weigh about 160 MB, and the images belong
 * to Gym visual, which only allows them at 180x180 and with attribution.
 *
 * `expo-image` caches what it downloads on disk, so a GIF is fetched once.
 */
const CDN = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main';

/** Must be shown wherever the media is, per the rights holder's terms. */
export const MEDIA_ATTRIBUTION = '© Gym visual — gymvisual.com';

export function exerciseMediaUrl(path: string | null): string | null {
  if (!path) return null;
  return `${CDN}/${path}`;
}
