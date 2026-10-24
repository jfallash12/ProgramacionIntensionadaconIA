# Especificación de Requerimientos: NomadPulse Travel Assistant

> **Metodología:** Sintaxis EARS (Easy Approach to Requirements Syntax).
> Patrón general: `WHEN <disparador>, IF <condición>, THEN the system SHALL <respuesta>`.
> El comportamiento esperado se expresa con `SHALL` (obligatorio) y el comportamiento que **no debe cambiar** se expresa con `SHALL NOT`.
>
> **Versión 2.** Los identificadores REQ son estables: un requerimiento eliminado conserva su número marcado como *Eliminado* y los nuevos se agregan desde REQ-047. Vigentes: 63 (REQ-001..REQ-065, excepto REQ-007 y REQ-024).
> **Contrato de datos:** [`data-contract.json`](./data-contract.json) (schemaVersion 2). **Reglas de negocio:** RN-01..RN-07 en [`design.md`](./design.md).

**Definiciones usadas en esta especificación**

- **Categoría diaria:** `comida` y `transporte`. Su presupuesto se distribuye uniformemente entre los días del viaje.
- **Gasto variable:** gasto con `isFixed = false`. **Gasto fijo:** pre-pago con `isFixed = true`.
- **Acumulado del Día (categoría, fecha):** suma de los gastos *variables* de esa categoría con esa fecha.
- **Redondeo:** ver REQ-050.

---

## 1. Gestión de Viajes y Presupuesto Global

* **REQ-001**: WHEN el usuario crea un nuevo viaje, THEN the system SHALL solicitar un nombre de viaje, un destino, una fecha de inicio y una fecha de fin.

* **REQ-002**: WHEN el usuario crea o edita un viaje, IF el nombre o el destino están vacíos (o contienen solo espacios), o la fecha de inicio o la fecha de fin están vacías, THEN the system SHALL rechazar la operación y mostrar un mensaje de error en vivo.

* **REQ-003**: WHEN el usuario crea o edita un viaje, IF la fecha de fin es anterior a la fecha de inicio, THEN the system SHALL rechazar la operación y mostrar un mensaje de error en vivo.

* **REQ-004**: WHEN la fecha de fin es igual a la fecha de inicio, THEN the system SHALL tratar el viaje como un viaje de un (1) día.

* **REQ-005**: WHEN un viaje es creado o sus fechas son modificadas, THEN the system SHALL calcular el total de días del viaje de forma **inclusiva** (contando el día de inicio y el día de fin):
  `totalDays = (endDate − startDate) + 1`
  *Ejemplo: del 2026-10-10 al 2026-10-17 → 8 días.*

* **REQ-006**: WHEN se registra, edita o elimina un gasto, o se modifica el monto asignado de una categoría, THEN the system SHALL calcular:
  `Presupuesto Total = Σ categories.allocated` (el presupuesto global **es** la suma de las categorías; no se ingresa por separado)
  `Total Gastado = Σ expenses.amount` (incluye gastos fijos previos)
  `Disponible Global = Presupuesto Total − Total Gastado`

* **REQ-007**: *Eliminado (v2).* El presupuesto global ya no es un monto independiente: es la suma de las categorías (REQ-006). La validación de montos asignados está en REQ-023.

* **REQ-008**: WHEN el usuario edita el nombre o las fechas de un viaje ya creado, IF el viaje tiene al menos una actividad asociada en el itinerario o al menos un gasto registrado, THEN the system SHALL solicitar confirmación explícita antes de aplicar el cambio y SHALL NOT modificar el viaje hasta que el usuario confirme.

* **REQ-009**: WHEN el usuario edita las fechas de un viaje ya creado, IF el cambio de fechas deja fuera del nuevo rango a actividades o gastos variables existentes, THEN the system SHALL mostrar una advertencia listando los elementos afectados sin eliminar ninguno de forma automática. Los gastos fijos no se consideran afectados (REQ-047). Esos elementos se pueden eliminar, pero para modificarlos primero hay que moverlos a una fecha dentro del viaje (REQ-027, REQ-031).

* **REQ-062**: the system SHALL mantener como máximo **un (1) viaje**. WHEN el usuario intenta crear un viaje, IF ya existe un viaje, THEN the system SHALL rechazar la creación e indicar que primero debe eliminar el viaje actual (REQ-063).

