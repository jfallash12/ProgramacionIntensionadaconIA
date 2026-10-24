# tasks.md — Plan de Implementación de NomadPulse Travel Assistant ("Viajero")

> **Laboratorio S3L2 — Re-ingeniería Intencional (Spec-Driven Coding).**
> Plan de desarrollo incremental y verificable, ordenado por fases, generado con IA a partir de los insumos
> armonizados y revisado por el estudiante (Head Chef) antes de programar.
>
> **Insumos (fuentes de verdad):** [`docs/requirements.md`](docs/requirements.md) (63 REQ vigentes, EARS) ·
> [`docs/design.md`](docs/design.md) (componentes, módulos, `dispatch`, mapeo REQ → función) ·
> [`docs/data-contract.json`](docs/data-contract.json) (schemaVersion 2) ·
> [`docs/wireframe.md`](docs/wireframe.md) + [`docs/wireframe.png`](docs/wireframe.png) ·
> memoria semántica en [`CLAUDE.md`](CLAUDE.md).

**Estado:** ✅ Todas las fases completadas (T-00..T-32) · Leyenda: `[ ]` pendiente · `[x]` hecha (evidencia en §Registro de ejecución)

---

## Cómo usar este plan (protocolo Head Chef)

### Reglas para el agente de IA

1. **Una tarea por vez**, en orden. No adelantar trabajo de tareas futuras.
2. Antes de cada tarea, leer `CLAUDE.md` y las secciones de `design.md` que la tarea cita.
3. Tocar **solo** los archivos listados en la tarea.
4. Usar exactamente los nombres de `design.md` §5.3 (funciones) y §4 (componentes), y los campos de `data-contract.json`.
5. **Unchanged Behavior:** ninguna tarea puede cambiar el comportamiento de una tarea ya marcada `[x]`. Si hace falta, se detiene y se avisa.
6. Prohibido: frameworks, librerías, CDN, `fetch`/XHR, ES Modules (`import`/`export`), `innerHTML` con datos del usuario.

### Ciclo por tarea

1. **Pedir** la tarea con el *Prompt de ejecución* (abajo).
2. **Revisar el diff** antes de aceptarlo: ¿toca solo los archivos permitidos? ¿usa los nombres del diseño? ¿hay lógica de negocio fuera de `calculations.js` / `validations.js`?
3. **Verificar** el *Criterio de aceptación* de la tarea (consola del navegador y/o pantalla).
4. **Correr las pruebas de regresión** R1–R5 que ya apliquen (ver §Pruebas de regresión).
5. **Commit** con el formato `feat(T-XX): <resumen>` (o `fix(T-XX): …`) y marcar la tarea `[x]` en este archivo.

### Prompt de ejecución (plantilla)

```text
Lee CLAUDE.md y tasks.md. Ejecuta SOLO la tarea T-XX.
Archivos permitidos: <lista de la tarea>.
Sigue los nombres de docs/design.md (§4 componentes, §5.3 API) y los campos de docs/data-contract.json.
Requerimientos que cubre: <REQ de la tarea>.
Al terminar, muestra el diff y explica cómo verificar el criterio de aceptación.
No modifiques nada fuera de esos archivos.
```

### Prompt de corrección con Unchanged Behavior (plantilla)

```text
Corrige/ajusta: <descripción exacta del problema o del cambio de interfaz>.
UNCHANGED BEHAVIOR — debe seguir funcionando EXACTAMENTE igual:
- Cálculos de calculations.js (límite diario, disponible, estados, Total del Día, presupuesto global).
- Validaciones de validations.js (montos ≤ 0, no numéricos, > 2 decimales, fechas, textos vacíos).
- Persistencia en localStorage en cada mutación (clave 'viajero.state').
- Tareas ya completadas en tasks.md: <lista T-XX>.
Toca solo: <archivos>. Muestra el diff y confirma que las pruebas R1–R5 siguen pasando.
```

### Definición de Hecho (para cada tarea)

- [ ] El criterio de aceptación de la tarea se verificó a mano.
- [ ] La consola del navegador no muestra errores y la pestaña Network está vacía.
- [ ] Las pruebas de regresión R1–R5 que ya aplican siguen pasando.
- [ ] Se usaron los nombres del diseño y del contrato, sin inventar campos.
- [ ] Commit hecho y tarea marcada `[x]`.

---

## Datos de prueba oficiales

