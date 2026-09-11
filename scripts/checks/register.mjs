// Resolves the `@/` alias used across the app so the checks can import the real
// modules instead of copies. Node strips the TypeScript types itself.
import { registerHooks } from 'node:module';

/** Directory the alias points at. */
const SRC = new URL('../../src/', import.meta.url).href;

registerHooks({
  resolve(specifier, context, next) {
    if (!specifier.startsWith('@/')) return next(specifier, context);

    const base = new URL(specifier.slice(2), SRC).href;

    for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
      try {
        return next(candidate, context);
      } catch {
        continue;
      }
    }

    throw new Error(`No se pudo resolver ${specifier}`);
  },
});