* **REQ-063**: WHEN el usuario solicita eliminar el viaje actual, THEN the system SHALL mostrar cuántos gastos y actividades se eliminarán, SHALL requerir confirmación explícita y, solo tras confirmar, SHALL eliminar el viaje con sus gastos y actividades, conservando las categorías del sistema.

---

## 2. Gastos Fijos Previos (Pre-pagos)

* **REQ-010**: WHEN el usuario registra un gasto fijo previo (por ejemplo: tiquetes de avión, hospedaje ya reservado, transporte reservado), THEN the system SHALL permitir marcarlo como fijo (`isFixed = true`).

* **REQ-011**: WHEN un gasto es clasificado como fijo, THEN the system SHALL excluirlo del Acumulado del Día de las categorías diarias (REQ-020) y del Total del Día (REQ-053). El gasto fijo SÍ SHALL contarse en el Total Gastado global (REQ-006) y en el gastado de su categoría.

* **REQ-012**: WHEN existe al menos un gasto fijo previo, THEN the system SHALL mostrarlo en el resumen del viaje como monto ya comprometido.

* **REQ-013**: WHEN un gasto fijo previo es registrado, editado o eliminado, THEN the system SHALL recalcular el disponible global usando la fórmula de REQ-006.

* **REQ-014**: WHEN el disponible global se calcula, IF el total de gastos fijos previos ya consume la totalidad del presupuesto total, THEN the system SHALL mostrar una alerta visual de presupuesto comprometido sin bloquear el registro de nuevos gastos.

* **REQ-047**: WHEN el usuario registra o edita un gasto fijo, IF la fecha es válida pero está fuera del rango del viaje (por ejemplo, una compra anticipada antes de la fecha de inicio), THEN the system SHALL aceptar el gasto (queda exento de REQ-027) y SHALL mostrarlo en el historial dentro del grupo "Pre-viaje / Fijos".

---

## 3. Gestión de Categorías

* **REQ-015**: WHEN el usuario elimina una categoría de gasto, IF dicha categoría tiene gastos o actividades asociados, THEN the system SHALL solicitar confirmación explícita indicando cuántos gastos y actividades serán reasignados y SHALL NOT eliminar la categoría hasta que el usuario confirme.

* **REQ-016**: WHEN el usuario confirma la eliminación de una categoría con gastos o actividades asociados, THEN the system SHALL requerir la selección de una categoría destino y reasignar todos los elementos asociados a ella, sin perder ningún registro. IF la categoría destino es `comida`, THEN the system SHALL requerir el tipo de comida de cada gasto reasignado antes de completar la operación (REQ-029).

* **REQ-017**: WHEN el usuario elimina una categoría sin gastos ni actividades asociados, THEN the system SHALL eliminar la categoría de forma inmediata sin solicitar confirmación y SHALL recalcular el Presupuesto Total (REQ-006).

* **REQ-018**: WHEN el usuario crea o edita una categoría, IF el nombre está vacío (o contiene solo espacios) o duplica el nombre de otra categoría existente (sin distinguir mayúsculas ni minúsculas), THEN the system SHALL rechazar la operación y mostrar un mensaje de error en vivo.

* **REQ-048**: WHEN el usuario intenta eliminar la categoría `comida` o `transporte`, THEN the system SHALL rechazar la operación e informar que son categorías del sistema. El usuario SÍ puede modificar su monto asignado.

* **REQ-049**: WHEN el usuario crea una categoría nueva, THEN the system SHALL crearla como categoría de bolsa total (`tracking = total`). Solo `comida` y `transporte` son categorías diarias.

---

## 4. Gestión de Presupuestos Diarios (Comida y Transporte)

* **REQ-019**: WHEN el usuario configura el viaje o modifica el monto asignado de una categoría diaria, THEN the system SHALL calcular el límite diario de esa categoría dividiendo su monto asignado entre el total de días del viaje:
  `foodDailyLimit = foodTotal / totalDays`
  `transportDailyLimit = transportTotal / totalDays`