Para todas las verificaciones se usa el **segundo ejemplo** de `docs/data-contract.json` (`examples[1]`): viaje del 2026-10-10 al 2026-10-17 (8 días), Día 2 = 2026-10-11.

**Cargar el dataset** (consola del navegador, con la app abierta; luego recargar con F5):

```js
localStorage.setItem('viajero.state', JSON.stringify(/* pegar aquí examples[1] de data-contract.json */));
```

**Limpiar:** `localStorage.removeItem('viajero.state')` y recargar.

| Valor esperado con el dataset | Resultado |
|---|---|
| `totalDays` | 8 |
| Comida — límite diario (DailyFoodLimit) | $70.00 (560 / 8) |
| Comida — acumulado Día 2 | $44.50 (14 + 6.50 + 24) → **64 %**, Verde |
| Comida — disponible Día 2 | +$25.50 |
| Transporte — límite / acumulado / disponible Día 2 | $47.50 / $12.00 / +$35.50 → 25 %, Verde |
| Total del Día 2 (todas las categorías, sin fijos) | $56.50 |
| Presupuesto Total (GlobalBudget.total) | $2,370.00 (Imprevistos no tiene asignado) |
| Gastado Total (incluye el fijo de $320) | $376.50 |
| Comprometido (fijos) | $320.00 |
| Disponible Global | $1,993.50 → 16 % consumido |
| Grupo "Pre-viaje / Fijos" | Reserva hotel 2026-09-15, $320.00 |

> Las cifras del wireframe ($612 gastados) son ilustrativas. Las cifras de verificación son las de esta tabla.

---

## Fase 0 — Auditoría y armonización de artefactos (Paso 1 del S3L2)

Objetivo: eliminar contradicciones **antes** de escribir código.

- [x] **T-00.1 Contrato de datos vs. negocio.** Los campos usan el lenguaje del negocio (`trip`, `categories`, `expenses`, `itinerary`, `isFixed`, `mealType`, `convertedExpenseId`/`linkedActivityId`). Las entidades derivadas `GlobalBudget`, `DailyFoodLimit`, `DailyTransportLimit` y `DayTotal` **no** se persisten.
  *Evidencia:* schemaVersion 2, estricto (`additionalProperties: false`); pasa 18 pruebas (2 ejemplos válidos y 16 casos inválidos rechazados).
- [x] **T-00.2 `requirements.md` claro en las reglas críticas.** Límite diario: REQ-019/020 con la fórmula `(Total Comida / Días Totales) − Acumulado del Día`. Montos: REQ-025 (≤ 0), REQ-028 (no numérico), REQ-065 (> 2 decimales). Persistencia: REQ-039/040/041/064.
- [x] **T-00.3 `design.md` mapea cada requerimiento.** La tabla §7 cubre 63/63 REQ vigentes con componente y función.
- [x] **T-00.4 Wireframe en armonía con el contrato.**
  - Categorías del dashboard = `categories` del contrato.
  - El formulario usa los campos de `expense`.
  - Los tipos de comida coinciden con el enum `mealType`.
  - El historial distingue `isFixed`.
  - "Convertir a gasto" respeta `status = completado`.
- [x] **T-00.5 Hallazgos de esta auditoría y su resolución.**
  - *"Registro en 1 clic"* (wireframe) vs. `PREFILL_MEAL` (diseño): un botón no puede registrar un gasto sin monto. **Decisión:** el clic precarga el formulario (fecha, categoría Comida y tipo de comida) y enfoca el campo Monto (ver T-24).
  - *Cifras del wireframe vs. ejemplo del contrato:* son datos distintos. **Decisión:** el ejemplo del contrato es el dataset oficial de verificación (tabla anterior).
- [x] **T-00.6 Elementos fuera de rango tras cambiar las fechas del viaje.** REQ-009 permite que queden gastos o actividades fuera del rango, mientras REQ-027 y REQ-031 validan el rango al editar.
  - **Decisión del Head Chef:** para editar uno de esos elementos (incluido cambiar el estado de una actividad), **primero hay que moverlo a una fecha dentro del viaje**. Eliminarlo sí está permitido.
  - *Evidencia:* REQ-009, REQ-027 y REQ-031 actualizados; clarificación C7 en `design.md`.

---

## Fase 1 — Esqueleto del proyecto

