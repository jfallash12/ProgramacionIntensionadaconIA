# CLAUDE.md — Memoria Semántica del Proyecto

> Este archivo es la memoria permanente y el **archivo de reglas de contexto** del proyecto
> (cumple la función de `.cursorrules` / `system_prompt.md`) para cualquier IA o desarrollador.
> Contiene las reglas del negocio, el lenguaje ubicuo, los invariantes que **nunca** deben romperse
> y las reglas de gobierno de la IA (§10). Antes de escribir o modificar código, léelo completo.

## 1. ¿Qué es este proyecto?

**NomadPulse Travel Assistant** (aplicación "Viajero") es una app de viajes 100% offline que
controla un presupuesto por categorías personalizables, con **límites diarios de comida y transporte**
(alertas visuales de sobre-gasto), Total del Día, itinerario del viaje y conversión de actividades a gastos.

- **Curso:** Programación Intencional con IA Generativa — Proyecto Final (Greenfield Intentional App).
- **Stack:** HTML + CSS puro (escrito a mano, **sin frameworks, librerías ni CDN**) + JavaScript vanilla en scripts clásicos (`window.Viajero`).
- **Persistencia:** `localStorage` del navegador (clave `viajero.state`). **Sin servidor, sin internet** (REQ-038).
- **Metodología:** especificación EARS (`WHEN …, IF …, THEN the system SHALL …`) en [`docs/requirements.md`](docs/requirements.md).

## 2. Fuentes de verdad (orden de precedencia)

| Documento | Contenido |
|---|---|
| [`docs/requirements.md`](docs/requirements.md) | Especificación EARS v2: 63 requerimientos vigentes (REQ-001..REQ-065, sin REQ-007 ni REQ-024) — fuente de verdad del comportamiento |
| [`docs/design.md`](docs/design.md) | Reglas de negocio RN-01..RN-07, clarificaciones C1–C6, entrevista Q1–Q6, arquitectura |
| [`docs/data-contract.json`](docs/data-contract.json) | JSON Schema 2020-12 del estado `TravelAssistantState` (schemaVersion 2) — contrato estricto |
| [`docs/wireframe.md`](docs/wireframe.md) | Diseño de interfaz por componentes (+ `wireframe.excalidraw` editable y `wireframe.png`) |
| [`tasks.md`](tasks.md) | Plan de implementación por fases (T-00..T-32) con criterios de aceptación y pruebas de regresión |
| [`retrospective.md`](retrospective.md) | Historial de correcciones y reflexiones |

Si algún artefacto contradice otro, mandan los requerimientos (REQ) y luego las reglas (RN).

## 3. Lenguaje ubicuo (glosario)

**Entidades clave y su nombre en el código** (úsalos tal cual en funciones, variables y componentes):

| Entidad | Código | Tipo |
|---|---|---|
| **Trip** | `state.trip` | Persistida |
| **Category** | `state.categories[]` | Persistida |
| **Expense** | `state.expenses[]` | Persistida |
| **ItineraryItem** | `state.itinerary[]` | Persistida |
| **GlobalBudget** | `calc.globalBudget(state)` → `{ total, spent, committed, available, status }` | Derivada |
| **DailyFoodLimit** | `calc.dailyLimit(state, 'cat-comida')` | Derivada |
| **DailyTransportLimit** | `calc.dailyLimit(state, 'cat-transporte')` | Derivada |
| **DayTotal** | `calc.dayTotal(state, date)` | Derivada |

