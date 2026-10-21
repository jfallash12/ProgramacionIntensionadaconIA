# Especificación de Requerimientos: NomadPulse Travel Assistant

> **Metodología:** Sintaxis EARS (Easy Approach to Requirements Syntax).
> Patrón general: `WHEN <disparador>, IF <condición>, THEN the system SHALL <respuesta>`.
> El comportamiento esperado se expresa con `SHALL` (obligatorio) y el comportamiento que **no debe cambiar** se expresa con `SHALL NOT`.

---

## 1. Gestión de Viajes y Presupuesto Global

* **REQ-001**: WHEN el usuario crea un nuevo viaje, THEN the system SHALL solicitar un nombre de viaje, una fecha de inicio y una fecha de fin.

* **REQ-002**: WHEN el usuario crea un viaje, IF el nombre del viaje está vacío (o contiene solo espacios) o la fecha de inicio o la fecha de fin están vacías, THEN the system SHALL rechazar la creación del viaje y mostrar un mensaje de error en vivo.

* **REQ-003**: WHEN el usuario crea un viaje, IF la fecha de fin es anterior a la fecha de inicio, THEN the system SHALL rechazar la creación del viaje y mostrar un mensaje de error en vivo.

* **REQ-004**: WHEN la fecha de fin es igual a la fecha de inicio, THEN the system SHALL tratar el viaje como un viaje de un (1) día.

* **REQ-005**: WHEN un viaje es creado o sus fechas son modificadas, THEN the system SHALL calcular el total de días del viaje de forma inclusiva en días (contando tanto el día de inicio como el día de fin):
  $$\text{totalDays} = (\text{endDate} - \text{startDate}) + 1$$

* **REQ-006**: WHEN el usuario define el presupuesto global del viaje, THEN the system SHALL calcular el total gastado y el disponible global con las fórmulas:
  $$\text{Total Gastado} = \sum \text{expenses.amount (incluye gastos fijos previos)}$$
  $$\text{Disponible Global} = \text{Budget Total} - \text{Total Gastado}$$

* **REQ-007**: WHEN el usuario define o modifica el presupuesto global del viaje, IF el monto ingresado es menor o igual a cero ($\text{amount} \le 0$), THEN the system SHALL rechazar la operación y mostrar un mensaje de error en vivo.

* **REQ-008**: WHEN el usuario edita el nombre o las fechas de un viaje ya creado, IF el viaje tiene al menos una actividad asociada en el itinerario o al menos un gasto registrado, THEN the system SHALL solicitar confirmación explícita antes de aplicar el cambio y SHALL NOT modificar el viaje hasta que el usuario confirme.

* **REQ-009**: WHEN el usuario edita las fechas de un viaje ya creado, IF el cambio de fechas deja fuera del nuevo rango a actividades o gastos existentes, THEN the system SHALL mostrar una advertencia listando los elementos afectados sin eliminar ninguno de forma automática.

---

## 2. Gastos Fijos Previos (Pre-pagos)

* **REQ-010**: WHEN el usuario registra un gasto fijo previo (por ejemplo: tiquetes de avión, hospedaje ya reservado, transporte reservado), THEN the system SHALL permitir marcarlo con el tipo `fixed` (fijo / ya pagado).

* **REQ-011**: WHEN un gasto es clasificado como `fixed`, THEN the system SHALL excluirlo del cálculo del límite diario de comida (definido en REQ-019), de modo que no consuma el presupuesto diario de ninguna categoría futura. El gasto fijo SÍ SHALL contarse dentro del Total Gastado global (REQ-006).

* **REQ-012**: WHEN existe al menos un gasto fijo previo, THEN the system SHALL mostrarlo en el resumen del viaje como monto ya comprometido.

* **REQ-013**: WHEN un gasto fijo previo es registrado o eliminado, THEN the system SHALL recalcular el disponible global usando la fórmula de REQ-006, reflejando inmediatamente el impacto del gasto fijo en el presupuesto global.

* **REQ-014**: WHEN el disponible global se calcula, IF el total de gastos fijos previos ya consume la totalidad del presupuesto global, THEN the system SHALL mostrar una alerta visual de presupuesto comprometido sin bloquear el registro de nuevos gastos.

---

## 3. Gestión de Categorías

* **REQ-015**: WHEN el usuario elimina una categoría de gasto, IF dicha categoría tiene gastos activos asociados, THEN the system SHALL solicitar confirmación explícita indicando cuántos gastos serán reasignados o eliminados y SHALL NOT eliminar la categoría hasta que el usuario confirme.

* **REQ-016**: WHEN el usuario confirma la eliminación de una categoría con gastos activos, THEN the system SHALL requerir la selección de una categoría destino y reasignar todos los gastos asociados a ella, sin perder ningún registro.