- [x] **T-01 `index.html`, CSP y carga de scripts**
  - **Archivos:** `src/index.html`, `src/js/calculations.js`, `src/js/validations.js`, `src/js/storage.js`, `src/js/ui.js`, `src/js/app.js` (estos 5 como stubs vacíos).
  - **Hacer:**
    - Regiones del layout del wireframe (`header`, `nav`, `main`, contenedor de diálogos).
    - `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'">`.
    - Scripts clásicos en el orden `calculations → validations → storage → ui → app`.
    - Cada script es una IIFE que registra su API en `window.Viajero` (`calc`, `validate`, `storage`, `ui`, `app`).
  - **REQ:** 038 · **Diseño:** §1, §5.1, D1, D6
  - **Aceptación:** al abrir con doble clic (`file://`), `Object.keys(Viajero)` devuelve los 5 módulos; la consola no tiene errores y Network está vacío.
- [x] **T-02 `styles.css` base**
  - **Archivos:** `src/css/styles.css`, `src/index.html` (solo el `<link>`).
  - **Hacer:**
    - Variables `:root` (`--ok`, `--warning`, `--exceeded`, `--fixed`, `--muted`).
    - Clases `is-ok` / `is-warning` / `is-exceeded`, barra de progreso y tarjetas.
    - Layout de 3 paneles y dos columnas en el detalle operativo.
    - Una sola columna con `@media (max-width: 720px)`.
  - **REQ:** 022 (colores de estado) · **Diseño:** §8
  - **Aceptación:** una página de prueba con las tres clases muestra verde, ámbar y rojo, cada color **con texto** además del color.

## Fase 2 — `calculations.js` (funciones puras, sin DOM)

- [x] **T-03 Fechas y días del viaje**
  - **Archivos:** `src/js/calculations.js`
  - **Hacer:** `parseISODate`, `toISODate`, `todayISO` (fecha **local**), `isValidISODate`, `tripDates`, `totalDays`. Usar `Date.UTC`; nunca `new Date('YYYY-MM-DD')`.
  - **REQ:** 004, 005 · **Diseño:** RN-01, D2, D3
  - **Aceptación (consola):**
    - `totalDays({startDate:'2026-10-10',endDate:'2026-10-17'}) === 8`
    - mismo día de inicio y fin → `1`
    - `isValidISODate('2026-02-30') === false`
    - `tripDates(trip).length === 8`
    - `todayISO()` coincide con la fecha del reloj de Windows (zona de Costa Rica)
- [x] **T-04 Dinero y formato**
  - **Archivos:** `src/js/calculations.js`
  - **Hacer:** `hasMax2Decimals`, `roundMoney`, `formatMoney`, `formatPercent`; las sumas internas se hacen en centavos enteros.
  - **REQ:** 050, 065 · **Diseño:** D4
  - **Aceptación:**
    - `formatPercent(63.5714) === '64 %'`
    - `formatMoney(25.5) === '$25.50'`
    - sumar `0.1 + 0.2` con el helper da `0.30`
    - `hasMax2Decimals(6.505) === false`
- [x] **T-05 Derivados diarios (DailyFoodLimit / DailyTransportLimit)**
  - **Archivos:** `src/js/calculations.js`
  - **Hacer:** `dailyLimit` (devuelve `null` si no hay asignado), `dayAccumulated` (excluye `isFixed`), `dailyAvailable`, `dailyStatus` (evalúa **sin redondear**), `mealTotals`.
  - **REQ:** 011, 019, 020, 022, 052 · **Diseño:** RN-02, RN-03, RN-04
  - **Aceptación con el dataset (Día 2):**
    - Comida: límite 70, acumulado 44.5, disponible 25.5, estado `ok`.
    - Transporte: límite 47.5, acumulado 12.
    - Al quitar `allocated` a comida, `dailyLimit` devuelve `null`.
- [x] **T-06 Derivados globales y utilidades**
  - **Archivos:** `src/js/calculations.js`
  - **Hacer:** `categorySpent`, `globalBudget` (`total`, `spent`, `committed`, `available`, `status`: `ok`/`committed`/`exceeded`), `dayTotal`, `groupExpensesByDate` (con el grupo Pre-viaje / Fijos), `itemsOutOfRange`, `canConvert`, `initialSelectedDate`.
  - **REQ:** 006, 009, 012, 014, 046, 047, 051, 053, 054 · **Diseño:** RN-06, RN-07
  - **Aceptación con el dataset:**
    - `globalBudget`: total 2370, spent 376.5, committed 320, available 1993.5.
    - `dayTotal('2026-10-11') === 56.5`.
    - `canConvert(act-001) === true`; `canConvert(act-002) === false`.
    - `initialSelectedDate(trip,'2026-10-01') === '2026-10-10'` y `initialSelectedDate(trip,'2026-11-01') === '2026-10-17'`.

