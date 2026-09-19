/* Orchid Dental Care — dashboard shell: auth guard, hash router, sidebar/drawer, topbar, notifications.
 *
 * Route: dashboard.html#/<role>/<page>   (role must match the logged-in session)
 *
 * ROLE MODULE CONTRACT — each js/dashboard/<role>.js registers:
 *   Roles.<role> = {
 *     render(ctx) -> spec,            // called on every render
 *     menuCounts?(state) -> { pageKey: number }   // sidebar badges
 *   }
 *   ctx  = { state, role, page, tab, user, go(page, tab?), setTab(i), set, update, toast }
 *          go(page, tab) navigates and opens that tab index on the new page (default 0)
 *   spec = {
 *     title?:   string                 (defaults to TITLES[page])
 *     kpis?:    [...]  -> UI.kpis
 *     widgets?: [...]  -> UI.widgets
 *     charts?:  [...]  -> UI.chartFilters + UI.charts
 *     tabs?:    [labels]  (shell-managed, uses ctx.tab / ctx.setTab)  OR  string (pre-rendered HTML)
 *     toolbar?: {...}  -> UI.toolbar
 *     table?:   {...}  -> UI.table
 *     html?:    string (custom screen HTML, rendered after the table)
 *     modal?:   string (rendered on top of everything)
 *   }
 *   Section order matches the prototype: kpis, widgets, charts, tabs, toolbar, table, html, modal.
 */
const Roles = {};

const Shell = (() => {
  const root = document.getElementById('app');
  let lastRouteKey = '';

  function parseRoute() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    return { role: parts[0] || '', page: parts[1] || 'main' };
  }

  function menuFor(role) {
    return MENUS[role] || [];
  }

  /** Normalise the hash against the session; returns the route or null when a redirect happened. */
  function resolveRoute() {
    const session = Store.session();
    if (!session || !MENUS[session.role]) {
      location.replace('login.html');
      return null;
    }
    const route = parseRoute();
    const pages = menuFor(session.role).map(m => m[0]);
    if (route.role !== session.role || !pages.includes(route.page)) {
      const page = route.role === session.role ? 'main' : (pages.includes(route.page) ? route.page : 'main');
      location.replace(`#/${session.role}/${page}`);
      return null;
    }
    return route;
  }

  function go(page, tab) {
    const { role } = parseRoute();
    if (parseRoute().page === page) { Store.set({ shell_tab: tab || 0 }); return; }
    Store.get().shell_pendingTab = tab || 0;
    location.hash = `#/${role}/${page}`;
  }

  function setUi(patch) {
    Store.set(patch);
  }

  function sidebarHtml(role, page, user, counts) {
    const items = menuFor(role).map(m => {
      const count = counts[m[0]] || 0;
      return `<button class="nav-item${page === m[0] ? ' is-active' : ''}" ${page === m[0] ? 'aria-current="page"' : ''} ${UI.click(() => { setUi({ shell_drawer: false }); go(m[0]); })}>
        <i class="${m[2]}"></i><span class="nav-label">${esc(m[1])}</span>${count ? `<span class="nav-count">${count}</span>` : ''}</button>`;
    }).join('');
    return `<aside class="sidebar" aria-label="Main menu">
      <div class="sidebar-brand"><i class="fa-solid fa-tooth"></i><span>Orchid Dental Care</span>
        <button class="sidebar-close" aria-label="Close menu" ${UI.click(() => setUi({ shell_drawer: false }))}><i class="fa-solid fa-xmark"></i></button></div>
      <nav>${items}</nav>
      <div class="sidebar-foot">
        <div class="sidebar-user"><div class="avatar">${esc(user.initials)}</div><div><div class="sidebar-user-name">${esc(user.name)}</div><div class="sidebar-user-role">${esc(user.roleLabel)}</div></div></div>
        <button class="nav-item sidebar-link" ${UI.click(() => { Store.reset(); toast('Demo data reset to the original seed'); })}><i class="fa-solid fa-rotate-left"></i>Reset demo data</button>
        <button class="nav-item sidebar-link" ${UI.click(() => { Store.logout(); location.href = 'index.html'; })}><i class="fa-solid fa-right-from-bracket"></i>Logout</button>
      </div>
    </aside>
    <div class="drawer-overlay" ${UI.click(() => setUi({ shell_drawer: false }))}></div>`;
  }

  function topbarHtml(title, user, notifs, notifOpen) {
    return `<header class="topbar">
      <button class="topbar-menu" aria-label="Open menu" ${UI.click(() => setUi({ shell_drawer: true }))}><i class="fa-solid fa-bars"></i></button>
      <h1 class="topbar-title">${esc(title)}</h1>
      <div class="topbar-right">
        <div class="notif">
          <button class="notif-btn" aria-label="Notifications" aria-expanded="${!!notifOpen}" ${UI.click(() => setUi({ shell_notifOpen: !notifOpen }))}>
            <i class="fa-regular fa-bell"></i>${notifs.length ? `<span class="notif-count">${notifs.length}</span>` : ''}</button>
          ${notifOpen ? `<div class="notif-backdrop" ${UI.click(() => setUi({ shell_notifOpen: false }))}></div>
          <div class="notif-panel"><div class="notif-head">Notifications</div>
            ${notifs.map(n => `<div class="notif-item"><i class="${n.icon}" style="color:${n.color}"></i><div><div>${esc(n.text)}</div><div class="notif-time">${esc(n.time)}</div></div></div>`).join('')}
          </div>` : ''}
        </div>
        <div class="topbar-user"><div class="avatar">${esc(user.initials)}</div>${esc(user.name)}<i class="fa-solid fa-chevron-down"></i></div>
      </div>
    </header>`;
  }

  function placeholder(role, page) {
    return { html: `<div class="card placeholder"><i class="fa-solid fa-person-digging"></i>The ${esc(TITLES[page] || page)} screen for ${esc(role)} is being built.</div>` };
  }

  function render() {
    const route = resolveRoute();
    if (!route) return;
    const state = Store.get();
    const { role, page } = route;
    const routeKey = role + '/' + page;
    if (routeKey !== lastRouteKey) {
      /* page change: reset tab, close overlays, scroll to top */
      state.shell_tab = state.shell_pendingTab || 0;
      state.shell_pendingTab = 0;
      state.shell_drawer = false;
      state.shell_notifOpen = false;
      if (lastRouteKey) window.scrollTo(0, 0);
      lastRouteKey = routeKey;
    }
    const user = USERS[role];
    const tab = state.shell_tab || 0;

    UI.begin();
    const module = Roles[role];
    const ctx = {
      state, role, page, tab, user,
      go,
      setTab: i => setUi({ shell_tab: i }),
      set: Store.set,
      update: Store.update,
      toast
    };
    let spec;
    try {
      spec = module && module.render ? module.render(ctx) || {} : placeholder(role, page);
    } catch (err) {
      console.error(err);
      spec = { html: `<div class="card placeholder"><i class="fa-solid fa-triangle-exclamation" style="color:#ef4444"></i>Something went wrong rendering this screen.</div>` };
    }
    const counts = module && module.menuCounts ? module.menuCounts(state) : {};
    const title = spec.title || TITLES[page] || 'Orchid Dental Care';
    document.title = `${title} · Orchid Dental Care`;

    const tabsHtml = Array.isArray(spec.tabs) ? UI.tabs(spec.tabs, tab, i => setUi({ shell_tab: i })) : (spec.tabs || '');
    const body = [
      UI.kpis(spec.kpis),
      UI.widgets(spec.widgets),
      spec.charts && spec.charts.length ? UI.chartFilters() + UI.charts(spec.charts) : '',
      tabsHtml,
      UI.toolbar(spec.toolbar),
      UI.table(spec.table),
      spec.html || ''
    ].join('');

    const html = `<div class="app${state.shell_drawer ? ' drawer-open' : ''}">
      ${sidebarHtml(role, page, user, counts)}
      <div class="main">
        ${topbarHtml(title, user, (state.notifs && state.notifs[role]) || [], state.shell_notifOpen)}
        <main class="content" id="content" data-route="${esc(routeKey)}">${body}</main>
      </div>
    </div>${spec.modal || ''}`;
    UI.render(root, html);
  }

  function boot() {
    UI.mount(root);
    Store.subscribe(render);
    window.addEventListener('hashchange', render);
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const s = Store.get();
      if (s.shell_drawer || s.shell_notifOpen) setUi({ shell_drawer: false, shell_notifOpen: false });
    });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return { render, go };
})();

