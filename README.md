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

El catálogo de ejercicios integrado está en `src/db/seed/exercises.ts` y se
inserta en el primer arranque. Añadir entradas nuevas ahí basta para que
aparezcan tras actualizar; las filas existentes nunca se sobrescriben.

## Estructura

```
src/
  app/            rutas de expo-router
    (tabs)/       Entreno, Rutinas, Ejercicios, Nutrición, Perfil
  components/     componentes compartidos
  db/             cliente SQLite, esquema, migraciones y semilla
  constants/      tema y tipografías
  hooks/
drizzle/          migraciones SQL generadas
docs/PLAN.md      plan de producto y fases
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo de Expo |
| `npm run android` | Abre en un dispositivo o emulador Android |
| `npx tsc --noEmit` | Comprobación de tipos |
| `npx expo export -p android` | Empaqueta para verificar que todo compila |
