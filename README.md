# NomadPulse Travel Assistant ("Viajero")

Asistente personal de viaje con presupuesto por categorías personalizables, límites diarios de **comida y transporte** con alertas visuales, Total del Día, itinerario y conversión de actividades a gastos. **100% offline**: los datos viven en el `localStorage` del navegador, sin servidores ni conexión a internet.

Proyecto del curso **Programación Intencional con IA Generativa** — José Fallas (jfallash@ucenfotec.ac.cr).

## Estructura del proyecto

```text
/
├── CLAUDE.md                # Memoria semántica: reglas de negocio, lenguaje ubicuo e invariantes
├── docs/
│   ├── requirements.md      # Especificación EARS v2 — 63 requerimientos vigentes (REQ-001..REQ-065)
│   ├── data-contract.json   # Contrato de datos: JSON Schema 2020-12 (TravelAssistantState, schemaVersion 2)
│   ├── wireframe.md         # Boceto de interfaz por componentes
│   ├── wireframe.excalidraw # Wireframe editable (abrir en excalidraw.com)
│   ├── wireframe.png        # Wireframe exportado (visible en GitHub)
│   └── design.md            # ENTREGABLE PRINCIPAL: diseño y arquitectura (RN-01..RN-07)
├── tasks.md                 # Plan de implementación por fases, ejecutado y verificado (T-00..T-32)
├── src/                     # Código fuente de la aplicación
│   ├── index.html           # Punto de entrada (abrir con doble clic)
│   ├── css/styles.css       # CSS puro
│   └── js/                  # calculations, validations, storage, ui, app (scripts clásicos)
├── REFLECTION.md            # Autoevaluación de alineación del Proyecto Final
├── retrospective.md         # Historial de correcciones y reflexiones (S2L2, S3L1, S3L2)
└── README.md                # Este archivo
```

## Documentación (flujo Spec Driven Development)

| Orden | Documento | Lab | Para qué sirve |
|---|---|---|---|
| 1 | [`docs/wireframe.md`](docs/wireframe.md) + [`wireframe.png`](docs/wireframe.png) | S1L2 | Qué ve el usuario |
| 2 | [`docs/requirements.md`](docs/requirements.md) | S2L2 | Qué debe hacer el sistema (EARS) |
| 3 | [`docs/data-contract.json`](docs/data-contract.json) | S1L2 / S2L2 | Forma exacta de los datos |
| 4 | [`CLAUDE.md`](CLAUDE.md) | S3L1 | Memoria semántica para la IA |
| 5 | [`docs/design.md`](docs/design.md) | S3L1 | Cómo se construye: componentes, módulos, estado, diagramas y mapeo REQ → función |
| 6 | [`tasks.md`](tasks.md) | S3L2 | Plan paso a paso: fases, criterios de aceptación, pruebas de regresión y matriz REQ → tarea |
| 7 | [`src/`](src/) | Proyecto final | La aplicación |
| 8 | [`REFLECTION.md`](REFLECTION.md) | Proyecto final | Autoevaluación: Visión vs. Realidad |
| 9 | [`retrospective.md`](retrospective.md) | todos | Correcciones y reflexiones |

## Cómo ejecutarla

Sin dependencias, sin build, sin servidor y sin internet:

1. Clonar o descargar el repositorio.
2. Abrir `src/index.html` con doble clic en Chrome, Edge o Firefox.

Los datos se guardan en el `localStorage` del navegador (clave `viajero.state`).

**Cargar datos de prueba (opcional):** abra la consola del navegador (F12), pegue la línea siguiente sustituyendo `<ejemplo>` por `examples[1]` de [`docs/data-contract.json`](docs/data-contract.json), y recargue con F5:

```js
localStorage.setItem('viajero.state', JSON.stringify(<ejemplo>));
```

Para empezar de cero: `localStorage.removeItem('viajero.state')` y F5.

## Demostración (auditoría del cliente)

Con los datos de prueba, seleccione el **Día 2** en el Control Diario:

