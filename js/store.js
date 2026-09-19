/* Orchid Dental Care — single state store with localStorage persistence.
 *
 * Store.get()            current state object (read-only by convention)
 * Store.set(patch)       merge patch (object, or fn(state) => object), persist, notify subscribers
 * Store.update(key,id,p) merge p into the row with that id inside the array at state[key]
 * Store.subscribe(fn)    re-render hook
 * Store.reset()          restore SEED_STATE (keeps the login session)
 * Store.login(role) / Store.logout() / Store.session()
 *
 * Only DATA keys are persisted; UI keys (page tab, open modal, drawer…) live in memory.
 */
const Store = (() => {
  const KEY = 'orchid.v1';
  const PERSISTED = ['leads', 'appts', 'bills', 'methods', 'seq', 'rec', 'showSplit', 'notifs', 'session'];
  const subscribers = [];
  let state = null;

  const clone = obj => JSON.parse(JSON.stringify(obj));

  function fresh() {
    return Object.assign(clone(SEED_STATE), { session: null });
  }

  function load() {
    state = fresh();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        PERSISTED.forEach(k => { if (saved[k] !== undefined) state[k] = saved[k]; });
      }
    } catch (e) {
      /* private mode / corrupt data: run on the seed */
    }
  }

  function save() {
    try {
      const out = {};
      PERSISTED.forEach(k => { out[k] = state[k]; });
      localStorage.setItem(KEY, JSON.stringify(out));
    } catch (e) {
      /* storage unavailable: keep working in memory */
    }
  }

  function notify() {
    subscribers.forEach(fn => fn(state));
  }

  function set(patch) {
    const p = typeof patch === 'function' ? patch(state) : patch;
    if (p) Object.assign(state, p);
    save();
    notify();
  }

  function update(listKey, id, patch) {
    set(s => ({ [listKey]: s[listKey].map(row => (row.id === id ? Object.assign({}, row, typeof patch === 'function' ? patch(row) : patch) : row)) }));
  }

  function reset() {
    const session = state.session;
    state = Object.assign(fresh(), { session });
    save();
    notify();
  }

  load();

  /* keep several open tabs (landing + dashboard) in sync */
  window.addEventListener('storage', e => {
    if (e.key !== KEY) return;
    const ui = {};
    Object.keys(state).forEach(k => { if (!PERSISTED.includes(k)) ui[k] = state[k]; });
    load();
    Object.assign(state, ui);
    notify();
  });

  return {
    get: () => state,
    set,
    update,
    subscribe: fn => { subscribers.push(fn); },
    reset,
    session: () => state.session,
    login: role => set({ session: { role } }),
    logout: () => set({ session: null })
  };
})();