* **REQ-017**: WHEN el usuario elimina una categoría sin gastos asociados, THEN the system SHALL eliminar la categoría de forma inmediata sin solicitar confirmación.

* **REQ-018**: WHEN el usuario crea o edita una categoría, IF el nombre de la categoría está vacío (o contiene solo espacios) o duplica el nombre de otra categoría existente, THEN the system SHALL rechazar la operación y mostrar un mensaje de error en vivo.

---

## 4. Gestión de Presupuestos y Comida

* **REQ-019**: WHEN el usuario configura el viaje, THEN the system SHALL calcular el límite diario de comida dividiendo el presupuesto total de comida entre el total de días del viaje:
  $$\text{foodDailyLimit} = \frac{\text{foodTotal}}{\text{totalDays}}$$

* **REQ-020**: WHEN el usuario registra un gasto de comida, IF el monto es mayor a cero y la fecha es válida, THEN the system SHALL restar el monto del disponible del día y actualizar el acumulado total y el saldo restante diario con la fórmula:
  $$\text{Disponible Hoy} = \left(\frac{\text{Presupuesto Total Comida}}{\text{Días Totales}}\right) - \text{Acumulado del Día}$$

* **REQ-021**: WHEN el gasto acumulado del día supera el límite diario establecido ($\text{Acumulado del Día} > \text{foodDailyLimit}$), THEN the system SHALL aplicar una alerta visual de advertencia (cambio a color rojo/alerta) sin bloquear el registro del gasto.

* **REQ-022**: WHEN el estado de la barra de progreso diaria se evalúa, THEN the system SHALL determinar el estado visual según las siguientes reglas:
  * IF $\text{Porcentaje Gastado} \le 80\%$, THEN SHALL mostrar el indicador en estado Normal (Verde / Emerald).
  * IF $80\% < \text{Porcentaje Gastado} \le 100\%$, THEN SHALL mostrar el indicador en estado de Precaución (Ámbar).
  * IF $\text{Porcentaje Gastado} > 100\%$, THEN SHALL mostrar el indicador en estado Excedido (Rojo).

* **REQ-023**: WHEN el usuario define o modifica el presupuesto de una categoría, IF el monto asignado a esa categoría es menor o igual a cero ($\text{amount} \le 0$), THEN the system SHALL rechazar la operación y mostrar un mensaje de error en vivo.

* **REQ-024**: WHEN la suma de los presupuestos por categoría difiere del presupuesto global, THEN the system SHALL mostrar la diferencia como presupuesto sin asignar, sin bloquear al usuario.

---

## 5. Validaciones de Borde y Transacciones

* **REQ-025**: WHEN el usuario ingresa un monto de gasto menor o igual a cero ($\text{amount} \le 0$), una fecha vacía o un formato de fecha inválido (distinto de ISO `YYYY-MM-DD`), THEN the system SHALL rechazar la transacción y mostrar un mensaje de error en vivo en la interfaz.

* **REQ-026**: WHEN el usuario registra o edita un gasto, IF la descripción del gasto está vacía (o contiene solo espacios), THEN the system SHALL rechazar la transacción y mostrar un mensaje de error en vivo.

* **REQ-027**: WHEN el usuario registra un gasto, IF la fecha del gasto está fuera del rango de fechas del viaje, THEN the system SHALL rechazar la transacción y mostrar un mensaje de error en vivo indicando el rango válido.

* **REQ-028**: WHEN el usuario registra un gasto, IF el monto ingresado no es un número válido (contiene texto o caracteres no numéricos), THEN the system SHALL rechazar la transacción y mostrar un mensaje de error en vivo.

* **REQ-029**: WHEN el usuario selecciona una categoría de gasto igual a `comida`, THEN the system SHALL obligar a seleccionar un tipo de comida (`mealType` dentro de `desayuno`, `almuerzo`, `cena`, `snack_cafe`, `bebidas_bar`).

* **REQ-030**: WHEN el usuario crea o edita un viaje, THEN the system SHALL validar que las fechas tengan un formato válido (ISO `YYYY-MM-DD`) antes de aceptarlas.

* **REQ-031**: WHEN el usuario crea o edita una actividad del itinerario, IF el nombre de la actividad está vacío (o contiene solo espacios), THEN the system SHALL rechazar la operación y mostrar un mensaje de error en vivo.

* **REQ-032**: WHEN el usuario edita la fecha de un viaje ya creado o modifica el presupuesto global, THEN the system SHALL recalcular de manera automática e inmediata los límites diarios de comida y los totales de las categorías afectadas.

* **REQ-033**: WHEN el usuario elimina una transacción de gasto existente, THEN the system SHALL actualizar dinámicamente los saldos acumulados diarios, el total gastado y el disponible global del presupuesto.

---

## 6. Restricciones del Cliente (Unchanged Behavior)

* **REQ-034**: the system SHALL NOT generar ni sugerir itinerarios de forma automática en ninguno de sus flujos.

