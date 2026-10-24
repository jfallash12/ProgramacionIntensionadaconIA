# Retrospectiva — NomadPulse Travel Assistant

> Análisis y reflexiones sobre el proceso de especificación intencional y las correcciones
> aplicadas tras la retroalimentación. Complementa a [`docs/requirements.md`](docs/requirements.md)
> y [`docs/design.md`](docs/design.md).

## 1. Historial de Correcciones (vs. entrega original del Lab 2)

| # | Corrección | Motivo |
|---|---|---|
| 1 | Formulario de ingreso: campos **Fecha, Monto, Descripción** (antes: Monto, Tipo, Lugar, Pago) | Paso 3 del lab exige Fecha, Monto y Descripción con validación en vivo |
| 2 | Se quitó **Equipaje** de la navegación | No está en ninguna regla de negocio de la entrevista ni en los puntos obligatorios del lab |
| 3 | Se agregó **[Convertir a gasto]** al itinerario (y se omite en actividades sin costo) | Regla Q6 de la minuta, no estaba diagramada |
| 4 | Categorías del dashboard alineadas al modelo: **Compras** e **Imprevistos** (antes: "Otros") | Consistencia entre wireframe, minuta y schema |
| 5 | Cifras corregidas: gastado de Transporte $140 → $100 | La suma de gastados por categoría ahora da $612 = Gastado Total |
| 6 | RN-01 a RN-05 escritas como **texto** (antes: ecuaciones como imagen) | Las imágenes no son buscables ni copiables; el texto sí |
| 7 | Schema: `mealType` **obligatorio si category = comida** (`if/then`) | RN-05 no estaba impuesta en el modelo |
| 8 | Schema: `allocated` con `exclusiveMinimum: 0` (antes `minimum: 0`) | RN-05 / Q5: no se permiten montos en cero |
| 9 | Schema: enum de categorías unificado en `$defs` (antes duplicado en budgets y expenses) | Un solo punto de mantenimiento; consistencia estricta |
| 10 | Schema: se eliminaron `currency`, `currencyCode`, `coverEmoji` y `notes` del viaje | Campos no respaldados por la entrevista ni el lab |
| 11 | Se documentó que `totalDays` y `foodDailyLimit` son **derivados, no persistidos** | El ejemplo de la guía los incluye dentro de `trip`; el modelo evita la redundancia |
| 12 | `itinerary.category` ahora usa el mismo enum que gastos y presupuestos | Consistencia del modelo (antes era string libre) |

### 1.1. Correcciones de la versión 2 (auditoría de consistencia)

| # | Corrección | Motivo |
|---|---|---|
| 13 | Límite diario también para **transporte** (REQ-019..022 generalizados, tarjeta en el wireframe) | La guía S1L2 indica que "las comidas y el transporte se calculan por día" |
| 14 | Categorías **personalizables**: colección `categories` con `categoryId`; comida y transporte protegidas (REQ-048/049) | REQ-015..018 permitían editar categorías, pero el schema usaba un enum fijo |
| 15 | Presupuesto Total = Σ categorías; se eliminan REQ-007 y REQ-024 | "Presupuesto sin asignar" era imposible si el global es la suma |
| 16 | Gastos fijos: campo `isFixed`, exentos del rango de fechas (REQ-047) | REQ-010..014 no tenían campo en el schema; las compras anticipadas son anteriores al viaje |
| 17 | Conversión solo en actividades `completado`; enlace `convertedExpenseId` ↔ `linkedActivityId` | El estado `converted` no existía en el schema y el wireframe mostraba el botón en una actividad en progreso |
| 18 | REQ-046 "ocultar" en vez de "deshabilitar" el botón de conversión | Contradicción entre el REQ y el wireframe |
| 19 | Nuevo **Total del Día** de todas las categorías (REQ-053) | Clarificación: calcular al final del día cuánto se gastó en total |
| 20 | Un solo viaje (REQ-062/063); se elimina el invariante de "traslape" | El invariante suponía varios viajes y no tenía REQ |
| 21 | Nuevos casos de borde: editar gasto (REQ-057), borrar gasto/actividad enlazados (REQ-058/059), redondeo (REQ-050), sin presupuesto (REQ-052), día actual fuera del viaje (REQ-054), sobregiro global (REQ-051), categoría obligatoria (REQ-055) | Vacíos detectados en la auditoría (Ronda 1 del S2L2) |
| 22 | Schema estricto: `additionalProperties: false`, `trip: null`, `schemaVersion`, regex de hora/fecha, textos no vacíos, `mealType` prohibido fuera de comida, `examples` | El validador aceptaba campos inventados, `99:99`, descripciones de solo espacios y rechazaba el estado vacío |
| 23 | Se eliminan `dayNumber`, `paymentMethod`, `location` y `notes` del gasto | Derivable o sin respaldo en la entrevista/formulario |
| 24 | Wireframe v2: barras reales, leyenda, variante Excedido, formulario con errores en vivo, historial agrupado por fecha, estados especiales; exportado a PNG | El original solo mostraba el caso feliz, tenía un `<br>` literal y no se veía en GitHub |
| 25 | Porcentaje del día 63 % → **64 %** (44.50 / 70 = 63.57 %) | Regla de redondeo explícita (REQ-050) |
| 26 | Nuevos REQ-064 (fallo al guardar en LocalStorage) y REQ-065 (máximo 2 decimales) | Vacíos detectados al pasar a diseño (S3L1, `design.md` §6) |
| 27 | `design.md` v3: componentes, módulos, estado, 6 diagramas Mermaid y mapeo de los 63 REQ | Requisitos de la guía S3L1 |

## 2. Reflexión sobre la Especificación Intencional

