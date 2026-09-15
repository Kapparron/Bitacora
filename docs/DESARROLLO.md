# Guía de desarrollo

Cómo levantar Bitácora y dónde está cada cosa. Lo que hace la app, contado para
cualquiera, está en el [README](../README.md); el plan de producto y el estado
de cada fase, en [`PLAN.md`](PLAN.md).

## Arrancar

Hace falta **Node.js 24 o superior** y la app **Expo Go** en el móvil, o Android
Studio para un emulador. Las comprobaciones de `npm run check` están escritas en
TypeScript y se apoyan en que Node las ejecute sin transpilar, que es lo que esa
versión ya hace.

```bash
npm install
npm start
```

Luego `a` para Android, `i` para iOS (solo desde macOS), o escanea el QR con
Expo Go.

> El escáner de códigos de barras, compartir la copia de seguridad y el selector
> de archivos necesitan una *development build* (`npx expo run:android`): en Expo
> Go pueden no funcionar. Las notificaciones del entreno y del descanso son un
> módulo nativo propio y solo existen en esa build.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo de Expo |
| `npm run android` | Abre en un dispositivo o emulador Android |
| `npm run check` | Comprobaciones sobre las migraciones reales y la lógica pura |
| `npx tsc --noEmit` | Comprobación de tipos |
| `npx expo export -p android` | Empaqueta para verificar que todo compila |
| `npm run build:icons` | Regenera los iconos desde `assets/images/logo.png` |
| `npm run build:catalog` | Regenera el catálogo de ejercicios |
| `npm run build:data` | Regenera lo que la web sirve desde `data/` |

## Stack

| Capa | Elección |
| --- | --- |
| Framework | React Native + Expo SDK 57, TypeScript |
| Navegación | expo-router, rutas por ficheros |
| Base de datos | SQLite (`expo-sqlite`) con Drizzle ORM y migraciones generadas |
| Estado de red | TanStack Query |
| Estado de UI | Zustand (temporizador de descanso) |
| Gráficas | `react-native-svg`, dibujadas a mano |

Tres ideas gobiernan el código:

- **Offline-first.** El gimnasio no tiene cobertura. Todo se apoya en SQLite
  local, incluida la sesión en curso: si se cierra la app a mitad de un entreno,
  no se pierde nada. La red solo aparece al buscar alimentos.
- **Sin backend.** Un usuario no necesita servidor, ni cuenta, ni registro.
- **Lo registrado no se reescribe.** Los macros de una comida se congelan al
  anotarla: Open Food Facts es colaborativo, y una corrección suya de hoy no debe
  cambiar lo que se comió hace un mes.

## Estructura

```
src/
  app/            rutas de expo-router
    (tabs)/       Inicio, Entrenos, Nutrición, Perfil
    workout/      sesión en curso y detalle de un entreno
    exercise/     ficha de un ejercicio y alta de uno propio
    food/         buscar, escanear, crear y registrar alimentos
    routine/      lista y editor de rutinas
  components/     componentes compartidos
  features/       lógica por dominio: workout, routines, exercises, nutrition,
                  calendar, body, rest, progress, charts, backup
  db/             cliente SQLite, esquema, migraciones y semilla
  constants/      tema y tipografías
modules/          módulos nativos propios: notificaciones del entreno (Android)
drizzle/          migraciones SQL generadas
data/             única fuente de los datos: catálogo, vocabulario, tipos de
                  serie, constantes del proyecto y paleta
scripts/          generadores del catálogo y de la web, iconos y comprobaciones
site/             la web de GitHub Pages: portada, rutina y entreno compartidos.
                  catalogo.json, datos.js y estilo.css los genera build:data
docs/PLAN.md      plan de producto y fases
```

## Base de datos

El esquema vive en `src/db/schema.ts`. Después de tocarlo hay que generar la
migración:

```bash
npx drizzle-kit generate
npm run check
```

La migración se escribe en `drizzle/` y entra en el bundle; se aplica en el
dispositivo al arrancar, desde `src/db/provider.tsx`. No hay base de datos
remota, así que `drizzle-kit push` y `drizzle-kit studio` no se usan aquí.

## Comprobaciones

`npm run check` aplica las migraciones reales sobre una base en memoria y
comprueba lo que no se ve en pantalla: el orden de tablas de las copias, el
borrado de datos, el volumen sin calentamientos, el día local de una sesión
nocturna, las rachas con días de descanso, el objetivo de calorías y la
programación de rutinas al cambiar la hora.

Conviene ejecutarlo junto a `npx tsc --noEmit` después de tocar el esquema o
cualquier cálculo.

## Los datos, en un solo sitio

Todo lo que la app y la web dicen sobre sí mismas vive en `data/`, y nada de
ello está escrito dos veces:

