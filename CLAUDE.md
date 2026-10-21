# CLAUDE.md — Memoria Semántica del Proyecto

> Este archivo es la memoria permanente para cualquier IA o desarrollador que trabaje en el
> proyecto. Contiene las reglas del negocio, el lenguaje ubicuo y los invariantes que
> **nunca** deben romperse. Antes de escribir código, léelo completo.

## 1. ¿Qué es este proyecto?

**NomadPulse Travel Assistant** (aplicación "Viajero") es una app de viajes 100% offline que
controla un presupuesto por categorías, con enfoque especial en el **límite diario de comida**
(alertas visuales de sobre-gasto), itinerario del viaje y conversión de actividades a gastos.

- **Curso:** Programación Intencional con IA Generativa — Semana 3, Lab 1.
- **Stack:** HTML + CSS puro (escrito a mano, **sin frameworks, librerías ni CDN**) + JavaScript vanilla modular.
- **Persistencia:** `localStorage` del navegador. **Sin servidor, sin internet** (REQ-038).
- **Metodología:** especificación EARS (`WHEN …, IF …, THEN the system SHALL …`) en [`docs/requirements.md`](docs/requirements.md).

## 2. Fuentes de verdad (orden de precedencia)

| Documento | Contenido |
|---|---|
| [`docs/requirements.md`](docs/requirements.md) | Los 46 requerimientos EARS (REQ-001..REQ-046) — fuente de verdad del comportamiento |
| [`docs/design.md`](docs/design.md) | Reglas de negocio RN-01..RN-05, decisiones de arquitectura, entrevista Q1-Q6 |
| [`docs/data-contract.json`](docs/data-contract.json) | JSON Schema 2020-12 del estado `TravelAssistantState` — contrato estricto |
| [`docs/wireframe.md`](docs/wireframe.md) | Diseño de interfaz por componentes (+ `.excalidraw` editable) |
| [`retrospective.md`](retrospective.md) | Historial de correcciones y reflexiones |

Si algún artefacto contradice otro, mandan los requerimientos (REQ) y luego las reglas (RN).

## 3. Lenguaje ubicuo (glosario)

| Término | Significado en este proyecto |
|---|---|
| **Viaje (trip)** | Entidad raíz: nombre, destino, fecha inicio y fin. Un único viaje activo a la vez |
| **totalDays** | Días del viaje, cálculo **inclusivo**: `(endDate − startDate) + 1`. Derivado, no se persiste |
| **Presupuesto global** | Suma de los montos asignados por categoría (`budgets[].allocated`) |
| **Categorías** | Enum fijo: `comida`, `hospedaje`, `transporte`, `actividades`, `compras`, `imprevistos` |
| **foodDailyLimit** | Límite diario de comida: `foodTotal / totalDays`. Derivado, no se persiste (RN-02) |
| **Acumulado del día** | Suma de gastos de categoría `comida` en una fecha específica |
| **Disponible del día** | `foodDailyLimit − Acumulado del día` (RN-03). Puede ser negativo (sobregiro) |
| **Estado de alerta** | Verde ≤80% / Ámbar (80,100] / Rojo >100% del límite diario (RN-04) |
| **mealType** | Tipo de comida: `desayuno`, `almuerzo`, `cena`, `snack_cafe`, `bebidas_bar`. Obligatorio si la categoría es `comida` |
| **Gasto fijo (fixed)** | Pre-pago (tiquetes, reserva ya pagada). Cuenta en el total global pero **no** consume el límite diario de comida |
| **Actividad del itinerario** | Item con fecha, hora, título, categoría, estado (`pendiente`/`en_progreso`/`completado`) y `estimatedCost` opcional |
| **Conversión a gasto** | Acción de 1 clic que convierte una actividad con costo estimado en un gasto enlazado (REQ-043..REQ-046) |
| **Validación en vivo** | Mensaje de error visible mientras el usuario escribe/edita, antes de confirmar |

## 4. Reglas de negocio (resumen ejecutable)

