/* Orchid Dental Care — shared helpers (formatting, lookups, bill maths, toast). */

/** Escape any value for safe insertion into HTML text or a double-quoted attribute. */
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Round to 2 decimal places (HALF_UP for positive money values). */
function r2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** "RM 1,234.50" */
function money(n) {
  return 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "1,234.50" (no currency prefix) */
function amount2(n) {
  return Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Status -> { label, bg, fg } using the BADGE colour map. */
function badge(status) {
  const pair = BADGE[status] || BADGE.NEW;
  return { label: String(status).replace(/_/g, ' '), bg: pair[0], fg: pair[1] };
}

/** Status -> badge <span> HTML. */
function badgeHtml(status) {
  const b = badge(status);
  return `<span class="badge" style="background:${b.bg};color:${b.fg}">${esc(b.label)}</span>`;
}

function dentistById(id) {
  return DENTISTS.find(d => d.id === id) || null;
}

function treatmentByName(name) {
  return TREATMENTS.find(t => t.name === name) || null;
}

/** Current wall-clock "HH:MM" (used for activity log stamps on the demo day). */
function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

/** Unique numeric id for new demo rows. */
function uid() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

/** Day-of-week (0 = Sun) for a day number in the demo month. */
function demoDow(day) {
  return (DEMO_TODAY.firstDow + day - 1) % 7;
}

/**
 * Bill Settlement calculation — ported exactly from the Dentist Receipt Calculator
 * (DESIGN-DOCUMENT §14.3). The payment fee is DEDUCTED: the clinic absorbs card cost.
 *   doctor = r2(amount × pct / 100)   clinic = r2(amount − doctor)
 *   subtotal = Σclinic + Σdoctor + Σother;  fee = r2(subtotal × method% / 100);  grand = subtotal − fee
 */
function calcBill(bill, methods) {
  const sv = bill.services.map(s => {
    const doctor = r2(Number(s.amount || 0) * Number(s.pct || 0) / 100);
    return Object.assign({}, s, { doctor, clinic: r2(Number(s.amount || 0) - doctor) });
  });
  const tc = r2(sv.reduce((a, s) => a + s.clinic, 0));
  const td = r2(sv.reduce((a, s) => a + s.doctor, 0));
  const to = r2(bill.others.reduce((a, o) => a + Number(o.amount || 0), 0));
  const sub = r2(tc + td + to);
  const method = (methods || []).find(m => m.name === bill.method) || { fee: 0 };
  const fee = r2(sub * method.fee / 100);
  return { sv, tc, td, to, sub, fee, grand: r2(sub - fee), feePct: method.fee };
}

/** Bottom-centre toast; replaces any visible one. */
let toastTimer = null;
function toast(text) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#10b981"></i><span>${esc(text)}</span>`;
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}