| Término | Significado en este proyecto |
|---|---|
| **Viaje (trip)** | Entidad raíz: nombre, destino, fecha inicio y fin. **Máximo un viaje** en la app (REQ-062). `null` = sin viaje |
| **totalDays** | Días del viaje, cálculo **inclusivo**: `(endDate − startDate) + 1`. Derivado, no se persiste |
| **Categoría** | Dato del usuario `{ id, name, allocated?, tracking, system }`. Personalizable; `cat-comida` y `cat-transporte` son del sistema y no se eliminan |
| **Categoría diaria** | `tracking = daily`: solo comida y transporte. Su asignado se divide entre `totalDays` |
| **Presupuesto Total** | `Σ categories.allocated`. No se ingresa por separado (RN-06) |
| **Límite diario** | `allocated / totalDays` de una categoría diaria (`foodDailyLimit`, `transportDailyLimit`). Derivado (RN-02) |
| **Gasto variable / fijo** | `isFixed = false` / `true`. Fijo = pre-pago (tiquetes, reserva pagada) |
| **Acumulado del día** | Suma de gastos **variables** de una categoría en una fecha |
| **Disponible Hoy** | `límite diario − Acumulado del día` (RN-03). Puede ser negativo (sobregiro) |
| **Total del Día** | Suma de gastos variables de **todas** las categorías en una fecha (RN-07, REQ-053) |
| **Estado de alerta** | Verde ≤80% / Ámbar (80,100] / Rojo >100% del límite diario (RN-04) |
| **mealType** | `desayuno`, `almuerzo`, `cena`, `snack_cafe`, `bebidas_bar`. Obligatorio si y solo si la categoría es comida |
| **Actividad del itinerario** | Item con fecha, hora, título, categoría, estado (`pendiente`/`en_progreso`/`completado`) y `estimatedCost` opcional |
| **Conversión a gasto** | Solo en actividades `completado` con costo > 0 y no convertidas. Enlace `convertedExpenseId` ↔ `linkedActivityId` |
| **Validación en vivo** | Mensaje de error visible mientras el usuario escribe/edita, antes de confirmar |

## 4. Reglas de negocio (resumen ejecutable)

- **RN-01:** `totalDays = (endDate − startDate) + 1` (inclusivo; 2026-10-10 → 2026-10-17 = 8 días).
- **RN-02:** `dailyLimit = allocated / totalDays` para comida y transporte; se recalcula al cambiar fechas o asignados.
- **RN-03:** `Disponible(cat, fecha) = dailyLimit − Σ(gastos variables de esa cat y fecha)`.
- **RN-04:** ≤80% Verde, (80%,100%] Ámbar, >100% Rojo. **Alerta visual, nunca bloquea**. Se evalúa sin redondear.
- **RN-05:** `amount > 0`; fecha ISO válida; categoría obligatoria; `mealType` si y solo si es comida; gastos variables dentro del rango del viaje, fijos exentos.
- **RN-06:** `Presupuesto Total = Σ allocated`; `Disponible Global = Presupuesto Total − Σ amount` (incluye fijos).
- **RN-07:** `Total del Día = Σ gastos variables de todas las categorías en la fecha`.
- Montos con precisión completa; se muestran con 2 decimales y los porcentajes como entero (REQ-050).

Detalle y trazabilidad a REQ en [`docs/design.md`](docs/design.md) §3.

## 5. Invariantes (comportamiento que NUNCA debe cambiar)

**Invariantes del negocio (no negociables):**

- **Cálculo dinámico de comida:** `Disponible Hoy = (Total Comida / Días Totales) − Acumulado del Día` (REQ-019, REQ-020). Lo mismo aplica a transporte.
- **Persistencia obligatoria en LocalStorage:** el estado completo se guarda en cada mutación y se restaura al iniciar (REQ-039, REQ-040).
- **Prohibición de montos negativos:** se rechazan montos ≤ 0, no numéricos o con más de 2 decimales, y campos obligatorios vacíos (REQ-025..REQ-028, REQ-065).

Estos son los `SHALL NOT` del sistema — no los toques sin cambiar primero `docs/requirements.md`:

