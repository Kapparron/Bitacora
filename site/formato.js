// Como se escriben las cifras en la web: las mismas reglas que la app sigue en
// `src/lib/format.ts`.
//
// GitHub Pages solo publica `site/`, asi que esto no puede importarse de la
// app ni al reves. Lo que ata los dos extremos es `scripts/checks/format.test.ts`,
// que pasa la misma tabla de casos por ambos y falla si dejan de coincidir.
//
// Ojo a las unidades: aqui la duracion llega en segundos, que es como viaja
// dentro de un enlace compartido; en la app llega en milisegundos.

/** `1:05:03` cuando hay horas, `5:03` cuando no. */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const pad = (value) => String(value).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(total % 60)}`
    : `${minutes}:${pad(total % 60)}`;
}

/** Quita los ceros de la derecha: 60 es "60" y 62,5 es "62,5". */
export function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits }).format(value);
}
