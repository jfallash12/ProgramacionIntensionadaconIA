# REFLECTION.md — Autoevaluación de Alineación

**Proyecto:** Mochila — Greenfield Intentional App
**Estudiante:** José Fallas — jfallash@ucenfotec.ac.cr
**Curso:** Programación Intencional con IA Generativa

---

## A. Matriz de Alineación de Intención (Visión vs. Realidad)

| Dimensión de la App | Visión inicial en mi mente (Semana 1) | Especificación entregada a la IA (`requirements.md`) | Resultado real generado por la IA (Semana 4) | Nivel de satisfacción percibido |
|---|---|---|---|---|
| **Lógica de Negocio** | "Quiero ver mi itinerario, ingresar mi presupuesto para varias categorías y saber cuánto me queda en comida cada día." Además, un recordatorio cada mañana con el saldo del día. La idea era una sola regla: comida dividida por días. | 63 REQ en EARS. Los principales: **REQ-019/020** límite diario `(Total / Días) − Acumulado del Día` para comida **y** transporte; **REQ-021/022** alerta Verde/Ámbar/Rojo que **nunca bloquea**; **REQ-025..028/065** rechazo de montos ≤ 0, no numéricos o con más de 2 decimales; **REQ-047** gastos fijos exentos del rango; **REQ-043..046** conversión de actividad completada en gasto; **REQ-053** Total del Día. | Las reglas funcionan como se especificaron y se verificaron con valores exactos: Día 2 = $70.00 / $44.50 / +$25.50 / 64 %; la secuencia +$10 / +$5 / +$20 pasa de Verde a Ámbar a Rojo sin bloquear. El **recordatorio diario no existe**: se eliminó del alcance al decidir que la app sería 100 % offline y sin servidor. | **Muy Satisfecho** ✏️ |
| **Experiencia de Usuario (UI/UX)** | Una pantalla tipo dashboard: barra del presupuesto total, "cuánto me queda hoy" bien visible y una lista de gastos. | Wireframe low-fi v2 ([`docs/wireframe.png`](docs/wireframe.png)) con 3 paneles + estados especiales; componentes y estilos en `design.md` §4 y §8; validación **en vivo** (REQ-025..031); estados con color **y** texto. | La interfaz sigue el wireframe: dashboard, control diario con dos tarjetas, registro rápido, formulario con errores en rojo al teclear y Guardar deshabilitado, historial agrupado con Total del Día, diálogos de confirmación y vista móvil sin scroll horizontal. Es funcional pero sobria (CSS escrito a mano, sin íconos propios ni modo oscuro), y el selector de fecha depende del formato del navegador. | **Satisfecho** ✏️ |
| **Persistencia de Datos** | "Que no se borre lo que anoté al recargar." No había pensado en el formato de los datos. | Contrato estricto [`docs/data-contract.json`](docs/data-contract.json) (JSON Schema 2020-12, `schemaVersion 2`, 4 entidades relacionadas); **REQ-039..041** guardar en cada cambio, restaurar y recuperarse de datos dañados; **REQ-064** fallo al guardar. | Cada cambio se guarda en `localStorage` y se restaura con F5. Un dato dañado o fuera de contrato no rompe la app: inicia vacía con aviso. Si el navegador no permite guardar, los datos quedan en memoria y se reintenta. `dispatch` nunca acepta un estado que no cumpla el contrato. Límite asumido: los datos viven en un solo navegador; no hay exportar/importar ni sincronización. | **Muy Satisfecho** ✏️ |

---

## B. Cuestionario de Reflexión de Cierre

### 1. Autonomía de la IA — ¿En qué momentos la IA tomó decisiones "por su cuenta" sin habérselo solicitado? ¿Fueron aciertos o fallos de arquitectura?

La IA tomó varias decisiones que yo no había pedido. Las clasifico así:

**Aciertos (las adopté y quedaron documentadas en `design.md` §6):**

- **Scripts clásicos en lugar de ES Modules.** Yo había pedido "JS modular" y "abrir con doble clic", y esas dos cosas son incompatibles en `file://`. La IA lo detectó y propuso `window.Mochila` (D1).
- **Fechas con `Date.UTC`.** En Costa Rica (UTC−6), `new Date('2026-10-10')` cae el 9 de octubre. La IA lo previó antes de que existiera el error (D2).
- **CSP que bloquea la red y DOM con `textContent`.** Volvió verificables REQ-038 y la seguridad ante texto malicioso (D5, D6).
- **Red de seguridad en `dispatch`.** Antes de guardar, el nuevo estado se valida contra el contrato (D13). Nadie lo pidió, pero garantiza que nunca se persista basura.

**Decisiones que tuve que corregir o aclarar (fallos o desvíos):**

