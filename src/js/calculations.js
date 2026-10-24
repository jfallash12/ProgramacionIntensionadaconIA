/*
 * calculations.js — Mochila.calc
 * Funciones PURAS (sin DOM, sin estado propio): fechas, dinero y valores derivados.
 * Reglas: RN-01..RN-04, RN-06, RN-07 (docs/design.md §3). Nada de lo que se calcula aquí se persiste.
 */
(function (global) {
  'use strict';

  var Mochila = global.Mochila = global.Mochila || {};

  var DAY_MS = 86400000;
  var ISO_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  var EPS = 1e-9;

  var CAT_FOOD = 'cat-comida';
  var CAT_TRANSPORT = 'cat-transporte';
  var MEAL_TYPES = ['desayuno', 'almuerzo', 'cena', 'snack_cafe', 'bebidas_bar'];

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* ---------- Fechas (D2, D3): siempre texto ISO; cálculos en UTC ---------- */

  function isValidISODate(s) {
    if (typeof s !== 'string' || !ISO_RE.test(s)) { return false; }
    var p = s.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
  }

  /** Devuelve los milisegundos UTC de la fecha ISO, o null si no es válida. */
  function parseISODate(s) {
    if (!isValidISODate(s)) { return null; }
    var p = s.split('-').map(Number);
    return Date.UTC(p[0], p[1] - 1, p[2]);
  }

  function toISODate(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  /** "HOY" según el reloj LOCAL del dispositivo (REQ-054, D3). */
  function todayISO(now) {
    var d = now || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function addDays(iso, n) {
    var ms = parseISODate(iso);
    return ms === null ? null : toISODate(ms + n * DAY_MS);
  }

  /** RN-01 (REQ-004, REQ-005): días inclusivos. 0 si no hay viaje o las fechas no son válidas. */
  function totalDays(trip) {
    if (!trip) { return 0; }
    var a = parseISODate(trip.startDate);
    var b = parseISODate(trip.endDate);
    if (a === null || b === null || b < a) { return 0; }
    return Math.round((b - a) / DAY_MS) + 1;
  }

  function tripDates(trip) {
    var n = totalDays(trip);
    var out = [];
    for (var i = 0; i < n; i++) { out.push(addDays(trip.startDate, i)); }
    return out;
  }

  /** Las fechas ISO se comparan como texto de forma segura. */
  function isInTrip(trip, iso) {
    return !!trip && typeof iso === 'string' && iso >= trip.startDate && iso <= trip.endDate;
  }

  function dayNumber(trip, iso) {
    if (!isInTrip(trip, iso)) { return null; }
    return Math.round((parseISODate(iso) - parseISODate(trip.startDate)) / DAY_MS) + 1;
  }

  /** REQ-054: HOY si está en el viaje; si es antes, el día 1; si es después, el último día. */
  function initialSelectedDate(trip, today) {
    if (!trip) { return null; }
    var t = today || todayISO();
    if (t < trip.startDate) { return trip.startDate; }
    if (t > trip.endDate) { return trip.endDate; }
    return t;
  }

  /* ---------- Dinero (D4, REQ-050, REQ-065) ---------- */

  function toCents(n) { return Math.round(Number(n) * 100); }

  function sumAmounts(list) {
    var cents = 0;
    for (var i = 0; i < list.length; i++) { cents += toCents(list[i].amount); }
    return cents / 100;
  }

  function hasMax2Decimals(n) {
    if (typeof n !== 'number' || !isFinite(n)) { return false; }
    var scaled = n * 100;
    return Math.abs(scaled - Math.round(scaled)) < 1e-6;
  }

  /** Redondeo a la mitad hacia arriba (en magnitud) a 2 decimales. */
  function roundMoney(n) {
    var sign = n < 0 ? -1 : 1;
    return sign * Math.round(Math.abs(n) * 100 + EPS) / 100;
  }

  function groupThousands(intStr) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /** formatMoney(25.5) → "$25.50"; con {sign:true}: "+$25.50" / "−$9.50". */
  function formatMoney(n, opts) {
    var v = roundMoney(Number(n) || 0);
    var abs = Math.abs(v).toFixed(2).split('.');
    var body = '$' + groupThousands(abs[0]) + '.' + abs[1];
    if (v < 0) { return '−' + body; }
    if (opts && opts.sign) { return '+' + body; }
    return body;
  }

  function formatPercent(p) {
    return Math.round((Number(p) || 0) + EPS) + ' %';
  }

  /* ---------- Derivados diarios (RN-02, RN-03, RN-04) ---------- */

  function getCategory(state, catId) {
    for (var i = 0; i < state.categories.length; i++) {
      if (state.categories[i].id === catId) { return state.categories[i]; }
    }
    return null;
  }

  function isVariable(e) { return e.isFixed !== true; }

  /** DailyFoodLimit / DailyTransportLimit (REQ-019). null = sin presupuesto (REQ-052). */
  function dailyLimit(state, catId) {
    var c = getCategory(state, catId);
    var n = totalDays(state.trip);
    if (!c || c.tracking !== 'daily' || typeof c.allocated !== 'number' || n <= 0) { return null; }
    return c.allocated / n;
  }

  /** Suma de gastos VARIABLES de la categoría en la fecha (REQ-011, REQ-020). */
  function dayAccumulated(state, catId, date) {
    return sumAmounts(state.expenses.filter(function (e) {
      return isVariable(e) && e.categoryId === catId && e.date === date;
    }));
  }

  /** Disponible Hoy = (Total / Días) − Acumulado del Día (REQ-020). */
  function dailyAvailable(state, catId, date) {
    var limit = dailyLimit(state, catId);
    if (limit === null) { return null; }
    return limit - dayAccumulated(state, catId, date);
  }

  function dailyPercent(state, catId, date) {
    var limit = dailyLimit(state, catId);
    if (limit === null || limit <= 0) { return null; }
    return dayAccumulated(state, catId, date) / limit * 100;
  }

  /** RN-04: ≤80 ok · ≤100 warning · >100 exceeded. Se evalúa SIN redondear. */
  function statusFromPercent(p) {
    if (p <= 80 + EPS) { return 'ok'; }
    if (p <= 100 + EPS) { return 'warning'; }
    return 'exceeded';
  }

  function dailyStatus(state, catId, date) {
    var p = dailyPercent(state, catId, date);
    return p === null ? null : statusFromPercent(p);
  }

  /** Acumulado de comida del día por tipo de comida (QuickMealButtons). */
  function mealTotals(state, date) {
    var out = {};
    MEAL_TYPES.forEach(function (m) {
      out[m] = sumAmounts(state.expenses.filter(function (e) {
        return isVariable(e) && e.categoryId === CAT_FOOD && e.date === date && e.mealType === m;
      }));
    });
    return out;
  }

  /* ---------- Derivados globales (RN-06, RN-07) ---------- */

  /** Gastado de una categoría, fijos incluidos (REQ-011). */
  function categorySpent(state, catId) {
    return sumAmounts(state.expenses.filter(function (e) { return e.categoryId === catId; }));
  }

  function categoryFixed(state, catId) {
    return sumAmounts(state.expenses.filter(function (e) { return e.categoryId === catId && e.isFixed === true; }));
  }

  /** GlobalBudget (REQ-006, REQ-012, REQ-014, REQ-051). */
  function globalBudget(state) {
    var totalCents = 0;
    state.categories.forEach(function (c) {
      if (typeof c.allocated === 'number') { totalCents += toCents(c.allocated); }
    });
    var total = totalCents / 100;
    var spent = sumAmounts(state.expenses);
    var committed = sumAmounts(state.expenses.filter(function (e) { return e.isFixed === true; }));
    var available = (toCents(total) - toCents(spent)) / 100;
    var percent = total > 0 ? spent / total * 100 : (spent > 0 ? Infinity : 0);
    var status = 'ok';
    if (spent > total + EPS) { status = 'exceeded'; }
    else if (committed > 0 && committed >= total - EPS) { status = 'committed'; }
    return { total: total, spent: spent, committed: committed, available: available, percent: percent, status: status };
  }

  /** Total del Día: gastos variables de TODAS las categorías en la fecha (REQ-053). */
  function dayTotal(state, date) {
    return sumAmounts(state.expenses.filter(function (e) { return isVariable(e) && e.date === date; }));
  }

  function compareExpenses(a, b) {
    var ta = a.time || '99:99';
    var tb = b.time || '99:99';
    if (ta !== tb) { return ta < tb ? -1 : 1; }
    return a.createdAt - b.createdAt;
  }

  /**
   * Agrupa los gastos para el historial: un grupo por fecha (gastos variables, fecha descendente)
   * y al final el grupo "Pre-viaje / Fijos" (REQ-047). Cada grupo trae su total.
   */
  function groupExpensesByDate(state) {
    var byDate = {};
    var fixed = [];
    state.expenses.forEach(function (e) {
      if (e.isFixed === true) { fixed.push(e); return; }
      (byDate[e.date] = byDate[e.date] || []).push(e);
    });
    var groups = Object.keys(byDate).sort().reverse().map(function (date) {
      var list = byDate[date].slice().sort(compareExpenses);
      return {
        kind: 'day',
        date: date,
        dayNumber: dayNumber(state.trip, date),
        outOfRange: !isInTrip(state.trip, date),
        expenses: list,
        total: dayTotal(state, date)
      };
    });
    if (fixed.length) {
      fixed.sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : compareExpenses(a, b)); });
      groups.push({ kind: 'fixed', date: null, dayNumber: null, outOfRange: false, expenses: fixed, total: sumAmounts(fixed) });
    }
    return groups;
  }

  /** Elementos que quedarían fuera de un nuevo rango de fechas (REQ-009). Los fijos no cuentan. */
  function itemsOutOfRange(state, newStart, newEnd) {
    var range = { startDate: newStart, endDate: newEnd };
    return {
      expenses: state.expenses.filter(function (e) { return isVariable(e) && !isInTrip(range, e.date); }),
      activities: state.itinerary.filter(function (a) { return !isInTrip(range, a.date); })
    };
  }

  /** REQ-043, REQ-046: completada, con costo > 0 y no convertida. */
  function canConvert(activity) {
    return !!activity && activity.status === 'completado' &&
      typeof activity.estimatedCost === 'number' && activity.estimatedCost > 0 &&
      !activity.convertedExpenseId;
  }

  Mochila.calc = {
    CAT_FOOD: CAT_FOOD,
    CAT_TRANSPORT: CAT_TRANSPORT,
    MEAL_TYPES: MEAL_TYPES,
    // fechas
    isValidISODate: isValidISODate,
    parseISODate: parseISODate,
    toISODate: toISODate,
    todayISO: todayISO,
    addDays: addDays,
    totalDays: totalDays,
    tripDates: tripDates,
    isInTrip: isInTrip,
    dayNumber: dayNumber,
    initialSelectedDate: initialSelectedDate,
    // dinero
    toCents: toCents,
    sumAmounts: sumAmounts,
    hasMax2Decimals: hasMax2Decimals,
    roundMoney: roundMoney,
    formatMoney: formatMoney,
    formatPercent: formatPercent,
    // derivados
    getCategory: getCategory,
    dailyLimit: dailyLimit,
    dayAccumulated: dayAccumulated,
    dailyAvailable: dailyAvailable,
    dailyPercent: dailyPercent,
    statusFromPercent: statusFromPercent,
    dailyStatus: dailyStatus,
    mealTotals: mealTotals,
    categorySpent: categorySpent,
    categoryFixed: categoryFixed,
    globalBudget: globalBudget,
    dayTotal: dayTotal,
    groupExpensesByDate: groupExpensesByDate,
    itemsOutOfRange: itemsOutOfRange,
    canConvert: canConvert
  };
}(window));