## Fase 3 — `validations.js` (funciones puras: `{ campo: 'mensaje' }`, vacío = válido)

- [x] **T-07 `validateTrip`**
  - **Archivos:** `src/js/validations.js`
  - **REQ:** 002, 003, 030
  - **Aceptación:** rechaza nombre o destino vacío o de solo espacios, fechas vacías o inválidas (`2026-02-30`) y fin < inicio.
- [x] **T-08 `validateExpense`**
  - **Archivos:** `src/js/validations.js`
  - **REQ:** 025, 026, 027, 028, 029, 047, 055, 065
  - **Aceptación:**
    - Rechaza `-5`, `0`, `'abc'` y `6.505`.
    - Rechaza descripción `'  '`, falta de categoría y comida sin `mealType`.
    - Rechaza una fecha variable fuera del rango, pero acepta un **fijo** con fecha 2026-09-15.
    - Editar un gasto variable que quedó fuera del rango se rechaza mientras su fecha siga fuera; al moverlo dentro del viaje, se acepta (T-00.6).
    - **No** consulta límites diarios (REQ-021): un gasto de $500 en comida es válido.
- [x] **T-09 `validateCategory` y `validateCategoryDelete`**
  - **Archivos:** `src/js/validations.js`
  - **REQ:** 018, 023, 048, 065
  - **Aceptación:**
    - Rechaza un nombre vacío y un duplicado sin distinguir mayúsculas (`comida` vs `Comida`).
    - Rechaza un asignado de `0` o `-10`.
    - Rechaza eliminar `cat-comida` y `cat-transporte`.
- [x] **T-10 `validateActivity` y `validateConversion`**
  - **Archivos:** `src/js/validations.js`
  - **REQ:** 031, 045, 061, 065
  - **Aceptación:**
    - Rechaza un título vacío y una fecha fuera del rango.
    - Rechaza cualquier edición, incluido el cambio de estado, de una actividad que quedó fuera del rango hasta que se mueva dentro del viaje (T-00.6).
    - Rechaza pasar una actividad convertida a `en_progreso`.
    - Rechaza convertir dos veces la misma actividad.

## Fase 4 — `storage.js` (persistencia)

- [x] **T-11 Persistencia en LocalStorage**
  - **Archivos:** `src/js/storage.js`
  - **Hacer:**
    - `STORAGE_KEY = 'viajero.state'` y `emptyState()` (`trip: null` + `cat-comida` + `cat-transporte`).
    - `validateState()` replica a mano el contrato: tipos, `required`, enums, `additionalProperties`, `mealType` condicional, `schemaVersion` y las categorías del sistema.
    - `loadState()` devuelve `{ state, notice }`.
    - `saveState()` devuelve `true` o un error, **sin lanzar excepción**.
  - **REQ:** 039, 040, 041, 064 · **Diseño:** §5.2, D8, D9
  - **Aceptación:**
    - `validateState(examples[0])` y `validateState(examples[1])` → válidos.
    - Un estado con `schemaVersion: 1`, con `budgets` o con un monto `-5` → inválido.
    - Si `localStorage` tiene `'{roto'`, `loadState()` devuelve el estado vacío + aviso.

## Fase 5 — `app.js` (estado, `dispatch` y reducers)

- [x] **T-12 Núcleo: `state`, `ui`, `dispatch`, eventos, `init`**
  - **Archivos:** `src/js/app.js`
  - **Hacer:**
    - El ciclo de `design.md` §5.4: guarda `requireTrip`, valida, pide confirmación si corresponde, ejecuta el reducer, `saveState` y `render`.
    - Delegación de eventos con `data-action`.
    - Si `saveState` falla: mantiene los datos en memoria, muestra el aviso y reintenta en la siguiente mutación.
    - `init()` usa `loadState` + `initialSelectedDate`.
  - **REQ:** 032, 039, 040, 042, 064
  - **Aceptación:**
    - Un `dispatch` con datos inválidos **no** cambia `state` ni `localStorage`.
    - Un `dispatch` válido actualiza ambos.
    - Una acción de dominio sin viaje se rechaza.