* **REQ-020**: WHEN el usuario registra un gasto variable de una categoría diaria, IF el monto es mayor a cero y la fecha es válida, THEN the system SHALL restar el monto del disponible de ese día para esa categoría y actualizar el Acumulado del Día, el acumulado total y el saldo restante diario:
  `Disponible Hoy = (Presupuesto Total de la Categoría / Días Totales) − Acumulado del Día`

* **REQ-021**: WHEN el Acumulado del Día de una categoría diaria supera su límite diario (`Acumulado del Día > límite diario`), THEN the system SHALL aplicar una alerta visual de advertencia (color rojo y disponible negativo) sin bloquear el registro del gasto.

* **REQ-022**: WHEN el estado de la barra de progreso diaria de una categoría diaria se evalúa, THEN the system SHALL calcular `Porcentaje Gastado = (Acumulado del Día / límite diario) × 100` y determinar el estado visual:
  * IF `Porcentaje Gastado ≤ 80%`, THEN SHALL mostrar el indicador en estado Normal (Verde).
  * IF `80% < Porcentaje Gastado ≤ 100%`, THEN SHALL mostrar el indicador en estado de Precaución (Ámbar).
  * IF `Porcentaje Gastado > 100%`, THEN SHALL mostrar el indicador en estado Excedido (Rojo).

* **REQ-023**: WHEN el usuario define o modifica el monto asignado de una categoría, IF el monto es menor o igual a cero o no es numérico, THEN the system SHALL rechazar la operación y mostrar un mensaje de error en vivo.

* **REQ-024**: *Eliminado (v2).* Como el Presupuesto Total es la suma de las categorías (REQ-006), no puede existir presupuesto "sin asignar".

* **REQ-050**: WHEN the system calcula límites, disponibles o totales, THEN the system SHALL operar con precisión completa y mostrar los montos redondeados a 2 decimales (redondeo a la mitad hacia arriba) y los porcentajes redondeados a enteros. Los estados de REQ-022 SHALL evaluarse con el valor sin redondear.
  *Ejemplo: 44.50 / 70.00 = 63.57 % → se muestra "64 %", estado Verde.*

* **REQ-051**: WHEN el Total Gastado supera el Presupuesto Total, THEN the system SHALL mostrar el Disponible Global en negativo con una alerta visual roja en el Dashboard Global, sin bloquear el registro de gastos.

* **REQ-052**: WHEN se evalúa una categoría diaria, IF la categoría no tiene monto asignado, THEN the system SHALL mostrar "Sin presupuesto definido", SHALL NOT calcular límite, porcentaje ni estado de alerta para esa categoría y SHALL permitir registrar gastos en ella.

* **REQ-053** *(Total del Día)*: WHEN el usuario registra, edita o elimina un gasto, o selecciona un día del viaje, THEN the system SHALL calcular y mostrar el **Total del Día** de esa fecha como la suma de los gastos variables de **todas** las categorías con esa fecha:
  `Total del Día(fecha) = Σ amount de gastos con date = fecha AND isFixed = false`

* **REQ-054**: WHEN la aplicación se abre con un viaje activo, IF la fecha actual está dentro del rango del viaje, THEN the system SHALL seleccionar el día actual ("HOY"); IF la fecha actual es anterior al inicio, THEN SHALL seleccionar el día 1; IF es posterior al fin, THEN SHALL seleccionar el último día.

---

## 5. Validaciones de Borde y Transacciones

* **REQ-025**: WHEN el usuario ingresa un monto de gasto menor o igual a cero, una fecha vacía o un formato de fecha inválido (distinto de ISO `YYYY-MM-DD` o una fecha inexistente como 2026-02-30), THEN the system SHALL rechazar la transacción y mostrar un mensaje de error en vivo en la interfaz.

* **REQ-026**: WHEN el usuario registra o edita un gasto, IF la descripción del gasto está vacía (o contiene solo espacios), THEN the system SHALL rechazar la transacción y mostrar un mensaje de error en vivo.

* **REQ-027**: WHEN el usuario registra o edita un gasto variable, IF la fecha del gasto está fuera del rango de fechas del viaje, THEN the system SHALL rechazar la transacción y mostrar un mensaje de error en vivo indicando el rango válido. Esto aplica también al editar un gasto que quedó fuera del rango tras cambiar las fechas del viaje (REQ-009): no se guarda ningún cambio hasta que su fecha esté dentro del viaje. (Los gastos fijos están exentos: REQ-047.)