* **REQ-035**: WHEN el usuario desea agregar una actividad al itinerario, THEN the system SHALL requerir que la actividad sea ingresada o seleccionada de forma explícita por el usuario.

* **REQ-036**: the system SHALL NOT modificar ni reordenar las actividades del itinerario existentes sin una acción explícita del usuario.

* **REQ-037**: the system SHALL NOT eliminar viajes, gastos, categorías o actividades de forma automática como efecto secundario de otra operación.

* **REQ-038**: the system SHALL NOT enviar datos del usuario a servidores externos ni requerir conexión a internet para operar (operación puramente local).

---

## 7. Persistencia de Datos Local

* **REQ-039**: WHEN ocurre cualquier cambio o mutación de estado en la aplicación (creación de viaje, registro de gastos, actualización de itinerario), THEN the system SHALL persistir el estado completo (`trip`, `budgets`, `categories`, `expenses`, `itinerary`) de forma reactiva en el `LocalStorage` del navegador sin requerir un servidor externo.

* **REQ-040**: WHEN la aplicación se inicia y existe estado persistido en el `LocalStorage`, THEN the system SHALL restaurar el estado completo sin perder viajes, gastos, categorías ni actividades.

* **REQ-041**: WHEN el estado persistido en el `LocalStorage` está corrupto o no puede ser interpretado (JSON inválido), THEN the system SHALL iniciar con un estado vacío y mostrar un aviso al usuario, sin bloquear la aplicación.

---

## 8. Restricciones de Diseño e Integración

* **REQ-042**: WHEN el usuario intenta registrar, editar o convertir un gasto o una actividad del itinerario, IF no existe un viaje activo seleccionado, THEN the system SHALL rechazar la operación y solicitar la selección o creación de un viaje.

* **REQ-043**: WHEN el usuario visualiza el itinerario y completa una actividad que cuenta con un costo estimado, THEN the system SHALL permitir convertir dicha actividad en un gasto registrado con un solo clic, enlazando el elemento del itinerario con el módulo de transacciones (`ExpenseModal`).

* **REQ-044**: WHEN una actividad del itinerario es convertida en gasto, THEN the system SHALL enlazar el gasto resultante con la actividad de origen y marcarla como `converted`, evitando conversiones duplicadas.

* **REQ-045**: WHEN el usuario intenta convertir una actividad que ya fue convertida en gasto, THEN the system SHALL impedir la conversión duplicada y mostrar un mensaje informativo.

* **REQ-046**: WHEN una actividad del itinerario no tiene un costo estimado, THEN the system SHALL deshabilitar la acción de conversión a gasto para dicha actividad.

---

## 9. Trazabilidad de Requerimientos

| Categoría | Requerimientos |
|-----------|----------------|
| Gestión de viajes y presupuesto global | REQ-001 – REQ-009 |
| Gastos fijos previos (pre-pagos) | REQ-010 – REQ-014 |
| Gestión de categorías | REQ-015 – REQ-018 |
| Presupuestos y comida | REQ-019 – REQ-024 |
| Validaciones de borde y transacciones | REQ-025 – REQ-033 |
| Restricciones del cliente (unchanged behavior) | REQ-034 – REQ-038 |
| Persistencia local | REQ-039 – REQ-041 |
| Diseño e integración | REQ-042 – REQ-046 |

---

## Reflexión sobre la Especificación Intencional

> **¿Qué tan diferente fue pedirle a la IA que redacte y ajuste las reglas del juego en lugar de pedirle directamente que escriba el código? ¿Sientes que ahora tienes más control sobre lo que la IA va a programar a continuación?**
>
> Redactar y ajustar las reglas del juego mediante especificaciones formales y sintaxis EARS cambia por completo la dinámica de desarrollo. En lugar de obtener código genérico o propenso a errores lógicos derivados de ambigüedades, definir contratos de software estrictos permite guiar a la inteligencia artificial con precisión matemática y restricciones de negocio claras. Esto otorga un control significativamente mayor sobre el flujo del sistema, ya que la IA pasa de "adivinar" el comportamiento deseado a ejecutar fielmente una arquitectura validada.
>
> La retroalimentación sobre la primera versión evidenció una lección clave: una especificación corta es una especificación incompleta. Al ampliarla, no solo se agregaron más requerimientos, sino que se cubrieron dimensiones que antes eran invisibles: los gastos fijos previos y su efecto en el presupuesto global, las restricciones explícitas de "comportamiento que no debe cambiar" (como la no generación automática de itinerarios) y los casos de borde derivados de operaciones destructivas o ambiguas (editar fechas con actividades asociadas, eliminar categorías con gastos activos, campos vacíos). Documentar explícitamente lo que el sistema **no** debe hacer resultó tan importante como documentar lo que debe hacer, porque elimina suposiciones que la IA tendería a rellenar por su cuenta.