| Fichero | Qué guarda | Quién lo lee |
| --- | --- | --- |
| `exercises.json` | los 1.324 ejercicios del catálogo | la semilla de la base de datos y la web |
| `vocabulary.json` | músculos y material, en inglés y en español, con sus familias y los patrones con que se reconocen en un nombre | el generador del catálogo, los filtros de la app y `catalogue.test.mjs` |
| `sets.json` | los tipos de serie (letra del enlace, insignia, si cuenta para el volumen) y los tipos de registro | la app, el enlace compartido y la web |
| `project.json` | el repositorio, el paquete, el esquema, los enlaces de la web y el CDN de las imágenes | `src/constants/project.ts` y la web |
| `theme.json` | la paleta clara y oscura, el verde de marca y los colores propios de la web | `src/constants/theme.ts`, `site/estilo.css` y `app.json` |

**La web no importa de la app**, porque GitHub Pages solo publica `site/`. Lo que
necesita se genera con `npm run build:data`, que escribe tres ficheros que no se
editan a mano:

```
site/catalogo.json   el catálogo recortado a nombre y foto, para las dos páginas
site/datos.js        enlaces, medios y tipos de serie
site/estilo.css      la paleta, como propiedades personalizadas
```

Lo que sí está escrito dos veces, porque no hay forma de importarlo, es el
formato de las cifras (`site/formato.js`) y la elección de la última versión
(`site/versiones.js`). Las comprobaciones pasan los mismos casos por los dos
lados y fallan en cuanto se separan.

**La versión de la app está solo en `app.json`.** `package.json` no la lleva:
llevaba una distinta desde hacía tiempo y no la leía nadie. El flujo
`Publicar APK` sobrescribe la de `app.json` con la etiqueta que se le pide, que
es lo que la app compara al buscar actualizaciones.

## Catálogo de ejercicios

Los 1.324 ejercicios integrados provienen del dataset público
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset),
recortado y traducido a `data/exercises.json` por
`scripts/build-exercise-catalog.mjs`. Se insertan en el primer arranque y se
identifican por el id del dataset, así que una versión posterior puede añadir
entradas sin tocar las existentes ni los ejercicios creados por el usuario.

Para regenerarlo tras actualizar el dataset o añadir nombres en español:

```bash
curl -L -o exercises.json https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json
npm run build:catalog -- exercises.json
```

Las condiciones de uso de las imágenes están en los créditos del
[README](../README.md): son de Gym visual, con límite de tamaño y atribución
obligatoria, y por eso se sirven desde jsDelivr en vez de empaquetarse.

## Compartir rutinas

Sin servidor ni cuentas, una rutina viaja entera dentro de un enlace, que se
muestra como código QR o se envía como texto. El código está en
`src/features/routines/share.ts`.

El enlace es `https://kapparron.github.io/Bitacora/rutina/#<rutina>` porque
WhatsApp solo deja pulsar enlaces web. Lleva a una página estática,
[`site/rutina/index.html`](../site/rutina/index.html), que enseña el nombre de
la rutina y abre la app con `bitacora://routine/import?r=<rutina>`; en Android lo
hace con un enlace `intent://` que, si la app no está instalada, manda a las
releases para descargarla. La rutina va detrás del `#`, que el navegador no
envía al servidor.

La página se publica en GitHub Pages con el flujo
[`Publicar web`](../.github/workflows/pages.yml), al cambiar `site/` en `master`
o a mano. Si cambia la dirección, hay que cambiar también `WEB_PREFIX`: los
enlaces ya enviados apuntan a la antigua.

- Un ejercicio del catálogo va solo con su id del dataset; uno propio va con
  nombre, grupo muscular, material y tipo de registro, y al importarlo se reusa
  el propio con el mismo nombre o se crea. Si el catálogo del receptor no tiene
  algún ejercicio, no se guarda nada y se le pide actualizar.
- La programación (cuándo toca) no se comparte.
- Un QR tiene un máximo de unos 3 KB, por eso las claves son de una letra. Si se
  añade un campo, sube `SHARE_VERSION` solo cuando una versión anterior ya no
  pueda leer el enlace: la importación rechaza versiones que no conoce.
- Lo leído de un QR no es de fiar: `parseSharedRoutine` valida cada campo antes
  de que llegue a la base de datos.

El envoltorio del enlace —JSON a base64url y las comprobaciones de cada campo—
está en `src/lib/link.ts`, y cómo se nombra un ejercicio dentro de un enlace, en
`src/features/exercises/shared-exercise.ts`. Los dos formatos los comparten.

## Compartir entrenos

Un entreno acabado se comparte desde su detalle o desde el menú que sale al
mantener pulsado en el historial. Aquí la página no es un puente sino el
destino: la abre alguien que no tiene la app y ve el entreno dibujado como en
ella. No se importa a ninguna parte.

El enlace es `https://kapparron.github.io/Bitacora/entreno/#<entreno>`, otra vez
detrás del `#`, que el navegador no envía. El formato lo escribe
`src/features/workout/share.ts` y lo lee
[`site/entreno/entreno.js`](../site/entreno/entreno.js);
`scripts/checks/workout-share.test.ts` importa los dos extremos y los obliga a
entenderse.

