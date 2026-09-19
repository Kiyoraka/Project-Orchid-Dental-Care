/* Orchid Dental Care — login page (prototype lines 341-365, renderVals `login` + `demoUsers`). */
(() => {
  const root = document.getElementById('app');

  const CREDENTIALS = {
    kiyo: 'admin', admin: 'admin', farah: 'marketing', aina: 'dentist', suraya: 'cashier', '0123456789': 'patient'
  };

  const DEMO_USERS = [
    ['admin', 'Kiyo', 'Admin', 'fa-solid fa-user-shield'],
    ['marketing', 'Farah', 'Marketing', 'fa-solid fa-phone'],
    ['dentist', 'Dr. Aina', 'Dentist', 'fa-solid fa-user-doctor'],
    ['cashier', 'Suraya', 'Cashier', 'fa-solid fa-cash-register'],
    ['patient', 'Nik Ahmad', 'Patient', 'fa-solid fa-user']
  ];

  const form = { user: '', pass: '', error: '' };

  const loginAs = role => {
    Store.login(role);
    location.href = 'dashboard.html#/' + role + '/main';
  };

  const submit = () => {
    const role = CREDENTIALS[form.user.toLowerCase().replace(/[\s-]/g, '')];
    if (role && form.pass) {
      loginAs(role);
    } else {
      form.error = 'Try a demo account below, or aina / any password.';
      render();
    }
  };

  function render() {
    UI.begin();
    const html = `<div class="login-screen" data-screen-label="Login">
      <div class="login-card">
        <a class="login-logo" href="index.html"><i class="fa-solid fa-tooth"></i><span>Orchid Dental Care</span></a>
        <div class="login-intro">Sign in — you'll be redirected to your dashboard.</div>
        <form class="login-form" novalidate>
          <label class="login-field">Username or phone
            <input type="text" data-key="login-user" name="username" autocomplete="username" placeholder="aina"
              value="${esc(form.user)}" ${UI.input((e, el) => { form.user = el.value; })}>
          </label>
          <label class="login-field">Password
            <input type="password" data-key="login-pass" name="password" autocomplete="current-password" placeholder="••••••••"
              value="${esc(form.pass)}" ${UI.input((e, el) => { form.pass = el.value; })}>
          </label>
          ${form.error ? `<div class="login-error" role="alert">${esc(form.error)}</div>` : ''}
          <button type="submit" class="login-submit" ${UI.click(submit)}>Login</button>
        </form>
        <div class="login-demo">
          <div class="login-demo-title">Demo accounts</div>
          <div class="login-demo-grid">
            ${DEMO_USERS.map(([role, name, label, icon]) => `<button type="button" class="login-demo-btn" ${UI.click(() => loginAs(role))}>
              <i class="${icon}"></i>
              <div><div class="login-demo-name">${esc(name)}</div><div class="login-demo-role">${esc(label)}</div></div>
            </button>`).join('')}
          </div>
        </div>
        <a class="login-back" href="index.html">← Back to website</a>
      </div>
    </div>`;
    UI.render(root, html);
  }

  UI.mount(root);
  // Enter in a field triggers an implicit click on the submit button (handled above);
  // this guard only stops the browser from navigating if a submit event still fires.
  root.addEventListener('submit', e => e.preventDefault());
  render();
})();
