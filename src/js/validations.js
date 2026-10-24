/*
 * validations.js — Viajero.validate
 * Funciones PURAS: reciben un borrador (valores crudos del formulario) y devuelven
 * { campo: 'mensaje' }. Un objeto vacío significa "válido". RN-05 (docs/design.md §3).
 * Importante (REQ-021): ninguna validación consulta límites diarios; exceder un límite nunca bloquea.
 */
(function (global) {
  'use strict';

  var Viajero = global.Viajero = global.Viajero || {};
  var calc = Viajero.calc;

  var AMOUNT_RE = /^[+-]?\d+(\.\d+)?$/;
  var TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  var STATUSES = ['pendiente', 'en_progreso', 'completado'];

  function isBlank(v) { return v === undefined || v === null || String(v).trim() === ''; }

  function rangeText(trip) { return trip.startDate + ' y ' + trip.endDate; }

  /**
   * Interpreta un monto crudo. REQ-025 (≤ 0), REQ-028 (no numérico), REQ-065 (> 2 decimales).
   * opts.allowZero permite 0 (costo estimado). Devuelve { value } o { error }.
   */
  function parseAmount(raw, opts) {
    opts = opts || {};
    var label = opts.label || 'El monto';
    if (isBlank(raw)) { return { error: label + ' es obligatorio.' }; }
    var s = String(raw).trim();
    if (!AMOUNT_RE.test(s)) { return { error: label + ' debe ser un número válido (use punto para decimales).' }; }
    var n = Number(s);
    if (!isFinite(n)) { return { error: label + ' debe ser un número válido.' }; }
    if (opts.allowZero ? n < 0 : n <= 0) {
      return { error: opts.allowZero ? label + ' no puede ser negativo.' : label + ' debe ser mayor a 0.' };
    }
    if (!calc.hasMax2Decimals(n)) { return { error: label + ' admite máximo 2 decimales.' }; }
    return { value: n };
  }

  function checkDate(errors, field, value, label) {
    if (isBlank(value)) { errors[field] = label + ' es obligatoria.'; return false; }
    if (!calc.isValidISODate(String(value))) { errors[field] = label + ' no es válida (formato AAAA-MM-DD).'; return false; }
    return true;
  }

  /* ---------- Viaje: REQ-002, REQ-003, REQ-030 ---------- */
  function validateTrip(draft) {
    var e = {};
    if (isBlank(draft.name)) { e.name = 'El nombre del viaje es obligatorio.'; }
    if (isBlank(draft.destination)) { e.destination = 'El destino es obligatorio.'; }
    var okStart = checkDate(e, 'startDate', draft.startDate, 'La fecha de inicio');
    var okEnd = checkDate(e, 'endDate', draft.endDate, 'La fecha de fin');
    if (okStart && okEnd && draft.endDate < draft.startDate) {
      e.endDate = 'La fecha de fin no puede ser anterior a la fecha de inicio.';
    }
    return e;
  }

  /* ---------- Gasto: REQ-025..029, REQ-047, REQ-055, REQ-065 (y T-00.6) ---------- */
  function validateExpense(draft, state) {
    var e = {};
    var isFixed = draft.isFixed === true;
    if (checkDate(e, 'date', draft.date, 'La fecha')) {
      // Gastos variables dentro del viaje (REQ-027), también al editar uno que quedó fuera (T-00.6).
      if (!isFixed && !calc.isInTrip(state.trip, draft.date)) {
        e.date = state.trip
          ? 'La fecha debe estar entre ' + rangeText(state.trip) + ' (los gastos fijos están exentos).'
          : 'Primero cree un viaje.';
      }
    }
    if (isBlank(draft.categoryId)) {
      e.categoryId = 'Seleccione una categoría.';
    } else if (!calc.getCategory(state, draft.categoryId)) {
      e.categoryId = 'La categoría seleccionada no existe.';
    } else if (draft.categoryId === calc.CAT_FOOD) {
      if (isBlank(draft.mealType)) { e.mealType = 'Seleccione el tipo de comida.'; }
      else if (calc.MEAL_TYPES.indexOf(draft.mealType) === -1) { e.mealType = 'Tipo de comida no válido.'; }
    }
    var amount = parseAmount(draft.amount);
    if (amount.error) { e.amount = amount.error; }
    if (isBlank(draft.description)) { e.description = 'La descripción es obligatoria.'; }
    return e;
  }

  /* ---------- Categoría: REQ-018, REQ-023, REQ-065 ---------- */
  function validateCategory(draft, state, originalId) {
    var e = {};
    if (isBlank(draft.name)) {
      e.name = 'El nombre de la categoría es obligatorio.';
    } else {
      var name = String(draft.name).trim().toLowerCase();
      var dup = state.categories.some(function (c) {
        return c.id !== originalId && c.name.trim().toLowerCase() === name;
      });
      if (dup) { e.name = 'Ya existe una categoría con ese nombre.'; }
    }
    if (!isBlank(draft.allocated)) {
      var a = parseAmount(draft.allocated, { label: 'El monto asignado' });
      if (a.error) { e.allocated = a.error; }
    }
    return e;
  }

  /* ---------- Eliminar categoría: REQ-048 ---------- */
  function validateCategoryDelete(catId, state) {
    var c = calc.getCategory(state, catId);
    if (!c) { return { category: 'La categoría no existe.' }; }
    if (c.system) { return { category: '"' + c.name + '" es una categoría del sistema y no se puede eliminar.' }; }
    return {};
  }

  /* ---------- Actividad: REQ-031, REQ-061, REQ-065 (y T-00.6) ---------- */
  function validateActivity(draft, state, original) {
    var e = {};
    if (isBlank(draft.title)) { e.title = 'El nombre de la actividad es obligatorio.'; }
    if (checkDate(e, 'date', draft.date, 'La fecha')) {
      if (!calc.isInTrip(state.trip, draft.date)) {
        e.date = state.trip
          ? 'La fecha debe estar entre ' + rangeText(state.trip) + '. Mueva la actividad dentro del viaje para poder editarla.'
          : 'Primero cree un viaje.';
      }
    }
    if (isBlank(draft.time)) { e.time = 'La hora es obligatoria.'; }
    else if (!TIME_RE.test(String(draft.time))) { e.time = 'La hora no es válida (HH:MM).'; }
    if (isBlank(draft.categoryId)) { e.categoryId = 'Seleccione una categoría.'; }
    else if (!calc.getCategory(state, draft.categoryId)) { e.categoryId = 'La categoría seleccionada no existe.'; }
    var cost = null;
    if (!isBlank(draft.estimatedCost)) {
      var c = parseAmount(draft.estimatedCost, { label: 'El costo estimado', allowZero: true });
      if (c.error) { e.estimatedCost = c.error; } else { cost = c.value; }
    }
    if (STATUSES.indexOf(draft.status) === -1) { e.status = 'Estado no válido.'; }
    if (original && original.convertedExpenseId) {
      if (draft.status !== 'completado') {
        e.status = 'La actividad ya fue convertida en gasto: elimine primero el gasto enlazado para cambiar su estado.';
      }
      if (!e.estimatedCost && !(cost > 0)) {
        e.estimatedCost = 'Una actividad convertida debe conservar un costo estimado mayor a 0.';
      }
    }
    return e;
  }

  /* ---------- Conversión: REQ-043, REQ-045, REQ-046 ---------- */
  function validateConversion(activity) {
    if (!activity) { return { activity: 'La actividad no existe.' }; }
    if (activity.convertedExpenseId) { return { activity: 'Esta actividad ya fue convertida en gasto.' }; }
    if (activity.status !== 'completado') { return { activity: 'Solo se pueden convertir actividades completadas.' }; }
    if (!(activity.estimatedCost > 0)) { return { activity: 'La actividad no tiene un costo estimado.' }; }
    return {};
  }

  function hasErrors(errors) { return !!errors && Object.keys(errors).length > 0; }

  Viajero.validate = {
    isBlank: isBlank,
    parseAmount: parseAmount,
    validateTrip: validateTrip,
    validateExpense: validateExpense,
    validateCategory: validateCategory,
    validateCategoryDelete: validateCategoryDelete,
    validateActivity: validateActivity,
    validateConversion: validateConversion,
    hasErrors: hasErrors
  };
}(window));