* **REQ-028**: WHEN el usuario registra o edita un gasto, IF el monto ingresado no es un número válido (contiene texto o caracteres no numéricos), THEN the system SHALL rechazar la transacción y mostrar un mensaje de error en vivo.

* **REQ-029**: WHEN el usuario selecciona la categoría `comida` para un gasto, THEN the system SHALL obligar a seleccionar un tipo de comida (`mealType` dentro de `desayuno`, `almuerzo`, `cena`, `snack_cafe`, `bebidas_bar`).

* **REQ-055**: WHEN el usuario registra o edita un gasto, IF no se seleccionó una categoría, THEN the system SHALL rechazar la transacción y mostrar un mensaje de error en vivo.

* **REQ-056**: WHEN el usuario selecciona para un gasto una categoría distinta de `comida`, THEN the system SHALL ocultar el campo tipo de comida y SHALL NOT guardar `mealType` en ese gasto.

* **REQ-065**: WHEN el usuario ingresa un monto (de gasto, de categoría o costo estimado), IF el monto tiene más de 2 decimales, THEN the system SHALL rechazarlo y mostrar un mensaje de error en vivo.

* **REQ-030**: WHEN el usuario crea o edita un viaje, THEN the system SHALL validar que las fechas tengan un formato válido (ISO `YYYY-MM-DD`) antes de aceptarlas.

* **REQ-031**: WHEN el usuario crea o edita una actividad del itinerario, IF el nombre de la actividad está vacío (o contiene solo espacios), o la fecha está fuera del rango del viaje, THEN the system SHALL rechazar la operación y mostrar un mensaje de error en vivo. Esto aplica a cualquier modificación (incluido el cambio de estado) de una actividad que quedó fuera del rango tras cambiar las fechas del viaje (REQ-009): primero debe moverse a una fecha dentro del viaje.

* **REQ-032**: WHEN el usuario edita las fechas de un viaje ya creado o modifica el monto asignado de cualquier categoría, THEN the system SHALL recalcular de manera automática e inmediata `totalDays`, los límites diarios de comida y transporte, los disponibles del día y los totales de las categorías afectadas.

* **REQ-057**: WHEN el usuario edita un gasto existente (monto, fecha, categoría, tipo de comida, descripción o marca de fijo), THEN the system SHALL aplicar las mismas validaciones que al registrarlo (REQ-025..REQ-029, REQ-047, REQ-055, REQ-056) y, si son válidas, SHALL recalcular el Acumulado del Día y el Total del Día **tanto de la fecha y categoría anteriores como de las nuevas**, el Total Gastado y el Disponible Global.

* **REQ-033**: WHEN el usuario elimina una transacción de gasto existente, THEN the system SHALL solicitar confirmación y, tras confirmar, SHALL actualizar los saldos acumulados diarios, el Total del Día, el total gastado y el disponible global.

* **REQ-058**: WHEN el usuario elimina un gasto que proviene de una actividad convertida, THEN the system SHALL quitar el enlace de la actividad (`convertedExpenseId`) sin eliminar la actividad, de modo que pueda volver a convertirse.

* **REQ-059**: WHEN el usuario elimina una actividad que fue convertida en gasto, THEN the system SHALL conservar el gasto y quitar su enlace (`linkedActivityId`), informando al usuario que el gasto se mantiene.

---

## 6. Restricciones del Cliente (Unchanged Behavior)

* **REQ-034**: the system SHALL NOT generar ni sugerir itinerarios de forma automática en ninguno de sus flujos.

* **REQ-035**: WHEN el usuario desea agregar una actividad al itinerario, THEN the system SHALL requerir que la actividad sea ingresada de forma explícita por el usuario.

* **REQ-036**: the system SHALL NOT modificar ni reordenar las actividades del itinerario existentes sin una acción explícita del usuario.

* **REQ-037**: the system SHALL NOT eliminar viajes, gastos, categorías o actividades de forma automática como efecto secundario de otra operación. La única eliminación en cascada permitida es la confirmada explícitamente en REQ-063.

* **REQ-038**: the system SHALL NOT enviar datos del usuario a servidores externos ni requerir conexión a internet para operar (operación puramente local).

