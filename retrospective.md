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

## 2. Reflexión sobre la Especificación Intencional

> **¿Qué tan diferente fue pedirle a la IA que redacte y ajuste las reglas del juego en lugar de pedirle directamente que escriba el código? ¿Sientes que ahora tienes más control sobre lo que la IA va a programar a continuación?**

Redactar y ajustar las reglas del juego mediante especificaciones formales y sintaxis EARS cambia por completo la dinámica de desarrollo. En lugar de obtener código genérico o propenso a errores lógicos derivados de ambigüedades, definir contratos de software estrictos permite guiar a la inteligencia artificial con precisión matemática y restricciones de negocio claras. Esto otorga un control significativamente mayor sobre el flujo del sistema, ya que la IA pasa de "adivinar" el comportamiento deseado a ejecutar fielmente una arquitectura validada.

La retroalimentación sobre la primera versión evidenció una lección clave: una especificación corta es una especificación incompleta. Al ampliarla, no solo se agregaron más requerimientos, sino que se cubrieron dimensiones que antes eran invisibles: los gastos fijos previos y su efecto en el presupuesto global, las restricciones explícitas de "comportamiento que no debe cambiar" (como la no generación automática de itinerarios) y los casos de borde derivados de operaciones destructivas o ambiguas (editar fechas con actividades asociadas, eliminar categorías con gastos activos, campos vacíos). Documentar explícitamente lo que el sistema **no** debe hacer resultó tan importante como documentar lo que debe hacer, porque elimina suposiciones que la IA tendería a rellenar por su cuenta.

## 3. Lecciones del proceso de corrección

- **Consistencia entre artefactos:** la mayoría de las correcciones (4, 5, 12) no eran errores de lógica sino de *desalineación* entre minuta, wireframe y schema. Mantener una sola fuente de verdad por concepto (categorías en `$defs`, RNs en `docs/design.md`) previene esta clase de defectos.
- **Los requisitos del curso mandan sobre el diseño inicial:** campos que parecían razonables (`currency`, `coverEmoji`, módulo de Equipaje) se eliminaron porque ningún requerimiento ni regla de negocio los respaldaba. Lo que no está especificado, no existe.
- **Validar cifras de ejemplos:** los datos de muestra del wireframe deben sumar exactamente (612 = total gastado); una suma inconsistente invalida la credibilidad de todo el documento.
