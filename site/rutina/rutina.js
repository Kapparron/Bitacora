// La rutina viaja detras del '#', que el navegador nunca manda al servidor:
// esta pagina solo se la pasa a la app. El formato es el de
// src/features/routines/share.ts.

import { APP_RUTINA, DESCARGA, ESQUEMA, PAQUETE } from '../datos.js';

const encoded = location.hash.slice(1);
const open = document.getElementById('open');

if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
  document.getElementById('summary').textContent =
    'Este enlace esta incompleto. Pide que te lo vuelvan a enviar.';
  open.style.display = 'none';
} else {
  try {
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const routine = JSON.parse(new TextDecoder().decode(bytes));
    const count = routine.e.length;

    document.getElementById('name').textContent = routine.n;
    document.title = routine.n + ' · Bitacora';
    document.getElementById('summary').textContent =
      (count === 1 ? '1 ejercicio' : count + ' ejercicios') +
      '. Abrela en Bitacora para guardarla.';
  } catch {
    // Un nombre que no se pueda leer no impide intentar abrir la app.
  }

  // En Android un enlace intent abre la app, y manda a la descarga a quien no
  // la tenga en vez de fallar en silencio.
  open.href = /Android/i.test(navigator.userAgent)
    ? 'intent://routine/import?r=' + encoded +
      '#Intent;scheme=' + ESQUEMA + ';package=' + PAQUETE +
      ';S.browser_fallback_url=' + encodeURIComponent(DESCARGA) + ';end'
    : APP_RUTINA + encoded;
}
