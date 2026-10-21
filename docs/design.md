# Documento de Diseño y Arquitectura — NomadPulse Travel Assistant

> **ENTREGABLE PRINCIPAL (Semana 2)** — concentra el diseño de dominio, las reglas de negocio
> y las decisiones de arquitectura. Los artefactos complementarios son:
> [`requirements.md`](./requirements.md) (especificación EARS), [`data-contract.json`](./data-contract.json)
> (contrato de datos), [`wireframe.md`](./wireframe.md) + excalidraw (interfaz) y
> [`../retrospective.md`](../retrospective.md) (reflexión).

**Curso:** Programación Intencional con IA Generativa
**Estudiante:** José Fallas — jfallash@ucenfotec.ac.cr
**Aplicación:** Viajero — Asistente Personal de Viaje & Presupuesto
**Fecha:** Octubre 2026

---

## 1. Visión general y stack

| Aspecto | Decisión |
|---|---|
| Aplicación | App de viajes: presupuesto de comida con alertas visuales, itinerario, conversión de actividades a gastos |
| Stack | HTML + CSS puro (sin frameworks ni CDN) + JavaScript vanilla modular (`js/`) |
| Persistencia | `localStorage` del navegador — 100% offline, sin servidor (REQ-038) |
| Metodología | Especificación EARS + diseño dirigido por intención |
| Modelo de viaje | **Un viaje activo a la vez**; se rechazan fechas que se traslapen con otro viaje existente |

## 2. Contexto de la Entrevista al Cliente (Cierre de la Brecha de Intención)

Como Arquitectos de Software, entrevistamos al Cliente (rol asumido por el profesor) para explorar los vacíos del requerimiento inicial ("quiero ver mi itinerario, ingresar mi presupuesto para varias categorías y ver cuánto me queda en comida cada día"). El objetivo fue transformar intenciones ambiguas en especificaciones técnicas formales y reglas de negocio ejecutables.

| # | Pregunta formulada al Cliente | Respuesta / Clarificación del Cliente | Impacto en la Arquitectura |
|---|---|---|---|
| Q1 | ¿Cómo se estructura y distribuye el presupuesto total del viaje? | El viaje tiene un presupuesto global dividido en categorías: Hospedaje, Tiquetes/Transporte, Actividades/Tours, Compras, Imprevistos y Comida. | Se modela una entidad `GlobalBudget` con categorías independientes, permitiendo edición de montos y seguimiento por rubro. |
| Q2 | ¿El presupuesto de comida se consume como una bolsa fija o tiene tratamiento diario? | Tratamiento Diario Dinámico: a diferencia de hospedaje (que es un pago fijo o por estadía), la comida debe distribuirse uniformemente por día. Se debe dividir el total de comida entre los días totales del viaje. | Se calcula dinámicamente `foodDailyLimit = foodTotal / totalDays`. Conforme transcurren los días y se ingresan transacciones, se recalcula el saldo restante diario y acumulado. |
| Q3 | ¿Qué sucede si el usuario se excede del límite de comida de un día específico? | La aplicación no debe bloquear el registro (el viajero necesita comer), pero debe disparar una alerta visual explícita (cambio a color rojo/alerta, indicando monto negativo o sobregiro). | Se implementa estado de advertencia (warning / exceeded) en la barra de progreso diaria y en la tarjeta de saldo. |
| Q4 | ¿Cómo debe persistir la información si el viajero viaja con conectividad intermitente? | Todos los datos (itinerario, presupuesto, configuración y transacciones de gastos) deben persistir localmente en el navegador (LocalStorage) sin depender de un servidor externo para no perder datos al refrescar. | Se diseña capa de persistencia reactiva en LocalStorage con sincronización automática en cada mutación de estado. |
| Q5 | ¿Cuáles son las reglas de validación en los formularios de gasto? | No se permiten montos negativos o cero, no se permiten gastos sin fecha válida, y la categoría es obligatoria. Además, el usuario debe poder clasificar las comidas por ocasión (desayuno, almuerzo, cena, café/snack). | Validaciones en vivo en el cliente con feedback visual en el formulario antes de confirmar la transacción. |
| Q6 | ¿Cómo se vincula el itinerario con los gastos? | El itinerario cuenta con costo estimado por actividad. Si el usuario completa una actividad, debe existir la posibilidad de convertirla en un gasto registrado con un clic. | Se integra un atajo directo entre `ItineraryItem` y `ExpenseModal`. |

## 3. Reglas de Negocio Formalizadas

1. **RN-01 (Cálculo de Días del Viaje):**
   `totalDays = (endDate - startDate) + 1`
   El cálculo es inclusivo: cuenta el día de inicio y el día de fin. Si inicio y fin son iguales, el viaje tiene 1 día. *(REQ-004, REQ-005)*

2. **RN-02 (Meta Diaria Recomendada de Comida):**
   `foodDailyLimit = foodTotal / totalDays`
   Se recalcula automáticamente si cambia el presupuesto de comida o las fechas del viaje. *(REQ-019, REQ-032)*

3. **RN-03 (Saldo Restante Diario de Comida para una fecha):**
   `Disponible(fecha) = foodDailyLimit - Σ(monto de gastos de categoría 'comida' en esa fecha)` *(REQ-020)*

4. **RN-04 (Estado de Alerta de Presupuesto Diario):**
   `% Gastado del día = (Acumulado del día / foodDailyLimit) × 100`
   - Si `% Gastado ≤ 80%` → **Normal (Verde / Emerald)**
   - Si `80% < % Gastado ≤ 100%` → **Precaución (Ámbar)**
   - Si `% Gastado > 100%` → **Excedido (Rojo / Alerta Visual Explícita)**
   El estado modifica el color de la barra de progreso diaria y de la tarjeta de saldo, pero nunca bloquea el registro del gasto (Q3 / REQ-021, REQ-022).