- **RN-01:** `totalDays = (endDate − startDate) + 1` (inclusivo; viaje de 1 día si inicio = fin).
- **RN-02:** `foodDailyLimit = foodTotal / totalDays`; se recalcula al cambiar fechas o presupuesto.
- **RN-03:** `Disponible(fecha) = foodDailyLimit − Σ(comida de esa fecha)`.
- **RN-04:** Estados de la barra diaria: ≤80% Verde, (80%,100%] Ámbar, >100% Rojo. **Alerta visual, nunca bloquea** registrar el gasto.
- **RN-05:** `amount > 0` (no ceros, negativos ni NaN); fechas en ISO `YYYY-MM-DD`; categoría obligatoria; `mealType` obligatorio si `category == comida`.

Detalle y trazabilidad a REQ en [`docs/design.md`](docs/design.md) §3.

## 5. Invariantes (comportamiento que NUNCA debe cambiar)

Estos son los `SHALL NOT` del sistema — no los toques sin cambiar primero `docs/requirements.md`:

1. **Nunca** se generan ni sugieren itinerarios automáticamente (REQ-034); toda actividad es ingresada o seleccionada explícitamente por el usuario (REQ-035).
2. **Nunca** se modifican ni reordenan actividades existentes sin acción explícita del usuario (REQ-036).
3. **Nunca** se eliminan viajes, gastos, categorías o actividades como efecto secundario de otra operación (REQ-037). Eliminar categoría con gastos exige reasignarlos a una categoría destino (REQ-015, REQ-016).
4. **Nunca** se envían datos a servidores externos ni se requiere internet (REQ-038). Sin fetch/XHR/CDN en el código.
5. **Nunca** se bloquea el registro de un gasto por exceder el límite: solo se alerta (REQ-021, REQ-022).
6. **Nunca** se pierde el viaje activo sin confirmación explícita: editar nombre/fechas con itinerario o gastos asociados pide confirmación (REQ-008) y advierte sobre elementos fuera del nuevo rango sin eliminarlos (REQ-009).
7. El estado persistido corrupto **nunca** bloquea el arranque: se inicia vacío con aviso (REQ-041).
8. **Un solo viaje activo** a la vez; se rechazan fechas que se traslapen con otro viaje registrado.

## 6. Convenciones de código

- JS modular en `src/js/`: `app.js` (orquestador), `storage.js` (persistencia), `validations.js` (validación en vivo), `calculations.js` (derivados RN-01..04), `ui.js` (render).
- CSS puro a mano en `src/css/styles.css`. Prohibido Tailwind, Bootstrap, CDNs o cualquier dependencia.
- El estado completo (`trip`, `budgets`, `expenses`, `itinerary`) se persiste en `localStorage` en **cada** mutación y se restaura al iniciar (REQ-039, REQ-040).
- Los valores derivados (`totalDays`, `foodDailyLimit`, acumulados, disponibles) **nunca** se persisten: se recalculan en cada render/mutación.
- Validar contra `docs/data-contract.json` antes de persistir cualquier estado nuevo.
- Nombres de campos del código = nombres del schema (`camelCase`).

## 7. Estructura del repositorio

```text
/
├── CLAUDE.md                      ← este archivo (memoria semántica)
├── docs/
│   ├── requirements.md            ← 46 requerimientos EARS (fuente de verdad)
│   ├── data-contract.json         ← JSON Schema TravelAssistantState
│   ├── wireframe.md               ← boceto de interfaz por componentes
│   ├── Descripción layout por componentes_Jose_Fallas.excalidraw
│   └── design.md                  ← ENTREGABLE PRINCIPAL: diseño y arquitectura
├── retrospective.md               ← historial de correcciones y reflexión
└── README.md                      ← resumen y comandos de ejecución
```

## 8. Notas de entorno (máquina del estudiante)

- **No hay Python ni Node.js** instalados; todo debe funcionar abriendo el HTML directamente en el navegador (file://) — coherente con REQ-038.
- Git CLI no está en el PATH de PowerShell: usar `"C:\Program Files\Git\cmd\git.exe"`.