- [x] **T-13 Reducers de viaje**
  - **Archivos:** `src/js/app.js`
  - **Hacer:** `CREATE_TRIP` (rechaza un segundo viaje), `UPDATE_TRIP` (requiere confirmación si hay datos), `DELETE_TRIP` (única cascada permitida).
  - **REQ:** 001, 008, 037, 062, 063
  - **Aceptación:**
    - Un segundo `CREATE_TRIP` se rechaza.
    - `DELETE_TRIP` confirmado deja `trip: null`, sin gastos ni actividades, y conserva todas las categorías (REQ-063 aclarado, D15).
- [x] **T-14 Reducers de categorías**
  - **Archivos:** `src/js/app.js`
  - **Hacer:** `ADD_CATEGORY` (`tracking: total`, `system: false`), `UPDATE_CATEGORY`, `DELETE_CATEGORY(id, targetId)`.
  - **REQ:** 015, 016, 017, 023, 048, 049
  - **Aceptación:**
    - Eliminar `cat-actividades` reasignando a `cat-imprevistos` mueve gastos y actividades sin perder ninguno.
    - Si el destino es comida, se exige `mealType`.
- [x] **T-15 Reducers de gastos**
  - **Archivos:** `src/js/app.js`
  - **Hacer:** `ADD_EXPENSE` (genera `id` y `createdAt`; elimina `mealType` si no es comida), `UPDATE_EXPENSE`, `DELETE_EXPENSE` (libera la actividad enlazada).
  - **REQ:** 010, 033, 056, 057, 058
  - **Aceptación:**
    - Mover un gasto del Día 2 al Día 3 recalcula ambos días.
    - Borrar un gasto convertido elimina el `convertedExpenseId` de la actividad.
- [x] **T-16 Reducers de actividades y conversión**
  - **Archivos:** `src/js/app.js`
  - **Hacer:** `ADD_ACTIVITY` (al final del arreglo, nunca reordena), `UPDATE_ACTIVITY` (no toca `expenses`), `DELETE_ACTIVITY` (conserva el gasto y quita el enlace), `CONVERT_ACTIVITY` (enlace bidireccional).
  - **REQ:** 035, 036, 043, 044, 045, 059, 060, 061
  - **Aceptación:**
    - Convertir `act-001` crea un gasto de $35 con `linkedActivityId`; la actividad recibe `convertedExpenseId`.
    - Una segunda conversión se rechaza.
    - El estado resultante sigue siendo válido según `validateState`.

## Fase 6 — Interfaz base

- [x] **T-17 Helper `el()`, `AppShell`, `NavTabs`, `render` y `StorageNotice`**
  - **Archivos:** `src/js/ui.js`, `src/js/app.js` (solo la llamada a `render`)
  - **Hacer:** construir el DOM con `textContent` (nunca `innerHTML` con datos); 4 pestañas (Control Diario, Itinerario, Presupuesto y Categorías, Gastos); aviso de estado dañado y de fallo al guardar.
  - **REQ:** 041, 064 · **Diseño:** §4, D5, D12
  - **Aceptación:**
    - Se puede cambiar de pestaña.
    - Con `'{roto'` en storage aparece el aviso y la app no se bloquea.
- [x] **T-18 `EmptyTripState` / `TripForm` y `TripHeader`**
  - **Archivos:** `src/js/ui.js`
  - **Hacer:**
    - Sin viaje: pantalla vacía con el formulario.
    - Validación **en vivo** mientras se escribe; Guardar deshabilitado si hay errores.
    - El encabezado muestra destino, rango ISO, `totalDays` y los botones Editar / Eliminar.
  - **REQ:** 001, 002, 003, 004, 005, 030, 042, 062, 063
  - **Aceptación:** crear el viaje del dataset muestra "8 días"; un nombre de solo espacios muestra el error en rojo al momento.

## Fase 7 — Dashboard global y categorías

- [x] **T-19 `CategoryBreakdown`, `BudgetTotals`, `GlobalProgressBar`**
  - **Archivos:** `src/js/ui.js`
  - **REQ:** 006, 012, 013, 014, 051, 052
  - **Aceptación con el dataset:**
    - Se muestra Total $2,370.00 · Gastado $376.50 · Comprometido $320.00 · Disponible $1,993.50 · barra 16 %.
    - Imprevistos muestra "Sin presupuesto".
    - Si el gastado supera el total, el disponible aparece en negativo y en rojo.
