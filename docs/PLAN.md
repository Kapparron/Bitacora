# Bitácora — plan de producto

Aplicación móvil personal de entrenamiento y nutrición. Dos mitades:

1. **Entrenamiento**, con el modelo de Hevy: ejercicios, rutinas y sesiones registradas serie a serie.
2. **Nutrición**, con un diario de desayuno, comida, cena y snacks, alimentado por la API de Open Food Facts.

## Principios

- **Offline-first.** El gimnasio no tiene cobertura. Toda la funcionalidad principal
  se apoya en SQLite local; la red solo se usa para buscar alimentos.
- **Sin backend hasta que haga falta.** Un único usuario no necesita servidor. La
  sincronización multi-dispositivo es la fase 5 y es opcional.
- **Los datos registrados son inmutables.** Los macros de una comida se congelan al
  registrarla. Open Food Facts es colaborativo y sus correcciones no deben
  reescribir el historial.

## Stack

| Capa | Elección |
| --- | --- |
| Framework | React Native + Expo SDK 57, TypeScript |
| Navegación | expo-router (rutas por ficheros, tabs) |
| Base de datos | SQLite (`expo-sqlite`) con Drizzle ORM y migraciones generadas |
| Estado de red | TanStack Query |
| Estado de UI | Zustand (sesión activa, temporizador de descanso) |
| Iconos | `@expo/vector-icons` (Ionicons) |

## Modelo de datos

Definido en `src/db/schema.ts`. Convenciones comunes:

- Claves primarias UUID generadas en el dispositivo, para que la sincronización
  futura no provoque colisiones.
- `created_at` / `updated_at` en milisegundos epoch, y `deleted_at` como borrado
  lógico para poder replicar lápidas.
- Los pesos se guardan siempre en kilogramos; la preferencia de unidades solo
  afecta a la presentación.
- Los días de calendario (nutrición, medidas corporales) son cadenas `YYYY-MM-DD`
  en la zona horaria del dispositivo, no marcas de tiempo.

Entrenamiento: `exercises`, `routines`, `routine_exercises`,
`workouts`, `workout_exercises`, `sets`, `personal_records`.

Nutrición: `foods` (caché de Open Food Facts más alimentos propios),
`food_entries`, `nutrition_goals`, `body_metrics`.

## Catálogo de ejercicios

Los 1.324 ejercicios integrados vienen de
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset).

- **Datos** (nombres, categorías, material, músculos e instrucciones): licencia
  MIT. Las instrucciones se usan en español, que el dataset ya trae traducido.
- **Nombres**: el dataset solo los tiene en inglés. Unos 105 ejercicios comunes
  llevan nombre en español mediante la tabla `SPANISH_NAMES` de
  `scripts/build-exercise-catalog.mjs`; el resto conserva el inglés. El buscador
  compara contra los dos, así que ningún ejercicio queda inaccesible.
- **Medios**: las miniaturas y los GIFs son propiedad de
  **Gym visual** (https://gymvisual.com/), redistribuidos en ese repositorio con
  permiso suyo. El NOTICE deja claro que clonar el repositorio **no concede
  licencia sobre el material**. Se usan a 180×180 y siempre con la atribución
  «© Gym visual — gymvisual.com», que la ficha del ejercicio muestra bajo la
  animación. Publicar la app en una tienda exigiría una licencia propia.
- **No se empaquetan**: los GIFs suman unos 160 MB. Se sirven desde jsDelivr y
  `expo-image` los cachea en disco tras la primera descarga. Sin conexión no hay
  imágenes, pero el resto de la app funciona igual.

El JSON original pesa 17 MB porque lleva diez idiomas.
`npm run build:catalog -- <ruta a exercises.json>` lo recorta a español y a los
campos que usa la app, y escribe `assets/data/exercises.json` (~1 MB), que sí va
dentro del bundle. El script aborta si alguna clave de `SPANISH_NAMES` deja de
coincidir con un nombre del dataset.

## Integración con Open Food Facts

- Producto por código de barras:
  `GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
- Búsqueda por texto: endpoint de búsqueda v2, filtrando por país e idioma.
- La cabecera `User-Agent` identificando la aplicación es obligatoria.
- Límites aproximados: 100 peticiones/minuto para producto, 10/minuto para
  búsqueda. La búsqueda se hace con debounce y una sola petición en vuelo.
- Todo producto consultado se guarda en `foods`; la segunda consulta no usa red.
- Entre el 20 % y el 30 % de los productos tienen campos incompletos, así que la
  creación manual de alimentos no es opcional.

## Fases

| Fase | Contenido | Estado |
| --- | --- | --- |
| 0 | Andamiaje Expo, esquema Drizzle, migraciones, catálogo de ejercicios, navegación | Hecha |
| 1 | Registrar una sesión vacía, editar series, historial | Hecha |
| 2 | Rutinas, superseries, temporizador de descanso, récords | Hecha |
| 3 | Nutrición: escáner de códigos, Open Food Facts, diario, objetivos | Pendiente |
| 4 | Gráficas, medidas corporales, exportar e importar datos | Pendiente |
| 5 | Sincronización y autenticación (opcional) | Pendiente |

## Riesgos conocidos

- El escáner de códigos de barras (`expo-camera`) necesita una *development
  build*; no funciona completo en Expo Go. Conviene probarlo pronto.
- Desde Windows no se puede compilar para iOS en local. Android sí; para iOS hace
  falta EAS Build.
