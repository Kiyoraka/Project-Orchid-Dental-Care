/* Orchid Dental Care — view toolkit.
 *
 * EVENTS (replaces the prototype's onClick="{{ fn }}"):
 *   `<button ${UI.click(() => ...)}>`            -> data-click="aN"
 *   `<input ${UI.input(e => ...)}>`              -> data-input="aN"   (fires on every keystroke)
 *   `<select ${UI.change(e => ...)}>`            -> data-change="aN"
 *   Handlers receive (event, element). The registry is cleared by UI.render() on every
 *   render, so always build handlers inside the render pass.
 *   Give every text input a stable `data-key="..."` so focus + caret survive re-renders.
 *
 * RENDER:  UI.render(rootEl, html)  — swaps innerHTML, restores focus by data-key.
 *          UI.mount(rootEl)         — attach delegated listeners once per root.
 *
 * TABLE CELLS (same API as the prototype): T(text,{bold,color}) · B(status) ·
 *   A([[icon,title,color,fn], ...]) · BTN(text,fn) · CK(bool) · RAW(html)
 *
 * BUILDERS return HTML strings: UI.kpis · UI.widgets · UI.charts · UI.chartFilters ·
 *   UI.tabs · UI.toolbar · UI.table · UI.bars (dataset helper) · UI.options
 */
