/* Orchid Dental Care — ADMIN dashboard role module.
 * Ported from the prototype renderVals() `role==='admin'` branches (Orchid Dental Care.dc.html lines 841-1072)
 * and the admin Setting tabs (lines 768-835). Registers Roles.admin = { render(ctx) } (contract: shell.js).
 */
(() => {
  const edit = ['fa-solid fa-pen', 'Edit'];

  /* ---------------- main ---------------- */
  function mainPage(ctx) {
    const s = ctx.state;
    const draftCount = s.bills.filter(b => b.status === 'DRAFT').length;
    const settledToday = s.bills.filter(b => b.status === 'SETTLED' && String(b.visit).startsWith('18 Sep'));
    const collected = settledToday.reduce((a, b) => a + calcBill(b, s.methods).grand, 0);
    const toCome = s.appts.filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING').length;
    const apptRows = s.appts.slice().sort((a, b) => a.time.localeCompare(b.time)).map(a => {
      const d = dentistById(a.dentist);
      return { time: a.time, title: a.patient, sub: `${d ? d.name : a.dentist} · ${a.treatment}`, badge: a.status };
    });
    return {
      kpis: [
        { label: 'Today revenue', value: money(4250 + collected), sub: '8 bills settled', icon: 'fa-solid fa-sack-dollar', color: '#10b981' },
        { label: 'This month', value: money(61830 + collected), sub: '+12% vs Aug', icon: 'fa-solid fa-chart-line' },
        { label: 'Appointments today', value: String(s.appts.length), sub: `${toCome} still to come`, icon: 'fa-regular fa-calendar' },
        { label: 'New patients', value: '5', sub: 'this month', icon: 'fa-solid fa-user-plus' },
        { label: 'Low stock', value: '3 items', sub: 'reorder now', icon: 'fa-solid fa-triangle-exclamation', color: '#f59e0b' }
      ],
      widgets: [
        { title: "Today's schedule", sub: 'all dentists', span: 1, rows: apptRows },
        {
          title: 'Alerts', sub: '', span: 1, rows: [
            { icon: 'fa-solid fa-triangle-exclamation', iconColor: '#f59e0b', title: 'Lidocaine 2% low', sub: '4 left · reorder level 10', action: 'Stock in', onAction: () => ctx.go('inventory', 1) },
            { icon: 'fa-solid fa-file-invoice', iconColor: '#f59e0b', title: `${draftCount} bills in DRAFT`, sub: 'awaiting cashier', action: 'View', onAction: () => ctx.toast('Admin has read access — see Cashier ▸ Patient Management') },
            { icon: 'fa-solid fa-phone', iconColor: '#ef4444', title: '5 follow-ups overdue', sub: 'Marketing pipeline' },
            { icon: 'fa-solid fa-ban', iconColor: '#ef4444', title: 'INV-20260916-003 voided', sub: 'reason: duplicate entry · audit logged' }
          ]
        }
      ]
    };
  }

  /* ---------------- analysis ---------------- */
  function analysisPage() {
    const trendData = [[1, 3.2], [2, 4.1], [3, 2.8], [4, 5.6], [5, 4.9], [6, 3.1], [8, 6.2], [9, 4.4], [10, 5.1], [11, 3.9], [12, 6.8], [13, 4.2], [15, 5.5], [16, 4.7], [17, 6.1], [18, 4.3]];
    return {
      charts: [
        { title: 'Revenue trend (daily)', type: 'trend', bars: trendData.map(d => ({ label: String(d[0]), pct: Math.round(d[1] / 6.8 * 100) })) },
        { title: 'Revenue by treatment', type: 'bars', bars: UI.bars([['Braces', 18000], ['Implant', 11400], ['Crown', 7200], ['Scaling', 5280], ['Whitening', 4500], ['Filling', 3600]]) },
        { title: 'Revenue by dentist', type: 'bars', bars: UI.bars([['Dr. Aina', 24300], ['Dr. Hafiz', 21900], ['Dr. Mei', 15600]], '#10b981') },
        { title: 'Doctor fee vs clinic fee', type: 'bars', bars: UI.bars([['Clinic fee', 35120], ['Doctor fee', 26710]], '#8b5cf6') },
        { title: 'Payment method mix · fee cost', type: 'bars', bars: UI.bars([['Cash', 24000], ['Online', 15200], ['Debit Card', 12800], ['Credit Card', 7400], ['Mastercard', 2430]], '#f59e0b') },
        { title: 'Appointments this month', type: 'bars', bars: UI.bars([['Completed', 212, 'n'], ['Cancelled', 18, 'n'], ['No-show', 9, 'n']], '#2563eb') }
      ]
    };
  }

  /* ---------------- users ---------------- */
  function usersPage(ctx) {
    const rows = [
      ['Kiyo', 'kiyo', 'ADMIN', 'ACTIVE', '18 Sep 08:02'], ['Dr. Aina', 'aina', 'DENTIST', 'ACTIVE', '18 Sep 08:45'],
      ['Dr. Hafiz', 'hafiz', 'DENTIST', 'ACTIVE', '17 Sep'], ['Dr. Mei', 'mei', 'DENTIST', 'ACTIVE', '16 Sep'],
      ['Farah', 'farah', 'MARKETING', 'ACTIVE', '18 Sep 09:10'], ['Suraya', 'suraya', 'CASHIER', 'ACTIVE', '18 Sep 08:30'],
      ['Aiman', 'aiman', 'MARKETING', 'INACTIVE', '2 Aug']
    ];
    return {
      toolbar: {
        search: 'Search name / username',
        filters: [['All roles', 'ADMIN', 'MARKETING', 'DENTIST', 'CASHIER'], ['Active', 'Inactive']],
        primary: 'Add User', onPrimary: () => ctx.toast('Add User modal — role DENTIST opens Dentist Profile tab')
      },
      table: {
        cols: ['Name', 'Username', 'Role', 'Status', 'Last login', 'Actions'],
        rows: rows.map(r => ({
          cells: [T(r[0], { bold: true }), T(r[1]), B(r[2]), B(r[3]), T(r[4], { color: '#4b5563' }),
            A([edit, ['fa-solid fa-key', 'Reset password'], ['fa-solid fa-power-off', r[3] === 'ACTIVE' ? 'Deactivate' : 'Activate', r[3] === 'ACTIVE' ? '#ef4444' : '#10b981']])]
        })),
        footer: '✎ edit · 🔑 reset password · ⏻ activate / deactivate — no hard delete'
      }
    };
  }

  /* ---------------- treatments ---------------- */
  function treatmentsPage(ctx) {
    const spec = { tabs: ['Treatments', 'Categories', 'Packages'] };
    if (ctx.tab === 0) {
      spec.toolbar = { search: 'Search treatment', filters: [['All categories', 'General', 'Surgery', 'Cosmetic', 'Orthodontic']], primary: 'Add Treatment', onPrimary: () => ctx.toast('New treatment form') };
      spec.table = {
        cols: ['Name', 'Category', 'Price (RM)', 'Doctor fee %', 'Duration', 'Public', 'Active', 'Actions'],
        rows: TREATMENTS.map(t => ({
          cells: [T(t.name, { bold: true }), T(t.category, { color: '#4b5563' }), T(t.price.toFixed(2)), T(t.pct + '%'),
            T(t.duration ? t.duration + ' min' : '-'), CK(t.isPublic), CK(true), A([edit, ['fa-solid fa-flask', 'Consumables']])]
        })),
        footer: 'Price = default charge (cashier can override per bill line). Consumables per treatment drive stock deduction on settle.'
      };
    } else if (ctx.tab === 1) {
      const cats = [['General', 1], ['Hygiene', 1], ['Restorative', 2], ['Surgery', 3], ['Diagnostic', 1], ['Cosmetic', 1], ['Endodontic', 1], ['Orthodontic', 1], ['Prosthodontic', 1], ['Emergency', 1], ['Pharmacy', 1], ['Package', 1]];
      spec.toolbar = { primary: 'Add Category', onPrimary: () => ctx.toast('New category') };
      spec.table = {
        cols: ['Category', 'Treatments', 'Sort', 'Actions'],
        rows: cats.map((c, i) => ({ cells: [T(c[0], { bold: true }), T(String(c[1])), T(String(i + 1), { color: '#4b5563' }), A([edit])] }))
      };
    } else {
      const pkgs = [
        ['Basic Check-up', 'Consult · Scaling · X-ray', '199.00', 'Always', true],
        ['Smile Makeover', 'Scaling · Whitening', '580.00', '1 Sep – 31 Dec 2026', true],
        ['Family Package', '4 × Consult · 4 × Scaling', '599.00', 'Always', true]
      ];
      spec.toolbar = { primary: 'Add Package', onPrimary: () => ctx.toast('New package') };
      spec.table = {
        cols: ['Package', 'Items', 'Price (RM)', 'Valid', 'Public', 'Actions'],
        rows: pkgs.map(p => ({ cells: [T(p[0], { bold: true }), T(p[1], { color: '#4b5563' }), T(p[2]), T(p[3]), CK(p[4]), A([edit])] })),
        footer: 'Open question #4: package price split across treatments proportionally by default price (for doctor fee).'
      };
    }
    return spec;
  }

  /* ---------------- inventory ---------------- */
  function inventoryPage(ctx) {
    const spec = { tabs: ['Items', 'Stock In', 'Stock Adjust', 'Movements', 'Suppliers', 'Categories'] };
    const items = [
      ['Lidocaine 2%', 'Anaesthetic', 'amp', 4, 10, '3.50'], ['Gloves (M)', 'Consumable', 'box', 22, 5, '18.00'],
      ['Composite A2', 'Restorative', 'syringe', 0, 3, '85.00'], ['Suture 3-0', 'Surgery', 'pack', 6, 8, '12.00'],
      ['Fluoride varnish', 'Hygiene', 'tube', 15, 4, '22.00'], ['Impression alginate', 'Prosthodontic', 'bag', 9, 3, '38.00']
    ];
    const stockStatus = i => (i[3] === 0 ? 'OUT' : i[3] <= i[4] ? 'LOW' : 'OK');
    const signColor = c => (c.startsWith('+') ? '#10b981' : '#ef4444');
    switch (ctx.tab) {
      case 0:
        spec.toolbar = { search: 'Search item / SKU', filters: [['All categories', 'Anaesthetic', 'Consumable', 'Restorative'], ['All status', 'OK', 'LOW', 'OUT']], primary: 'Add Item', onPrimary: () => ctx.toast('New item') };
        spec.table = {
          cols: ['Item', 'Category', 'Unit', 'On hand', 'Reorder', 'Cost (RM)', 'Status', 'Actions'],
          rows: items.map(i => ({
            cells: [T(i[0], { bold: true }), T(i[1], { color: '#4b5563' }), T(i[2]),
              T(String(i[3]), { bold: true, color: stockStatus(i) === 'OK' ? '#1f2937' : '#ef4444' }), T(String(i[4])), T(i[5]), B(stockStatus(i)),
              A([edit, ['fa-solid fa-arrow-down', 'Stock in', '#10b981', () => ctx.setTab(1)]])]
          })),
          footer: 'on_hand is always Σ stock_movements — row-locked per item.'
        };
        break;
      case 1:
        spec.toolbar = { primary: 'Record Stock In', onPrimary: () => ctx.toast('Stock IN recorded — movement +qty written') };
        spec.table = {
          cols: ['Date', 'Item', 'Supplier', 'Qty', 'Unit cost', 'Batch', 'Expiry'],
          rows: [
            ['18 Sep', 'Gloves (M)', 'MedSupply Sdn Bhd', '+10 box', '18.00', 'G-2609', 'Mar 2028'],
            ['15 Sep', 'Fluoride varnish', 'DentCare Trading', '+12 tube', '22.00', 'FV-118', 'Nov 2027'],
            ['10 Sep', 'Suture 3-0', 'MedSupply Sdn Bhd', '+20 pack', '12.00', 'S30-77', 'Jun 2027']
          ].map(r => ({ cells: r.map((c, i) => T(c, { bold: i === 1, color: i === 3 ? '#10b981' : '#1f2937' })) }))
        };
        break;
      case 2:
        spec.toolbar = { primary: 'New Adjustment', onPrimary: () => ctx.toast('Adjustment ±qty with reason') };
        spec.table = {
          cols: ['Date', 'Item', 'Qty', 'Reason', 'By'],
          rows: [
            ['16 Sep', 'Composite A2', '−2', 'Expired', 'Kiyo'],
            ['12 Sep', 'Lidocaine 2%', '−1', 'Damaged ampoule', 'Dr. Hafiz'],
            ['1 Sep', 'Gloves (M)', '+1', 'Count correction', 'Kiyo']
          ].map(r => ({ cells: r.map((c, i) => T(c, { bold: i === 1, color: i === 2 ? signColor(c) : '#1f2937' })) }))
        };
        break;
      case 3:
        spec.toolbar = { search: 'Filter by item', filters: [['All types', 'IN', 'OUT', 'ADJUST']] };
        spec.table = {
          cols: ['Date', 'Type', 'Item', 'Qty', 'Ref'],
          rows: [
            ['18 Sep 09:12', 'OUT', 'Lidocaine 2%', '−2', 'INV-20260918-001 (Extraction)'],
            ['18 Sep 08:40', 'IN', 'Gloves (M)', '+10', 'PO-2209'],
            ['17 Sep 15:05', 'OUT', 'Gloves (M)', '−1', 'INV-20260917-004'],
            ['16 Sep', 'ADJUST', 'Composite A2', '−2', 'Expired']
          ].map(r => ({
            cells: [T(r[0], { color: '#4b5563' }), B(r[1] === 'IN' ? 'OK' : r[1] === 'OUT' ? 'LOW' : 'NEW'), T(r[2], { bold: true }),
              T(r[3], { color: signColor(r[3]) }), T(r[4], { color: '#4b5563' })]
          }))
        };
        break;
      case 4:
        spec.toolbar = { primary: 'Add Supplier', onPrimary: () => ctx.toast('New supplier') };
        spec.table = {
          cols: ['Supplier', 'Contact', 'Phone', 'Email', 'Actions'],
          rows: [
            ['MedSupply Sdn Bhd', 'Encik Roslan', '03-7788 1122', 'sales@medsupply.my'],
            ['DentCare Trading', 'Ms. Lim', '03-2211 3344', 'order@dentcare.my']
          ].map(r => ({ cells: [T(r[0], { bold: true }), T(r[1]), T(r[2]), T(r[3], { color: '#4b5563' }), A([edit])] }))
        };
        break;
      default:
        spec.toolbar = { primary: 'Add Category', onPrimary: () => ctx.toast('New category') };
        spec.table = {
          cols: ['Category', 'Items', 'Actions'],
          rows: [['Anaesthetic', 1], ['Consumable', 1], ['Restorative', 1], ['Surgery', 1], ['Hygiene', 1], ['Prosthodontic', 1]]
            .map(r => ({ cells: [T(r[0], { bold: true }), T(String(r[1])), A([edit])] }))
        };
    }
    return spec;
  }

  /* ---------------- report ---------------- */
  function reportPage(ctx) {
    const reports = [
      ['Daily Collection', 'date', 'bills settled, by payment method, card fees, cash total'],
      ['Revenue by Treatment', 'date range', 'count, gross, doctor fee, clinic fee'],
      ['Revenue by Dentist', 'date range, dentist', 'bills, gross, doctor fee'],
      ['Doctor Fee Payout', 'month, dentist', 'per-bill doctor fee lines — payout statement'],
      ['Payment Method Fees', 'date range', 'Σ payment_fee per method'],
      ['Patient Visit', 'date range', 'new vs returning, visits'],
      ['Appointment', 'date range, dentist', 'booked, completed, cancelled, no-show'],
      ['Lead Conversion', 'date range, source, staff', 'funnel, conversion rate, lost reasons'],
      ['Inventory Valuation', 'as of date', 'on hand × cost'],
      ['Low Stock / Expiry', '—', 'items ≤ reorder, batches expiring 30/60/90 days'],
      ['Stock Movement', 'date range, item', 'IN / OUT / ADJUST ledger']
    ];
    return {
      toolbar: { filters: [['1 Sep – 18 Sep 2026', 'Today', 'This month', 'Last month'], ['All dentists', 'Dr. Aina', 'Dr. Hafiz', 'Dr. Mei']] },
      table: {
        cols: ['Report', 'Filters', 'Content', 'Export'],
        rows: reports.map(r => ({
          cells: [T(r[0], { bold: true }), T(r[1], { color: '#4b5563' }), T(r[2], { color: '#4b5563' }),
            A([['fa-solid fa-file-excel', 'Excel', '#10b981', () => ctx.toast(r[0] + '.xlsx generating…')],
              ['fa-solid fa-file-pdf', 'PDF', '#ef4444', () => ctx.toast(r[0] + '.pdf generating…')]])]
        })),
        footer: 'Collection report carries forward the old export-excel.php / export-all.php columns.'
      }
    };
  }

  /* ---------------- patients ---------------- */
  function patientsPage(ctx) {
    const rows = [
      ['P-000123', 'Nik Ahmad', '012-345 6789', '****-**-1234', '18 Sep 2026', '850.00'],
      ['P-000088', 'Siti Zulaikha', '013-888 7766', '****-**-5521', '18 Sep 2026', '2,340.00'],
      ['P-000201', 'Farid Kamil', '016-222 0101', '****-**-9087', '17 Sep 2026', '120.00'],
      ['P-000177', 'Hana Lee', '012-777 3131', '****-**-4410', '17 Sep 2026', '4,500.00'],
      ['P-000150', 'Chong Wei', '019-404 5050', '****-**-2288', '16 Sep 2026', '1,980.00'],
      ['P-000042', 'Puan Rosnah', '013-101 2020', '****-**-7734', '18 Sep 2026', '3,210.00']
    ];
    return {
      toolbar: {
        search: 'Search name / phone / IC / code', primary: 'Add Patient',
        onPrimary: () => ctx.toast('New patient — phone must be unique'), secondary: 'Merge duplicates'
      },
      table: {
        cols: ['Code', 'Name', 'Phone', 'IC', 'Last visit', 'Total spent', 'Actions'],
        rows: rows.map(r => ({
          cells: [T(r[0], { color: '#4b5563' }), T(r[1], { bold: true }), T(r[2]), T(r[3], { color: '#4b5563' }), T(r[4]),
            T(money(r[5].replace(',', '')), { bold: true }),
            A([['fa-regular fa-eye', 'View profile', '#2563eb', () => ctx.toast(r[1] + ' — Overview · Appointments · Records · Bills · Files')], edit])]
        })),
        footer: 'IC masked in lists (PDPA). Merge: pick 2 → choose master → move appts/records/bills → archive other.'
      }
    };
  }

  /* ---------------- setting ---------------- */
  function clinicTab() {
    const f = SettingKit.field;
    return `<div class="settings-title">Clinic Profile</div>
      <div class="field-grid">
        ${f('Clinic name', '<input data-key="adm-clinic-name" value="Orchid Dental Care">')}
        ${f('Registration no.', '<input data-key="adm-clinic-reg" value="MOH/DC/2026/00412">')}
        ${f('Phone', '<input data-key="adm-clinic-phone" type="tel" value="03-5510 2233">')}
        ${f('WhatsApp', '<input data-key="adm-clinic-wa" type="tel" value="012-345 6789">')}
        ${f('Address', '<input data-key="adm-clinic-address" value="12-1, Jalan Plumbum V7/V, Seksyen 7, 40000 Shah Alam, Selangor">', true)}
      </div>
      <div class="settings-title spaced">Invoice &amp; Receipt</div>
      <div class="field-grid">
        ${f('Invoice prefix', '<input data-key="adm-inv-prefix" value="INV-">')}
        ${f('Format', '<input data-key="adm-inv-format" value="INV-YYYYMMDD-NNN" disabled>')}
        ${f('Slot length (min)', '<input data-key="adm-slot-len" type="number" value="30">')}
        ${f('Auto-cancel PENDING after (h)', '<input data-key="adm-auto-cancel" type="number" value="48">')}
      </div>`;
  }

  function hoursTab() {
    return `<div class="settings-title">Operating Hours</div>
      <div class="admin-hours">${LANDING.hours.map((h, i) => `<div class="admin-hours-row">
        <div class="admin-hours-day">${esc(h[0])}</div>
        <input type="time" data-key="adm-hours-open-${i}" aria-label="${esc(h[0])} opening time" value="${esc(h[1])}">
        <input type="time" data-key="adm-hours-close-${i}" aria-label="${esc(h[0])} closing time" value="${esc(h[2])}">
      </div>`).join('')}</div>`;
  }

  function paymentsTab(ctx) {
    const s = ctx.state;
    const rows = s.methods.map((m, i) => `<div class="admin-pm-row">
        <input data-key="adm-pm-name-${i}" value="${esc(m.name)}" disabled aria-label="Payment method">
        <div class="admin-pm-fee"><input type="number" step="0.1" data-key="adm-pm-fee-${i}" aria-label="${esc(m.name)} fee percent" value="${esc(m.fee)}"
          ${UI.change((e, el) => ctx.set({ methods: s.methods.map((x, j) => (j === i ? Object.assign({}, x, { fee: Number(el.value) || 0 }) : x)) }))}><span aria-hidden="true">%</span></div>
        <button class="admin-toggle${m.active ? ' is-on' : ''}" aria-pressed="${m.active}"
          ${UI.click(() => ctx.set({ methods: s.methods.map((x, j) => (j === i ? Object.assign({}, x, { active: !x.active }) : x)) }))}>${m.active ? 'Active' : 'Inactive'}</button>
      </div>`).join('');
    return `<div class="settings-title">Payment Methods <span class="settings-sub">— fee % is snapshotted on every payment</span></div>
      <div class="admin-pm-list">${rows}</div>
      <div class="admin-note">Changes apply to the Cashier calculator immediately in this prototype.</div>
      <div class="admin-split">
        <div class="admin-split-text"><div class="admin-split-label">Show doctor / clinic fee split on patient receipt</div>
          <div class="admin-note">Default off — open question #8 in the design document.</div></div>
        <button class="admin-toggle${s.showSplit ? ' is-on' : ''}" aria-pressed="${!!s.showSplit}"
          ${UI.click(() => ctx.set({ showSplit: !ctx.state.showSplit }))}>${s.showSplit ? 'On' : 'Off'}</button>
      </div>`;
  }

  function whatsappTab() {
    const f = SettingKit.field;
    return `<div class="settings-title">WhatsApp Business API <span class="admin-pill">PLACEHOLDER</span></div>
      <div class="admin-status"><span class="admin-dot" aria-hidden="true"></span>Status: Not connected</div>
      <div class="field-grid">
        ${f('Phone Number ID', '<input data-key="adm-wa-phone-id">')}
        ${f('WhatsApp Business ID', '<input data-key="adm-wa-business-id">')}
        ${f('Access Token', '<input data-key="adm-wa-token" type="password" placeholder="stored encrypted" autocomplete="off">')}
        ${f('Webhook Verify Token', '<input data-key="adm-wa-verify">')}
        ${f('Webhook URL', `<input data-key="adm-wa-webhook" value="${esc('https://<domain>/api/whatsapp/webhook')}" disabled>`, true)}
      </div>
      <div class="admin-note admin-note-md">Planned: appointment confirmation · reminders (24h / 2h) · receipt PDF · lead follow-up · patient OTP login.</div>`;
  }

  function settingPage(ctx) {
    const tabs = ['My Profile', 'Clinic Profile', 'Operating Hours', 'Payment Methods', 'WhatsApp API'];
    const inner = [
      () => SettingKit.profile(ctx.user, ''),
      clinicTab,
      hoursTab,
      () => paymentsTab(ctx),
      whatsappTab
    ][ctx.tab] || (() => SettingKit.profile(ctx.user, ''));
    return { tabs, html: SettingKit.page(inner()) };
  }

  const pages = {
    main: mainPage,
    analysis: analysisPage,
    users: usersPage,
    treatments: treatmentsPage,
    inventory: inventoryPage,
    report: reportPage,
    patients: patientsPage,
    setting: settingPage
  };

  Roles.admin = {
    render(ctx) {
      const page = pages[ctx.page];
      return page ? page(ctx) : {};
    }
  };
})();