- [x] **T-20 `CategoryManager` y `ReassignCategoryDialog`**
  - **Archivos:** `src/js/ui.js`
  - **REQ:** 015, 016, 017, 018, 023, 048, 049
  - **Aceptación:**
    - Comida y Transporte no tienen botón Eliminar.
    - Eliminar Actividades pide un destino y muestra cuántos elementos se reasignan.
    - Crear "comida" (duplicado) muestra un error en vivo.

## Fase 8 — Control diario (núcleo del negocio)

- [x] **T-21 `DaySelector`**
  - **Archivos:** `src/js/ui.js`
  - **REQ:** 054
  - **Aceptación:** muestra 8 botones; marca HOY cuando la fecha cae dentro del viaje; al hacer clic en un día se actualiza todo el panel.
- [x] **T-22 `DailyCategoryCard` (comida y transporte) y `StatusLegend`**
  - **Archivos:** `src/js/ui.js`
  - **REQ:** 019, 020, 021, 022, 050, 052
  - **Aceptación (Día 2):**
    - Comida: Asignado Hoy $70.00 · Acumulado Hoy $44.50 · Disponible Hoy +$25.50 · 64 % Verde.
    - Transporte: $47.50 / $12.00 / +$35.50 · 25 % Verde.
- [x] **T-23 `ExpenseForm` con validación en vivo**
  - **Archivos:** `src/js/ui.js`
  - **Campos:** Fecha, Categoría, Tipo de comida (solo si es Comida), Monto, Descripción y la casilla Gasto fijo.
  - **Comportamiento:** los errores aparecen mientras se escribe y Guardar se deshabilita si hay errores. Exceder el límite diario **no** bloquea el registro.
  - **REQ:** 010, 021, 025, 026, 027, 028, 029, 047, 055, 056, 065
  - **Aceptación:**
    - Monto `-5` → "El monto debe ser mayor a 0" y Guardar deshabilitado.
    - `localStorage` no cambia.
    - Un gasto válido actualiza al instante la tarjeta, el historial y el dashboard.
- [x] **T-24 `QuickMealButtons`**
  - **Archivos:** `src/js/ui.js`
  - **REQ:** 029 · **Decisión:** T-00.5
  - **Aceptación:**
    - Cada botón muestra el acumulado de hoy por tipo (Desayuno $14.00, Almuerzo $24.00, Snack/Café $6.50).
    - Al hacer clic, el formulario se precarga con la fecha del día, la categoría Comida y ese tipo, y el foco queda en Monto.

## Fase 9 — Historial de gastos

- [x] **T-25 `ExpenseHistory` / `DayGroup` / `ExpenseRow` y pestaña Gastos**
  - **Archivos:** `src/js/ui.js`
  - **REQ:** 011, 047, 053
  - **Aceptación:**
    - Los gastos aparecen agrupados por fecha, y el grupo del Día 2 muestra "Total del Día: $56.50".
    - Existe el grupo "Pre-viaje / Fijos" con la reserva de $320, que no suma al Total del Día.
- [x] **T-26 Editar (`ExpenseModal`) y eliminar (`ConfirmDialog`) gastos**
  - **Archivos:** `src/js/ui.js`
  - **REQ:** 033, 057, 058
  - **Aceptación:**
    - Editar el Casado ($24) y pasarlo al Día 3 recalcula el Día 2 (acumulado $20.50) y el Día 3.
    - Eliminar pide confirmación y recalcula todo.

## Fase 10 — Itinerario y conversión

- [x] **T-27 `ItineraryList` / `ItineraryItem` / `ActivityForm` y pestaña Itinerario**
  - **Archivos:** `src/js/ui.js`
  - **REQ:** 031, 034, 035, 036, 059, 060, 061
  - **Aceptación:**
    - No existe ningún botón ni flujo que sugiera o genere actividades.
    - Las actividades se muestran en orden de inserción.
    - Cambiar el estado funciona, excepto sacar de `completado` una actividad convertida.
