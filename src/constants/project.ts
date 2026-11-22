import project from '@/data/project.json';

/**
 * Who this app is, where it lives and where its media comes from.
 *
 * Every one of these strings used to sit inline in whatever file needed it —
 * the repository in `features/updates`, the link prefixes in the two sharing
 * modules, the CDN in `features/exercises/media`— and the same values again in
 * the web pages under `site/`. They all come from `data/project.json` now, and
 * `npm run build:data` writes the web's copy from the same file.
 */

/** Repository the releases are read from. */
export const REPO = project.repo;

export const WEB_BASE = project.web.base;

/** A shared routine, as the page that hands it to the app. */
export const ROUTINE_LINK_PREFIX = `${WEB_BASE}${project.web.routinePath}#`;

/** A shared session, as the page that draws it. */
export const WORKOUT_LINK_PREFIX = `${WEB_BASE}${project.web.workoutPath}#`;

/** What the routine page opens, and what links shared before it existed use. */
export const ROUTINE_APP_PREFIX = project.app.routineImport;

/**
 * Exercise media lives in the upstream repository and is served from jsDelivr
 * rather than bundled: the 1.324 GIFs weigh about 160 MB, and the images belong
 * to Gym visual, which only allows them at 180x180 and with attribution.
 */
export const MEDIA_CDN = project.media.cdn;

/** Must be shown wherever the media is, per the rights holder's terms. */
export const MEDIA_ATTRIBUTION = project.media.attribution;

/** Where the releases are read from. */
export const RELEASES_API = `${project.githubApi}/${REPO}/releases`;
