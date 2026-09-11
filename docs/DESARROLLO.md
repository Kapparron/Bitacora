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

> **El APK va firmado con la clave de depuración**, que es la que trae la
> plantilla de Expo. Sirve para instalarlo a mano en tu móvil, pero no vale para
> Google Play, y si algún día firmas con una clave propia, Android tratará la app
> como distinta y habrá que desinstalar la anterior. Para una clave real hacen
> falta un keystore guardado en los secretos del repositorio y un
> `signingConfig` propio en `android/app/build.gradle`, que hoy no existe.