const UI = (() => {
  let handlers = {};
  let seq = 0;

  function register(fn) {
    const id = 'a' + (++seq);
    handlers[id] = fn;
    return id;
  }

  const click = fn => `data-click="${register(fn)}"`;
  const input = fn => `data-input="${register(fn)}"`;
  const change = fn => `data-change="${register(fn)}"`;

  /* true while innerHTML is being swapped: removing a focused, edited input makes Chrome fire a
     synchronous `change` on the detached node — handling it would re-enter render and lose focus. */
  let rendering = false;

  function dispatch(attr, e) {
    if (rendering) return;
    const el = e.target.closest(`[data-${attr}]`);
    if (!el) return;
    const fn = handlers[el.dataset[attr]];
    if (!fn) return;
    if (attr === 'click' && (el.tagName === 'A' || el.type === 'submit')) e.preventDefault();
    fn(e, el);
  }

  function mount(root) {
    if (root.__uiMounted) return;
    root.__uiMounted = true;
    root.addEventListener('click', e => dispatch('click', e));
    root.addEventListener('input', e => dispatch('input', e));
    root.addEventListener('change', e => dispatch('change', e));
  }

  /** Clear handlers — call once at the start of a full render pass (before building HTML). */
  function begin() {
    handlers = {};
    seq = 0;
  }

  /** Replace root content, keeping focus/caret on the element with the same data-key. */
  function render(root, html) {
    const active = document.activeElement;
    let key = null, start = null, end = null;
    if (active && root.contains(active) && active.dataset && active.dataset.key) {
      key = active.dataset.key;
      try { start = active.selectionStart; end = active.selectionEnd; } catch (e) { /* not a text field */ }
    }
    rendering = true;
    try {
      root.innerHTML = html;
      if (key) {
        const el = root.querySelector(`[data-key="${CSS.escape(key)}"]`);
        if (el) {
          el.focus({ preventScroll: true });
          try { if (start != null) el.setSelectionRange(start, end); } catch (e) { /* number/select */ }
        }
      }
    } finally {
      rendering = false;
    }
  }

  /* ---------------- table cells (prototype-compatible) ---------------- */
  const cells = {
    T: (t, o = {}) => ({ kind: 'text', t, bold: !!o.bold, color: o.color || '' }),
    B: s => ({ kind: 'badge', s }),
    A: list => ({ kind: 'actions', list }),
    BTN: (t, fn) => ({ kind: 'button', t, fn }),
    CK: ok => ({ kind: 'check', ok: !!ok }),
    RAW: html => ({ kind: 'raw', html })
  };

  function cellHtml(c) {
    switch (c.kind) {
      case 'badge': return `<td>${badgeHtml(c.s)}</td>`;
      case 'actions':
        return `<td><div class="row-actions">${c.list.map(a => `<button class="icon-btn" title="${esc(a[1])}" aria-label="${esc(a[1])}" style="color:${a[2] || '#4b5563'}" ${click(a[3] || (() => {}))}><i class="${a[0]}"></i></button>`).join('')}</div></td>`;
      case 'button': return `<td><button class="btn btn-primary btn-sm" ${click(c.fn)}>${esc(c.t)}</button></td>`;
      case 'check': return `<td><i class="${c.ok ? 'fa-solid fa-check' : 'fa-solid fa-xmark'}" style="color:${c.ok ? '#10b981' : '#cbd5e1'}"></i></td>`;
      case 'raw': return `<td>${c.html}</td>`;
      default: return `<td style="${c.bold ? 'font-weight:600;' : ''}${c.color ? 'color:' + c.color : ''}">${esc(c.t)}</td>`;
    }
  }

  /* ---------------- builders ---------------- */
  const KPI_BG = { '#10b981': '#d1fae5', '#f59e0b': '#fef3c7', '#ef4444': '#fee2e2' };

  /** kpis: [{label, value, sub, icon, color}] */
  function kpis(list) {
    if (!list || !list.length) return '';
    return `<div class="kpi-grid">${list.map(k => {
      const color = k.color || '#2563eb';
      return `<div class="kpi card"><div class="kpi-icon" style="background:${KPI_BG[color] || '#dbeafe'};color:${color}"><i class="${k.icon}"></i></div>
        <div class="kpi-body"><div class="kpi-label">${esc(k.label)}</div><div class="kpi-value">${esc(k.value)}</div><div class="kpi-sub">${esc(k.sub || '')}</div></div></div>`;
    }).join('')}</div>`;
  }

  /** widgets: [{title, sub, span, rows:[{time, icon, iconColor, title, sub, amount, badge(status), action, onAction}]}] */
  function widgets(list) {
    if (!list || !list.length) return '';
    return `<div class="widget-grid">${list.map(w => `<section class="widget card" style="${w.span === 2 ? 'grid-column:1/-1' : ''}">
      <header class="widget-head"><span>${esc(w.title)}</span><span class="widget-sub">${esc(w.sub || '')}</span></header>
      <div class="widget-rows">${(w.rows || []).map(r => `<div class="widget-row">
        ${r.time ? `<div class="widget-time">${esc(r.time)}</div>` : ''}
        ${r.icon ? `<i class="${r.icon}" style="color:${r.iconColor || '#2563eb'}"></i>` : ''}
        <div class="widget-main"><div class="widget-title">${esc(r.title)}</div>${r.sub ? `<div class="widget-rsub">${esc(r.sub)}</div>` : ''}</div>
        ${r.amount ? `<div class="widget-amount">${esc(r.amount)}</div>` : ''}
        ${r.badge ? badgeHtml(r.badge) : ''}
        ${r.action ? `<button class="btn btn-primary btn-sm" ${click(r.onAction || (() => {}))}>${esc(r.action)}</button>` : ''}
      </div>`).join('')}</div></section>`).join('')}</div>`;
  }

  /** Dataset helper, same as the prototype: arr = [[label, number, 'n'?]] ('n' = plain count, else money). */
  function bars(arr, color) {
    const max = Math.max(...arr.map(a => a[1]));
    return arr.map(a => ({ label: a[0], value: a[2] === 'n' ? String(a[1]) : money(a[1]), pct: Math.round(a[1] / max * 100), color: color || '#2563eb' }));
  }

  /** charts: [{title, type:'bars'|'trend'|'funnel', bars:[...]}]  (trend bars: {label,pct}; funnel: {label,value}) */
  function charts(list) {
    if (!list || !list.length) return '';
    return `<div class="chart-grid">${list.map(c => {
      let body = '';
      if (c.type === 'bars') {
        body = `<div class="hbars">${c.bars.map(b => `<div class="hbar"><div class="hbar-label">${esc(b.label)}</div><div class="hbar-track"><div class="hbar-fill" style="width:${b.pct}%;background:${b.color}"></div></div><div class="hbar-value">${esc(b.value)}</div></div>`).join('')}</div>`;
      } else if (c.type === 'trend') {
        body = `<div class="vbars">${c.bars.map(b => `<div class="vbar"><div class="vbar-fill" style="height:${b.pct}%"></div><div class="vbar-label">${esc(b.label)}</div></div>`).join('')}</div>`;
      } else if (c.type === 'funnel') {
        body = `<div class="funnel">${c.bars.map(b => `<div class="funnel-step"><div class="funnel-value">${esc(b.value)}</div><div class="funnel-label">${esc(b.label)}</div></div>`).join('')}</div>`;
      }
      return `<section class="chart card"><div class="chart-title">${esc(c.title)}</div>${body}</section>`;
    }).join('')}</div>`;
  }

  /** Period + dentist filter row shown above analysis charts. */
  function chartFilters() {
    return `<div class="chart-filters"><select aria-label="Period"><option>This month</option><option>Last month</option><option>Last 90 days</option></select>
      <select aria-label="Dentist"><option>All dentists</option>${DENTISTS.map(d => `<option>${esc(d.name)}</option>`).join('')}</select></div>`;
  }

  /** tabs(labels, activeIndex, onPick(i)) */
  function tabs(labels, active, onPick) {
    if (!labels || !labels.length) return '';
    return `<div class="tabs" role="tablist">${labels.map((l, i) => `<button role="tab" aria-selected="${i === active}" class="tab${i === active ? ' is-active' : ''}" ${click(() => onPick(i))}>${esc(l)}</button>`).join('')}</div>`;
  }

  /** toolbar({search, filters:[[opt...]], primary, onPrimary, secondary, onSecondary}) */
  function toolbar(t) {
    if (!t) return '';
    return `<div class="toolbar">
      ${t.search ? `<div class="toolbar-search"><i class="fa-solid fa-magnifying-glass"></i><input type="search" placeholder="${esc(t.search)}" aria-label="${esc(t.search)}" data-key="toolbar-search"></div>` : ''}
      ${(t.filters || []).map(f => `<select class="toolbar-select">${f.map(o => `<option>${esc(o)}</option>`).join('')}</select>`).join('')}
      ${t.primary ? `<button class="btn btn-primary toolbar-primary" ${click(t.onPrimary || (() => {}))}><i class="fa-solid fa-plus"></i>${esc(t.primary)}</button>` : ''}
      ${t.secondary ? `<button class="btn btn-outline" ${click(t.onSecondary || (() => toast(t.secondary)))}>${esc(t.secondary)}</button>` : ''}
    </div>`;
  }

  /** table({cols:[..], rows:[{cells:[cell..]}], footer, empty}) */
  function table(t) {
    if (!t) return '';
    const body = t.rows.length
      ? t.rows.map(r => `<tr>${r.cells.map(cellHtml).join('')}</tr>`).join('')
      : `<tr><td colspan="${t.cols.length}" class="table-empty">${esc(t.empty || 'Nothing here yet.')}</td></tr>`;
    return `<div class="table-card card"><div class="table-scroll"><table class="data-table">
      <thead><tr>${t.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>
      ${t.footer ? `<div class="table-footer">${esc(t.footer)}</div>` : ''}</div>`;
  }

  /** <option> list with the current value selected. items: [value] or [[value,label]] */
  function options(items, current) {
    return items.map(it => {
      const [v, l] = Array.isArray(it) ? it : [it, it];
      return `<option value="${esc(v)}"${String(v) === String(current) ? ' selected' : ''}>${esc(l)}</option>`;
    }).join('');
  }

  return { click, input, change, mount, begin, render, kpis, widgets, bars, charts, chartFilters, tabs, toolbar, table, options, cells };
})();

/* prototype-style cell constructors as globals */
const { T, B, A, BTN, CK, RAW } = UI.cells;
