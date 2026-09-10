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

Entrenamiento: `exercises`, `routine_folders`, `routines`, `routine_exercises`,
`workouts`, `workout_exercises`, `sets`, `personal_records`.

Nutrición: `foods` (caché de Open Food Facts más alimentos propios),
`food_entries`, `nutrition_goals`, `body_metrics`.

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
| 2 | Rutinas, plantillas, superseries, temporizador de descanso, récords | Pendiente |
| 3 | Nutrición: escáner de códigos, Open Food Facts, diario, objetivos | Pendiente |
| 4 | Gráficas, medidas corporales, exportar e importar datos | Pendiente |
| 5 | Sincronización y autenticación (opcional) | Pendiente |

## Riesgos conocidos

- El escáner de códigos de barras (`expo-camera`) necesita una *development
  build*; no funciona completo en Expo Go. Conviene probarlo pronto.
- Desde Windows no se puede compilar para iOS en local. Android sí; para iOS hace
  falta EAS Build.