1. **Nunca** se generan ni sugieren itinerarios automáticamente (REQ-034); toda actividad la ingresa el usuario (REQ-035).
2. **Nunca** se modifican ni reordenan actividades existentes sin acción explícita del usuario (REQ-036).
3. **Nunca** se eliminan viajes, gastos, categorías o actividades como efecto secundario de otra operación (REQ-037). Eliminar una categoría con elementos exige reasignarlos (REQ-015, REQ-016). La única cascada permitida es eliminar el viaje con confirmación (REQ-063).
4. **Nunca** se eliminan las categorías del sistema `cat-comida` y `cat-transporte` (REQ-048).
5. **Nunca** se envían datos a servidores externos ni se requiere internet (REQ-038). Sin fetch/XHR/CDN en el código.
6. **Nunca** se bloquea el registro de un gasto por exceder un límite: solo se alerta (REQ-021, REQ-051).
7. **Nunca** se cambia el viaje sin confirmación cuando tiene datos asociados (REQ-008); los elementos fuera del nuevo rango se advierten, no se borran (REQ-009).
8. El estado persistido corrupto o fuera de contrato **nunca** bloquea el arranque: se inicia vacío con aviso (REQ-041). Si no se puede guardar, los datos se mantienen en memoria con aviso (REQ-064).
9. **Máximo un viaje** en la aplicación (REQ-062).
10. **Nunca** se convierte dos veces la misma actividad, ni una que no esté `completado` (REQ-043, REQ-045, REQ-046).

## 6. Convenciones de código

> La arquitectura completa (componentes, API de cada módulo, `dispatch`, diagramas y mapeo REQ → función) está en [`docs/design.md`](docs/design.md). Respeta esos nombres.

- JS en `src/js/`, cargado como **scripts clásicos** (no ES Modules, que no funcionan en `file://`) en este orden: `calculations.js` → `validations.js` → `storage.js` → `ui.js` → `app.js`. Cada archivo es una IIFE que registra su API en `window.Viajero` (`Viajero.calc`, `Viajero.validate`, `Viajero.storage`, `Viajero.ui`, `Viajero.app`).
- **Solo `app.js` muta el estado**, y siempre mediante `dispatch(action)`: validar → (confirmar) → reducer → `storage.saveState` → `ui.render`. `calculations.js` y `validations.js` son funciones puras sin DOM.
- Prohibido: frameworks, Redux u otro store, backend, IndexedDB, Service Workers, `fetch`/XHR, CDNs, `innerHTML` con datos del usuario (usar `textContent` con el helper `el()`).
- Fechas: texto ISO `YYYY-MM-DD`; cálculos con `Date.UTC`; nunca `new Date('YYYY-MM-DD')` para fechas locales; "HOY" = fecha local del dispositivo.
- Dinero: sumar en centavos enteros; redondear solo al mostrar (2 decimales; porcentajes enteros). Los montos ingresados admiten máximo 2 decimales (REQ-065).
- CSS puro a mano en `src/css/styles.css`. Prohibido Tailwind, Bootstrap, CDNs o cualquier dependencia.
- El estado completo (`schemaVersion`, `trip`, `categories`, `expenses`, `itinerary`) se persiste en `localStorage` en **cada** mutación y se restaura al iniciar (REQ-039, REQ-040).
- Los valores derivados (`totalDays`, límites diarios, acumulados, disponibles, Presupuesto Total, Total del Día) **nunca** se persisten.
- Validar contra `docs/data-contract.json` antes de persistir cualquier estado nuevo; las reglas listadas en su `$comment` se validan en `validations.js`.
- Nombres de campos del código = nombres del schema (`camelCase`). IDs con prefijo: `trip-`, `cat-`, `exp-`, `act-`.

## 7. Estructura del repositorio

