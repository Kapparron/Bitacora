<div align="center">

<img src="assets/images/icon.png" alt="Bitácora" width="120" />

# Bitácora

**Entrenamiento y nutrición en una sola app, sin cuenta y sin conexión.**

Registra tus sesiones serie a serie, monta rutinas, lleva el diario de calorías
y mira cómo evoluciona todo. Los datos son tuyos y viven en tu teléfono.

</div>

---

## Qué hace

### 🏋️ Entrenamiento

- **Sesión en curso** con la serie como unidad: reps, kilos, marcar como hecha y
  a la siguiente. La columna **Anterior** recuerda qué hiciste la última vez,
  serie por serie, para repetirlo o superarlo sin salir de la pantalla.
- **Tipos de serie**: normal, calentamiento, drop set y al fallo. El
  calentamiento no cuenta para el volumen ni para los récords.
- **Superseries** y **temporizador de descanso** por ejercicio, que arranca solo
  al marcar una serie.
- **Cambiar el ejercicio** de un hueco sin perder las series ya hechas.
- **Récords automáticos**: peso máximo, 1RM estimado (Epley), mejor serie por
  volumen y volumen de sesión. La serie que alcanza uno lleva **medalla** en la
  lista y lo anuncia con una burbuja.
- **Rutinas** con programación por días de la semana o cada N días desde una
  fecha. La de hoy aparece en la pantalla de inicio.
- **Historial** completo: cada entreno con su fecha, duración, volumen y todas
  las series que se hicieron. Editable si algo se registró mal.
- **Catálogo de 1.324 ejercicios** con animación, músculo, material e
  instrucciones, buscable y filtrable por grupo muscular. Puedes añadir los
  tuyos.

### 🍎 Nutrición

- **Diario** por desayuno, comida, cena y snacks, con el total del día frente a
  tu objetivo.
- **Open Food Facts**: busca primero en tus alimentos y solo consulta la red
  cuando se lo pides, para no saturar su API.
- **Código de barras** con la cámara, o tecleado a mano si prefieres.
- **Alimentos propios** con sus macros, y **repetir la comida de ayer** de un
  toque.
- **Objetivo de calorías calculado** a partir de género, edad, altura, peso,
  actividad y los kilos que quieras ganar o perder por semana. Se niega a
  proponerte un déficit insostenible.

### 📈 Progreso

- **Calendario** con los días entrenados, los que tienen comida registrada, los
  planificados y los de descanso.
- **Rachas** de entreno y de diario, con una llama que crece por tramos y un
  anillo que se llena hacia la siguiente marca.
- **Días de descanso**, fijos por día de la semana o marcados a mano. Uno no
  rompe la racha; dos seguidos sí.
- **Peso corporal** con gráfica, objetivo marcado y evolución desde la primera
  medida.
- **Progreso por ejercicio**: peso máximo, 1RM estimado o volumen, sesión a
  sesión.
- **Copia de seguridad**: exporta todo a un JSON y restáuralo cuando quieras.

---

## Cómo está hecho

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
  cambiar lo que comiste hace un mes.

El plan completo y el estado de cada fase están en
[`docs/PLAN.md`](docs/PLAN.md).

---

## Arrancar

Hace falta **Node.js 20 o superior** y la app **Expo Go** en el móvil, o Android
Studio para un emulador.

```bash
npm install
npm start
```

Luego `a` para Android, `i` para iOS (solo desde macOS), o escanea el QR con
Expo Go.

> El escáner de códigos de barras, compartir la copia de seguridad y el selector
> de archivos necesitan una *development build* (`npx expo run:android`): en Expo
> Go pueden no funcionar.

### Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo de Expo |
| `npm run android` | Abre en un dispositivo o emulador Android |
| `npm run check` | Comprobaciones sobre las migraciones reales y la lógica pura |
| `npx tsc --noEmit` | Comprobación de tipos |
| `npx expo export -p android` | Empaqueta para verificar que todo compila |
| `npm run build:icons` | Regenera los iconos desde `assets/images/logo.png` |
| `npm run build:catalog` | Regenera el catálogo de ejercicios |

---

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

`npm run check` aplica las migraciones reales sobre una base en memoria y
comprueba lo que no se ve en pantalla: el orden de tablas de las copias, el
borrado de datos, el volumen sin calentamientos, el día local de una sesión
nocturna, las rachas con descansos y el cálculo del objetivo de calorías.

---

## Catálogo de ejercicios

Los 1.324 ejercicios integrados provienen del dataset público
[**hasaneyldrm/exercises-dataset**](https://github.com/hasaneyldrm/exercises-dataset),
recortado y traducido a `assets/data/exercises.json` por
`scripts/build-exercise-catalog.mjs`. Se insertan en el primer arranque y se
identifican por el id del dataset, así que una versión posterior puede añadir
entradas sin tocar las existentes ni los ejercicios que hayas creado tú.

Para regenerarlo tras actualizar el dataset o añadir nombres en español:

```bash
curl -L -o exercises.json https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json
npm run build:catalog -- exercises.json
```

> **Atribución.** Los datos del dataset son MIT. Las imágenes y animaciones son
> propiedad de [**Gym visual**](https://gymvisual.com/), que permite su uso a un
> máximo de 180×180 px y **exigiendo la atribución**. Por eso no se empaquetan:
> se sirven desde jsDelivr y la app muestra el crédito «© Gym visual —
> gymvisual.com» allí donde aparecen. Si publicas una app basada en este
> repositorio, revisa esos términos antes.

Los datos nutricionales vienen de [**Open Food Facts**](https://world.openfoodfacts.org),
base de datos colaborativa bajo licencia ODbL.
