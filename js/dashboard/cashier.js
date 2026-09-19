/* Orchid Dental Care — CASHIER dashboard role module.
 * Pages (MENUS.cashier): main · analysis · bills · setting.
 * The Bill Settlement screen is the ported Dentist Receipt Calculator (DESIGN-DOCUMENT §14,
 * prototype template lines 676-766, script renderVals() cashier branches).
 * All money maths go through calcBill(bill, state.methods) — never re-derived here.
 *
 * UI keys (in-memory, not persisted): cash_settleId, cash_showReceipt, cash_newService,
 * cash_newAmount, cash_raw (raw text of amount inputs while the cashier is typing).
 */
(() => {
  const CLINIC = {
    name: 'Orchid Dental Care',
    address: '12-1, Jalan Plumbum V7/V, Seksyen 7, 40000 Shah Alam, Selangor',
    phone: '03-5510 2233'
  };
  const STATUSES = ['DRAFT', 'SETTLED', 'VOID'];
  const FOOTERS = {
    DRAFT: 'Draft bills arrive automatically when a dentist completes a record. "+ Walk-in bill" is the old manual flow.',
    SETTLED: 'Edit after settle is allowed for ADMIN/CASHIER — every change is written to audit_logs (before/after JSON).',
    VOID: 'Void = admin only, with reason; stock movements reversed.'
  };
  const SETTING_EXTRA = 'Receipt printer: A4 · Default payment method: Cash';

  const drafts = state => state.bills.filter(b => b.status === 'DRAFT');
  const settledToday = state => state.bills.filter(b => b.status === 'SETTLED' && b.visit.startsWith('18 Sep'));

  /** Open a bill on the settlement screen (from the bills page itself). */
  function openBill(ctx, id, showReceipt) {
    ctx.set({ cash_settleId: id, cash_showReceipt: !!showReceipt, cash_raw: {} });
  }

  /* ---------------- main ---------------- */
  function mainPage(ctx) {
    const s = ctx.state;
    const today = settledToday(s);
    const collected = today.reduce((a, b) => a + calcBill(b, s.methods).grand, 0);
    const fees = today.reduce((a, b) => a + calcBill(b, s.methods).fee, 0);
    return {
      kpis: [
        { label: 'Awaiting payment', value: String(drafts(s).length), sub: 'draft bills', icon: 'fa-solid fa-hourglass-half', color: '#f59e0b' },
        { label: 'Collected today', value: money(3120 + collected), sub: '', icon: 'fa-solid fa-sack-dollar', color: '#10b981' },
        { label: 'Receipts today', value: String(14 + today.length), sub: '', icon: 'fa-solid fa-receipt' },
        { label: 'Card fees today', value: money(18.4 + fees), sub: 'absorbed by clinic', icon: 'fa-regular fa-credit-card', color: '#ef4444' }
      ],
      widgets: [
        {
          title: 'Awaiting payment', sub: 'DRAFT bills', span: 1,
          rows: drafts(s).map(b => ({
            icon: 'fa-solid fa-file-invoice-dollar', iconColor: '#2563eb', title: b.patient, sub: b.dentist,
            amount: money(calcBill(b, s.methods).grand), action: 'Settle',
            /* navigate first so the settlement render happens on the bills route */
            onAction: () => { ctx.go('bills'); ctx.set({ cash_settleId: b.id, cash_showReceipt: false, cash_raw: {} }); }
          }))
        },
        {
          title: 'Today by payment method', sub: '', span: 1,
          rows: [['Cash', 1200], ['Debit Card', 800], ['Online', 450], ['Credit Card', 670]]
            .map(m => ({ icon: 'fa-solid fa-circle', iconColor: '#2563eb', title: m[0], amount: money(m[1]) }))
        }
      ]
    };
  }

  /* ---------------- analysis ---------------- */
  function analysisPage() {
    const trend = {
      title: 'Revenue trend (daily)', type: 'trend',
      bars: [[1, 3.2], [2, 4.1], [3, 2.8], [4, 5.6], [5, 4.9], [6, 3.1], [8, 6.2], [9, 4.4], [10, 5.1], [11, 3.9], [12, 6.8], [13, 4.2], [15, 5.5], [16, 4.7], [17, 6.1], [18, 4.3]]
        .map(d => ({ label: String(d[0]), pct: Math.round(d[1] / 6.8 * 100) }))
    };
    return {
      charts: [
        trend,
        { title: 'By payment method', type: 'bars', bars: UI.bars([['Cash', 24000], ['Online', 15200], ['Debit Card', 12800], ['Credit Card', 7400], ['Mastercard', 2430]]) },
        { title: 'Card fee cost (Σ payment_fee)', type: 'bars', bars: UI.bars([['Debit 0.5%', 64], ['Credit 1.2%', 88.8], ['Mastercard 2.5%', 60.75]], '#ef4444') },
        { title: 'Daily closing — cash drawer', type: 'bars', bars: UI.bars([['Opening float', 300], ['Cash collected', 1200], ['Expected in drawer', 1500]], '#10b981') }
      ]
    };
  }

  /* ---------------- bills list ---------------- */
  function billsList(ctx) {
    const s = ctx.state;
    const stt = STATUSES[ctx.tab] || 'DRAFT';
    return {
      tabs: ['Awaiting payment', 'Settled', 'Void'],
      toolbar: {
        search: 'Search name / invoice / terminal no.',
        primary: 'Walk-in bill',
        onPrimary: () => {
          const id = uid();
          ctx.set(st => ({
            bills: [{ id, patient: 'Walk-in (search by phone)', code: '—', dentist: '—', visit: '18 Sep 2026', status: 'DRAFT', invoice: '', terminal: '', method: 'Cash', services: [], others: [{ desc: 'Medication', amount: 0 }] }, ...st.bills],
            cash_settleId: id, cash_showReceipt: false, cash_raw: {}
          }));
        }
      },
      table: {
        cols: ['Invoice', 'Patient', 'Dentist', 'Amount (RM)', 'Method', 'Status', 'Actions'],
        rows: s.bills.filter(b => b.status === stt).map(b => {
          const c = calcBill(b, s.methods);
          const open = () => openBill(ctx, b.id, false);
          return {
            cells: [
              T(b.invoice || '(draft)', { color: b.invoice ? '#1f2937' : '#4b5563' }),
              T(b.patient, { bold: true }),
              T(b.dentist),
              T(c.grand.toFixed(2), { bold: true }),
              T(b.method, { color: '#4b5563' }),
              B(b.status),
              b.status === 'DRAFT'
                ? BTN('Settle', open)
                : A([
                  ['fa-solid fa-print', 'Print', '#4b5563', () => openBill(ctx, b.id, true)],
                  ['fa-solid fa-file-pdf', 'PDF', '#ef4444', () => ctx.toast('receipt.pdf generated server-side')],
                  ['fa-solid fa-pen', 'Edit (audited)', '#2563eb', open]
                ])
            ]
          };
        }),
        footer: FOOTERS[stt],
        empty: 'No bills here.'
      }
    };
  }

  /* ---------------- bill settlement (receipt calculator) ---------------- */
  function settlement(ctx, bill) {
    const s = ctx.state;
    const c = calcBill(bill, s.methods);
    const raw = s.cash_raw || {};
    const newService = s.cash_newService || 'Consult';
    const newAmount = s.cash_newAmount == null ? '' : s.cash_newAmount;
    const isDraft = bill.status === 'DRAFT';
    const invoiceText = bill.invoice || '(auto on settle)';

    /* The ONE bill-edit helper: replace the bill with id cash_settleId. `extra` = UI keys to set alongside. */
    const updBill = (patch, extra) => ctx.set(st => Object.assign({
      bills: st.bills.map(b => (b.id === st.cash_settleId ? Object.assign({}, b, typeof patch === 'function' ? patch(b) : patch) : b))
    }, extra || {}));

    /* amount inputs keep the raw text while typing ("3." / "") and store the number in the bill */
    const numValue = (key, n) => (raw[key] != null ? raw[key] : String(n == null ? 0 : n));
    const withRaw = (key, value) => ({ cash_raw: Object.assign({}, ctx.state.cash_raw, { [key]: value }) });
    const dropRaw = key => () => {
      const next = Object.assign({}, ctx.state.cash_raw);
      delete next[key];
      ctx.set({ cash_raw: next });
    };
    const amountInput = (key, n, onNum, cls) => `<input class="cash-num ${cls || ''}" data-key="${key}" type="text" inputmode="decimal" value="${esc(numValue(key, n))}" placeholder="0.00" aria-label="Amount (RM)"
      ${UI.input((e, el) => onNum(Number(el.value) || 0, el.value))} ${UI.change(dropRaw(key))}>`;

    const serviceRows = c.sv.map((sv, i) => {
      const key = `svc-amt-${i}`;
      return `<tr>
        <td>${esc(sv.name)} <span class="cash-pct">(${esc(sv.pct)}%)</span></td>
        <td class="num">${amountInput(key, bill.services[i].amount, (n, v) => updBill(b => ({ services: b.services.map((x, j) => (j === i ? Object.assign({}, x, { amount: n }) : x)) }), withRaw(key, v)))}</td>
        <td class="num muted">${sv.doctor.toFixed(2)}</td>
        <td class="num muted">${sv.clinic.toFixed(2)}</td>
        <td class="num"><button class="cash-remove" title="Remove" aria-label="Remove ${esc(sv.name)}" ${UI.click(() => updBill(b => ({ services: b.services.filter((_, j) => j !== i) }), { cash_raw: {} }))}><i class="fa-solid fa-xmark"></i></button></td>
      </tr>`;
    }).join('');

    const addRow = `<tr class="cash-add-row">
      <td><select data-key="cash-new-service" aria-label="Service" ${UI.change((e, el) => ctx.set({ cash_newService: el.value }))}>${UI.options(TREATMENTS.map(t => [t.name, `${t.name} (${t.pct}%)`]), newService)}</select></td>
      <td class="num"><input class="cash-num" data-key="cash-new-amount" type="text" inputmode="decimal" value="${esc(newAmount)}" placeholder="0.00" aria-label="Charge (RM)" ${UI.input((e, el) => ctx.set({ cash_newAmount: el.value }))}></td>
      <td colspan="3" class="num"><button class="btn btn-primary btn-sm cash-add-btn" ${UI.click(() => {
        const st = ctx.state;
        const t = treatmentByName(st.cash_newService || 'Consult') || TREATMENTS[0];
        const amt = Number(st.cash_newAmount) || t.price;
        updBill(b => ({ services: [...b.services, { name: t.name, pct: t.pct, amount: amt }] }), { cash_newAmount: '' });
      })}>+ Add service</button></td>
    </tr>`;

    const otherRows = bill.others.map((o, i) => {
      const key = `oth-amt-${i}`;
      return `<div class="cash-other">
        <input class="cash-other-desc" data-key="oth-desc-${i}" value="${esc(o.desc)}" placeholder="Description" aria-label="Charge description"
          ${UI.input((e, el) => updBill(b => ({ others: b.others.map((x, j) => (j === i ? Object.assign({}, x, { desc: el.value }) : x)) })))}>
        ${amountInput(key, o.amount, (n, v) => updBill(b => ({ others: b.others.map((x, j) => (j === i ? Object.assign({}, x, { amount: n }) : x)) }), withRaw(key, v)), 'cash-other-amt')}
        <button class="cash-remove" title="Remove" aria-label="Remove charge" ${UI.click(() => updBill(b => ({ others: b.others.filter((_, j) => j !== i) }), { cash_raw: {} }))}><i class="fa-solid fa-xmark"></i></button>
      </div>`;
    }).join('');

    const methodCards = s.methods.filter(m => m.active).map(m => {
      const on = m.name === bill.method;
      return `<button class="cash-method${on ? ' is-selected' : ''}" aria-pressed="${on}" ${UI.click(() => updBill({ method: m.name }))}>
        <i class="${esc(m.icon)}"></i>${esc(m.name)} <span class="cash-method-fee">${esc(m.fee)}%</span></button>`;
    }).join('');

    const settle = () => {
      const n = ctx.state.seq + 1;
      const inv = `${INVOICE_PREFIX}${String(n).padStart(3, '0')}`;
      ctx.set(st => ({
        seq: n,
        bills: st.bills.map(b => (b.id === bill.id ? Object.assign({}, b, { status: 'SETTLED', invoice: inv }) : b)),
        cash_showReceipt: true
      }));
      ctx.toast(`Settled ${inv} · payment saved · stock OUT · audit logged`);
    };

    const line = (label, value, cls) => `<div class="cash-line${cls ? ' ' + cls : ''}"><span>${label}</span><span>${value}</span></div>`;

    const summary = `<section class="card cash-summary">
      <div class="cash-summary-title">Final summary</div>
      ${line('<span class="muted">Total Clinic Fee</span>', money(c.tc))}
      ${line('<span class="muted">Total Doctor Fee</span>', money(c.td))}
      ${line('<span class="muted">Additional Charges</span>', money(c.to))}
      ${line('Subtotal', money(c.sub), 'is-sub')}
      ${line(`Payment Fee (${esc(bill.method)} ${esc(c.feePct)}%)`, `− ${money(c.fee)}`, 'is-fee')}
      ${line('GRAND TOTAL', money(c.grand), 'is-grand')}
      <div class="cash-note">Fee is deducted — clinic absorbs card cost. Server recomputes on save.</div>
      ${isDraft
    ? `<button class="btn btn-success btn-block cash-settle-btn" ${UI.click(settle)}><i class="fa-solid fa-floppy-disk"></i>Save &amp; Settle</button>`
    : `<div class="cash-settled"><i class="fa-solid fa-check"></i>SETTLED · ${esc(invoiceText)}</div>`}
      <div class="cash-summary-actions">
        <button class="btn btn-outline" ${UI.click(() => ctx.set({ cash_showReceipt: !ctx.state.cash_showReceipt }))}><i class="fa-solid fa-print"></i>${s.cash_showReceipt ? 'Hide receipt' : 'Print / preview receipt'}</button>
        <button class="btn btn-outline cash-reset" ${UI.click(() => ctx.toast('Lines reset to dentist record'))}><i class="fa-solid fa-rotate-left"></i>Reset to dentist lines</button>
      </div>
    </section>`;

    const receipt = s.cash_showReceipt ? receiptHtml(bill, c, s.showSplit) : '';

    const left = `<section class="card cash-bill">
      <header class="cash-head">
        <div class="cash-head-main">
          <div class="cash-head-title">Bill Settlement — ${esc(bill.patient)} <span class="cash-code">(${esc(bill.code)})</span></div>
          <div class="cash-head-sub">Dentist: ${esc(bill.dentist)} · Visit: ${esc(bill.visit)}</div>
        </div>
        <button class="btn btn-outline btn-sm cash-back" ${UI.click(() => ctx.set({ cash_settleId: null, cash_showReceipt: false, cash_raw: {} }))}><i class="fa-solid fa-arrow-left"></i>Back to list</button>
      </header>
      <div class="cash-fields">
        <label class="cash-field">Invoice No<input data-key="cash-invoice" value="${esc(invoiceText)}" disabled></label>
        <label class="cash-field">Terminal Invoice No<input data-key="cash-terminal" value="${esc(bill.terminal)}" placeholder="from card terminal" autocomplete="off"
          ${UI.input((e, el) => updBill({ terminal: el.value }))}></label>
        <label class="cash-field">Invoice Date<input data-key="cash-date" type="date" value="${DEMO_TODAY.dateIso}"></label>
      </div>
      <div class="cash-block">
        <div class="cash-block-title">Services</div>
        <div class="cash-table-scroll"><table class="cash-table">
          <thead><tr><th>Service</th><th class="num">Charge (RM)</th><th class="num">Doctor Fee</th><th class="num">Clinic Fee</th><th><span class="sr-only">Remove</span></th></tr></thead>
          <tbody>${serviceRows}${addRow}</tbody>
        </table></div>
      </div>
      <div class="cash-block">
        <div class="cash-block-title">Other charges</div>
        ${otherRows}
        <button class="cash-add-charge" ${UI.click(() => updBill(b => ({ others: [...b.others, { desc: '', amount: 0 }] })))}>+ Add charge</button>
      </div>
      <div class="cash-block is-last">
        <div class="cash-block-title">Payment method <span class="cash-block-hint">— from Admin ▸ Setting ▸ Payment Methods</span></div>
        <div class="cash-methods">${methodCards}</div>
      </div>
    </section>`;

    return {
      html: `<div class="cash-settle">
        ${left}
        <div class="cash-side">${summary}${receipt}</div>
      </div>`
    };
  }

  function receiptHtml(bill, c, showSplit) {
    const row = (l, r, cls) => `<div class="rc-row${cls ? ' ' + cls : ''}"><span>${l}</span><span>${r}</span></div>`;
    const date = bill.visit.split(' ').slice(0, 3).join(' ');
    return `<section class="cash-receipt" aria-label="Receipt">
      <div class="rc-name">${esc(CLINIC.name)}</div>
      <div class="rc-addr">${esc(CLINIC.address)} · ${esc(CLINIC.phone)}</div>
      <div class="rc-rule"></div>
      ${row('Invoice', esc(bill.invoice || '(auto on settle)'))}
      ${row('Terminal ref', esc(bill.terminal || '—'))}
      ${row('Date', esc(date))}
      ${row('Patient', esc(bill.patient))}
      ${row('Dentist', esc(bill.dentist))}
      <div class="rc-rule"></div>
      ${c.sv.map(sv => row(esc(sv.name), money(sv.amount))).join('')}
      ${bill.others.map(o => row(esc(o.desc || 'Other charge'), money(o.amount || 0))).join('')}
      ${showSplit ? row('(Doctor fee / Clinic fee)', `${money(c.td)} / ${money(c.tc)}`, 'rc-split') : ''}
      <div class="rc-rule"></div>
      ${row('Subtotal', money(c.sub))}
      ${row(`${esc(bill.method)} fee (${esc(c.feePct)}%)`, `− ${money(c.fee)}`)}
      ${row('GRAND TOTAL', money(c.grand), 'rc-total')}
      <div class="rc-thanks">Thank you. Keep smiling.</div>
      <button class="btn btn-primary btn-block rc-print" ${UI.click(() => window.print())}><i class="fa-solid fa-print"></i>Print</button>
    </section>`;
  }

  /* ---------------- register ---------------- */
  Roles.cashier = {
    render(ctx) {
      const s = ctx.state;
      /* prototype go() clears settleId on every page change */
      if (ctx.page !== 'bills' && s.cash_settleId != null) {
        s.cash_settleId = null;
        s.cash_showReceipt = false;
      }
      switch (ctx.page) {
        case 'main': return mainPage(ctx);
        case 'analysis': return analysisPage();
        case 'bills': {
          const bill = s.cash_settleId != null ? s.bills.find(b => b.id === s.cash_settleId) : null;
          return bill ? settlement(ctx, bill) : billsList(ctx);
        }
        case 'setting': return { html: SettingKit.page(SettingKit.profile(ctx.user, SETTING_EXTRA)) };
        default: return {};
      }
    },
    menuCounts(state) {
      return { bills: drafts(state).length };
    }
  };
})();
