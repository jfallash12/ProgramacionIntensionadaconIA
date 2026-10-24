/*
 * ui.js — Mochila.ui
 * Componentes de render (docs/design.md §4). Reciben (state, ui) y devuelven nodos DOM.
 * No mutan el estado: emiten acciones con data-action / data-submit que app.js captura.
 * Seguridad (D5): el DOM se construye con textContent; nunca innerHTML con datos del usuario.
 */
(function (global) {
  'use strict';

  var V = global.Mochila = global.Mochila || {};
  var calc = V.calc;
  var doc = global.document;

  var MEAL_LABELS = {
    desayuno: 'Desayuno', almuerzo: 'Almuerzo', cena: 'Cena',
    snack_cafe: 'Snack / Café', bebidas_bar: 'Bebidas / Bar'
  };
  var MEAL_ICONS = { desayuno: '🥐', almuerzo: '🥗', cena: '🍽', snack_cafe: '☕', bebidas_bar: '🍹' };
  var STATUS_LABELS = { pendiente: 'Pendiente', en_progreso: 'En progreso', completado: 'Completado' };
  var STATUS_ICONS = { pendiente: '○', en_progreso: '⏳', completado: '✅' };
  var ALERT_TEXT = { ok: 'En orden', warning: 'Precaución', exceeded: 'Excedido — sobregiro' };
  var TABS = [
    { id: 'daily', label: 'Control Diario' },
    { id: 'itinerary', label: 'Itinerario' },
    { id: 'budget', label: 'Presupuesto y Categorías' },
    { id: 'expenses', label: 'Gastos' }
  ];

  var S, U, H; // state, ui y helpers del render en curso

  /* ====================================================================== */
  /* Helper el(): crea elementos de forma segura                             */
  /* ====================================================================== */

  function el(tag, props) {
    var node = doc.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === undefined || v === null || v === false) { return; }
      if (k === 'class') { node.className = v; }
      else if (k === 'text') { node.textContent = v; }
      else if (k === 'style') { Object.keys(v).forEach(function (p) { node.style[p] = v[p]; }); }
      else if (k === 'value') { node.value = v; }
      else if (k === 'checked') { node.checked = true; }
      else if (k === 'disabled') { node.disabled = true; }
      else if (k === 'hidden') { node.hidden = true; }
      else { node.setAttribute(k, v === true ? '' : String(v)); }
    });
    for (var i = 2; i < arguments.length; i++) { append(node, arguments[i]); }
    return node;
  }

  function append(node, child) {
    if (child === null || child === undefined || child === false) { return; }
    if (Array.isArray(child)) { child.forEach(function (c) { append(node, c); }); return; }
    node.appendChild(typeof child === 'string' ? doc.createTextNode(child) : child);
  }

  function button(label, action, extra) {
    var props = { type: 'button', 'data-action': action, class: 'btn' };
    Object.keys(extra || {}).forEach(function (k) {
      if (k === 'class') { props.class = 'btn ' + extra.class; } else { props[k] = extra[k]; }
    });
    return el('button', props, label);
  }

  function money(n, sign) { return calc.formatMoney(n, sign ? { sign: true } : null); }

  function bar(percent, status, label) {
    var pct = isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 100;
    return el('div', {
      class: 'bar is-' + status, role: 'progressbar',
      'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(pct)), 'aria-label': label || 'Progreso'
    }, el('div', { class: 'bar-fill', style: { width: pct + '%' } }));
  }

  function emptyText(text) { return el('p', { class: 'empty' }, text); }

  /* ====================================================================== */
  /* Formularios con validación en vivo                                      */
  /* ====================================================================== */

  function formErrors(name, draft, id) { return H.validateForm(name, draft, id) || {}; }

  function field(form, name, label, control, hint) {
    var touched = (U.touched[form.name] || {})[name];
    var v = form.draft[name];
    // Se muestra el error si el usuario ya tocó el campo o si el campo trae un valor precargado inválido.
    var msg = (touched || (v !== undefined && v !== null && v !== '' && typeof v !== 'boolean')) ? form.errors[name] : '';
    var errId = 'err-' + form.name + '-' + name;
    control.id = control.id || ('f-' + form.name + '-' + name);
    control.setAttribute('aria-describedby', errId);
    if (msg) { control.setAttribute('aria-invalid', 'true'); }
    return el('div', { class: 'field' + (msg ? ' has-error' : ''), 'data-field-wrap': name },
      el('label', { for: control.id }, label),
      control,
      hint ? el('small', { class: 'hint' }, hint) : null,
      el('span', { class: 'field-error', id: errId, 'aria-live': 'polite' }, msg || ''));
  }

  function input(name, value, attrs) {
    var p = { name: name, value: value === undefined || value === null ? '' : String(value), type: 'text', autocomplete: 'off' };
    Object.keys(attrs || {}).forEach(function (k) { p[k] = attrs[k]; });
    return el('input', p);
  }

  function select(name, options, value, attrs) {
    var s = el('select', Object.assign({ name: name }, attrs || {}));
    options.forEach(function (o) {
      var opt = el('option', { value: o.value }, o.label);
      if (String(o.value) === String(value === undefined || value === null ? '' : value)) { opt.selected = true; }
      s.appendChild(opt);
    });
    return s;
  }

  function checkbox(name, checked, label) {
    var id = 'f-' + name + '-' + Math.random().toString(36).slice(2, 7);
    return el('label', { class: 'check', for: id },
      el('input', { type: 'checkbox', name: name, id: id, checked: !!checked }), ' ', label);
  }

  /**
   * Crea un formulario: { name, submit, id, draft, errors } + node.
   * Guardar se deshabilita mientras haya errores (validación en vivo).
   */
  function makeForm(name, submit, id, draft) {
    var errors = formErrors(name, draft, id);
    return { name: name, submit: submit, id: id, draft: draft, errors: errors };
  }

  function formNode(form, children, submitLabel, extraButtons) {
    var hasErr = V.validate.hasErrors(form.errors);
    return el('form', { 'data-form': form.name, 'data-submit': form.submit, 'data-id': form.id, novalidate: true, class: 'form' },
      el('p', { class: 'form-error', 'data-form-error': true, 'aria-live': 'polite', hidden: !form.errors._form }, form.errors._form || ''),
      children,
      el('div', { class: 'form-actions' },
        extraButtons || null,
        el('button', { type: 'submit', class: 'btn primary', disabled: hasErr }, submitLabel)));
  }

  /** Actualiza errores y el botón Guardar sin re-renderizar (no se pierde el foco). */
  function updateFormFeedback(formEl, errors, touched) {
    Array.prototype.forEach.call(formEl.querySelectorAll('[data-field-wrap]'), function (wrap) {
      var name = wrap.getAttribute('data-field-wrap');
      var ctl = wrap.querySelector('input, select');
      var filled = ctl && ctl.type !== 'checkbox' && ctl.value !== '';
      var msg = (touched && touched[name]) || filled ? errors[name] : '';
      wrap.classList.toggle('has-error', !!msg);
      var span = wrap.querySelector('.field-error');
      if (span) { span.textContent = msg || ''; }
      if (ctl) { if (msg) { ctl.setAttribute('aria-invalid', 'true'); } else { ctl.removeAttribute('aria-invalid'); } }
    });
    var fe = formEl.querySelector('[data-form-error]');
    if (fe) { fe.textContent = errors._form || ''; fe.hidden = !errors._form; }
    var submit = formEl.querySelector('button[type="submit"]');
    if (submit) { submit.disabled = V.validate.hasErrors(errors); }
  }

  /* ====================================================================== */
  /* Componentes                                                             */
  /* ====================================================================== */

  function StorageNotice() { // REQ-041, REQ-064 y avisos generales
    if (!U.notice) { return null; }
    return el('div', { class: 'notice is-' + U.notice.type, role: U.notice.type === 'ok' ? 'status' : 'alert' },
      el('span', null, U.notice.text),
      button('Cerrar', 'DISMISS_NOTICE', { class: 'ghost small', 'aria-label': 'Cerrar aviso' }));
  }

  function TripFields(form) {
    var d = form.draft;
    return [
      field(form, 'name', 'Nombre del viaje', input('name', d.name, { placeholder: 'Ej. Vacaciones Arenal' })),
      field(form, 'destination', 'Destino', input('destination', d.destination, { placeholder: 'Ej. Costa Rica (Arenal)' })),
      el('div', { class: 'grid-2' },
        field(form, 'startDate', 'Fecha de inicio', input('startDate', d.startDate, { type: 'date' })),
        field(form, 'endDate', 'Fecha de fin', input('endDate', d.endDate, { type: 'date' })))
    ];
  }

  function EmptyTripState() { // REQ-001, REQ-042, REQ-062
    var form = makeForm('trip', 'CREATE_TRIP', null, H.getDraft('trip'));
    return el('section', { class: 'card empty-trip' },
      el('h2', null, 'Cree su viaje'),
      el('p', { class: 'muted' }, 'Para registrar gastos y actividades primero necesita un viaje. La aplicación maneja un solo viaje a la vez.'),
      formNode(form, TripFields(form), 'Crear viaje'));
  }

  function TripHeader() { // REQ-005, REQ-008, REQ-063
    var t = S.trip;
    return el('section', { class: 'trip-header' },
      el('div', null,
        el('h2', null, t.destination),
        el('p', { class: 'muted' }, t.name + ' · ' + t.startDate + ' → ' + t.endDate + ' · ' + calc.totalDays(t) + ' días')),
      el('div', { class: 'row-actions' },
        button('Editar viaje', 'OPEN_TRIP_EDIT'),
        button('Eliminar viaje', 'DELETE_TRIP', { class: 'danger' })));
  }

  function NavTabs() {
    return el('nav', { class: 'tabs', role: 'tablist', 'aria-label': 'Secciones' },
      TABS.map(function (t) {
        return el('button', {
          type: 'button', role: 'tab', class: 'tab', 'data-action': 'SET_TAB', 'data-tab': t.id,
          'aria-selected': U.activeTab === t.id ? 'true' : 'false'
        }, t.label);
      }));
  }

  /* ----- 1. Dashboard global ----- */

  function CategoryBreakdown() { // REQ-006, REQ-052
    return el('div', { class: 'cat-grid' }, S.categories.map(function (c) {
      var spent = calc.categorySpent(S, c.id);
      var fixed = calc.categoryFixed(S, c.id);
      var has = typeof c.allocated === 'number';
      var pct = has ? spent / c.allocated * 100 : null;
      return el('div', { class: 'cat-card' },
        el('div', { class: 'cat-name' }, c.name, c.tracking === 'daily' ? el('span', { class: 'badge' }, 'diaria') : null),
        el('div', { class: 'cat-values' }, has ? money(c.allocated) + ' / ' + money(spent) : 'Sin presupuesto / ' + money(spent)),
        fixed > 0 ? el('small', { class: 'muted' }, '🔒 incluye ' + money(fixed) + ' fijo') : null,
        has ? bar(pct, calc.statusFromPercent(pct), 'Gastado de ' + c.name) : el('small', { class: 'muted' }, 'Asigne un monto para ver el avance.'));
    }));
  }

  function BudgetTotals(g) { // REQ-006, REQ-012, REQ-014, REQ-051
    var status = g.status === 'exceeded' ? 'exceeded' : (g.status === 'committed' ? 'warning' : 'ok');
    var pctText = g.total > 0 ? ' (' + calc.formatPercent(100 - g.percent) + ')' : '';
    return el('div', null,
      el('div', { class: 'stats' },
        stat('Presupuesto Total', money(g.total)),
        stat('Gastado Total', money(g.spent)),
        stat('Comprometido (fijos)', money(g.committed)),
        stat('Disponible Global', money(g.available) + pctText, 'is-' + status)),
      g.status === 'exceeded'
        ? el('p', { class: 'alert is-exceeded', role: 'alert' }, '⚠ Sobregiro global: el gasto supera el presupuesto total en ' + money(-g.available) + '. Puede seguir registrando gastos.')
        : null,
      g.status === 'committed'
        ? el('p', { class: 'alert is-warning', role: 'alert' }, '⚠ Presupuesto comprometido: los gastos fijos ya consumen todo el presupuesto total.')
        : null);
  }

  function stat(label, value, cls) {
    return el('div', { class: 'stat ' + (cls || '') }, el('span', { class: 'stat-label' }, label), el('strong', null, value));
  }

  function GlobalProgressBar(g) {
    if (g.total <= 0) { return el('p', { class: 'muted' }, 'Asigne montos a las categorías para ver el avance del presupuesto total.'); }
    var status = g.status === 'exceeded' ? 'exceeded' : (g.status === 'committed' ? 'warning' : 'ok');
    return el('div', { class: 'global-bar' },
      el('span', null, 'Presupuesto total consumido: ' + calc.formatPercent(g.percent) + ' (' + money(g.spent) + ' de ' + money(g.total) + ')'),
      bar(g.percent, status, 'Presupuesto total consumido'));
  }

  function GlobalDashboard() {
    var g = calc.globalBudget(S);
    return el('section', { class: 'card' },
      el('h3', null, 'Dashboard global'),
      CategoryBreakdown(),
      BudgetTotals(g),
      GlobalProgressBar(g));
  }

  /* ----- 2. Control diario ----- */

  function DaySelector() { // REQ-054
    var today = calc.todayISO();
    return el('div', { class: 'day-selector', role: 'group', 'aria-label': 'Selector de día' },
      calc.tripDates(S.trip).map(function (d, i) {
        var label = String(i + 1) + (d === today ? ' · HOY' : '');
        return el('button', {
          type: 'button', class: 'day' + (d === U.selectedDate ? ' is-selected' : ''), 'data-action': 'SELECT_DAY', 'data-date': d,
          'aria-pressed': d === U.selectedDate ? 'true' : 'false', title: d
        }, label);
      }));
  }

  function DailyCategoryCard(catId) { // REQ-019..022, REQ-050, REQ-052
    var c = calc.getCategory(S, catId);
    var date = U.selectedDate;
    var acc = calc.dayAccumulated(S, catId, date);
    var limit = calc.dailyLimit(S, catId);
    var dn = calc.dayNumber(S.trip, date);
    if (limit === null) {
      return el('div', { class: 'day-card is-none' },
        el('h4', null, c.name + ' — Día ' + dn),
        el('p', null, 'Sin presupuesto definido. Asigne un monto en "Presupuesto y Categorías".'),
        el('div', { class: 'stats' }, stat('Acumulado Hoy', money(acc))));
    }
    var pct = calc.dailyPercent(S, catId, date);
    var status = calc.dailyStatus(S, catId, date);
    return el('div', { class: 'day-card is-' + status },
      el('h4', null, c.name + ' — Día ' + dn + ' (' + money(c.allocated) + ' / ' + calc.totalDays(S.trip) + ' = ' + money(limit) + ')'),
      el('div', { class: 'stats' },
        stat('Asignado Hoy', money(limit)),
        stat('Acumulado Hoy', money(acc)),
        stat('Disponible Hoy', money(calc.dailyAvailable(S, catId, date), true))),
      el('div', { class: 'bar-row' }, bar(pct, status, c.name + ': porcentaje del límite diario'), el('span', null, calc.formatPercent(pct))),
      el('p', { class: 'status-text' }, 'Estado: ' + ALERT_TEXT[status] + (status === 'exceeded' ? '. Se permite seguir registrando.' : '')));
  }

  function StatusLegend() {
    return el('p', { class: 'legend' },
      el('span', { class: 'dot is-ok' }), ' Verde ≤ 80 %  ',
      el('span', { class: 'dot is-warning' }), ' Ámbar 80–100 %  ',
      el('span', { class: 'dot is-exceeded' }), ' Rojo > 100 % — la alerta nunca bloquea registrar un gasto.');
  }

  function QuickMealButtons() { // REQ-029 · T-00.5: precarga el formulario
    var totals = calc.mealTotals(S, U.selectedDate);
    return el('div', { class: 'quick-meals' },
      el('h4', null, 'Registro rápido de comida (acumulado de hoy por tipo)'),
      el('div', { class: 'quick-row' }, calc.MEAL_TYPES.map(function (m) {
        return el('button', { type: 'button', class: 'btn quick', 'data-action': 'PREFILL_MEAL', 'data-meal': m },
          MEAL_ICONS[m] + ' ' + MEAL_LABELS[m] + ': ' + money(totals[m]));
      })));
  }

  function categoryOptions(placeholder) {
    var opts = placeholder ? [{ value: '', label: placeholder }] : [];
    return opts.concat(S.categories.map(function (c) { return { value: c.id, label: c.name }; }));
  }

  function mealOptions() {
    return [{ value: '', label: 'Seleccione…' }].concat(calc.MEAL_TYPES.map(function (m) { return { value: m, label: MEAL_LABELS[m] }; }));
  }

  function ExpenseFields(form) { // REQ-010, REQ-025..029, REQ-047, REQ-055, REQ-056, REQ-065
    var d = form.draft;
    var isFood = d.categoryId === calc.CAT_FOOD;
    return [
      el('div', { class: 'grid-3' },
        field(form, 'date', 'Fecha', input('date', d.date, { type: 'date' })),
        field(form, 'categoryId', 'Categoría', select('categoryId', categoryOptions('Seleccione…'), d.categoryId, { 'data-rerender': true })),
        isFood ? field(form, 'mealType', 'Tipo de comida', select('mealType', mealOptions(), d.mealType)) : null),
      el('div', { class: 'grid-2' },
        field(form, 'amount', 'Monto', input('amount', d.amount, { inputmode: 'decimal', placeholder: '0.00' })),
        field(form, 'description', 'Descripción', input('description', d.description, { placeholder: 'Ej. Casado' }))),
      el('div', { class: 'field', 'data-field-wrap': 'isFixed' },
        checkbox('isFixed', d.isFixed === true, 'Gasto fijo / pre-pago (puede tener fecha anterior al viaje)'),
        el('span', { class: 'field-error' }, ''))
    ];
  }

  function ExpenseForm() {
    var form = makeForm('expense', 'ADD_EXPENSE', null, H.getDraft('expense'));
    return el('div', { class: 'expense-form' },
      el('h4', null, 'Registrar gasto'),
      formNode(form, ExpenseFields(form), 'Guardar gasto'));
  }

  function DailyControl() {
    var dn = calc.dayNumber(S.trip, U.selectedDate);
    return el('section', { class: 'card' },
      el('h3', null, 'Control diario — Día ' + dn + ' (' + U.selectedDate + ')'),
      DaySelector(),
      el('div', { class: 'grid-2 cards' }, DailyCategoryCard(calc.CAT_FOOD), DailyCategoryCard(calc.CAT_TRANSPORT)),
      StatusLegend(),
      QuickMealButtons(),
      ExpenseForm());
  }

  /* ----- 3. Detalle operativo ----- */

  function ItineraryItem(a) { // REQ-034..036, REQ-043..046, REQ-061
    var outOfRange = !calc.isInTrip(S.trip, a.date);
    var cost = typeof a.estimatedCost === 'number' && a.estimatedCost > 0 ? 'Est: ' + money(a.estimatedCost) : 'Sin costo estimado';
    var statusSel = select('status', Object.keys(STATUS_LABELS).map(function (k) { return { value: k, label: STATUS_LABELS[k] }; }), a.status,
      { 'data-action': 'SET_ACTIVITY_STATUS', 'data-id': a.id, 'aria-label': 'Estado de ' + a.title, class: 'small-select' });
    return el('li', { class: 'activity is-' + a.status },
      el('div', { class: 'activity-main' },
        el('strong', null, a.time + ' · ' + a.title),
        el('div', { class: 'muted' },
          STATUS_ICONS[a.status] + ' ' + STATUS_LABELS[a.status] + ' · ' + cost + ' · ' + H.categoryName(a.categoryId) +
          (a.location ? ' · ' + a.location : '')),
        a.convertedExpenseId ? el('span', { class: 'badge ok' }, '✓ Convertida en gasto') : null,
        outOfRange ? el('span', { class: 'badge warn' }, '⚠ Fuera del rango del viaje: muévala para editarla') : null),
      el('div', { class: 'row-actions' },
        statusSel,
        calc.canConvert(a) ? button('Convertir a gasto', 'OPEN_CONVERT', { 'data-id': a.id, class: 'primary small' }) : null,
        button('Editar', 'OPEN_EDIT_ACTIVITY', { 'data-id': a.id, class: 'small' }),
        button('Eliminar', 'DELETE_ACTIVITY', { 'data-id': a.id, class: 'small danger' })));
  }

  function ItineraryList(date) {
    var items = S.itinerary.filter(function (a) { return !date || a.date === date; }); // orden de inserción (REQ-036)
    if (!items.length) { return emptyText(date ? 'No hay actividades para este día.' : 'Aún no hay actividades en el itinerario.'); }
    return el('ul', { class: 'activity-list' }, items.map(ItineraryItem));
  }

  function ExpenseRow(e) {
    var cat = H.categoryName(e.categoryId) + (e.mealType ? ' / ' + MEAL_LABELS[e.mealType] : '');
    return el('li', { class: 'expense-row' },
      el('div', null,
        el('span', { class: 'muted' }, e.time ? e.time + ' · ' : ''),
        el('strong', null, e.description),
        el('span', { class: 'muted' }, ' · ' + cat + (e.isFixed ? ' · ' + e.date : '')),
        e.isFixed ? el('span', { class: 'badge fixed' }, '🔒 Fijo') : null,
        e.linkedActivityId ? el('span', { class: 'badge' }, 'desde itinerario') : null),
      el('div', { class: 'row-actions' },
        el('strong', { class: 'amount' }, money(e.amount)),
        button('✎ Editar', 'OPEN_EDIT_EXPENSE', { 'data-id': e.id, class: 'small', 'aria-label': 'Editar ' + e.description }),
        button('🗑 Eliminar', 'DELETE_EXPENSE', { 'data-id': e.id, class: 'small danger', 'aria-label': 'Eliminar ' + e.description })));
  }

  function ExpenseHistory(openAll) { // REQ-011, REQ-047, REQ-053
    var groups = calc.groupExpensesByDate(S);
    if (!groups.length) { return emptyText('Aún no hay gastos registrados.'); }
    return el('div', { class: 'history' }, groups.map(function (g) {
      var title = g.kind === 'fixed'
        ? 'Pre-viaje / Fijos — no cuentan en el Total del Día · ' + money(g.total)
        : g.date + (g.dayNumber ? ' · Día ' + g.dayNumber : '') + ' — Total del Día: ' + money(g.total);
      var open = openAll || g.kind === 'fixed' || g.date === U.selectedDate;
      return el('details', { class: 'day-group' + (g.kind === 'fixed' ? ' is-fixed' : ''), open: open },
        el('summary', null, title, g.outOfRange ? el('span', { class: 'badge warn' }, '⚠ Fuera del rango del viaje') : null),
        el('ul', { class: 'expense-list' }, g.expenses.map(ExpenseRow)));
    }));
  }

  function OperationalDetail() {
    var dn = calc.dayNumber(S.trip, U.selectedDate);
    return el('section', { class: 'card' },
      el('h3', null, 'Detalle operativo'),
      el('div', { class: 'grid-2 detail' },
        el('div', null,
          el('div', { class: 'section-head' },
            el('h4', null, 'Itinerario del Día ' + dn),
            button('Agregar actividad', 'SET_TAB', { 'data-tab': 'itinerary', class: 'small' })),
          ItineraryList(U.selectedDate)),
        el('div', null,
          el('h4', null, 'Historial de gastos (agrupado por fecha)'),
          ExpenseHistory(false))));
  }

  /* ----- Itinerario ----- */

  function ActivityFields(form) { // REQ-031, REQ-035, REQ-065
    var d = form.draft;
    return [
      el('div', { class: 'grid-3' },
        field(form, 'date', 'Fecha', input('date', d.date, { type: 'date', min: S.trip.startDate, max: S.trip.endDate })),
        field(form, 'time', 'Hora', input('time', d.time, { type: 'time' })),
        field(form, 'status', 'Estado', select('status', Object.keys(STATUS_LABELS).map(function (k) { return { value: k, label: STATUS_LABELS[k] }; }), d.status))),
      el('div', { class: 'grid-2' },
        field(form, 'title', 'Actividad', input('title', d.title, { placeholder: 'Ej. Puentes Colgantes' })),
        field(form, 'categoryId', 'Categoría', select('categoryId', categoryOptions('Seleccione…'), d.categoryId))),
      el('div', { class: 'grid-2' },
        field(form, 'estimatedCost', 'Costo estimado (opcional)', input('estimatedCost', d.estimatedCost, { inputmode: 'decimal', placeholder: '0.00' })),
        field(form, 'location', 'Lugar (opcional)', input('location', d.location)))
    ];
  }

  function ItineraryView() {
    var form = makeForm('activity', 'ADD_ACTIVITY', null, H.getDraft('activity'));
    var dates = calc.tripDates(S.trip);
    var outside = S.itinerary.filter(function (a) { return dates.indexOf(a.date) === -1; });
    return el('section', { class: 'card' },
      el('h3', null, 'Itinerario'),
      el('p', { class: 'muted' }, 'Las actividades se ingresan manualmente y se muestran en el orden en que las agregó. La aplicación no genera ni sugiere itinerarios.'),
      el('h4', null, 'Agregar actividad'),
      formNode(form, ActivityFields(form), 'Agregar actividad'),
      dates.map(function (d, i) {
        var items = S.itinerary.filter(function (a) { return a.date === d; });
        if (!items.length) { return null; }
        return el('div', { class: 'itin-day' }, el('h4', null, 'Día ' + (i + 1) + ' · ' + d), el('ul', { class: 'activity-list' }, items.map(ItineraryItem)));
      }),
      outside.length ? el('div', { class: 'itin-day' }, el('h4', null, 'Fuera del rango del viaje'), el('ul', { class: 'activity-list' }, outside.map(ItineraryItem))) : null,
      S.itinerary.length ? null : emptyText('Aún no hay actividades en el itinerario.'));
  }

  /* ----- Presupuesto y categorías ----- */

  function CategoryManager() { // REQ-015..018, REQ-023, REQ-048, REQ-049
    var form = makeForm('category', 'ADD_CATEGORY', null, H.getDraft('category'));
    return el('section', { class: 'card' },
      el('h3', null, 'Categorías'),
      el('p', { class: 'muted' }, 'El Presupuesto Total es la suma de los montos asignados. Comida y Transporte son categorías diarias del sistema: su monto se divide entre los días del viaje y no se pueden eliminar.'),
      el('ul', { class: 'cat-list' }, S.categories.map(function (c) {
        return el('li', { class: 'cat-row' },
          el('div', null,
            el('strong', null, c.name),
            el('span', { class: 'muted' }, ' · ' + (c.tracking === 'daily' ? 'Diaria' : 'Total del viaje') +
              ' · ' + (typeof c.allocated === 'number' ? 'Asignado ' + money(c.allocated) : 'Sin presupuesto') +
              ' · Gastado ' + money(calc.categorySpent(S, c.id))),
            c.system ? el('span', { class: 'badge' }, 'sistema') : null),
          el('div', { class: 'row-actions' },
            button('Editar', 'OPEN_EDIT_CATEGORY', { 'data-id': c.id, class: 'small' }),
            c.system ? null : button('Eliminar', 'REQUEST_DELETE_CATEGORY', { 'data-id': c.id, class: 'small danger' })));
      })),
      el('h4', null, 'Nueva categoría'),
      formNode(form, el('div', { class: 'grid-2' },
        field(form, 'name', 'Nombre', input('name', form.draft.name, { placeholder: 'Ej. Tiquetes' })),
        field(form, 'allocated', 'Monto asignado (opcional)', input('allocated', form.draft.allocated, { inputmode: 'decimal', placeholder: '0.00' }))), 'Agregar categoría'));
  }

  /* ====================================================================== */
  /* Diálogos                                                                */
  /* ====================================================================== */

  function cancelButton() { return button('Cancelar', 'CLOSE_DIALOG', { class: 'ghost' }); }

  function dialogShell(title, body) {
    return el('div', { class: 'backdrop' },
      el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dialog-title' },
        el('h3', { id: 'dialog-title' }, title), body));
  }

  function ConfirmDialog(d) { // REQ-008, REQ-009, REQ-033, REQ-059, REQ-063
    return dialogShell(d.title, [
      el('p', null, d.message),
      d.items.length ? el('ul', { class: 'affected' }, d.items.map(function (t) { return el('li', null, t); })) : null,
      el('div', { class: 'form-actions' }, cancelButton(), button(d.confirmLabel || 'Confirmar', 'CONFIRM', { class: d.danger ? 'danger solid' : 'primary' }))
    ]);
  }

  function ReassignDialog(d) { // REQ-015, REQ-016
    var c = calc.getCategory(S, d.id);
    var exp = S.expenses.filter(function (e) { return e.categoryId === d.id; });
    var acts = S.itinerary.filter(function (a) { return a.categoryId === d.id; });
    var form = makeForm('reassign', 'DELETE_CATEGORY', d.id, H.getDraft('reassign'));
    var targets = [{ value: '', label: 'Seleccione…' }].concat(S.categories.filter(function (x) { return x.id !== d.id; })
      .map(function (x) { return { value: x.id, label: x.name }; }));
    var mealFields = form.draft.targetId === calc.CAT_FOOD ? exp.map(function (e) {
      return field(form, 'meal_' + e.id, 'Tipo de comida para "' + e.description + '" (' + money(e.amount) + ')', select('meal_' + e.id, mealOptions(), form.draft['meal_' + e.id]));
    }) : null;
    return dialogShell('Eliminar la categoría "' + (c ? c.name : '') + '"', formNode(form, [
      el('p', null, 'Esta categoría tiene ' + exp.length + ' gasto(s) y ' + acts.length + ' actividad(es). Se reasignarán todos a la categoría destino; no se perderá ningún registro.'),
      field(form, 'targetId', 'Reasignar a', select('targetId', targets, form.draft.targetId, { 'data-rerender': true })),
      mealFields
    ], 'Reasignar y eliminar', cancelButton()));
  }

  function Dialogs() {
    var d = U.dialog;
    if (!d) { return null; }
    var form;
    switch (d.type) {
      case 'confirm': return ConfirmDialog(d);
      case 'reassign': return ReassignDialog(d);
      case 'trip':
        form = makeForm('tripEdit', 'UPDATE_TRIP', null, H.getDraft('tripEdit'));
        return dialogShell('Editar viaje', formNode(form, TripFields(form), 'Guardar cambios', cancelButton()));
      case 'expense':
        if (d.mode === 'convert') {
          form = makeForm('convert', 'CONVERT_ACTIVITY', d.id, H.getDraft('convert'));
          return dialogShell('Convertir actividad en gasto', [
            el('p', { class: 'muted' }, 'Revise los datos precargados desde la actividad y confirme.'),
            formNode(form, ExpenseFields(form), 'Crear gasto', cancelButton())]);
        }
        form = makeForm('expenseEdit', 'UPDATE_EXPENSE', d.id, H.getDraft('expenseEdit'));
        return dialogShell('Editar gasto', formNode(form, ExpenseFields(form), 'Guardar cambios', cancelButton()));
      case 'activity':
        form = makeForm('activityEdit', 'UPDATE_ACTIVITY', d.id, H.getDraft('activityEdit'));
        return dialogShell('Editar actividad', formNode(form, ActivityFields(form), 'Guardar cambios', cancelButton()));
      case 'category':
        form = makeForm('categoryEdit', 'UPDATE_CATEGORY', d.id, H.getDraft('categoryEdit'));
        return dialogShell('Editar categoría', formNode(form, el('div', { class: 'grid-2' },
          field(form, 'name', 'Nombre', input('name', form.draft.name)),
          field(form, 'allocated', 'Monto asignado (vacío = sin presupuesto)', input('allocated', form.draft.allocated, { inputmode: 'decimal' }))),
          'Guardar cambios', cancelButton()));
      default: return null;
    }
  }

  /* ====================================================================== */
  /* Render principal                                                        */
  /* ====================================================================== */

  function View() {
    switch (U.activeTab) {
      case 'itinerary': return ItineraryView();
      case 'budget': return [GlobalDashboard(), CategoryManager()];
      case 'expenses': return el('section', { class: 'card' }, el('h3', null, 'Gastos'), ExpenseForm(), ExpenseHistory(true));
      default: return [GlobalDashboard(), DailyControl(), OperationalDetail()];
    }
  }

  function render(root, state, uiState, helpers) {
    S = state; U = uiState; H = helpers;
    var content = el('div', { class: 'layout' },
      el('header', { class: 'app-header' },
        el('h1', null, 'Mochila'),
        el('span', { class: 'muted' }, 'Asistente de viaje y presupuesto · 100 % offline')),
      StorageNotice(),
      S.trip ? [TripHeader(), NavTabs(), el('main', null, View())] : el('main', null, EmptyTripState()),
      Dialogs());
    root.replaceChildren(content);
    doc.body.classList.toggle('has-dialog', !!U.dialog);
  }

  /** Lleva el foco al primer campo del diálogo abierto (accesibilidad). */
  function ensureDialogFocus(root) {
    var dlg = root.querySelector('.dialog');
    if (!dlg || dlg.contains(doc.activeElement)) { return; }
    var first = dlg.querySelector('input, select, button');
    if (first) { first.focus(); }
  }

  V.ui = {
    el: el,
    render: render,
    updateFormFeedback: updateFormFeedback,
    ensureDialogFocus: ensureDialogFocus,
    MEAL_LABELS: MEAL_LABELS
  };
}(window));
