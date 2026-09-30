// Lets the checks import the app's modules as they are: the `@/` alias the app
// uses, and the extensionless relative imports a bundler fills in. Node strips
// the TypeScript types itself.
//
// The one module swapped is the database client, which opens expo-sqlite and
// cannot start in Node. Whoever imports it gets ./database-client.ts instead,
// the same Drizzle schema over node:sqlite, so the checks run the app's own
// queries rather than copies of them.
import { registerHooks } from 'node:module';

/** The same `paths` tsconfig.json declares, in the same order of preference. */
const ROOT = new URL('../../', import.meta.url).href;
const ALIASES = [
  ['@/assets/', `${ROOT}assets/`],
  ['@/data/', `${ROOT}data/`],
  ['@/', `${ROOT}src/`],
];

const EXTENSIONS = ['.ts', '.tsx', '/index.ts'];

const APP_CLIENT = `${ROOT}src/db/client.ts`;
const TEST_CLIENT = new URL('./database-client.ts', import.meta.url).href;

function resolveAlias(specifier) {
  const alias = ALIASES.find(([prefix]) => specifier.startsWith(prefix));
  return alias ? new URL(specifier.slice(alias[0].length), alias[1]).href : specifier;
}

/**
 * Metro and TypeScript take `import data from './x.json'` as it is; Node asks
 * for an import attribute. Answering with it here keeps the app's imports
 * written the way the bundler expects them.
 */
function withJsonAttribute(target, result) {
  return target.endsWith('.json')
    ? { ...result, importAttributes: { type: 'json' } }
    : result;
}

function resolveFile(specifier, context, next) {
  const target = resolveAlias(specifier);

  try {
    return withJsonAttribute(target, next(target, context));
  } catch (cause) {
    for (const extension of EXTENSIONS) {
      try {
        return next(`${target}${extension}`, context);
      } catch {
        continue;
      }
    }

    throw cause;
  }
}

registerHooks({
  resolve(specifier, context, next) {
    const result = resolveFile(specifier, context, next);
    return result.url === APP_CLIENT ? { ...result, url: TEST_CLIENT } : result;
  },
});
