/*
 * app.js — Mochila.app
 * Único dueño del estado. Todo cambio pasa por dispatch(action) (docs/design.md §5.4):
 *   requireTrip → validar → (confirmar) → reducer → validar contrato → saveState → render
 */
(function (global) {
  'use strict';

  var V = global.Mochila = global.Mochila || {};
  var calc = V.calc;
  var validate = V.validate;
  var storage = V.storage;

  var state = null;
  var ui = null;
  var root = null;

  /* ====================================================================== */
  /* Utilidades                                                              */
  /* ====================================================================== */

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /** IDs que cumplen los patterns del contrato (D7): prefijo-base36-aleatorio. */
  function newId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function trimOr(v) { return String(v === undefined || v === null ? '' : v).trim(); }

  function findById(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return null;
  }

  function categoryName(id) {
    var c = calc.getCategory(state, id);
    return c ? c.name : '(categoría eliminada)';
  }

  function firstError(errors) {
    var keys = Object.keys(errors);
    return keys.length ? errors[keys[0]] : '';
  }

  /* ====================================================================== */
  /* Estado de interfaz (no se persiste)                                     */
  /* ====================================================================== */

  function initialUi() {
    return {
      activeTab: 'daily',
      selectedDate: null,
      drafts: {},
      touched: {},
      errors: {},
      dialog: null,
      notice: null,
      storageError: false,
      focus: null
    };
  }

  function defaultDraft(name) {
    var date = ui.selectedDate || (state.trip ? state.trip.startDate : '');
    switch (name) {
      case 'trip': return { name: '', destination: '', startDate: '', endDate: '' };
      case 'expense': return { date: date, categoryId: '', mealType: '', amount: '', description: '', isFixed: false };
      case 'activity': return { date: date, time: '', title: '', categoryId: '', estimatedCost: '', location: '', status: 'pendiente' };
      case 'category': return { name: '', allocated: '' };
      default: return {};
    }
  }

  function getDraft(name) {
    if (!ui.drafts[name]) { ui.drafts[name] = defaultDraft(name); }
    return ui.drafts[name];
  }

  function resetForm(name, keep) {
    var d = defaultDraft(name);
    if (keep) { Object.keys(keep).forEach(function (k) { d[k] = keep[k]; }); }
    ui.drafts[name] = d;
    ui.touched[name] = {};
    ui.errors[name] = {};
  }

  function touchAll(name, errors) {
    ui.touched[name] = ui.touched[name] || {};
    Object.keys(errors).forEach(function (k) { ui.touched[name][k] = true; });
  }

  function setNotice(type, text) { ui.notice = { type: type, text: text }; }

  function openDialog(d) {
    d.previous = ui.dialog;
    ui.dialog = d;
  }

  /* ====================================================================== */
  /* Validación de formularios (validación en vivo y al enviar)              */
  /* ====================================================================== */

  function draftFromExpense(e) {
    return {
      date: e.date, categoryId: e.categoryId, mealType: e.mealType || '',
      amount: String(e.amount), description: e.description, isFixed: e.isFixed === true
    };
  }

  function draftFromActivity(a) {
    return {
      date: a.date, time: a.time, title: a.title, categoryId: a.categoryId,
      estimatedCost: typeof a.estimatedCost === 'number' ? String(a.estimatedCost) : '',
      location: a.location || '', status: a.status
    };
  }

  function usageOf(catId) {
    return {
      expenses: state.expenses.filter(function (e) { return e.categoryId === catId; }),
      activities: state.itinerary.filter(function (a) { return a.categoryId === catId; })
    };
  }

  function validateReassign(draft, catId) {
    var e = validate.validateCategoryDelete(catId, state);
    if (validate.hasErrors(e)) { return e; }
    var use = usageOf(catId);
    if (use.expenses.length + use.activities.length === 0) { return {}; }
    if (validate.isBlank(draft.targetId)) { return { targetId: 'Seleccione la categoría destino.' }; }
    if (draft.targetId === catId || !calc.getCategory(state, draft.targetId)) { return { targetId: 'Categoría destino no válida.' }; }
    if (draft.targetId === calc.CAT_FOOD) {
      use.expenses.forEach(function (x) {
        if (calc.MEAL_TYPES.indexOf(draft['meal_' + x.id]) === -1) {
          e['meal_' + x.id] = 'Seleccione el tipo de comida.';
        }
      });
    }
    return e;
  }

  function validateForm(name, draft, id) {
    switch (name) {
      case 'trip':
      case 'tripEdit': return validate.validateTrip(draft);
      case 'expense':
      case 'expenseEdit': return validate.validateExpense(draft, state);
      case 'convert': {
        var e = validate.validateExpense(draft, state);
        var c = validate.validateConversion(findById(state.itinerary, id));
        if (c.activity) { e._form = c.activity; }
        return e;
      }
      case 'category': return validate.validateCategory(draft, state, null);
      case 'categoryEdit': return validate.validateCategory(draft, state, id);
      case 'activity': return validate.validateActivity(draft, state, null);
      case 'activityEdit': return validate.validateActivity(draft, state, findById(state.itinerary, id));
      case 'reassign': return validateReassign(draft, id);
      default: return {};
    }
  }

  /* ====================================================================== */
  /* Constructores de entidades (borrador → objeto del contrato)             */
  /* ====================================================================== */

  function buildTrip(d, id) {
    return { id: id, name: trimOr(d.name), destination: trimOr(d.destination), startDate: d.startDate, endDate: d.endDate };
  }

  function buildExpense(d, base) {
    var e = {
      id: base.id,
      categoryId: d.categoryId,
      amount: validate.parseAmount(d.amount).value,
      description: trimOr(d.description),
      date: d.date,
      isFixed: d.isFixed === true,
      createdAt: base.createdAt
    };
    if (base.time) { e.time = base.time; }
    if (d.categoryId === calc.CAT_FOOD) { e.mealType = d.mealType; } // REQ-056: solo en comida
    if (base.linkedActivityId) { e.linkedActivityId = base.linkedActivityId; }
    return e;
  }

  function buildActivity(d, base) {
    var a = {
      id: base.id, date: d.date, time: d.time, title: trimOr(d.title),
      categoryId: d.categoryId, status: d.status
    };
    if (trimOr(d.location)) { a.location = trimOr(d.location); }
    if (base.notes) { a.notes = base.notes; }
    if (!validate.isBlank(d.estimatedCost)) {
      a.estimatedCost = validate.parseAmount(d.estimatedCost, { allowZero: true }).value;
    }
    if (base.convertedExpenseId) { a.convertedExpenseId = base.convertedExpenseId; }
    return a;
  }

  function buildCategory(d, base) {
    var c = { id: base.id, name: trimOr(d.name), tracking: base.tracking, system: base.system };
    if (!validate.isBlank(d.allocated)) {
      c.allocated = validate.parseAmount(d.allocated).value;
    }
    return c;
  }

  /* ====================================================================== */
  /* Acciones de dominio                                                     */
  /* ====================================================================== */

  var DOMAIN = {
    /* ----- Viaje ----- */
    CREATE_TRIP: {
      form: 'trip',
      validate: function (a) {
        var e = validate.validateTrip(a.draft);
        if (state.trip) { e._form = 'Ya existe un viaje. Para crear otro, primero elimine el viaje actual.'; } // REQ-062
        return e;
      },
      reduce: function (s, a) { s.trip = buildTrip(a.draft, newId('trip')); },
      after: function () {
        resetForm('trip');
        ui.selectedDate = calc.initialSelectedDate(state.trip, calc.todayISO());
        resetForm('expense');
        resetForm('activity');
        ui.activeTab = 'daily';
        setNotice('ok', 'Viaje creado: ' + calc.totalDays(state.trip) + ' días.');
      }
    },

    UPDATE_TRIP: {
      form: 'tripEdit', requiresTrip: true,
      validate: function (a) { return validate.validateTrip(a.draft); },
      confirm: function (a) { // REQ-008, REQ-009
        if (state.expenses.length + state.itinerary.length === 0) { return null; }
        var d = a.draft;
        var t = state.trip;
        if (trimOr(d.name) === t.name && trimOr(d.destination) === t.destination &&
          d.startDate === t.startDate && d.endDate === t.endDate) { return null; }
        var out = calc.itemsOutOfRange(state, d.startDate, d.endDate);
        var items = out.expenses.map(function (e) { return 'Gasto: ' + e.description + ' (' + e.date + ')'; })
          .concat(out.activities.map(function (x) { return 'Actividad: ' + x.title + ' (' + x.date + ')'; }));
        return {
          title: '¿Confirmar cambios del viaje?',
          message: items.length
            ? 'El viaje tiene gastos y actividades. Con las nuevas fechas, estos elementos quedarán fuera del rango. No se borrará ninguno, pero para editarlos tendrá que moverlos dentro del viaje:'
            : 'El viaje tiene gastos o actividades registrados. ¿Desea aplicar los cambios?',
          items: items,
          confirmLabel: 'Confirmar cambios'
        };
      },
      reduce: function (s, a) { s.trip = buildTrip(a.draft, s.trip.id); },
      after: function () {
        if (!calc.isInTrip(state.trip, ui.selectedDate)) {
          ui.selectedDate = calc.initialSelectedDate(state.trip, calc.todayISO());
        }
        resetForm('expense', { categoryId: getDraft('expense').categoryId });
        resetForm('activity');
        ui.dialog = null;
        setNotice('ok', 'Viaje actualizado.');
      }
    },

    DELETE_TRIP: {
      requiresTrip: true,
      confirm: function () { // REQ-063
        return {
          title: '¿Eliminar el viaje "' + state.trip.name + '"?',
          message: 'Se eliminarán el viaje, ' + state.expenses.length + ' gasto(s) y ' + state.itinerary.length +
            ' actividad(es). Las categorías se conservan. Esta acción no se puede deshacer.',
          items: [],
          confirmLabel: 'Eliminar viaje',
          danger: true
        };
      },
      reduce: function (s) { s.trip = null; s.expenses = []; s.itinerary = []; },
      after: function () {
        ui.selectedDate = null;
        ui.drafts = {};
        ui.touched = {};
        ui.errors = {};
        ui.activeTab = 'daily';
        setNotice('ok', 'Viaje eliminado.');
      }
    },

    /* ----- Categorías ----- */
    ADD_CATEGORY: {
      form: 'category',
      validate: function (a) { return validate.validateCategory(a.draft, state, null); },
      reduce: function (s, a) { // REQ-049: nuevas categorías siempre de bolsa total
        s.categories.push(buildCategory(a.draft, { id: newId('cat'), tracking: 'total', system: false }));
      },
      after: function () { resetForm('category'); setNotice('ok', 'Categoría creada.'); }
    },

    UPDATE_CATEGORY: {
      form: 'categoryEdit',
      validate: function (a) {
        if (!calc.getCategory(state, a.id)) { return { _form: 'La categoría no existe.' }; }
        return validate.validateCategory(a.draft, state, a.id);
      },
      reduce: function (s, a) {
        var i = s.categories.findIndex(function (c) { return c.id === a.id; });
        s.categories[i] = buildCategory(a.draft, s.categories[i]);
      },
      after: function () { ui.dialog = null; setNotice('ok', 'Categoría actualizada.'); }
    },

    DELETE_CATEGORY: { // REQ-015, REQ-016, REQ-017, REQ-048
      form: 'reassign',
      validate: function (a) { return validateReassign(a.draft || {}, a.id); },
      reduce: function (s, a) {
        var target = a.draft && a.draft.targetId;
        s.expenses.forEach(function (e) {
          if (e.categoryId !== a.id) { return; }
          e.categoryId = target;
          if (target === calc.CAT_FOOD) { e.mealType = a.draft['meal_' + e.id]; } else { delete e.mealType; }
        });
        s.itinerary.forEach(function (x) { if (x.categoryId === a.id) { x.categoryId = target; } });
        s.categories = s.categories.filter(function (c) { return c.id !== a.id; });
      },
      after: function () { ui.dialog = null; setNotice('ok', 'Categoría eliminada.'); }
    },

    /* ----- Gastos ----- */
    ADD_EXPENSE: {
      form: 'expense', requiresTrip: true,
      validate: function (a) { return validate.validateExpense(a.draft, state); },
      reduce: function (s, a) {
        s.expenses.push(buildExpense(a.draft, { id: newId('exp'), createdAt: Date.now() }));
      },
      after: function (a) {
        resetForm('expense', { date: a.draft.date, categoryId: a.draft.categoryId, mealType: a.draft.mealType });
        ui.focus = { form: 'expense', name: 'amount' };
        setNotice('ok', 'Gasto registrado: ' + calc.formatMoney(validate.parseAmount(a.draft.amount).value) + ' — ' + trimOr(a.draft.description) + '.');
      }
    },

    UPDATE_EXPENSE: { // REQ-057
      form: 'expenseEdit', requiresTrip: true,
      validate: function (a) {
        if (!findById(state.expenses, a.id)) { return { _form: 'El gasto no existe.' }; }
        return validate.validateExpense(a.draft, state);
      },
      reduce: function (s, a) {
        var i = s.expenses.findIndex(function (e) { return e.id === a.id; });
        s.expenses[i] = buildExpense(a.draft, s.expenses[i]);
      },
      after: function () { ui.dialog = null; setNotice('ok', 'Gasto actualizado.'); }
    },

    DELETE_EXPENSE: { // REQ-033, REQ-058
      confirm: function (a) {
        var e = findById(state.expenses, a.id);
        if (!e) { return null; }
        return {
          title: '¿Eliminar este gasto?',
          message: e.description + ' — ' + calc.formatMoney(e.amount) + ' (' + e.date + ').' +
            (e.linkedActivityId ? ' La actividad de origen quedará disponible para convertirse de nuevo.' : ''),
          items: [], confirmLabel: 'Eliminar gasto', danger: true
        };
      },
      validate: function (a) { return findById(state.expenses, a.id) ? {} : { _form: 'El gasto no existe.' }; },
      reduce: function (s, a) {
        var e = findById(s.expenses, a.id);
        s.expenses = s.expenses.filter(function (x) { return x.id !== a.id; });
        if (e.linkedActivityId) {
          var act = findById(s.itinerary, e.linkedActivityId);
          if (act) { delete act.convertedExpenseId; }
        }
      },
      after: function () { setNotice('ok', 'Gasto eliminado.'); }
    },

    /* ----- Itinerario ----- */
    ADD_ACTIVITY: { // REQ-035
      form: 'activity', requiresTrip: true,
      validate: function (a) { return validate.validateActivity(a.draft, state, null); },
      reduce: function (s, a) { s.itinerary.push(buildActivity(a.draft, { id: newId('act') })); }, // al final: nunca reordena (REQ-036)
      after: function (a) {
        resetForm('activity', { date: a.draft.date });
        setNotice('ok', 'Actividad agregada.');
      }
    },

    UPDATE_ACTIVITY: { // REQ-060, REQ-061
      form: 'activityEdit', requiresTrip: true,
      validate: function (a) {
        var orig = findById(state.itinerary, a.id);
        if (!orig) { return { _form: 'La actividad no existe.' }; }
        return validate.validateActivity(a.draft, state, orig);
      },
      reduce: function (s, a) {
        var i = s.itinerary.findIndex(function (x) { return x.id === a.id; });
        s.itinerary[i] = buildActivity(a.draft, s.itinerary[i]); // no toca expenses (REQ-060)
      },
      after: function () { ui.dialog = null; setNotice('ok', 'Actividad actualizada.'); }
    },

    SET_ACTIVITY_STATUS: {
      requiresTrip: true,
      validate: function (a) {
        var orig = findById(state.itinerary, a.id);
        if (!orig) { return { _form: 'La actividad no existe.' }; }
        var d = draftFromActivity(orig);
        d.status = a.status;
        return validate.validateActivity(d, state, orig);
      },
      reduce: function (s, a) { findById(s.itinerary, a.id).status = a.status; },
      after: function () { setNotice('ok', 'Estado de la actividad actualizado.'); }
    },

    DELETE_ACTIVITY: { // REQ-059
      confirm: function (a) {
        var x = findById(state.itinerary, a.id);
        if (!x) { return null; }
        return {
          title: '¿Eliminar la actividad "' + x.title + '"?',
          message: x.convertedExpenseId
            ? 'La actividad fue convertida en gasto. El gasto se conservará en el historial.'
            : 'Esta acción no se puede deshacer.',
          items: [], confirmLabel: 'Eliminar actividad', danger: true
        };
      },
      validate: function (a) { return findById(state.itinerary, a.id) ? {} : { _form: 'La actividad no existe.' }; },
      reduce: function (s, a) {
        s.itinerary = s.itinerary.filter(function (x) { return x.id !== a.id; });
        s.expenses.forEach(function (e) { if (e.linkedActivityId === a.id) { delete e.linkedActivityId; } });
      },
      after: function () { setNotice('ok', 'Actividad eliminada.'); }
    },

    CONVERT_ACTIVITY: { // REQ-043, REQ-044, REQ-045
      form: 'convert', requiresTrip: true,
      validate: function (a) { return validateForm('convert', a.draft, a.id); },
      reduce: function (s, a) {
        var act = findById(s.itinerary, a.id);
        var exp = buildExpense(a.draft, { id: newId('exp'), createdAt: Date.now(), time: act.time, linkedActivityId: act.id });
        s.expenses.push(exp);
        act.convertedExpenseId = exp.id;
      },
      after: function () { ui.dialog = null; setNotice('ok', 'Actividad convertida en gasto.'); }
    }
  };

  /* ====================================================================== */
  /* Acciones de interfaz (no mutan el estado de dominio)                    */
  /* ====================================================================== */

  var UI_ACTIONS = {
    SET_TAB: function (a) { ui.activeTab = a.tab; },

    SELECT_DAY: function (a) {
      if (!calc.isInTrip(state.trip, a.date)) { return; }
      ui.selectedDate = a.date;
      getDraft('expense').date = a.date;
      getDraft('activity').date = a.date;
    },

    PREFILL_MEAL: function (a) { // T-00.5: precarga el formulario y enfoca Monto
      var d = getDraft('expense');
      d.date = ui.selectedDate;
      d.categoryId = calc.CAT_FOOD;
      d.mealType = a.meal;
      d.isFixed = false;
      ui.activeTab = 'daily';
      ui.focus = { form: 'expense', name: 'amount' };
    },

    OPEN_TRIP_EDIT: function () {
      if (!state.trip) { return; }
      ui.drafts.tripEdit = {
        name: state.trip.name, destination: state.trip.destination,
        startDate: state.trip.startDate, endDate: state.trip.endDate
      };
      ui.touched.tripEdit = {};
      openDialog({ type: 'trip' });
    },

    OPEN_EDIT_EXPENSE: function (a) {
      var e = findById(state.expenses, a.id);
      if (!e) { return; }
      ui.drafts.expenseEdit = draftFromExpense(e);
      ui.touched.expenseEdit = {};
      openDialog({ type: 'expense', mode: 'edit', id: e.id });
    },

    OPEN_CONVERT: function (a) {
      var act = findById(state.itinerary, a.id);
      var err = validate.validateConversion(act);
      if (validate.hasErrors(err)) { setNotice('error', firstError(err)); return; } // REQ-045
      ui.drafts.convert = {
        date: act.date, categoryId: act.categoryId, mealType: '',
        amount: String(act.estimatedCost), description: act.title, isFixed: false
      };
      ui.touched.convert = {};
      openDialog({ type: 'expense', mode: 'convert', id: act.id });
    },

    OPEN_EDIT_ACTIVITY: function (a) {
      var x = findById(state.itinerary, a.id);
      if (!x) { return; }
      ui.drafts.activityEdit = draftFromActivity(x);
      ui.touched.activityEdit = {};
      openDialog({ type: 'activity', id: x.id });
    },

    OPEN_EDIT_CATEGORY: function (a) {
      var c = calc.getCategory(state, a.id);
      if (!c) { return; }
      ui.drafts.categoryEdit = { name: c.name, allocated: typeof c.allocated === 'number' ? String(c.allocated) : '' };
      ui.touched.categoryEdit = {};
      openDialog({ type: 'category', id: c.id });
    },

    REQUEST_DELETE_CATEGORY: function (a) {
      var err = validate.validateCategoryDelete(a.id, state);
      if (validate.hasErrors(err)) { setNotice('error', firstError(err)); return; } // REQ-048
      var use = usageOf(a.id);
      if (use.expenses.length + use.activities.length === 0) {
        return { type: 'DELETE_CATEGORY', id: a.id, draft: {} }; // REQ-017: inmediato
      }
      ui.drafts.reassign = { targetId: '' };
      ui.touched.reassign = {};
      openDialog({ type: 'reassign', id: a.id });
      return null;
    },

    CLOSE_DIALOG: function () { ui.dialog = ui.dialog ? (ui.dialog.previous || null) : null; },

    CONFIRM: function () {
      if (!ui.dialog || ui.dialog.type !== 'confirm') { return null; }
      var pending = ui.dialog.pending;
      ui.dialog = ui.dialog.previous || null;
      pending.confirmed = true;
      return pending;
    },

    DISMISS_NOTICE: function () { ui.notice = null; }
  };

  /* ====================================================================== */
  /* dispatch                                                                */
  /* ====================================================================== */

  function dispatch(action) {
    if (!action || !action.type) { return; }
    if (ui.notice && ui.notice.type === 'ok') { ui.notice = null; }

    if (UI_ACTIONS[action.type]) {
      var follow = UI_ACTIONS[action.type](action);
      if (follow) { dispatch(follow); return; }
      render();
      return;
    }

    var def = DOMAIN[action.type];
    if (!def) {
      if (global.console) { global.console.warn('[Mochila] Acción desconocida:', action.type); }
      return;
    }

    // REQ-042: sin viaje no se registran, editan ni convierten gastos o actividades.
    if (def.requiresTrip && !state.trip) {
      setNotice('error', 'Primero cree un viaje.');
      render();
      return;
    }

    var errors = def.validate ? def.validate(action) : {};
    if (validate.hasErrors(errors)) {
      if (def.form && action.draft) {
        ui.drafts[def.form] = action.draft;
        ui.errors[def.form] = errors;
        touchAll(def.form, errors);
      }
      if (errors._form || !def.form || !action.draft) { setNotice('error', errors._form || firstError(errors)); }
      render();
      return;
    }

    if (def.confirm && !action.confirmed) {
      var c = def.confirm(action);
      if (c) {
        openDialog({
          type: 'confirm', title: c.title, message: c.message, items: c.items || [],
          confirmLabel: c.confirmLabel, danger: !!c.danger, pending: action
        });
        render();
        return;
      }
    }

    var next = clone(state);
    def.reduce(next, action);

    // Red de seguridad: nunca se acepta ni se persiste un estado que no cumple el contrato.
    var check = storage.validateState(next);
    if (!check.valid) {
      if (global.console) { global.console.error('[Mochila] Cambio rechazado, rompe el contrato:', check.errors); }
      setNotice('error', 'No se aplicó el cambio porque el resultado no cumple el contrato de datos.');
      render();
      return;
    }

    state = next;
    persist();
    if (def.after) { def.after(action); }
    if (ui.storageError) {
      setNotice('warning', 'No se pudieron guardar los cambios en este navegador. Sus datos siguen en memoria y se reintentará con el próximo cambio.');
    }
    render();
  }

  /** REQ-039 / REQ-064: guardar en cada mutación; si falla, se mantiene en memoria y se reintenta. */
  function persist() {
    var result = storage.saveState(state);
    ui.storageError = result !== true;
  }

  /* ====================================================================== */
  /* Render y eventos                                                        */
  /* ====================================================================== */

  function render() {
    var focus = ui.focus || captureFocus();
    ui.focus = null;
    V.ui.render(root, state, ui, { getDraft: getDraft, validateForm: validateForm, categoryName: categoryName });
    restoreFocus(focus);
    V.ui.ensureDialogFocus(root);
  }

  function captureFocus() {
    var el = global.document.activeElement;
    if (!el || !el.name) { return null; }
    var form = el.closest('form[data-form]');
    return form ? { form: form.getAttribute('data-form'), name: el.name } : null;
  }

  function restoreFocus(f) {
    if (!f) { return; }
    var form = root.querySelector('form[data-form="' + f.form + '"]');
    var el = form && form.elements[f.name];
    if (el && typeof el.focus === 'function') { el.focus(); }
  }

  function readForm(form) {
    var d = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) { return; }
      d[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return d;
  }

  function onFieldChange(ev, rerender) {
    var el = ev.target;
    var form = el.closest && el.closest('form[data-form]');
    if (!form || !el.name) { return; }
    var name = form.getAttribute('data-form');
    var draft = readForm(form);
    ui.drafts[name] = draft;
    ui.touched[name] = ui.touched[name] || {};
    ui.touched[name][el.name] = true;
    var errors = validateForm(name, draft, form.getAttribute('data-id'));
    ui.errors[name] = errors;
    if (rerender || el.hasAttribute('data-rerender')) {
      render();
    } else {
      V.ui.updateFormFeedback(form, errors, ui.touched[name]);
    }
  }

  function bindEvents() {
    root.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-action]');
      if (!btn || btn.tagName === 'SELECT' || btn.disabled || !root.contains(btn)) { return; }
      ev.preventDefault();
      dispatch({
        type: btn.getAttribute('data-action'),
        id: btn.getAttribute('data-id') || undefined,
        date: btn.getAttribute('data-date') || undefined,
        tab: btn.getAttribute('data-tab') || undefined,
        meal: btn.getAttribute('data-meal') || undefined
      });
    });

    root.addEventListener('submit', function (ev) {
      var form = ev.target.closest('form[data-form]');
      if (!form) { return; }
      ev.preventDefault();
      var name = form.getAttribute('data-form');
      var draft = readForm(form);
      ui.drafts[name] = draft;
      dispatch({ type: form.getAttribute('data-submit'), form: name, draft: draft, id: form.getAttribute('data-id') || undefined });
    });

    root.addEventListener('input', function (ev) { onFieldChange(ev, false); });

    root.addEventListener('change', function (ev) {
      var el = ev.target;
      if (el.tagName === 'SELECT' && el.hasAttribute('data-action')) {
        dispatch({ type: el.getAttribute('data-action'), id: el.getAttribute('data-id'), status: el.value });
        return;
      }
      if (el.type === 'checkbox' || el.tagName === 'SELECT') { onFieldChange(ev, el.hasAttribute('data-rerender')); }
    });

    global.document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && ui.dialog) { dispatch({ type: 'CLOSE_DIALOG' }); }
    });
  }

  function init() {
    root = global.document.getElementById('app');
    var loaded = storage.loadState(); // REQ-040 / REQ-041
    state = loaded.state;
    ui = initialUi();
    ui.notice = loaded.notice;
    ui.selectedDate = calc.initialSelectedDate(state.trip, calc.todayISO()); // REQ-054
    bindEvents();
    render();
  }

  V.app = {
    init: init,
    dispatch: dispatch,
    get state() { return state; },
    get ui() { return ui; }
  };

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}(window));