- [x] **T-28 Flujo "Convertir a gasto"**
  - **Archivos:** `src/js/ui.js`
  - **REQ:** 043, 044, 045, 046
  - **Aceptación:**
    - El botón solo aparece en *Puentes Colgantes*: completada, $35 y no convertida.
    - Abre el `ExpenseModal` precargado; al confirmar, la actividad muestra "✓ Convertida" y el botón desaparece.

## Fase 11 — Diálogos y casos de borde

- [x] **T-29 Editar fechas del viaje y eliminar el viaje**
  - **Archivos:** `src/js/ui.js`
  - **REQ:** 008, 009, 032, 037, 063
  - **Aceptación:**
    - Cambiar el fin al 2026-10-10 lista los elementos fuera de rango sin borrarlos y recalcula los límites (comida = $560.00 para 1 día).
    - Editar uno de esos elementos exige moverlo a 2026-10-10; eliminarlo sí se permite (T-00.6).
    - Eliminar el viaje muestra los conteos y pide confirmación.
- [x] **T-30 Pruebas de robustez y seguridad**
  - **Archivos:** solo correcciones donde fallen (bajo Unchanged Behavior)
  - **REQ:** 038, 041, 064
  - **Aceptación:**
    - Una descripción `<img src=x onerror=alert(1)>` se muestra como texto.
    - Con `'{roto'` en storage aparece el aviso.
    - Simular un fallo de `setItem` mantiene los datos en memoria con aviso.
    - DevTools → Network sigue vacío en todo el recorrido.

## Fase 12 — Verificación contra el negocio y aprobación del cliente (Paso 4 del S3L2)

- [x] **T-31 Auditoría del Cliente: los 3 puntos críticos**
  1. **Persistencia:** registrar un gasto, presionar **F5** → el gasto, los totales y el día seleccionado siguen igual.
  2. **Restricciones semánticas:** ingresar un gasto de **−5** → se rechaza en vivo, Guardar queda deshabilitado y `localStorage` no cambia.
  3. **Lógica dinámica** (dataset, Día 2, Comida; límite $70.00, acumulado inicial $44.50):

     | Acción | Acumulado | Disponible | % | Estado |
     |---|---|---|---|---|
     | + $10.00 | $54.50 | +$15.50 | 78 % | Verde |
     | + $5.00 | $59.50 | +$10.50 | 85 % | Ámbar |
     | + $20.00 | $79.50 | −$9.50 | 114 % | Rojo — **el gasto se registra igual** |
- [x] **T-32 Cierre**
  - Recorrer los 63 REQ de `requirements.md` contra la app (usar la tabla §7 de `design.md` como checklist).
  - Actualizar el `README.md` con "Cómo ejecutarla" ya real.
  - Responder en `retrospective.md` las preguntas del S3L2 con la experiencia de la implementación.
  - Verificar la estructura del repo pedida por el lab.

---

## Registro de ejecución

| Fases | Tareas | Commit | Archivos |
|---|---|---|---|
| 1 | T-01, T-02 | `feat(T-01,T-02)` | `src/index.html`, `src/css/styles.css` |
| 2 | T-03..T-06 | `feat(T-03..T-06)` | `src/js/calculations.js` |
| 3 | T-07..T-10 | `feat(T-07..T-10)` | `src/js/validations.js` |
| 4 | T-11 | `feat(T-11)` | `src/js/storage.js` |
| 5–11 | T-12..T-30 | `feat(T-12..T-30)` | `src/js/app.js`, `src/js/ui.js` (dependen entre sí: se integraron juntos) |
| 12 | T-31, T-32 | `docs(T-31,T-32)` | documentación, `REFLECTION.md` |

**Evidencia de verificación** (navegador Chromium automatizado abriendo `src/index.html` con `file://`, con el dataset oficial):

- **65 verificaciones de lógica** sobre `Viajero.calc`, `Viajero.validate` y `Viajero.storage`: todos los criterios de aceptación de T-03..T-11, más bordes extra (80 % exacto = Verde, 100 % = Ámbar, $70.01 = Rojo, cruce de mes, `0.1 + 0.2`). 65/65 OK.
- **61 verificaciones de interfaz** de punta a punta: crear viaje con errores en vivo, valores del dataset, las 3 pruebas del cliente (T-31), registro rápido, editar y mover un gasto, conversión y doble conversión, eliminar con confirmación, XSS mostrado como texto, categorías (duplicado, asignado 0, eliminar vacía, reasignar), cambio de fechas con lista de afectados, edición bloqueada fuera de rango (T-00.6), fallo de `localStorage` y reintento, eliminar viaje, datos dañados, vista móvil sin scroll horizontal y **cero peticiones de red**. 61/61 OK, sin errores en consola.

