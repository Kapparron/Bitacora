import { MEDIA_ATTRIBUTION, MEDIA_CDN } from '@/constants/project';

/**
 * Exercise media is referenced, never bundled: the 1.324 GIFs weigh about 160 MB
 * and the images belong to Gym visual. The CDN and the attribution come from
 * `data/project.json`, which is also what the web pages are built from.
 *
 * `expo-image` caches what it downloads on disk, so a GIF is fetched once.
 */
export { MEDIA_ATTRIBUTION };

export function exerciseMediaUrl(path: string | null): string | null {
  if (!path) return null;
  // Pictures of our own are whole addresses; the dataset's are paths on the CDN.
  if (path.startsWith('https://')) return path;
  return `${MEDIA_CDN}/${path}`;
}