1. **Persistencia:** registre un gasto y presione **F5** → los datos y los totales siguen ahí.
2. **Restricción semántica:** escriba **−5** en Monto → error en rojo al instante, Guardar deshabilitado, nada se guarda.
3. **Lógica dinámica:** en Comida (límite $70.00, acumulado $44.50) registre $10.00, luego $5.00 y luego $20.00 → disponible +$15.50 (78 % Verde), +$10.50 (85 % Ámbar), −$9.50 (114 % Rojo); el gasto se registra aunque exceda el límite.

## Cumplimiento del Proyecto Final

| Requisito | Dónde se cumple |
|---|---|
| 2 o más entidades relacionadas | `Trip`, `Category`, `Expense` (→ `categoryId`) e `ItineraryItem` (↔ `Expense` con `convertedExpenseId` / `linkedActivityId`) — [`docs/data-contract.json`](docs/data-contract.json) |
| Persistencia real | `localStorage` en cada cambio, restauración al iniciar y manejo de datos dañados — `src/js/storage.js` (REQ-039..041, REQ-064) |
| 3 o más reglas de negocio complejas en EARS | 63 REQ en [`docs/requirements.md`](docs/requirements.md); por ejemplo REQ-020 (Disponible Hoy), REQ-016 (reasignar al eliminar categoría), REQ-043 (convertir actividad completada) |
| Archivo de reglas de contexto | [`CLAUDE.md`](CLAUDE.md) §10: restringe el stack, fija convenciones y prohíbe parches fuera de la especificación |
| Casos de borde con retroalimentación visual | Vacíos, negativos, no numéricos, más de 2 decimales, duplicados, fechas fuera de rango, segundo viaje, doble conversión — errores en vivo y avisos |
| Unchanged Behavior | Protocolo en [`tasks.md`](tasks.md) y pruebas de regresión R1–R5 |
| Autoevaluación | [`REFLECTION.md`](REFLECTION.md) |

## Stack

- **HTML + CSS puro** (escrito a mano — sin frameworks, librerías ni CDN).
- **JavaScript vanilla** en scripts clásicos (`src/js/calculations.js`, `validations.js`, `storage.js`, `ui.js`, `app.js`) bajo el espacio de nombres `window.Viajero`.
- **Persistencia** en `localStorage` con restauración automática al iniciar y manejo de estado corrupto.

## Requerimientos

La especificación completa está en [`docs/requirements.md`](docs/requirements.md) (sintaxis EARS). Resumen por categoría:

| Categoría | Requerimientos |
|-----------|----------------|
| Gestión de viajes y presupuesto global | REQ-001 – REQ-009 (REQ-007 eliminado), REQ-062, REQ-063 |
| Gastos fijos previos (pre-pagos) | REQ-010 – REQ-014, REQ-047 |
| Gestión de categorías | REQ-015 – REQ-018, REQ-048, REQ-049 |
| Presupuestos diarios (comida y transporte) | REQ-019 – REQ-023 (REQ-024 eliminado), REQ-050 – REQ-054 |
| Validaciones de borde y transacciones | REQ-025 – REQ-033, REQ-055 – REQ-059, REQ-065 |
| Restricciones del cliente (comportamiento que no cambia) | REQ-034 – REQ-038, REQ-060 |
| Persistencia local | REQ-039 – REQ-041, REQ-064 |
| Diseño e integración (conversión actividad → gasto) | REQ-042 – REQ-046, REQ-061 |

## Reglas de negocio clave

- `totalDays = (endDate − startDate) + 1` — cálculo inclusivo de días (RN-01).
- `dailyLimit = allocated / totalDays` para comida y transporte (RN-02).
- `Disponible Hoy = dailyLimit − acumulado del día`; estados Verde ≤80%, Ámbar ≤100%, Rojo >100% (RN-03, RN-04). **La alerta nunca bloquea registrar un gasto.**
- Montos > 0, fechas ISO `YYYY-MM-DD`, categoría obligatoria, `mealType` si y solo si la categoría es comida; los gastos fijos pueden ser anteriores al viaje (RN-05).
- `Presupuesto Total = Σ asignados por categoría` (RN-06) · `Total del Día = Σ gastos variables del día` (RN-07).

Detalles y trazabilidad en [`docs/design.md`](docs/design.md).
