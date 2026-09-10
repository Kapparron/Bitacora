# Bitácora

Aplicación móvil de entrenamiento y nutrición: registro de sesiones, rutinas y
ejercicios, más un diario de calorías con datos de Open Food Facts.

El plan completo y el estado de cada fase están en [`docs/PLAN.md`](docs/PLAN.md).

## Requisitos

- Node.js 20 o superior
- La app Expo Go en el móvil para el desarrollo diario, o Android Studio para un
  emulador

## Arrancar

```bash
npm install
npm start
```

Luego pulsa `a` para Android, `i` para iOS (solo desde macOS) o escanea el código
QR con Expo Go.

## Base de datos

El esquema vive en `src/db/schema.ts`. Después de tocarlo hay que generar la
migración correspondiente:

```bash
npx drizzle-kit generate
```

Esto escribe un `.sql` en `drizzle/` y actualiza `drizzle/migrations.js`. Ambos se
incluyen en el bundle y se aplican en el dispositivo al arrancar, desde
`src/db/provider.tsx`. No hay base de datos remota: `drizzle-kit push` y
`drizzle-kit studio` no se usan en este proyecto.

## Catálogo de ejercicios

Los 1.324 ejercicios integrados salen de
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)
y viven en `assets/data/exercises.json`, generado por
`scripts/build-exercise-catalog.mjs`. Se insertan en el primer arranque y se
identifican por el id del dataset, así que una versión posterior puede añadir
entradas nuevas sin tocar las existentes.

Para regenerarlo tras actualizar el dataset o añadir nombres en español:

```bash
curl -L -o exercises.json https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json
npm run build:catalog -- exercises.json
```

Los datos son MIT. Las imágenes y GIFs son de **Gym visual**, se sirven desde
jsDelivr en vez de empaquetarse, y exigen mantener la atribución. Los detalles
están en [`docs/PLAN.md`](docs/PLAN.md).

## Estructura

```
src/
  app/            rutas de expo-router
    (tabs)/       Entreno, Rutinas, Nutrición, Perfil
    workout/      sesión en curso y detalle de un entreno
    exercises     catálogo de ejercicios
    exercise/     ficha de un ejercicio
    food/         buscar, escanear, crear y registrar alimentos
    routine/      editor de una rutina
    pick-exercise selector de ejercicios (sesión y rutina)
  components/     componentes compartidos
  features/       logica por dominio (workout, routines, exercises, nutrition, calendar)
  db/             cliente SQLite, esquema, migraciones y semilla
  constants/      tema y tipografías
  hooks/
drizzle/          migraciones SQL generadas
assets/data/      catálogo de ejercicios generado
scripts/          generador del catálogo
docs/PLAN.md      plan de producto y fases
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo de Expo |
| `npm run android` | Abre en un dispositivo o emulador Android |
| `npx tsc --noEmit` | Comprobación de tipos |
| `npx expo export -p android` | Empaqueta para verificar que todo compila |
