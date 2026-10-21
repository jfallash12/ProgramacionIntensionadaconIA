# NomadPulse Travel Assistant

Asistente de viajes con control de presupuesto de comida, alertas visuales y persistencia local.

Proyecto del curso **Programación Intencional con IA**.

## Estructura del proyecto

- `Requirements.md` — Especificación de requerimientos (sintaxis EARS). Fuente de verdad del comportamiento esperado.
- `index.html` — Punto de entrada de la aplicación (por definir).
- `css/` — Estilos (por definir).
- `js/` — Lógica de la aplicación (por definir).

> **Stack:** HTML + CSS + JavaScript vanilla. Persistencia en `LocalStorage` (sin servidor externo).

## Requerimientos

Ver [`Requirements.md`](./Requirements.md) para la especificación completa:

| ID | Descripción |
|----|-------------|
| REQ-001 | Cálculo del límite diario de comida |
| REQ-002 | Registro de gastos y actualización de saldos |
| REQ-003 | Alerta visual al superar el límite diario |
| REQ-004 | Estados de la barra de progreso diaria |
| REQ-005 | Validación de monto y fecha |
| REQ-006 | Tipo de comida obligatorio en categoría `comida` |
| REQ-007 | Recálculo automático al editar viaje/presupuesto |
| REQ-008 | Actualización dinámica al eliminar transacciones |
| REQ-009 | Persistencia reactiva en `LocalStorage` |
| REQ-010 | Conversión de actividad del itinerario a gasto |