/* Shared Setting page building blocks (prototype lines 768-835) — every role's "setting" page.
 *   SettingKit.page(innerHtml)          white card + "Save changes" footer
 *   SettingKit.profile(user, extraText) My Profile + Change password (+ role info note)
 *   SettingKit.field(label, inputHtml, full?)   one labelled field for a .field-grid
 */
const SettingKit = {
  field(label, inputHtml, full) {
    return `<label class="field${full ? ' full' : ''}">${esc(label)}${inputHtml}</label>`;
  },
  page(innerHtml) {
    return `<section class="card settings-card">${innerHtml}
      <div class="settings-actions"><button class="btn btn-primary" ${UI.click(() => toast('Settings saved'))}>Save changes</button></div></section>`;
  },
  profile(user, extraText) {
    const f = SettingKit.field;
    return `<div class="settings-title">My Profile</div>
      <div class="profile-row"><div class="avatar profile-avatar">${esc(user.initials)}</div><button class="btn btn-outline" ${UI.click(() => toast('Photo upload opens here'))}>Change photo</button></div>
      <div class="field-grid">
        ${f('Full name', `<input data-key="set-name" value="${esc(user.name)}" autocomplete="name">`)}
        ${f('Email', `<input data-key="set-email" type="email" value="${esc(user.email)}" autocomplete="email">`)}
        ${f('Phone', `<input data-key="set-phone" type="tel" value="${esc(user.phone)}" autocomplete="tel">`)}
      </div>
      <div class="settings-title spaced">Change password</div>
      <div class="field-grid">
        ${f('Current', '<input data-key="set-pass-cur" type="password" autocomplete="current-password">')}
        ${f('New', '<input data-key="set-pass-new" type="password" autocomplete="new-password">')}
        ${f('Confirm', '<input data-key="set-pass-confirm" type="password" autocomplete="new-password">')}
      </div>
      ${extraText ? `<div class="info-note"><i class="fa-solid fa-circle-info"></i>${esc(extraText)}</div>` : ''}`;
  }
};
