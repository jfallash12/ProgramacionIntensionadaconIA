# Especificación de Requerimientos: NomadPulse Travel Assistant

## 1. Gestión de Presupuestos y Comida (Sintaxis EARS)

* **REQ-001**: WHEN el usuario configura el viaje, THEN the system SHALL calcular el límite diario de comida dividiendo el presupuesto total de comida entre el total de días del viaje:
  $$\text{foodDailyLimit} = \frac{\text{foodTotal}}{\text{totalDays}}$$

* **REQ-002**: WHEN el usuario registra un gasto de comida, IF el monto es mayor a cero y la fecha es válida, THEN the system SHALL restar el monto del disponible del día y actualizar el acumulado total y el saldo restante diario con la fórmula:
  $$\text{Disponible Hoy} = \left(\frac{\text{Presupuesto Total Comida}}{\text{Días Totales}}\right) - \text{Acumulado del Día}$$

* **REQ-003**: WHEN el gasto acumulado del día supera el límite diario establecido ($\text{Acumulado del Día} > \text{foodDailyLimit}$), THEN the system SHALL aplicar una alerta visual de advertencia (cambio a color rojo/alerta) sin bloquear el registro del gasto.

* **REQ-004**: WHEN el estado de la barra de progreso diaria se evalúa, THEN the system SHALL determinar el estado visual según las siguientes reglas:
  * IF $\text{Porcentaje Gastado} \le 80\%$, THEN SHALL mostrar el indicador en estado Normal (Verde / Emerald).
  * IF $80\% < \text{Porcentaje Gastado} \le 100\%$, THEN SHALL mostrar el indicador en estado de Precaución (Ámbar).
  * IF $\text{Porcentaje Gastado} > 100\%$, THEN SHALL mostrar el indicador en estado Excedido (Rojo).

---

## 2. Validaciones de Borde y Transacciones

* **REQ-005**: WHEN el usuario ingresa un monto de gasto menor o igual a cero ($\text{amount} \le 0$), una fecha vacía o un formato de fecha inválido (distinto de ISO `YYYY-MM-DD`), THEN the system SHALL rechazar la transacción y mostrar un mensaje de error en vivo en la interfaz.

* **REQ-006**: WHEN el usuario selecciona una categoría de gasto igual a `comida`, THEN the system SHALL obligar a seleccionar un tipo de comida (`mealType` dentro de `desayuno`, `almuerzo`, `cena`, `snack_cafe`, `bebidas_bar`).

* **REQ-007**: WHEN el usuario edita la fecha de un viaje ya creado o modifica el presupuesto global, THEN the system SHALL recalcular de manera automática e inmediata los límites diarios de comida y los totales de las categorías afectadas.

* **REQ-008**: WHEN el usuario elimina una transacción de gasto existente, THEN the system SHALL actualizar dinámicamente los saldos acumulados diarios, el total gastado y el disponible global del presupuesto.

---

## 3. Persistencia de Datos Local

* **REQ-009**: WHEN ocurre cualquier cambio o mutación de estado en la aplicación (creación de viaje, registro de gastos, actualización de itinerario), THEN the system SHALL persistir el estado completo (`trip`, `budgets`, `expenses`, `itinerary`) de forma reactiva en el `LocalStorage` del navegador sin requerir un servidor externo.

---

## 4. Restricciones de Diseño e Integración

* **REQ-010**: WHEN el usuario visualiza el itinerario y completa una actividad que cuenta con un costo estimado, THEN the system SHALL permitir convertir dicha actividad en un gasto registrado con un solo clic, enlazando el elemento del itinerario con el módulo de transacciones (`ExpenseModal`).

---

## Reflexión sobre la Especificación Intencional

> **¿Qué tan diferente fue pedirle a la IA que redacte y ajuste las reglas del juego en lugar de pedirle directamente que escriba el código? ¿Sientes que ahora tienes más control sobre lo que la IA va a programar a continuación?**
>
> Redactar y ajustar las reglas del juego mediante especificaciones formales y sintaxis EARS cambia por completo la dinámica de desarrollo. En lugar de obtener código genérico o propenso a errores lógicos derivados de ambigüedades, definir contratos de software estrictos permite guiar a la inteligencia artificial con precisión matemática y restricciones de negocio claras. Esto otorga un control significativamente mayor sobre el flujo del sistema, ya que la IA pasa de "adivinar" el comportamiento deseado a ejecutar fielmente una arquitectura validada.