# NomadPulse Travel Assistant ("Viajero")

Asistente personal de viaje con control de presupuesto por categorías, alertas visuales de límite diario de comida, itinerario y conversión de actividades a gastos. **100% offline**: los datos viven en el `localStorage` del navegador, sin servidores ni conexión a internet.

Proyecto del curso **Programación Intencional con IA Generativa** — José Fallas (jfallash@ucenfotec.ac.cr).

## Estructura del proyecto

```text
/
├── CLAUDE.md              # Memoria semántica: reglas de negocio, lenguaje ubicuo e invariantes
├── docs/
│   ├── requirements.md    # Especificación formal — 46 requerimientos en sintaxis EARS (REQ-001..REQ-046)
│   ├── data-contract.json # Contrato de datos: JSON Schema 2020-12 (TravelAssistantState)
│   ├── wireframe.md       # Boceto de interfaz por componentes (+ .excalidraw editable)
│   └── design.md          # ENTREGABLE PRINCIPAL: diseño y arquitectura (reglas RN-01..RN-05)
├── retrospective.md       # Historial de correcciones y reflexión sobre especificación intencional
└── README.md              # Este archivo
```

## Cómo ejecutarla

Sin dependencias, sin build, sin servidor:

1. Clonar el repositorio.
2. Abrir `src/index.html` en cualquier navegador moderno *(la implementación aún no ha comenzado; el código fuente se construirá módulo por módulo)*.

## Stack

- **HTML + CSS puro** (escrito a mano — sin frameworks, librerías ni CDN).
- **JavaScript vanilla modular** (`js/app.js`, `js/storage.js`, `js/validations.js`, `js/calculations.js`, `js/ui.js`).
- **Persistencia** en `localStorage` con restauración automática al iniciar y manejo de estado corrupto.

## Requerimientos

La especificación completa está en [`docs/requirements.md`](docs/requirements.md) (sintaxis EARS). Resumen por categoría:

| Categoría | Requerimientos |
|-----------|----------------|
| Gestión de viajes y presupuesto global | REQ-001 – REQ-009 |
| Gastos fijos previos (pre-pagos) | REQ-010 – REQ-014 |
| Gestión de categorías | REQ-015 – REQ-018 |
| Presupuestos y comida (límite diario y alertas) | REQ-019 – REQ-024 |
| Validaciones de borde y transacciones | REQ-025 – REQ-033 |
| Restricciones del cliente (comportamiento que no cambia) | REQ-034 – REQ-038 |
| Persistencia local | REQ-039 – REQ-041 |
| Diseño e integración (conversión actividad → gasto) | REQ-042 – REQ-046 |

## Reglas de negocio clave

- `totalDays = (endDate − startDate) + 1` — cálculo inclusivo de días (RN-01).
- `foodDailyLimit = foodTotal / totalDays` — la comida se distribuye uniformemente por día (RN-02).
- `Disponible(día) = foodDailyLimit − acumulado del día`; estados Verde ≤80%, Ámbar ≤100%, Rojo >100% (RN-03, RN-04). **La alerta nunca bloquea registrar un gasto.**
- Montos > 0, fechas ISO `YYYY-MM-DD`, categoría obligatoria y `mealType` obligatorio si la categoría es `comida` (RN-05).

Detalles y trazabilidad en [`docs/design.md`](docs/design.md).