- Solo viajan las series completadas, y un ejercicio sin ninguna se queda fuera:
  no se llegó a hacer.
- Las series son números y son muchas, así que van en una sola cadena,
  `w20x10,60x8@8,d40x12`: `60x8` son 60 kg por 8 repeticiones, `90s` una serie
  de 90 segundos, `1000m90s` una de distancia y tiempo, `-` una serie hecha sin
  anotar nada; la letra de delante es calentamiento, drop o fallo, y el `@8` de
  detrás el RPE. Un entreno de seis ejercicios cabe en medio kilobyte.
- La página necesita el catálogo para convertir un id en nombre e imagen, pero
  no el de 1 MB que lleva la app: `npm run build:data` genera `site/catalogo.json`
  (69 KB) a partir de `data/exercises.json`, y `npm run build:catalog` lo
  regenera también. La comprobación falla si se queda atrás.
- Las imágenes salen del mismo CDN que en la app, y el GIF solo se descarga al
  pulsar la miniatura.

## Iconos

`npm run build:icons` genera el icono de la app, el adaptativo de Android, su
variante monocroma, la marca del splash y el favicon a partir de
`assets/images/logo.png`, tomando el color de fondo del propio logo.

## Publicar una version

El flujo [`Publicar APK`](../.github/workflows/release-apk.yml) se lanza a mano
desde la pestaña **Actions** de GitHub. La rama se elige en el desplegable del
propio GitHub; el flujo solo pregunta la **versión** (`v1.2.0`) y si publicarla
como preliminar.

Lo que hace, en orden: comprueba tipos, pasa `npm run check`, escribe esa
versión en `app.json` y el número de ejecución como `versionCode`, genera el
proyecto Android con `expo prebuild`, compila `assembleRelease` y crea la
release —etiquetada sobre el commit compilado— con el APK adjunto como
`bitacora-<version>.apk`.

La carpeta `android/` no está en el repositorio: se genera en cada compilación
desde `app.json`, que es la única fuente de la configuración nativa. Por eso el
`versionCode` y la versión se escriben ahí antes de generarla.

El APK se compila **solo para `arm64-v8a`** y con minificación
(`android.enableMinifyInReleaseBuilds`). Un APK universal lleva las librerías
nativas de las cuatro arquitecturas y pesa unos 143 MB; con una sola baja a
alrededor de 50 MB. A cambio no se instala en móviles de 32 bits ni en
emuladores x86: para esos hay que quitar `-PreactNativeArchitectures` de la
llamada a `gradlew` en el flujo.

## Actualizaciones dentro de la app

La app se mira ella sola si hay una versión más nueva: pregunta por la release
más reciente de este repositorio, y si su etiqueta es mayor que la versión
instalada, ofrece descargar el APK adjunto y lo entrega al instalador de
Android. El código está en `src/features/updates/`.

La comprobación corre cuando la app pasa a primer plano, como mucho una vez cada
24 horas, y guarda en `settings` cuándo miró por última vez y qué versión
rechazó el usuario. El botón **Buscar actualizaciones** del perfil se salta
ambas cosas. Sin conexión no pasa nada: el fallo se ignora.

Por defecto solo cuentan las versiones terminadas, porque se pregunta por
`releases/latest` y ese endpoint descarta borradores y preliminares; un
repositorio cuyas releases son todas preliminares responde `404` ahí. La casilla
**Incluir versiones de prueba** cambia la pregunta a la lista completa de
releases y se queda con la versión más alta, preliminar o no. Con la casilla
puesta, una comprobación manual ofrece cualquier versión distinta de la
instalada, no solo una mayor: es la forma de bajarse una preliminar a propósito.

Requisitos que hay que respetar al tocar esto:

- **La firma tiene que coincidir.** Android solo instala encima de una app si la
  nueva lleva la misma clave. Hoy todas las releases salen del mismo flujo, así
  que coinciden; el día que se firme con una clave propia, la primera
  actualización fallará con `INSTALL_FAILED_UPDATE_INCOMPATIBLE` y habrá que
  desinstalar a mano.
- **El `versionCode` tiene que crecer.** El flujo usa el número de ejecución,
  que crece solo.
- El permiso `REQUEST_INSTALL_PACKAGES` está en `app.json`, y Android además
  pide al usuario autorizar la instalación una vez, en una pantalla de ajustes
  que no se puede consultar desde la app.
- Nada de esto funciona en Expo Go: el instalador necesita el APK real.

> **El APK va firmado con la clave de depuración**, que es la que trae la
> plantilla de Expo. Sirve para instalarlo a mano en tu móvil, pero no vale para
> Google Play, y si algún día firmas con una clave propia, Android tratará la app
> como distinta y habrá que desinstalar la anterior. Para una clave real hacen
> falta un keystore guardado en los secretos del repositorio y un
> `signingConfig` propio en `android/app/build.gradle`, que hoy no existe.
