/* Orchid Dental Care — Dentist dashboard role module (logged-in dentist: Dr. Aina, id 'aina').
 * Ported from the prototype renderVals() dentist branches + treatment record screen (template lines 596-674).
 * Pages: main (queue), analysis (charts), record (treatment record), setting.
 */
(() => {
  const DENTIST_ID = 'aina';
  const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  const HISTORY = [
    { date: '14 Mar 2026', treatments: 'Scaling · Consult', dentist: 'Dr. Aina', notes: 'mild gingivitis, advised flossing' },
    { date: '2 Nov 2025', treatments: 'Filling (tooth 36)', dentist: 'Dr. Hafiz', notes: 'composite, occlusal' },
    { date: '18 Apr 2025', treatments: 'Consult · X-ray', dentist: 'Dr. Aina', notes: 'baseline OPG' }
  ];
  const FILES = [{ name: 'OPG_2025-04.jpg', date: '18 Apr 2025' }, { name: 'PA_36.jpg', date: '2 Nov 2025' }];
  const NEXT_VISIT = ['None', '1 week', '2 weeks', '1 month', '6 months'];
  const SETTING_EXTRA = 'Weekly availability: Mon–Fri 09:00–18:00 (view only — Admin edits). Leave request: 3 days pending approval.';

  const byTime = (a, b) => a.time.localeCompare(b.time);
  const mine = state => state.appts.filter(a => a.dentist === DENTIST_ID).sort(byTime);
  const sortedTeeth = teeth => teeth.slice().sort((a, b) => a - b);
  const initials = name => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

  /** Merge a patch into state.rec (always from the freshest state). */
  const setRec = (ctx, patch) => ctx.set(s => ({ rec: Object.assign({}, s.rec, patch) }));

  /* ---------------- main ---------------- */
  function mainPage(ctx) {
    const { state } = ctx;
    const list = mine(state);
    const kpis = [
      { label: 'Today appointments', value: String(list.length), sub: 'Dr. Aina', icon: 'fa-regular fa-calendar' },
      { label: 'Waiting', value: String(list.filter(a => a.status === 'CHECKED_IN').length), sub: 'checked in', icon: 'fa-solid fa-user-clock', color: '#f59e0b' },
      { label: 'Completed', value: String(5 + list.filter(a => a.status === 'COMPLETED').length), sub: 'today', icon: 'fa-solid fa-check', color: '#10b981' }
    ];
    const rows = list.map(a => {
      const canStart = a.status === 'CHECKED_IN';
      const cont = a.status === 'IN_TREATMENT';
      return {
        time: a.time, title: a.patient, sub: a.treatment, badge: a.status,
        action: canStart ? 'Start treatment' : cont ? 'Continue record' : null,
        onAction: () => {
          ctx.update('appts', a.id, { status: 'IN_TREATMENT' });
          ctx.set(s => {
            const same = s.rec.apptId === a.id;
            return { rec: Object.assign({}, s.rec, { apptId: a.id, tab: 0, rows: same ? s.rec.rows : [], teeth: same ? s.rec.teeth : [] }) };
          });
          ctx.go('record');
        }
      };
    });
    return { kpis, widgets: [{ title: 'Queue', sub: 'today', span: 2, rows }] };
  }

  /* ---------------- analysis ---------------- */
  function analysisPage() {
    return {
      charts: [
        { title: 'Treatments performed (this month)', type: 'bars', bars: UI.bars([['Scaling', 38, 'n'], ['Filling', 22, 'n'], ['Extraction', 15, 'n'], ['Consult', 44, 'n'], ['Whitening', 6, 'n']]) },
        { title: 'My doctor-fee earnings', type: 'trend', bars: [['May', 6.1], ['Jun', 7.4], ['Jul', 6.9], ['Aug', 8.2], ['Sep', 5.3]].map(d => ({ label: d[0], pct: Math.round(d[1] / 8.2 * 100) })) },
        { title: 'Patients seen · no-show rate', type: 'bars', bars: UI.bars([['Patients seen', 96, 'n'], ['No-shows', 4, 'n']], '#10b981') }
      ]
    };
  }

  /* ---------------- record ---------------- */
  function emptyRecord(ctx) {
    return `<div class="card dent-empty">
      <i class="fa-solid fa-user-clock"></i>
      <div class="dent-empty-title">No patient in treatment</div>
      <div class="dent-empty-text">Start a patient from today's queue on Main.</div>
      <button class="btn btn-primary" ${UI.click(() => ctx.go('main'))}>Go to queue</button>
    </div>`;
  }

  function toothRow(ctx, rec, arr) {
    return `<div class="dent-teeth-row">${arr.map((n, i) => {
      const sel = rec.teeth.includes(n);
      return `<button class="dent-tooth${sel ? ' is-selected' : ''}${i === 7 ? ' is-gap' : ''}" aria-pressed="${sel}" aria-label="Tooth ${n}"
        ${UI.click(() => setRec(ctx, { teeth: sel ? Store.get().rec.teeth.filter(x => x !== n) : [...Store.get().rec.teeth, n] }))}>${n}</button>`;
    }).join('')}</div>`;
  }

  function visitTab(ctx, rec, appt) {
    const selectedText = rec.teeth.length ? sortedTeeth(rec.teeth).join(', ') : '—';
    const rows = rec.rows.map((r, i) => `<tr>
      <td class="bold">${esc(r.treatment)}</td><td>${esc(r.tooth)}</td><td>${esc(r.qty)}</td><td class="muted">${esc(r.notes)}</td>
      <td class="dent-cell-end"><button class="dent-remove" aria-label="Remove ${esc(r.treatment)}" ${UI.click(() => setRec(ctx, { rows: Store.get().rec.rows.filter((_, j) => j !== i) }))}><i class="fa-solid fa-xmark"></i></button></td>
    </tr>`).join('');

    const addRow = () => {
      const r = Store.get().rec;
      setRec(ctx, {
        rows: [...r.rows, { treatment: r.newTreatment, tooth: r.teeth.length ? sortedTeeth(r.teeth).join(',') : '-', qty: r.newQty || 1, notes: r.newNotes }],
        teeth: [], newNotes: ''
      });
    };

    const complete = () => {
      const r = Store.get().rec;
      if (!r.rows.length) { ctx.toast('Add at least one treatment first'); return; }
      const services = r.rows.map(row => {
        const t = treatmentByName(row.treatment) || { name: row.treatment, pct: 0, price: 0 };
        return { name: t.name, pct: t.pct, amount: r2(t.price * Number(row.qty || 1)) };
      });
      ctx.set(s => ({
        appts: s.appts.map(x => x.id === appt.id ? Object.assign({}, x, { status: 'COMPLETED' }) : x),
        bills: [{ id: uid(), patient: appt.patient, code: 'P-000123', dentist: 'Dr. Aina', visit: '18 Sep 2026 ' + appt.time, status: 'DRAFT', invoice: '', terminal: '', method: 'Cash', services, others: [] }, ...s.bills],
        rec: Object.assign({}, s.rec, { apptId: null, rows: [], teeth: [], notes: '' })
      }));
      ctx.go('main');
      ctx.toast(`${appt.patient} completed — draft bill sent to cashier`);
    };

    return `<div class="dent-body">
        <div class="dent-section">
          <div class="dent-label">Tooth chart (FDI) — click to select</div>
          <div class="dent-chart-scroll"><div class="dent-chart">
            ${toothRow(ctx, rec, UPPER)}
            ${toothRow(ctx, rec, LOWER)}
          </div></div>
          <div class="dent-selected">Selected: <b>${esc(selectedText)}</b></div>
        </div>
        <div class="dent-section">
          <div class="dent-label">Treatments performed</div>
          <div class="dent-table-wrap">
            <table class="dent-table">
              <thead><tr><th>Treatment</th><th>Tooth</th><th>Qty</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                ${rows}
                <tr class="dent-add-row">
                  <td><select data-key="dent-new-treatment" aria-label="Treatment" ${UI.change(e => setRec(ctx, { newTreatment: e.target.value }))}>${UI.options(TREATMENTS.map(t => t.name), rec.newTreatment)}</select></td>
                  <td class="dent-add-tooth">${esc(selectedText)}</td>
                  <td><input data-key="dent-new-qty" type="number" min="1" class="dent-qty" aria-label="Quantity" value="${esc(rec.newQty)}" ${UI.input(e => setRec(ctx, { newQty: e.target.value }))}></td>
                  <td><input data-key="dent-new-notes" aria-label="Notes" placeholder="e.g. impacted, sutured" value="${esc(rec.newNotes)}" ${UI.input(e => setRec(ctx, { newNotes: e.target.value }))}></td>
                  <td><button class="btn btn-primary btn-sm dent-add-btn" ${UI.click(addRow)}>+ Add</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="dent-form-grid">
          <label class="dent-field full">Clinical notes<textarea data-key="dent-notes" rows="3" placeholder="Findings, procedure, advice…" ${UI.input(e => setRec(ctx, { notes: e.target.value }))}>${esc(rec.notes)}</textarea></label>
          <div class="dent-field">Attachments<button class="dent-dropzone" ${UI.click(() => ctx.toast('Upload X-ray / photo'))}><i class="fa-solid fa-paperclip"></i>Upload X-ray / photo</button></div>
          <label class="dent-field">Next visit recommended<select data-key="dent-next-visit" ${UI.change(e => ctx.set({ dent_nextVisit: e.target.value }))}>${UI.options(NEXT_VISIT, ctx.state.dent_nextVisit || '2 weeks')}</select></label>
        </div>
      </div>
      <div class="dent-footer">
        <button class="btn btn-outline" ${UI.click(() => ctx.toast('Draft saved'))}>Save draft</button>
        <button class="btn btn-success dent-complete" ${UI.click(complete)}><i class="fa-solid fa-check"></i>Complete &amp; send to cashier</button>
      </div>`;
  }

  function historyTab() {
    return `<div class="dent-body dent-history">${HISTORY.map(h => `<div class="dent-history-item">
      <div class="dent-history-date">${esc(h.date)}</div>
      <div><div class="bold">${esc(h.treatments)}</div><div class="dent-history-sub">${esc(h.dentist)} · ${esc(h.notes)}</div></div>
    </div>`).join('')}</div>`;
  }

  function filesTab() {
    return `<div class="dent-body dent-files">${FILES.map(f => `<div class="dent-file">
      <i class="fa-regular fa-file-image"></i><div class="dent-file-name">${esc(f.name)}</div><div>${esc(f.date)}</div>
    </div>`).join('')}</div>`;
  }

  function recordPage(ctx) {
    const { state } = ctx;
    const rec = state.rec;
    const appt = state.appts.find(a => a.id === rec.apptId);
    if (!appt) return { html: emptyRecord(ctx) };

    const allergy = appt.patient === 'Nik Ahmad' ? 'Penicillin' : '';
    const tabs = ['This visit', 'History', 'Files'].map((l, i) => `<button role="tab" aria-selected="${rec.tab === i}" class="dent-tab${rec.tab === i ? ' is-active' : ''}" ${UI.click(() => setRec(ctx, { tab: i }))}>${esc(l)}</button>`).join('');
    const body = rec.tab === 1 ? historyTab() : rec.tab === 2 ? filesTab() : visitTab(ctx, rec, appt);

    return {
      html: `<section class="card dent-record">
        <header class="dent-head">
          <div class="avatar dent-avatar">${esc(initials(appt.patient))}</div>
          <div class="dent-patient">
            <div class="dent-patient-name">${esc(appt.patient)} <span class="dent-patient-meta">· P-000123 · Age 34</span></div>
            ${allergy ? `<div class="dent-allergy"><i class="fa-solid fa-triangle-exclamation"></i>Allergy: ${esc(allergy)}</div>` : ''}
          </div>
          <div class="dent-tabs" role="tablist">${tabs}</div>
        </header>
        ${body}
      </section>`
    };
  }

  /* ---------------- setting ---------------- */
  function settingPage(ctx) {
    return { html: SettingKit.page(SettingKit.profile(ctx.user, SETTING_EXTRA)) };
  }

  Roles.dentist = {
    render(ctx) {
      switch (ctx.page) {
        case 'analysis': return analysisPage(ctx);
        case 'record': return recordPage(ctx);
        case 'setting': return settingPage(ctx);
        default: return mainPage(ctx);
      }
    }
  };
})();
