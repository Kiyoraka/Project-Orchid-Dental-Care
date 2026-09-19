/* Orchid Dental Care — public landing page (prototype lines 25-339 + landing part of renderVals()).
 *
 * Views are driven by location.hash, mirroring the prototype's `landPage`:
 *   #home (default) · #services · #schedule · #dentists · #contact · #book
 * UI-only state (calendar filter/day, FAQ, mobile menu, booking draft) is module-local;
 * a confirmed booking prepends a lead to the persisted store (visible in Marketing).
 */
(() => {
  const PAGES = ['home', 'services', 'schedule', 'dentists', 'contact', 'book'];
  const NAV = [['Home', 'home'], ['Services', 'services'], ['Schedule', 'schedule'], ['Dentists', 'dentists'], ['Contact', 'contact']];
  const root = document.getElementById('app');

  /* ---------- module-local UI state (prototype defaults) ---------- */
  const cal = { dentist: 'all', day: 24 };
  const book = { name: '', phone: '', email: '', dentist: 'aina', date: '2026-09-24', time: '10:00', treatment: 'Not sure yet', notes: '', done: false, error: '' };
  let faqOpen = 0;
  let mobileNav = false;

  const pageFromHash = () => {
    const h = (location.hash || '').replace(/^#/, '');
    return PAGES.includes(h) ? h : 'home';
  };
  let page = pageFromHash();

  /* ---------- navigation (prototype setLand / goBook / goLogin) ---------- */
  function go(p) {
    mobileNav = false;
    if (pageFromHash() !== p || location.hash !== '#' + p) {
      location.hash = p; /* hashchange -> render + scroll top */
    } else {
      page = p;
      render();
      window.scrollTo(0, 0);
    }
  }
  const goHome = () => go('home');
  const goServices = () => go('services');
  const goSchedule = () => go('schedule');
  const goBook = () => { book.done = false; go('book'); };
  const goLogin = () => { mobileNav = false; location.href = 'login.html'; };

  window.addEventListener('hashchange', () => {
    page = pageFromHash();
    mobileNav = false;
    render();
    window.scrollTo(0, 0);
  });

  /* ---------- calendar maths (ported verbatim) ---------- */
  const dowOf = d => demoDow(d);
  function slotsFor(d) {
    const dow = dowOf(d);
    if (d < 1 || d > DEMO_TODAY.daysInMonth || dow === 0 || d < DEMO_TODAY.day) return [];
    const ids = cal.dentist === 'all' ? DENTISTS.map(x => x.id) : [cal.dentist];
    const open = ids.some(id => dentistById(id).on.includes(dow));
    if (!open) return [];
    const base = dow === 5 ? ALL_SLOTS.slice(0, 6) : ALL_SLOTS;
    const seed = d * 7 + ids.length * 3;
    const keep = (seed % 5 === 0) ? 1 : (seed % 5 < 3) ? 3 : 2;
    return base.filter((_, i) => (i + seed) % keep === 0);
  }
  const isoDay = d => '2026-09-' + String(d).padStart(2, '0');

  /* ---------- pieces ---------- */
  const pubServices = TREATMENTS.filter(t => t.isPublic).map(t => Object.assign({}, t, { priceText: t.price.toFixed(2) }));

  const head = (eyebrow, title, extraCls = '') =>
    `<div><div class="land-eyebrow">${esc(eyebrow)}</div><div class="land-title ${extraCls}">${esc(title)}</div></div>`;

  function navHtml() {
    const links = NAV.map(n => `<a href="#${n[1]}" class="land-nav-link${page === n[1] ? ' is-active' : ''}" ${UI.click(() => go(n[1]))}>${esc(n[0])}</a>`).join('');
    const mobileLinks = NAV.map(n => `<a href="#${n[1]}" class="land-mobile-link${page === n[1] ? ' is-active' : ''}" ${UI.click(() => go(n[1]))}>${esc(n[0])}</a>`).join('');
    return `<header class="land-nav">
      <div class="land-nav-bar">
        <a href="#home" class="land-logo" ${UI.click(goHome)}><span class="land-logo-mark"><i class="fa-solid fa-tooth"></i></span><span class="land-logo-text">Orchid Dental Care</span></a>
        <nav class="land-nav-links" aria-label="Main">${links}</nav>
        <div class="land-nav-actions">
          <button class="land-pill land-pill-ghost" ${UI.click(goLogin)}>Patient login</button>
          <button class="land-pill land-pill-primary land-nav-book" ${UI.click(goBook)}>Book appointment</button>
        </div>
        <button class="land-burger" aria-label="Menu" aria-expanded="${mobileNav}" ${UI.click(() => { mobileNav = !mobileNav; render(); })}><i class="fa-solid ${mobileNav ? 'fa-xmark' : 'fa-bars'}"></i></button>
      </div>
      ${mobileNav ? `<div class="land-mobile-menu">${mobileLinks}
        <button class="land-pill land-pill-primary" ${UI.click(goBook)}>Book appointment</button>
        <button class="land-pill land-pill-outline" ${UI.click(goLogin)}>Patient login</button>
      </div>` : ''}
    </header>`;
  }

  function nextAvailHtml() {
    return DENTISTS.map(d => {
      let day = DEMO_TODAY.day, sl = [];
      while (day <= DEMO_TODAY.daysInMonth) {
        const dow = dowOf(day);
        if (d.on.includes(dow) && dow !== 0) { sl = ALL_SLOTS.filter((_, i) => (i + day) % 2 === 0); break; }
        day++;
      }
      const when = day === 18 ? 'Today' : day === 19 ? 'Tomorrow' : `${DOW[dowOf(day)]} ${day} Sep`;
      const time = sl[0] || '09:00';
      const pick = () => {
        Object.assign(book, { done: false, dentist: d.id, date: isoDay(day), time });
        go('book');
      };
      return `<button class="land-avail-item" ${UI.click(pick)}>
        <div class="land-avatar" style="background:${d.color}">${esc(d.initials)}</div>
        <div class="land-avail-main"><div class="land-avail-name">${esc(d.name)}</div><div class="land-avail-spec">${esc(d.specialty)}</div></div>
        <div class="land-avail-when"><div class="land-avail-day">${esc(when)}</div><div class="land-avail-time">${esc(time)}</div></div>
      </button>`;
    }).join('');
  }

  function heroHtml() {
    return `<section class="land-hero">
      <div class="land-hero-glow"></div>
      <div class="land-hero-grid">
        <div class="land-hero-copy">
          <div class="land-open-pill"><span class="land-dot"></span>Open today · 9:00 AM – 6:00 PM</div>
          <h1 class="land-hero-h1">Your smile,<br><span>our care.</span></h1>
          <p class="land-hero-sub">Gentle, modern dentistry for the whole family in Shah Alam. Transparent pricing, three specialists, and online booking that takes under a minute.</p>
          <div class="land-hero-ctas">
            <button class="land-pill land-pill-primary land-hero-book" ${UI.click(goBook)}><i class="fa-regular fa-calendar-check"></i>Book appointment</button>
            <button class="land-hero-wa"><i class="fa-brands fa-whatsapp"></i>WhatsApp us</button>
          </div>
          <div class="land-stats">${LANDING.stats.map(st => `<div class="land-stat"><div class="land-stat-value">${esc(st.value)}</div><div class="land-stat-label">${esc(st.label)}</div></div>`).join('')}</div>
        </div>
        <div class="land-avail">
          <div class="land-avail-head"><div class="land-avail-title">Next available</div><span class="land-live">Live availability</span></div>
          <div class="land-avail-list">${nextAvailHtml()}</div>
          <a href="#schedule" class="land-avail-more" ${UI.click(goSchedule)}>See full schedule →</a>
        </div>
      </div>
    </section>`;
  }

  const whyHtml = () => `<section class="land-why">${LANDING.whyUs.map(w => `<div class="land-why-item">
      <div class="land-why-icon"><i class="${esc(w.icon)}"></i></div>
      <div class="land-why-title">${esc(w.title)}</div>
      <div class="land-why-text">${esc(w.text)}</div>
    </div>`).join('')}</section>`;

  function serviceCard(s, lift) {
    return `<div class="land-svc ${lift ? 'land-svc-lift' : 'land-svc-flat'}">
      <div class="land-svc-icon"><i class="${esc(s.icon)}"></i></div>
      <div class="land-svc-name">${esc(s.name)}</div>
      <div class="land-chips"><span class="land-chip">${esc(s.category)}</span><span class="land-chip">${lift ? '<i class="fa-regular fa-clock"></i>' : ''}${esc(s.duration)} min</span></div>
      <div class="land-svc-price"><span class="land-svc-from">from</span><span class="land-svc-amount">RM ${esc(s.priceText)}</span></div>
    </div>`;
  }

  function homeServicesHtml() {
    const list = pubServices.filter(t => LANDING.homeServices.includes(t.name));
    return `<section class="land-section">
      <div class="land-section-head">${head('Services', 'Transparent prices, no surprises')}<a href="#services" class="land-link" ${UI.click(goServices)}>View all services →</a></div>
      <div class="land-svc-grid">${list.map(s => serviceCard(s, true)).join('')}</div>
    </section>`;
  }

  function packagesHtml() {
    return `<section class="land-section land-section-pkg">
      ${head('Packages', 'Bundled care, better value')}
      <div class="land-pkg-grid">${LANDING.packages.map(p => `<div class="land-pkg${p.popular ? ' is-popular' : ''}">
        ${p.popular ? '<div class="land-pkg-badge">MOST POPULAR</div>' : ''}
        <div class="land-pkg-name">${esc(p.name)}</div>
        <div class="land-pkg-desc">${esc(p.desc)}</div>
        <div class="land-pkg-items">${p.items.map(it => `<div class="land-pkg-item"><span class="land-pkg-check"><i class="fa-solid fa-check"></i></span><span>${esc(it)}</span></div>`).join('')}</div>
        <div class="land-pkg-foot">
          <div><div class="land-pkg-label">Package price</div><div class="land-pkg-price">RM ${esc(p.priceText)}</div></div>
          <button class="land-pkg-btn" ${UI.click(goBook)}>Book</button>
        </div>
      </div>`).join('')}</div>
    </section>`;
  }

  const allServicesHtml = () => `<section class="land-section">
      ${head('Services', 'Everything we offer')}
      <div class="land-svc-grid">${pubServices.map(s => serviceCard(s, false)).join('')}</div>
    </section>`;

  function scheduleHtml() {
    const chips = [{ id: 'all', name: 'Any dentist', initials: 'ALL', color: '#2563eb' }].concat(DENTISTS).map(d => {
      const on = cal.dentist === d.id;
      return `<button class="land-dchip${on ? ' is-on' : ''}" aria-pressed="${on}" ${UI.click(() => { cal.dentist = d.id; render(); })}>
        <span class="land-dchip-avatar" style="background:${d.color}">${d.id === 'all' ? '∙' : esc(d.initials)}</span>${esc(d.name)}
      </button>`;
    }).join('');

    let cells = '';
    for (let i = 0; i < DEMO_TODAY.firstDow; i++) cells += '<button class="land-cell is-blank" disabled aria-hidden="true" tabindex="-1"><span></span><span class="land-cell-dots"></span></button>';
    for (let d = 1; d <= DEMO_TODAY.daysInMonth; d++) {
      const n = slotsFor(d).length, sel = cal.day === d, today = d === DEMO_TODAY.day, closed = n === 0;
      const dots = closed ? [] : n >= 6 ? ['#10b981', '#10b981', '#10b981'] : n >= 3 ? ['#10b981', '#10b981'] : ['#f59e0b'];
      const cls = ['land-cell', sel ? 'is-selected' : '', closed ? 'is-closed' : '', today ? 'is-today' : ''].filter(Boolean).join(' ');
      const pick = closed ? '' : UI.click(() => { cal.day = d; render(); });
      const label = `${DOW[dowOf(d)]} ${d} September${closed ? ', closed or full' : `, ${n} slots`}`;
      cells += `<button class="${cls}" ${closed ? 'disabled' : ''} aria-label="${label}"${sel ? ' aria-current="date"' : ''} ${pick}>
        <span>${d}</span><span class="land-cell-dots">${(sel ? dots.map(() => '#fff') : dots).map(c => `<span class="land-cell-dot" style="background:${c}"></span>`).join('')}</span>
      </button>`;
    }

    const daySlots = slotsFor(cal.day);
    const dentName = cal.dentist === 'all' ? 'Any dentist' : dentistById(cal.dentist).name;
    const mkSlot = t => `<button class="land-slot" ${UI.click(() => {
      Object.assign(book, { done: false, date: isoDay(cal.day), time: t, dentist: cal.dentist === 'all' ? 'any' : cal.dentist });
      go('book');
    })}>${esc(t)}</button>`;
    const morning = daySlots.filter(t => t < '13:00'), afternoon = daySlots.filter(t => t >= '13:00');
    const group = (icon, color, title, list) => list.length ? `<div class="land-slot-group">
        <div class="land-slot-group-title"><i class="${icon}" style="color:${color}"></i>${title}</div>
        <div class="land-slot-grid">${list.map(mkSlot).join('')}</div>
      </div>` : '';

    return `<section class="land-band"><div class="land-sched">
      <div class="land-sched-head">
        <div><div class="land-eyebrow">Schedule</div><div class="land-title">Pick a day, pick a time</div><div class="land-lead">Only availability is shown — never patient details. Slots are 30 minutes.</div></div>
        <div class="land-dchips">${chips}</div>
      </div>
      <div class="land-cal-card">
        <div class="land-cal">
          <div class="land-cal-head">
            <button class="land-cal-nav" disabled aria-label="Previous month"><i class="fa-solid fa-chevron-left"></i></button>
            <div class="land-cal-month">September 2026</div>
            <button class="land-cal-nav" aria-label="Next month"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
          <div class="land-cal-dow"><div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div></div>
          <div class="land-cal-grid">${cells}</div>
          <div class="land-cal-legend">
            <div class="land-legend-item"><span class="land-legend-dots"><span class="land-cell-dot" style="background:#10b981"></span><span class="land-cell-dot" style="background:#10b981"></span><span class="land-cell-dot" style="background:#10b981"></span></span>Plenty of slots</div>
            <div class="land-legend-item"><span class="land-cell-dot" style="background:#f59e0b;display:inline-block"></span>Few left</div>
            <div class="land-legend-item"><span class="land-legend-swatch"></span>Closed / full</div>
          </div>
        </div>
        <div class="land-slots">
          <div>
            <div class="land-slots-label">Selected</div>
            <div class="land-slots-day">${DOW[dowOf(cal.day)]}, ${cal.day} September</div>
            <div class="land-slots-sub">${esc(daySlots.length ? `${daySlots.length} slots available · ${dentName}` : `Closed or fully booked · ${dentName}`)}</div>
          </div>
          ${group('fa-regular fa-sun', '#f59e0b', 'Morning', morning)}
          ${group('fa-regular fa-moon', '#2563eb', 'Afternoon', afternoon)}
          ${daySlots.length ? '' : '<div class="land-slots-empty"><i class="fa-regular fa-calendar-xmark"></i>No slots on this day. Try a highlighted date.</div>'}
          <div class="land-slots-note"><i class="fa-solid fa-shield-halved"></i>Selecting a time pre-fills the booking form. Your slot is held until our team confirms.</div>
        </div>
      </div>
    </div></section>`;
  }

  function dentistsHtml() {
    return `<section class="land-section land-section-lg">
      ${head('Our dentists', 'Meet the team')}
      <div class="land-dent-grid">${DENTISTS.map(d => `<div class="land-dent">
        <div class="land-dent-cover" style="background:linear-gradient(135deg,${d.color},#1d4ed8)">
          <div class="land-dent-ring"><div class="land-dent-avatar" style="background:${d.color}">${esc(d.initials)}</div></div>
        </div>
        <div class="land-dent-body">
          <div><div class="land-dent-name">${esc(d.name)}</div><div class="land-dent-spec">${esc(d.specialty)}</div></div>
          <div class="land-daychips">${[1, 2, 3, 4, 5, 6].map(i => `<span class="land-daychip${d.on.includes(i) ? ' is-on' : ''}">${DOW[i]}</span>`).join('')}</div>
          <button class="land-dent-book" ${UI.click(() => { Object.assign(book, { dentist: d.id, done: false }); go('book'); })}>Book with ${esc(d.short)}</button>
        </div>
      </div>`).join('')}</div>
    </section>`;
  }

  function promoFaqHtml() {
    const faqs = LANDING.faqs.map((f, i) => {
      const open = faqOpen === i;
      return `<div class="land-faq${open ? ' is-open' : ''}">
        <button class="land-faq-q" aria-expanded="${open}" ${UI.click(() => { faqOpen = open ? -1 : i; render(); })}><span>${esc(f[0])}</span><span class="land-faq-icon"><i class="fa-solid ${open ? 'fa-minus' : 'fa-plus'}"></i></span></button>
        ${open ? `<div class="land-faq-a">${esc(f[1])}</div>` : ''}
      </div>`;
    }).join('');
    return `<section class="land-band-top"><div class="land-two">
      <div class="land-col">
        ${head('Promotions', 'This season', 'land-title-sm')}
        ${LANDING.promos.map(p => `<div class="land-promo">
          <div class="land-promo-title">${esc(p.title)}</div>
          <div class="land-promo-text">${esc(p.text)}</div>
          <div class="land-promo-valid"><i class="fa-regular fa-calendar"></i>Valid ${esc(p.valid)}</div>
        </div>`).join('')}
        <div class="land-say">What patients say</div>
        ${LANDING.testimonials.map(t => `<div class="land-quote">
          <div class="land-stars">${'<i class="fa-solid fa-star"></i>'.repeat(5)}</div>
          <div class="land-quote-text">“${esc(t.quote)}”</div>
          <div class="land-quote-name">${esc(t.name)}</div>
        </div>`).join('')}
      </div>
      <div class="land-col">
        ${head('FAQ', 'Common questions', 'land-title-sm')}
        ${faqs}
      </div>
    </div></section>`;
  }

  function contactHtml() {
    const hours = LANDING.hours.map(h => {
      const fri = h[0] === 'Friday';
      return `<div class="land-hours-row${fri ? ' is-hl' : ''}"><span class="land-hours-day">${esc(h[0])}</span><span class="land-hours-time${h[1] ? '' : ' is-closed'}">${esc(h[1] ? `${h[1]} – ${h[2]}` : 'Closed')}</span></div>`;
    }).join('');
    return `<section class="land-contact">
      <div class="land-panel">
        <div class="land-panel-title">Visit us</div>
        <div class="land-info land-info-top"><span class="land-info-icon"><i class="fa-solid fa-location-dot"></i></span><span>12-1, Jalan Plumbum V7/V, Seksyen 7, 40000 Shah Alam, Selangor</span></div>
        <div class="land-info"><span class="land-info-icon"><i class="fa-solid fa-phone"></i></span>03-5510 2233</div>
        <div class="land-info"><span class="land-info-icon is-wa"><i class="fa-brands fa-whatsapp"></i></span>012-345 6789</div>
        <div class="land-map"><i class="fa-solid fa-map-location-dot"></i>Map embed</div>
      </div>
      <div class="land-panel land-panel-hours">
        <div class="land-panel-title">Operating hours</div>
        <div class="land-hours">${hours}</div>
        <div class="land-hours-note">Closed on public holidays. Emergencies: WhatsApp us.</div>
      </div>
    </section>`;
  }

  /* ---------- booking ---------- */
  function submitBooking() {
    if (!book.name || !book.phone) {
      book.error = 'Name and phone are required.';
      render();
      return;
    }
    book.done = true;
    book.error = '';
    const lead = {
      id: Date.now(), name: book.name, phone: book.phone, source: 'Website', interest: 'Booking', status: 'BOOKED',
      follow: '', attempts: 0, log: [{ when: '18 Sep', type: 'Status', outcome: 'Booked online', note: book.date + ' ' + book.time }]
    };
    Store.set(s => ({ leads: [lead].concat(s.leads) })); /* notifies -> render() */
  }

  function bookHtml() {
    const field = (label, control, full) => `<label class="land-field${full ? ' land-field-full' : ''}">${label}${control}</label>`;
    const setter = key => UI.input((e, el) => { book[key] = el.value; });
    const chooser = key => UI.change((e, el) => { book[key] = el.value; });

    if (book.done) {
      const who = book.dentist === 'any' ? 'any available dentist' : (dentistById(book.dentist) || {}).name;
      return `<section class="land-book"><div class="land-book-card">
        <div class="land-done">
          <div class="land-done-icon"><i class="fa-solid fa-check"></i></div>
          <div class="land-done-title">Slot held, ${esc(book.name)}</div>
          <div class="land-done-text">${esc(`${book.date} at ${book.time} with ${who}. A lead (WEBSITE) and a PENDING appointment were created.`)}</div>
          <div class="land-done-pending">PENDING — our team will call to confirm</div>
          <button class="land-pill land-pill-outline land-done-home" ${UI.click(goHome)}>Back to home</button>
        </div>
      </div></section>`;
    }

    return `<section class="land-book"><div class="land-book-card">
      <div class="land-steps"><span class="is-on">1 Details</span><span>›</span><span>2 We confirm</span><span>›</span><span>3 Visit</span></div>
      <div class="land-book-title">Book an appointment</div>
      <div class="land-book-sub">We hold the slot for you and confirm by phone or WhatsApp.</div>
      <div class="land-form-grid">
        ${field('Full name', `<input data-key="book-name" autocomplete="name" value="${esc(book.name)}" placeholder="Nik Ahmad" ${setter('name')}>`)}
        ${field('Phone', `<input data-key="book-phone" type="tel" autocomplete="tel" value="${esc(book.phone)}" placeholder="012-345 6789" ${setter('phone')}>`)}
        ${field('Email (optional)', `<input data-key="book-email" type="email" autocomplete="email" value="${esc(book.email)}" placeholder="you@email.com" ${setter('email')}>`)}
        ${field('Dentist', `<select data-key="book-dentist" ${chooser('dentist')}>${UI.options([['any', 'Any available']].concat(DENTISTS.map(d => [d.id, d.name])), book.dentist)}</select>`)}
        ${field('Date', `<input data-key="book-date" type="date" value="${esc(book.date)}" ${chooser('date')}>`)}
        ${field('Time', `<select data-key="book-time" ${chooser('time')}>${UI.options(ALL_SLOTS, book.time)}</select>`)}
        ${field('Treatment / package (optional)', `<select data-key="book-treatment" ${chooser('treatment')}>${UI.options(['Not sure yet'].concat(pubServices.map(s => s.name)), book.treatment)}</select>`, true)}
      </div>
      ${field('Notes', `<textarea data-key="book-notes" rows="3" placeholder="Anything we should know?" ${setter('notes')}>${esc(book.notes)}</textarea>`)}
      ${book.error ? `<div class="land-error" role="alert"><i class="fa-solid fa-circle-exclamation"></i>${esc(book.error)}</div>` : ''}
      <button class="land-pill land-pill-primary land-submit" ${UI.click(submitBooking)}>Confirm booking</button>
      <div class="land-pdpa">By booking you agree to our PDPA privacy notice.</div>
    </div></section>`;
  }

  function footerHtml() {
    return `<footer class="land-footer">
      <div class="land-footer-grid">
        <div class="land-footer-col land-footer-brand"><div class="land-footer-logo"><i class="fa-solid fa-tooth"></i>Orchid Dental Care</div><div class="land-footer-reg">Registered dental clinic · MOH/DC/2026/00412</div></div>
        <div class="land-footer-col"><div class="land-footer-head">Clinic</div>${NAV.map(n => `<a href="#${n[1]}" ${UI.click(() => go(n[1]))}>${esc(n[0])}</a>`).join('')}</div>
        <div class="land-footer-col"><div class="land-footer-head">Contact</div><div>03-5510 2233</div><div>012-345 6789 (WhatsApp)</div><div>hello@orchiddental.my</div></div>
        <div class="land-footer-col"><div class="land-footer-head">Follow</div><div class="land-social"><i class="fa-brands fa-facebook" aria-label="Facebook"></i><i class="fa-brands fa-instagram" aria-label="Instagram"></i><i class="fa-brands fa-tiktok" aria-label="TikTok"></i></div></div>
      </div>
      <div class="land-footer-bottom"><div class="land-footer-bottom-inner"><span>© 2026 Orchid Dental Care</span><span>Privacy (PDPA) · Terms</span></div></div>
    </footer>`;
  }

  /* ---------- render ---------- */
  function render() {
    UI.begin();
    const home = page === 'home';
    const html = [
      navHtml(),
      '<main>',
      home ? heroHtml() + whyHtml() + homeServicesHtml() + packagesHtml() : '',
      page === 'services' ? allServicesHtml() : '',
      home || page === 'schedule' ? scheduleHtml() : '',
      home || page === 'dentists' ? dentistsHtml() : '',
      home ? promoFaqHtml() : '',
      home || page === 'contact' ? contactHtml() : '',
      page === 'book' ? bookHtml() : '',
      '</main>',
      footerHtml()
    ].join('');
    UI.render(root, html);
  }

  UI.mount(root);
  Store.subscribe(render);
  render();
})();
