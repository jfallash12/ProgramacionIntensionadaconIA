# Boceto de la UI (Wireframe) — Layout por Componentes

**Aplicación:** Viajero — Asistente Personal de Viaje & Presupuesto (NomadPulse Travel Assistant)
**Semana 2 — Laboratorio 2:** Wireframing

> Versión gráfica editable: [`Descripción layout por componentes_Jose_Fallas.excalidraw`](./Descripción%20layout%20por%20componentes_Jose_Fallas.excalidraw)
> Datos de muestra: viaje Oct 10–Oct 17 (8 días), presupuesto global $2,370.

## 1. Layout general

```text
+----------------------------------------------------------------------------+
| ENCABEZADO:  Costa Rica (Arenal) |  Oct 10 - Oct 17 (8 dias)               |
| NAVEGACION:  Control de Comida | Itinerario | Presupuesto | Gastos         |
+----------------------------------------------------------------------------+
| 1. PANEL SUPERIOR: DASHBOARD GLOBAL                                        |
| +------------------------------------------------------------------------+ |
| | Desglose por categorias (asignado / gastado)                          | |
| | Comida $560/$127  Hospedaje $850/$320  Transporte $380/$100            | |
| | Actividades $320/$65  Compras $260/$0  Imprevistos $0/$0              | |
| +------------------------------------------------------------------------+ |
| |  Presupuesto Total: $2,370.00                                         | |
| |  Gastado Total:     $612.00                                           | |
| |  Disponible Total:  $1,758.00 (74%)                                   | |
| |  Barra de progreso: 26% consumido   [#########-------------]          | |
| +------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------+
| 2. MODULO CENTRAL: ENFOQUE DIARIO DE COMIDA                                |
| +------------------------------------------------------------------------+ |
| | REGISTRO EN 1 CLIC                                                     | |
| | [ Desayuno: $14 ]  [ Almuerzo: $24 ]  [ Cena: $0 ]  [ Snacks: $6.50 ]  | |
| +------------------------------------------------------------------------+ |
| |  Tarjeta Hero del Dia                                                  | |
| |  Meta Hoy: $70.00 | Gastado Hoy: $44.50 (63%) | Disponible: +$25.50    | |
| |  Status: En orden (Verde)   <- Ambar >80%   Rojo >100%                | |
| +------------------------------------------------------------------------+ |
| | Selector de Dia: [1] [2-HOY] [3] [4] [5] [6] [7] [8]                  | |
| +------------------------------------------------------------------------+ |
| | FORMULARIO DE INGRESO RAPIDO                                           | |
| |  Fecha | Monto | Descripcion | Tipo de comida (si categoria=comida)  | |
| |  Validacion visual EN VIVO (en rojo): monto <= 0, fecha vacía o       | |
| |  formato invalido, descripcion vacia, tipo de comida sin elegir       | |
| +------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------+
| 3. MODULO INFERIOR: DETALLE OPERATIVO                                     |
| +---------------------------+  +-----------------------------------------+ |
| | ITINERARIO DEL DIA 2      |  | HISTORIAL DE GASTOS DEL DIA             | |
| | 08:30 Puentes Colgantes   |  |  08:30 | Gallo pinto ($14)              | |
| |  (Comp) Est: $35          |  |  11:15 | Cafe ($6.50)                   | |
| |  [ Convertir a gasto ]    |  |  14:00 | Casado ($24)                   | |
| | 15:30 Termales Tabacón    |  |  -------------------------------------- | |
| |  (Prog) Est: $52          |  |  Total Dia: $44.50                      | |
| |  [ Convertir a gasto ]    |  |  (lista agrupada por fechas)           | |
| | 19:30 Cena Mirador        |  |                                         | |
| |  (Pend - sin costo est.)  |  |                                         | |
| +---------------------------+  +-----------------------------------------+ |
+----------------------------------------------------------------------------+
```

## 2. Descripción por componentes y comportamiento guiado por intención

**Encabezado**
- Muestra destino, rango de fechas (formato ISO visible al editar) y total de días calculado con RN-01 (inclusivo).

**Navegación principal**
- Secciones: Control de Comida, Itinerario, Presupuesto, Gastos. (Sin módulos fuera del alcance de las reglas de negocio de la entrevista.)

**1. Panel Superior — Dashboard Global**
- Barra de progreso del Presupuesto Total: `Gastado Total / Presupuesto Total` (26% en el ejemplo: 612/2370).
- Desglose por categorías en formato `asignado / gastado`, usando exactamente las categorías del modelo de datos (comida, hospedaje, transporte, actividades, compras, imprevistos).
- Cifras consistentes: la suma de asignados = $2,370 (Presupuesto Total); la suma de gastados = $612 (Gastado Total); Disponible = $2,370 - $612 = $1,758 (74%).

**2. Módulo Central — Enfoque Diario de Comida**
- **Registro en 1 clic:** botones por tipo de comida con el acumulado del día de cada ocasión (desayuno $14 + almuerzo $24 + cena $0 + snacks $6.50 = $44.50).
- **Tarjeta Hero del Día (RN-02/RN-03/RN-04):**
  - Meta Hoy = `$70.00` = foodTotal $560 / 8 días.
  - Gastado Hoy = $44.50 (63% del límite diario).
  - Disponible Hoy = $70.00 - $44.50 = +$25.50.
  - Status con los tres estados de RN-04: Verde ≤80%, Ámbar (80%,100%], Rojo >100%. El color alerta, pero **nunca bloquea** registrar un gasto (Q3).
- **Selector de Día:** permite ver/gestionar cualquier día del viaje; marca cuál es "hoy".
- **Formulario de Ingreso Rápido (obligatorio del lab):** campos **Fecha, Monto, Descripción** (más Tipo de comida, exigido por RN-05 cuando la categoría es comida) con **validación visual en vivo** antes de confirmar: monto ≤ 0 o no numérico, fecha vacía o con formato distinto a `YYYY-MM-DD`, descripción vacía.

**3. Módulo Inferior — Detalle Operativo**
- **Itinerario del Día:** actividades del día en orden ingresado, con hora, título y estado (`completado`, `en_progreso`, `pendiente`). Cada actividad **con costo estimado** muestra el atajo **[Convertir a gasto]** (Q6): un clic abre el `ExpenseModal` con los datos precargados y crea el gasto enlazado a la actividad. Las actividades **sin costo estimado no muestran el botón** de conversión.
- **Historial de Gastos del Día:** gastos del día en formato `hora | descripción (monto)` con **Total Día**, dentro de una lista agrupada por fechas. Coincide con el acumulado de la Tarjeta Hero ($14 + $6.50 + $24 = $44.50).

**Persistencia (Q4)**
- Todo el estado (`trip`, `budgets`, `expenses`, `itinerary`) se guarda en LocalStorage en cada mutación y se restaura al iniciar; sin servidores externos ni conexión a internet.
