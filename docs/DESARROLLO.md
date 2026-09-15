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
> Go pueden no funcionar.

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
drizzle/          migraciones SQL generadas
assets/data/      catálogo de ejercicios generado
scripts/          generador del catálogo, iconos y comprobaciones
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

## Catálogo de ejercicios

Los 1.324 ejercicios integrados provienen del dataset público
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset),
recortado y traducido a `assets/data/exercises.json` por
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

Sin servidor ni cuentas, una rutina viaja entera dentro de un enlace
`bitacora://routine/import?r=...`, que se muestra como código QR o se envía como
texto. El código está en `src/features/routines/share.ts`.

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
