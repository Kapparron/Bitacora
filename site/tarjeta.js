// La cabecera de la tarjeta de un ejercicio, igual en las dos paginas: la
// miniatura, el nombre y la superserie. Lo de debajo no se comparte, porque un
// entreno ensena lo que se hizo y una rutina lo que se quiere hacer.

import { CDN, IMAGENES, VIDEOS } from './datos.js';

/**
 * `{ "0001": ["3/4 sit-up", "0001-2gPfomN"] }`, que escribe
 * scripts/build-data.mjs. Un enlace nombra los ejercicios del catalogo solo por
 * su id, que es lo que lo mantiene corto.
 */
export async function loadCatalogue() {
  try {
    const response = await fetch(new URL('./catalogo.json', import.meta.url));
    return response.ok ? await response.json() : {};
  } catch {
    // Sin conexion, o sin el fichero: los ejercicios propios siguen saliendo.
    return {};
  }
}

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Nombre e imagen de un ejercicio, este o no en el catalogo. */
function describe(exercise, catalogue) {
  if ('x' in exercise) {
    const known = catalogue[exercise.x];
    return known
      ? { name: known[0], slug: known[1], detail: null }
      : { name: 'Ejercicio ' + exercise.x, slug: null, detail: null };
  }

  return { name: exercise.n, slug: null, detail: `${exercise.m} · ${exercise.q}` };
}

/**
 * La tarjeta de un ejercicio con su cabecera ya puesta; quien la llama anade lo
 * de debajo. `group` es el de la superserie, o null.
 */
export function exerciseCard(exercise, group, notes, catalogue) {
  const { name, slug, detail } = describe(exercise, catalogue);

  const card = element('article', 'card');

  if (group !== null) {
    card.classList.add('superset');
    card.append(element('p', 'superset-label', `SUPERSERIE ${String.fromCharCode(64 + group)}`));
  }

  const head = element('div', 'card-head');

  if (slug) {
    // El GIF pesa mucho mas que la foto, asi que solo se pide al pulsar.
    const figure = element('button', 'thumb');
    figure.type = 'button';
    figure.title = 'Ver el movimiento';

    const image = new Image();
    image.src = `${CDN}/${IMAGENES}/${slug}.jpg`;
    image.alt = name;
    image.loading = 'lazy';
    figure.append(image);

    figure.addEventListener('click', () => {
      image.src = image.src.includes(`/${VIDEOS}/`)
        ? `${CDN}/${IMAGENES}/${slug}.jpg`
        : `${CDN}/${VIDEOS}/${slug}.gif`;
    });

    head.append(figure);
  }

  const heading = element('div', 'card-title');
  heading.append(element('h3', null, name));
  if (detail) heading.append(element('p', 'muted', detail));
  if (notes) heading.append(element('p', 'note', notes));
  head.append(heading);
  card.append(head);

  return card;
}