```text
/
├── CLAUDE.md                      ← este archivo (memoria semántica)
├── docs/
│   ├── requirements.md            ← especificación EARS v2 (fuente de verdad)
│   ├── data-contract.json         ← JSON Schema TravelAssistantState (schemaVersion 2)
│   ├── wireframe.md               ← boceto de interfaz por componentes
│   ├── wireframe.excalidraw       ← versión editable (excalidraw.com)
│   ├── wireframe.png              ← exportación visible en GitHub
│   └── design.md                  ← ENTREGABLE PRINCIPAL: diseño y arquitectura
├── tasks.md                       ← plan de implementación por fases (T-00..T-32, completado)
├── src/
│   ├── index.html                 ← punto de entrada + CSP
│   ├── css/styles.css             ← CSS puro
│   └── js/                        ← calculations.js, validations.js, storage.js, ui.js, app.js
├── REFLECTION.md                  ← autoevaluación del Proyecto Final
├── retrospective.md               ← historial de correcciones y reflexión
└── README.md                      ← resumen y comandos de ejecución
```

## 8. Flujo de trabajo con la IA (tasks.md + Unchanged Behavior)

1. Ejecutar **una tarea de [`tasks.md`](tasks.md) a la vez**, en orden, tocando solo los archivos que la tarea lista.
2. Al terminar, mostrar el diff y cómo verificar su criterio de aceptación.
3. **Unchanged Behavior:** ningún cambio puede alterar el comportamiento de una tarea ya marcada `[x]`, ni los cálculos, validaciones o la persistencia. Si un ajuste lo requiere, detenerse y avisar.
4. Después de cada tarea deben seguir pasando las pruebas de regresión R1–R5 de `tasks.md`.
5. Si una tarea revela una contradicción en los documentos, no decidir: reportarla para actualizar primero `requirements.md` / `design.md`.

## 9. Notas de entorno (máquina del estudiante)

- **No hay Python ni Node.js** instalados; todo debe funcionar abriendo el HTML directamente en el navegador (file://) — coherente con REQ-038.
- Git CLI no está en el PATH de PowerShell: usar `"C:\Program Files\Git\cmd\git.exe"`.

## 10. Reglas del proyecto para la IA (gobierno del Sous Chef)

El estudiante es el **Head Chef** (arquitecto y auditor); la IA es el **Sous Chef** (ejecuta). Estas reglas son obligatorias en toda sesión:

**Stack permitido (y nada más):**

- HTML5 + CSS3 escritos a mano + JavaScript vanilla (ES2015+) en scripts clásicos, persistencia en `localStorage`.
- **Prohibido** agregar: frameworks o librerías (React, Vue, jQuery, Bootstrap, Tailwind…), CDNs, `npm`/`package.json`, herramientas de build, TypeScript compilado, backend, bases de datos externas, IndexedDB, Service Workers, `fetch`/XHR/WebSocket o cualquier acceso a red (REQ-038).

**Convenciones obligatorias:** las de §6. Nombres de funciones y componentes exactamente como en `docs/design.md` §4 y §5.3; campos exactamente como en `docs/data-contract.json`; textos de la interfaz en español.

**Prohibición de parches fuera de la especificación:**

1. No agregar funcionalidades, campos, pantallas ni comportamientos que no estén en `docs/requirements.md`. Si algo falta o es ambiguo, **detenerse y preguntar**; no inventar.
2. No "arreglar" síntomas con casos especiales (`if` para un dato puntual, `try/catch` que oculta errores, valores mágicos). La corrección debe hacerse en la función responsable según `docs/design.md` §7.
3. Todo cambio de comportamiento se hace en este orden: `requirements.md` → `data-contract.json` / `design.md` → `tasks.md` → código.
4. Al corregir o ajustar, aplicar **Unchanged Behavior** (§8): declarar qué no puede cambiar, tocar solo los archivos necesarios y volver a pasar las pruebas R1–R5 de `tasks.md`.
5. Ningún cambio puede romper los invariantes de §5 ni dejar un estado que no cumpla el contrato (`dispatch` lo verifica con `storage.validateState`).
6. Entregar siempre el diff y cómo verificarlo; nunca "Accept All" sin revisión del Head Chef.

