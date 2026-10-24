/*
 * storage.js — Mochila.storage
 * Persistencia en LocalStorage (REQ-039, REQ-040, REQ-041, REQ-064).
 * validateState() replica a mano docs/data-contract.json (D8: sin librerías de JSON Schema).
 */
(function (global) {
  'use strict';

  var Mochila = global.Mochila = global.Mochila || {};
  var calc = Mochila.calc;

  var STORAGE_KEY = 'mochila.state';
  var SCHEMA_VERSION = 2;

  var RE = {
    tripId: /^trip-[a-z0-9-]+$/,
    catId: /^cat-[a-z0-9-]+$/,
    expId: /^exp-[a-z0-9-]+$/,
    actId: /^act-[a-z0-9-]+$/,
    notBlank: /\S/,
    time: /^([01]\d|2[0-3]):[0-5]\d$/
  };
  var STATUSES = ['pendiente', 'en_progreso', 'completado'];
  var SYSTEM_IDS = [calc.CAT_FOOD, calc.CAT_TRANSPORT];

  /** Estado vacío: sin viaje y solo con las categorías del sistema (REQ-041). */
  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      trip: null,
      categories: [
        { id: calc.CAT_FOOD, name: 'Comida', tracking: 'daily', system: true },
        { id: calc.CAT_TRANSPORT, name: 'Transporte', tracking: 'daily', system: true }
      ],
      expenses: [],
      itinerary: []
    };
  }

  /* ---------- Validador del contrato (schemaVersion 2) ---------- */

  function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function isNum(n) { return typeof n === 'number' && isFinite(n); }
  function isStr(s) { return typeof s === 'string'; }

  function checkKeys(errors, path, o, required, allowed) {
    required.forEach(function (k) {
      if (!(k in o)) { errors.push(path + ': falta "' + k + '"'); }
    });
    Object.keys(o).forEach(function (k) {
      if (allowed.indexOf(k) === -1) { errors.push(path + ': campo no permitido "' + k + '"'); }
    });
  }

  function checkTrip(errors, t) {
    if (t === null) { return; }
    if (!isObj(t)) { errors.push('trip: debe ser objeto o null'); return; }
    checkKeys(errors, 'trip', t, ['id', 'name', 'destination', 'startDate', 'endDate'],
      ['id', 'name', 'destination', 'startDate', 'endDate']);
    if (!isStr(t.id) || !RE.tripId.test(t.id)) { errors.push('trip.id inválido'); }
    if (!isStr(t.name) || !RE.notBlank.test(t.name)) { errors.push('trip.name vacío'); }
    if (!isStr(t.destination) || !RE.notBlank.test(t.destination)) { errors.push('trip.destination vacío'); }
    if (!calc.isValidISODate(t.startDate)) { errors.push('trip.startDate inválida'); }
    if (!calc.isValidISODate(t.endDate)) { errors.push('trip.endDate inválida'); }
  }

  function checkCategory(errors, c, i) {
    var p = 'categories[' + i + ']';
    if (!isObj(c)) { errors.push(p + ': debe ser objeto'); return; }
    checkKeys(errors, p, c, ['id', 'name', 'tracking', 'system'], ['id', 'name', 'allocated', 'tracking', 'system']);
    if (!isStr(c.id) || !RE.catId.test(c.id)) { errors.push(p + '.id inválido'); }
    if (!isStr(c.name) || !RE.notBlank.test(c.name)) { errors.push(p + '.name vacío'); }
    if ('allocated' in c && !(isNum(c.allocated) && c.allocated > 0)) { errors.push(p + '.allocated debe ser > 0'); }
    if (['daily', 'total'].indexOf(c.tracking) === -1) { errors.push(p + '.tracking inválido'); }
    if (typeof c.system !== 'boolean') { errors.push(p + '.system debe ser booleano'); }
    var isSystem = SYSTEM_IDS.indexOf(c.id) !== -1;
    if (c.tracking === 'daily' && !isSystem) { errors.push(p + ': solo comida y transporte son diarias'); }
    if (isSystem && (c.system !== true || c.tracking !== 'daily')) { errors.push(p + ': categoría del sistema mal definida'); }
    if (!isSystem && c.system !== false) { errors.push(p + ': system debe ser false'); }
  }

  function checkExpense(errors, e, i) {
    var p = 'expenses[' + i + ']';
    if (!isObj(e)) { errors.push(p + ': debe ser objeto'); return; }
    checkKeys(errors, p, e, ['id', 'categoryId', 'amount', 'description', 'date', 'isFixed', 'createdAt'],
      ['id', 'categoryId', 'amount', 'description', 'date', 'time', 'mealType', 'isFixed', 'linkedActivityId', 'createdAt']);
    if (!isStr(e.id) || !RE.expId.test(e.id)) { errors.push(p + '.id inválido'); }
    if (!isStr(e.categoryId) || !RE.catId.test(e.categoryId)) { errors.push(p + '.categoryId inválido'); }
    if (!(isNum(e.amount) && e.amount > 0)) { errors.push(p + '.amount debe ser > 0'); }
    if (!isStr(e.description) || !RE.notBlank.test(e.description)) { errors.push(p + '.description vacía'); }
    if (!calc.isValidISODate(e.date)) { errors.push(p + '.date inválida'); }
    if ('time' in e && !(isStr(e.time) && RE.time.test(e.time))) { errors.push(p + '.time inválida'); }
    if (typeof e.isFixed !== 'boolean') { errors.push(p + '.isFixed debe ser booleano'); }
    if ('linkedActivityId' in e && !(isStr(e.linkedActivityId) && RE.actId.test(e.linkedActivityId))) {
      errors.push(p + '.linkedActivityId inválido');
    }
    if (!(Number.isInteger(e.createdAt) && e.createdAt >= 0)) { errors.push(p + '.createdAt inválido'); }
    if (e.categoryId === calc.CAT_FOOD) {
      if (calc.MEAL_TYPES.indexOf(e.mealType) === -1) { errors.push(p + '.mealType requerido para comida'); }
    } else if ('mealType' in e) {
      errors.push(p + '.mealType solo se permite en comida');
    }
  }

  function checkActivity(errors, a, i) {
    var p = 'itinerary[' + i + ']';
    if (!isObj(a)) { errors.push(p + ': debe ser objeto'); return; }
    checkKeys(errors, p, a, ['id', 'date', 'time', 'title', 'categoryId', 'status'],
      ['id', 'date', 'time', 'title', 'location', 'categoryId', 'notes', 'estimatedCost', 'status', 'convertedExpenseId']);
    if (!isStr(a.id) || !RE.actId.test(a.id)) { errors.push(p + '.id inválido'); }
    if (!calc.isValidISODate(a.date)) { errors.push(p + '.date inválida'); }
    if (!(isStr(a.time) && RE.time.test(a.time))) { errors.push(p + '.time inválida'); }
    if (!isStr(a.title) || !RE.notBlank.test(a.title)) { errors.push(p + '.title vacío'); }
    if ('location' in a && !isStr(a.location)) { errors.push(p + '.location inválido'); }
    if ('notes' in a && !isStr(a.notes)) { errors.push(p + '.notes inválido'); }
    if (!isStr(a.categoryId) || !RE.catId.test(a.categoryId)) { errors.push(p + '.categoryId inválido'); }
    if ('estimatedCost' in a && !(isNum(a.estimatedCost) && a.estimatedCost >= 0)) { errors.push(p + '.estimatedCost inválido'); }
    if (STATUSES.indexOf(a.status) === -1) { errors.push(p + '.status inválido'); }
    if ('convertedExpenseId' in a) {
      if (!(isStr(a.convertedExpenseId) && RE.expId.test(a.convertedExpenseId))) { errors.push(p + '.convertedExpenseId inválido'); }
      if (a.status !== 'completado') { errors.push(p + ': una actividad convertida debe estar completada'); }
      if (!(isNum(a.estimatedCost) && a.estimatedCost > 0)) { errors.push(p + ': una actividad convertida requiere costo > 0'); }
    }
  }

  /** Devuelve { valid, errors[] } según docs/data-contract.json. */
  function validateState(s) {
    var errors = [];
    if (!isObj(s)) { return { valid: false, errors: ['El estado debe ser un objeto'] }; }
    checkKeys(errors, 'estado', s, ['schemaVersion', 'trip', 'categories', 'expenses', 'itinerary'],
      ['schemaVersion', 'trip', 'categories', 'expenses', 'itinerary']);
    if (s.schemaVersion !== SCHEMA_VERSION) { errors.push('schemaVersion debe ser ' + SCHEMA_VERSION); }
    checkTrip(errors, s.trip === undefined ? null : s.trip);
    if (!Array.isArray(s.categories)) { errors.push('categories debe ser arreglo'); }
    else {
      s.categories.forEach(function (c, i) { checkCategory(errors, c, i); });
      SYSTEM_IDS.forEach(function (id) {
        if (!s.categories.some(function (c) { return isObj(c) && c.id === id; })) { errors.push('falta la categoría ' + id); }
      });
    }
    if (!Array.isArray(s.expenses)) { errors.push('expenses debe ser arreglo'); }
    else { s.expenses.forEach(function (e, i) { checkExpense(errors, e, i); }); }
    if (!Array.isArray(s.itinerary)) { errors.push('itinerary debe ser arreglo'); }
    else { s.itinerary.forEach(function (a, i) { checkActivity(errors, a, i); }); }
    return { valid: errors.length === 0, errors: errors };
  }

  /* ---------- Lectura / escritura ---------- */

  /** REQ-040/041: devuelve { state, notice }. Nunca lanza excepciones. */
  function loadState() {
    var raw;
    try {
      raw = global.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return {
        state: emptyState(),
        notice: { type: 'warning', text: 'Este navegador no permite leer los datos guardados. La aplicación funciona, pero los cambios podrían no guardarse.' }
      };
    }
    if (raw === null) { return { state: emptyState(), notice: null }; }
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return { state: emptyState(), notice: corruptNotice() };
    }
    var check = validateState(parsed);
    if (!check.valid) {
      if (global.console) { global.console.warn('[Mochila] Estado guardado inválido:', check.errors); }
      return { state: emptyState(), notice: corruptNotice() };
    }
    return { state: parsed, notice: null };
  }

  function corruptNotice() {
    return {
      type: 'error',
      text: 'Los datos guardados estaban dañados o no cumplen el formato esperado. Se inició con un estado vacío.'
    };
  }

  /** REQ-039 / REQ-064: devuelve true, o el error si no se pudo guardar (nunca lanza). */
  function saveState(state) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      return err || new Error('No se pudo guardar');
    }
  }

  Mochila.storage = {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    emptyState: emptyState,
    validateState: validateState,
    loadState: loadState,
    saveState: saveState
  };
}(window));
