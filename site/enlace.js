// Lo que las dos paginas necesitan para leer un enlace compartido: el payload
// en base64url y las comprobaciones de cada campo. Es la copia web de
// `src/lib/link.ts` y `src/features/exercises/shared-exercise.ts`, porque GitHub
// Pages solo publica `site/` y desde aqui no se puede importar la app.
//
// Un enlace puede decir cualquier cosa, y todo lo que se lee de el acaba en
// pantalla: cada campo se comprueba antes de usarlo.

/** Generoso, solo para que un enlace hostil no inunde la pagina. */
export const MAX_TEXT = 500;

/** El objeto que lleva un payload, o null cuando el texto no es uno. */
export function decodePayload(encoded) {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return null;

  try {
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

/**
 * Un ejercicio del catalogo por su id del dataset, o uno que se creo quien lo
 * comparte. El tipo de registro no se lee: la pagina no lo necesita.
 */
export function parseSharedExercise(raw) {
  if (!isObject(raw)) return null;
  if ('x' in raw) return isText(raw.x) ? { x: raw.x } : null;
  if (!isText(raw.n) || !isText(raw.m) || !isText(raw.q)) return null;

  return { n: raw.n.trim(), m: raw.m, q: raw.q };
}

export function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isText(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_TEXT;
}

export function isOptionalText(value) {
  return value === null || value === undefined ||
    (typeof value === 'string' && value.length <= MAX_TEXT);
}

export function isOptionalInt(value, min, max) {
  return value === null || value === undefined ||
    (Number.isInteger(value) && value >= min && value <= max);
}