* **REQ-060**: WHEN el usuario edita el costo estimado de una actividad ya convertida, THEN the system SHALL NOT modificar automáticamente el monto del gasto enlazado.

---

## 7. Persistencia de Datos Local

* **REQ-039**: WHEN ocurre cualquier cambio o mutación de estado en la aplicación (viaje, categorías, gastos o itinerario), THEN the system SHALL persistir el estado completo (`schemaVersion`, `trip`, `categories`, `expenses`, `itinerary`) en el `LocalStorage` del navegador, sin persistir valores derivados.

* **REQ-040**: WHEN la aplicación se inicia y existe estado persistido en el `LocalStorage`, THEN the system SHALL restaurar el estado completo sin perder viajes, gastos, categorías ni actividades.

* **REQ-041**: WHEN el estado persistido en el `LocalStorage` está corrupto (JSON inválido) o no cumple el contrato de datos (`data-contract.json`), THEN the system SHALL iniciar con un estado vacío (sin viaje y solo con las categorías del sistema `comida` y `transporte`) y mostrar un aviso al usuario, sin bloquear la aplicación.

* **REQ-064**: WHEN the system intenta persistir el estado, IF el `LocalStorage` no está disponible o rechaza la escritura (por ejemplo, cuota excedida o navegación privada), THEN the system SHALL mantener los cambios en memoria, mostrar un aviso indicando que los datos no se están guardando y SHALL reintentar el guardado en la siguiente mutación.

---

## 8. Restricciones de Diseño e Integración

* **REQ-042**: WHEN el usuario intenta registrar, editar o convertir un gasto o una actividad del itinerario, IF no existe un viaje creado, THEN the system SHALL rechazar la operación y solicitar la creación de un viaje.

* **REQ-043**: WHEN el usuario hace clic en **[Convertir a gasto]** de una actividad, IF la actividad está en estado `completado`, tiene costo estimado mayor a cero y no ha sido convertida, THEN the system SHALL abrir el `ExpenseModal` precargado con fecha, categoría, descripción (título de la actividad) y monto (costo estimado), y al confirmar SHALL crear el gasto aplicando las validaciones de REQ-025..REQ-029.

* **REQ-044**: WHEN una actividad del itinerario es convertida en gasto, THEN the system SHALL guardar el enlace en ambos sentidos (`activity.convertedExpenseId` y `expense.linkedActivityId`) y mostrar la actividad como "Convertida".

* **REQ-045**: WHEN el usuario intenta convertir una actividad que ya fue convertida en gasto, THEN the system SHALL impedir la conversión duplicada y mostrar un mensaje informativo.

* **REQ-046**: WHEN se muestra una actividad del itinerario, IF no tiene costo estimado (ausente o 0), o su estado no es `completado`, o ya fue convertida, THEN the system SHALL NOT mostrar la acción **[Convertir a gasto]** para dicha actividad.

* **REQ-061**: WHEN el usuario intenta cambiar el estado de una actividad convertida a `pendiente` o `en_progreso`, THEN the system SHALL rechazar el cambio e indicar que primero debe eliminar el gasto enlazado (REQ-058).

---

## 9. Trazabilidad de Requerimientos

| Categoría | Requerimientos |
|-----------|----------------|
| Gestión de viajes y presupuesto global | REQ-001 – REQ-009 (REQ-007 eliminado), REQ-062, REQ-063 |
| Gastos fijos previos (pre-pagos) | REQ-010 – REQ-014, REQ-047 |
| Gestión de categorías | REQ-015 – REQ-018, REQ-048, REQ-049 |
| Presupuestos diarios (comida y transporte) | REQ-019 – REQ-023 (REQ-024 eliminado), REQ-050 – REQ-054 |
| Validaciones de borde y transacciones | REQ-025 – REQ-033, REQ-055 – REQ-059, REQ-065 |
| Restricciones del cliente (unchanged behavior) | REQ-034 – REQ-038, REQ-060 |
| Persistencia local | REQ-039 – REQ-041, REQ-064 |
| Diseño e integración | REQ-042 – REQ-046, REQ-061 |

> La reflexión del laboratorio vive en [`../retrospective.md`](../retrospective.md); este documento contiene solo la especificación.