> **¿Qué tan diferente fue pedirle a la IA que redacte y ajuste las reglas del juego en lugar de pedirle directamente que escriba el código? ¿Sientes que ahora tienes más control sobre lo que la IA va a programar a continuación?**

Redactar y ajustar las reglas del juego mediante especificaciones formales y sintaxis EARS cambia por completo la dinámica de desarrollo. En lugar de obtener código genérico o propenso a errores lógicos derivados de ambigüedades, definir contratos de software estrictos permite guiar a la inteligencia artificial con precisión matemática y restricciones de negocio claras. Esto otorga un control significativamente mayor sobre el flujo del sistema, ya que la IA pasa de "adivinar" el comportamiento deseado a ejecutar fielmente una arquitectura validada.

La retroalimentación sobre la primera versión evidenció una lección clave: una especificación corta es una especificación incompleta. Al ampliarla, no solo se agregaron más requerimientos, sino que se cubrieron dimensiones que antes eran invisibles: los gastos fijos previos y su efecto en el presupuesto global, las restricciones explícitas de "comportamiento que no debe cambiar" (como la no generación automática de itinerarios) y los casos de borde derivados de operaciones destructivas o ambiguas (editar fechas con actividades asociadas, eliminar categorías con gastos activos, campos vacíos). Documentar explícitamente lo que el sistema **no** debe hacer resultó tan importante como documentar lo que debe hacer, porque elimina suposiciones que la IA tendería a rellenar por su cuenta.

## 3. Reflexión S3L1 — Diseño Técnico e Inyección de Memoria Semántica

> ✏️ **BORRADOR para editar:** ajuste cada respuesta con su experiencia real (herramienta usada, qué propuso la IA y qué cambió usted) antes de entregar.

**1. Paso de Requerimientos a Diseño — ¿Qué decisiones técnicas tuvo que tomar la IA que no estaban escritas en `requirements.md`?**

Los requerimientos dicen *qué* debe pasar, pero no *cómo*. Al pasar a diseño aparecieron decisiones que ningún REQ resolvía (documentadas en `design.md` §6):

- **Manejo de estado:** un único objeto `state` en memoria y una función `dispatch(action)` como único camino para mutarlo. El estado de interfaz (`ui`: pestaña activa, día seleccionado, borradores, errores) queda separado y no se persiste.
- **División de componentes:** el wireframe se convirtió en unos 20 componentes de render con responsabilidades y acciones explícitas.
- **Carga de scripts:** los requerimientos piden abrir la app sin servidor, pero los ES Modules no funcionan en `file://`. Por eso se usan scripts clásicos con un espacio de nombres `window.Viajero`.
- **Fechas y zona horaria:** en Costa Rica (UTC−6), `new Date('2026-10-10')` muestra el 9 de octubre. Se decidió calcular con `Date.UTC` y tomar "HOY" de la fecha local.
- **Dinero:** sumar en centavos para evitar errores de punto flotante.
- **Seguridad:** construir el DOM con `textContent` para que una descripción con HTML no se ejecute, y usar una CSP que bloquee la red (hace verificable REQ-038).
- **Vacíos encontrados:** no había REQ para el fallo al guardar en `localStorage` (cuota o modo privado) ni para el máximo de decimales del monto. Se agregaron como REQ-064 y REQ-065.

**2. Memoria Semántica — ¿Cómo afectó tener `CLAUDE.md` a la hora de que la IA propusiera los nombres de funciones y componentes?**

Con el glosario y las entidades (`Trip`, `GlobalBudget`, `DailyFoodLimit`, `Expense`) ya definidos, la IA reutilizó esos nombres en lugar de inventar sinónimos. Por ejemplo, propuso `calc.globalBudget()` y `calc.dailyLimit(state, 'cat-comida')` en vez de nombres genéricos como `getTotals()`. Los invariantes (nunca bloquear un gasto por exceder el límite, nunca generar itinerarios, sin red) aparecieron como reglas explícitas del diseño: `validateExpense` no consulta límites, no existe ninguna función generadora de itinerarios y hay una CSP. Sin la memoria semántica, la IA tendió a mezclar español e inglés y a nombrar los campos de forma distinta al contrato (`category` vs `categoryId`). Por eso se agregó a `CLAUDE.md` una tabla "entidad → nombre en el código".

**3. Poda Arquitectónica — ¿Tuviste que simplificar alguna propuesta sobreestructurada de la IA?**

Sí. Se descartaron React y Redux (un solo usuario y un solo viaje no justifican un store), un backend con base de datos (viola REQ-038), IndexedDB/Service Workers, y Ajv para validar el JSON Schema (es una dependencia). También se reemplazaron los ES Modules por scripts clásicos. Queda una arquitectura de 5 archivos JS sin dependencias, con un solo flujo de datos (`dispatch` → validar → reducer → guardar → render) que se puede explicar en un diagrama (`design.md` §5.4).

## 4. Lecciones del proceso de corrección

- **Consistencia entre artefactos:** la mayoría de las correcciones (4, 5, 12) no eran errores de lógica sino de *desalineación* entre minuta, wireframe y schema. Mantener una sola fuente de verdad por concepto (categorías en `data-contract.json`, RNs y arquitectura en `docs/design.md`, nombres en `CLAUDE.md`) previene esta clase de defectos.
- **Los requisitos del curso mandan sobre el diseño inicial:** campos que parecían razonables (`currency`, `coverEmoji`, módulo de Equipaje) se eliminaron porque ningún requerimiento ni regla de negocio los respaldaba. Lo que no está especificado, no existe.
- **Validar cifras de ejemplos:** los datos de muestra del wireframe deben sumar exactamente (612 = total gastado); una suma inconsistente invalida la credibilidad de todo el documento.