- Propuso eliminar campos del gasto (`paymentMethod`, `location`, `notes`) sin preguntar. Lo acepté porque ningún REQ los respaldaba, pero fue una decisión unilateral que debió ser mía.
- Al eliminar el viaje, el texto de REQ-063 llevaba a borrar las categorías creadas por el usuario. La IA eligió conservarlas para no violar REQ-037. Fue un acierto, pero dejaba el REQ ambiguo, así que se corrigió el texto del REQ.
- **Fallo encontrado en la verificación:** al acortar las fechas del viaje, el formulario de actividad quedaba con una fecha vieja y el botón deshabilitado sin mensaje. La lógica de negocio estaba bien; el fallo era de estado de interfaz. Se corrigió con Unchanged Behavior y se agregó la regla D14 para mostrar errores de valores precargados.

### 2. Calidad de Especificación — Analizando tu `requirements.md` inicial, ¿dónde fuiste ambiguo y causaste "alucinaciones" o parches frágiles por parte de la IA?

La primera versión (46 REQ) tenía ambigüedades que, si se hubiera programado directo, habrían producido parches frágiles:

- **"Presupuesto global" sin definir:** ¿es un monto propio o la suma de las categorías? REQ-007 y REQ-024 suponían lo primero y `CLAUDE.md` lo segundo. Una IA habría inventado un campo `globalBudget` y una lógica de "sin asignar" que nadie pidió. Se resolvió con la decisión C3 y se eliminaron REQ-007 y REQ-024.
- **Categorías fijas vs. personalizables:** el contrato tenía un enum, pero REQ-015..018 permitían crear y eliminar categorías. Cualquier implementación habría roto uno de los dos (C2).
- **Gastos previos vs. rango de fechas:** REQ-027 rechazaba fechas fuera del viaje, lo que hacía imposible registrar los tiquetes comprados antes (C4, REQ-047).
- **"Registro en 1 clic"** en el wireframe: un botón no puede registrar un gasto sin monto. La IA lo convirtió en "precargar el formulario" (T-00.5). Fue razonable, pero lo decidió ella.
- **Transporte diario:** la entrevista decía que comida **y** transporte eran diarios, pero los REQ solo hablaban de comida (C1/Q2).
- **Edición de elementos fuera de rango** tras cambiar fechas (T-00.6) y **"conservando las categorías del sistema"** (REQ-063): ambos casos de borde quedaron abiertos hasta la auditoría.

La lección es que la ambigüedad estaba en las **relaciones entre artefactos** (REQ vs. contrato vs. wireframe) más que en cada documento por separado. La auditoría de armonización (Fase 0) fue lo que evitó las alucinaciones.

### 3. Rol de Head Chef — ¿Te sientes 100 % dueño y responsable del código fuente generado o existen componentes que consideras "caja negra"?


Me siento dueño de la **arquitectura y del comportamiento**. Cada regla se puede rastrear de REQ a componente y función (`design.md` §7) y de función a tarea y commit (`tasks.md`), y puedo explicar el flujo `dispatch` → validar → confirmar → reducer → validar contrato → guardar → render. La parte que más domino es `validations.js`, porque son funciones puras con resultados verificables.

Las partes más cercanas a una "caja negra" son:

- **`storage.validateState`**, la réplica manual del JSON Schema: es larga y repetitiva, y la verifiqué con pruebas más que leyéndola línea por línea.
- **Los detalles de `ui.js`**: la construcción del DOM con `el()`, la actualización de errores sin perder el foco y los atributos `data-rerender`.

Para cerrar esa brecha, mi plan es recorrer esas dos funciones con el depurador del navegador antes de la defensa.

### 4. Satisfacción del Cliente — Si el docente fuera un cliente real que pagó por este software, ¿qué tan alineado está el producto final con la visión original?

**Alineado en lo esencial.** Las tres reglas críticas que audita el cliente se cumplen y se pueden demostrar en vivo:

- La persistencia sobrevive a F5.
- Un monto negativo se rechaza en vivo.
- El límite diario se recalcula con cada gasto.

El producto también entrega más de lo que el cliente pidió al inicio: transporte diario, gastos fijos previos, conversión de actividades en gastos, Total del Día y manejo de datos dañados.

Le explicaría honestamente al cliente tres brechas:

1. **No hay recordatorio diario cada mañana.** Era parte de la visión inicial y se sacrificó al elegir una app 100 % offline. Requeriría notificaciones del navegador o un servidor, que el alcance prohibía.
2. **Los datos viven en un solo navegador.** Si cambia de equipo o borra el historial, se pierden, porque no hay exportar/importar.
3. **Un solo viaje a la vez.** Para un viajero frecuente sería una limitación.

Como cliente que pagó, estaría **satisfecho**: recibe exactamente lo que se especificó y aprobó, con evidencia de que funciona. Pediría las brechas 1 y 2 como una segunda fase, que habría que especificar primero en `requirements.md` antes de programar.