**Hallazgos durante la ejecución (corregidos con Unchanged Behavior):**

1. *Borrador de actividad desactualizado:* después de acortar las fechas del viaje, el formulario de actividad conservaba una fecha fuera del rango y el botón quedaba deshabilitado sin explicar por qué. Se corrigió en `UPDATE_TRIP.after` (reiniciar el borrador) y en la regla de visibilidad de errores (D14). Las validaciones y los cálculos no cambiaron, y las 126 verificaciones volvieron a pasar.
2. *Ambigüedad en REQ-063* ("conservando las categorías del sistema"): se aclaró que se conservan **todas** las categorías, para cumplir REQ-037 (D15).

## Pruebas de regresión (correr después de cada tarea, cuando ya apliquen)

| ID | Prueba | Aplica desde |
|---|---|---|
| R1 | **Persistencia:** crear/editar datos → F5 → todo sigue igual | T-12 |
| R2 | **Montos negativos:** `-5`, `0`, `'abc'`, `6.505` se rechazan y el estado no cambia | T-08 (consola) / T-23 (UI) |
| R3 | **Cálculo dinámico:** con el dataset, Comida Día 2 = $70.00 / $44.50 / +$25.50 / 64 % | T-05 (consola) / T-22 (UI) |
| R4 | **Consola limpia** y **Network vacío** | T-01 |
| R5 | **Contrato:** `Viajero.storage.validateState(Viajero.app.state)` es válido tras cualquier acción | T-12 |

## Matriz de cobertura REQ → tarea

| REQ | Tareas | REQ | Tareas | REQ | Tareas |
|---|---|---|---|---|---|
| 001 | T-13, T-18 | 023 | T-09, T-14, T-20 | 045 | T-10, T-16, T-28 |
| 002 | T-07, T-18 | 024 | *Eliminado* | 046 | T-06, T-28 |
| 003 | T-07, T-18 | 025 | T-08, T-23 | 047 | T-06, T-08, T-23, T-25 |
| 004 | T-03, T-18 | 026 | T-08, T-23 | 048 | T-09, T-14, T-20 |
| 005 | T-03, T-18 | 027 | T-08, T-23 | 049 | T-14, T-20 |
| 006 | T-06, T-19 | 028 | T-08, T-23 | 050 | T-04, T-22 |
| 007 | *Eliminado* | 029 | T-08, T-23, T-24 | 051 | T-06, T-19 |
| 008 | T-13, T-29 | 030 | T-07, T-18 | 052 | T-05, T-19, T-22 |
| 009 | T-06, T-29 | 031 | T-10, T-27 | 053 | T-06, T-25 |
| 010 | T-15, T-23 | 032 | T-12, T-29 | 054 | T-06, T-21 |
| 011 | T-05, T-25 | 033 | T-15, T-26 | 055 | T-08, T-23 |
| 012 | T-06, T-19 | 034 | T-27 | 056 | T-15, T-23 |
| 013 | T-19 | 035 | T-16, T-27 | 057 | T-15, T-26 |
| 014 | T-06, T-19 | 036 | T-16, T-27 | 058 | T-15, T-26 |
| 015 | T-14, T-20 | 037 | T-13, T-29 | 059 | T-16, T-27 |
| 016 | T-14, T-20 | 038 | T-01, T-30 | 060 | T-16, T-27 |
| 017 | T-14, T-20 | 039 | T-11, T-12 | 061 | T-10, T-16, T-27 |
| 018 | T-09, T-20 | 040 | T-11, T-12 | 062 | T-13, T-18 |
| 019 | T-05, T-22 | 041 | T-11, T-17, T-30 | 063 | T-13, T-18, T-29 |
| 020 | T-05, T-22 | 042 | T-12, T-18 | 064 | T-11, T-12, T-17, T-30 |
| 021 | T-22, T-23 | 043 | T-16, T-28 | 065 | T-04, T-08, T-09, T-10, T-23 |
| 022 | T-02, T-05, T-22 | 044 | T-16, T-28 | | |

**Cobertura:** 63/63 requerimientos vigentes tienen al menos una tarea de lógica o de interfaz y un criterio verificable.