5. **RN-05 (Validaciones de Borde):**
   - `amount > 0`: se rechazan montos en cero, negativos o no numéricos (NaN). *(REQ-025, REQ-028)*
   - `date` debe tener formato ISO `YYYY-MM-DD`; no se aceptan fechas vacías. *(REQ-025, REQ-030)*
   - `category` es obligatoria y debe pertenecer a `['comida', 'hospedaje', 'transporte', 'actividades', 'compras', 'imprevistos']`.
   - Si `category == 'comida'`, entonces `mealType` es obligatorio y debe pertenecer a `['desayuno', 'almuerzo', 'cena', 'snack_cafe', 'bebidas_bar']`. *(REQ-029)*
   - Los datos se persisten localmente (LocalStorage) en cada mutación de estado (RN-Q4 / REQ-039).

## 4. Modelo de Datos

El contrato estricto vive en [`data-contract.json`](./data-contract.json) (JSON Schema 2020-12, título `TravelAssistantState`). Resumen del modelo:

```text
TravelAssistantState
├── trip       { id, name, destination, startDate, endDate }      ← UN viaje activo
├── budgets    [ { category, allocated } ]                        ← asignado por categoría
├── expenses   [ { id, category, amount, description, date,
│                  time?, mealType?, paymentMethod, location?,
│                  notes?, createdAt } ]                          ← mealType obligatorio si category == comida
└── itinerary  [ { id, dayNumber, date, time, title, location,
                   category, notes?, estimatedCost?, status } ]   ← status: pendiente | en_progreso | completado
```

**Notas de diseño del modelo:**

- El enum de categorías está definido **una sola vez** en `$defs.categoria` y se reutiliza en `budgets`, `expenses` e `itinerary` (evita duplicación y garantiza consistencia).
- `expenses.items` incluye la validación condicional de RN-05: si `category == "comida"`, el campo `mealType` pasa a ser obligatorio.
- `allocated` y `amount` usan `exclusiveMinimum: 0` (RN-05: no se permiten montos en cero).
- `date` exige formato ISO estricto (`format: date` + `pattern`); `time` exige `HH:MM`.
- `estimatedCost` permite `0` para actividades sin costo (que no podrán convertirse en gasto).
- **Campos derivados, no persistidos:** `totalDays` y `foodDailyLimit` se recalculan en tiempo de ejecución a partir de `trip.startDate`, `trip.endDate` y `budgets` (RN-01, RN-02). El ejemplo de la guía los incluía dentro de `trip`; el modelo evita la redundancia.

## 5. Arquitectura de la Aplicación

### 5.1. Organización del código (JS modular)

```text
src/
├── index.html          ← punto de entrada
├── css/styles.css      ← CSS puro, escrito a mano (REQ-038: sin CDNs)
└── js/
    ├── app.js          ← orquestador: arranque, wiring de eventos, flujo principal
    ├── storage.js      ← capa de persistencia: leer/escribir/validar estado en localStorage
    ├── validations.js  ← reglas de validación en vivo (RN-05, REQ-025..REQ-031)
    ├── calculations.js ← derivados: totalDays, foodDailyLimit, acumulados, disponibles (RN-01..RN-04)
    └── ui.js           ← render: dashboard, tarjeta hero, barras, itinerario, historial
```

### 5.2. Flujo de datos

```text
UI (evento del usuario)
  → validations.js (valida; si falla, error EN VIVO, sin mutar estado)
  → mutations de estado (app.js)
  → calculations.js recalcula derivados
  → storage.js persiste el estado COMPLETO en localStorage   ← REQ-039
  → ui.js re-renderiza
```

- **Restauración al inicio (REQ-040):** `app.js` intenta leer `localStorage`; si el JSON está corrupto, inicia con estado vacío y muestra un aviso sin bloquear la app (REQ-041).
- **Recálculo reactivo (REQ-032, REQ-033):** editar fechas o presupuestos, o eliminar gastos, dispara el mismo pipeline completo: nunca se persisten valores derivados obsoletos.

### 5.3. Decisiones de integración

- **Conversión actividad → gasto (REQ-043..REQ-046):** el botón **[Convertir a gasto]** solo aparece en actividades con `estimatedCost > 0`; el gasto resultante enlaza con la actividad de origen y la marca como `converted`; una actividad ya convertida no se puede convertir dos veces.
- **Bloqueos por contexto (REQ-042):** sin viaje activo, registrar/editar/convertir gastos o actividades se rechaza y se solicita crear o seleccionar el viaje.
- **Gastos fijos previos (REQ-010..REQ-014):** los gastos marcados `fixed` cuentan en el Total Gastado global pero **no** consumen el límite diario de comida.

## 6. Interfaz de Usuario

El diseño de interfaz está especificado en [`wireframe.md`](./wireframe.md) (boceto ASCII por componentes) con su versión gráfica editable en [`Descripción layout por componentes_Jose_Fallas.excalidraw`](./Descripción%20layout%20por%20componentes_Jose_Fallas.excalidraw). Estructura de tres paneles:

1. **Dashboard Global** — desglose por categorías (asignado/gastado) + barra del presupuesto total.
2. **Enfoque Diario de Comida** — registro en 1 clic, Tarjeta Hero del día (meta/gastado/disponible/status), selector de día y formulario de ingreso rápido con validación en vivo.
3. **Detalle Operativo** — itinerario del día con [Convertir a gasto] + historial de gastos del día agrupado por fechas.
