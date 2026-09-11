// Lets the checks import the app's modules as they are: the `@/` alias the app
// uses, and the extensionless relative imports a bundler fills in. Node strips
// the TypeScript types itself.
import { registerHooks } from 'node:module';

/** Directory the alias points at. */
const SRC = new URL('../../src/', import.meta.url).href;

const EXTENSIONS = ['.ts', '.tsx', '/index.ts'];

registerHooks({
  resolve(specifier, context, next) {
    const target = specifier.startsWith('@/')
      ? new URL(specifier.slice(2), SRC).href
      : specifier;

    try {
      return next(target, context);
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
  },
});
