/* Orchid Dental Care — MARKETING dashboard role module (Task 8).
 * Ported from the prototype renderVals() marketing branches + kanban / leadDetail / CYCLE / scheduleRows
 * (Orchid Dental Care.dc.html script 841-1072, template 515-594).
 * UI-only state: mkt_leadOpen (id of the lead shown in the detail modal).
 */
(() => {
  const CYCLE = { PENDING: 'CONFIRMED', CONFIRMED: 'CHECKED_IN', CHECKED_IN: 'IN_TREATMENT' };
  const SETTING_EXTRA = 'Personal call-list preferences: default filter "Follow-ups due today", sort by follow-up time.';

  const stamp = () => '18 Sep ' + nowTime();
  const dentistName = id => (dentistById(id) || { name: id }).name;

  /* ---------------- lead actions ---------------- */
  function advanceLead(ctx, lead) {
    const next = LEAD_ORDER[LEAD_ORDER.indexOf(lead.status) + 1];
    if (!next) return;
    ctx.update('leads', lead.id, row => ({
      status: next,
      log: [{ when: stamp(), type: 'Status', outcome: '→ ' + next, note: '' }, ...row.log]
    }));
  }

  function logCall(ctx, lead) {
    ctx.update('leads', lead.id, row => ({
      attempts: row.attempts + 1,
      status: row.status === 'NEW' ? 'CONTACTED' : row.status,
      log: [{ when: stamp(), type: 'Call', outcome: 'Answered', note: 'logged from prototype' }, ...row.log]
    }));
  }

  function bookLead(ctx, lead) {
    ctx.update('leads', lead.id, row => ({
      status: 'BOOKED',
      follow: '',
      log: [{ when: '18 Sep', type: 'Status', outcome: 'Booked', note: 'Fri 10:00 Dr. Aina' }, ...row.log]
    }));
    ctx.set(s => ({
      appts: [...s.appts, { id: uid(), time: '14:00', dentist: 'aina', patient: lead.name, treatment: lead.interest, status: 'CONFIRMED' }],
      mkt_leadOpen: null
    }));
    ctx.toast(lead.name + ' booked — patient linked by phone');
  }

  function markLost(ctx, lead) {
    ctx.update('leads', lead.id, row => ({
      status: 'LOST',
      follow: '',
      log: [{ when: '18 Sep', type: 'Status', outcome: 'Lost', note: 'reason: price' }, ...row.log]
    }));
    ctx.set({ mkt_leadOpen: null });
  }

  const openLead = (ctx, id) => ctx.set({ mkt_leadOpen: id });
  const closeLead = ctx => ctx.set({ mkt_leadOpen: null });

  /* ---------------- main ---------------- */
  function mainPage(ctx) {
    const s = ctx.state;
    const news = s.leads.filter(l => l.status === 'NEW').length;
    const pending = s.appts.filter(a => a.status === 'PENDING');
    const followRows = s.leads
      .filter(l => l.follow && l.status !== 'LOST' && l.status !== 'CONVERTED')
      .map(l => ({
        icon: 'fa-solid fa-phone', iconColor: '#2563eb', title: l.name, sub: `${l.phone} · ${l.interest}`,
        badge: l.status, action: 'Open',
        onAction: () => { ctx.set({ mkt_leadOpen: l.id }); ctx.go('leads'); }
      }));
    const bookingRows = pending.map(a => ({
      time: a.time, title: a.patient, sub: `${dentistName(a.dentist)} · ${a.treatment}`, action: 'Confirm',
      onAction: () => { ctx.update('appts', a.id, { status: 'CONFIRMED' }); ctx.toast(`${a.patient} confirmed`); }
    }));
    if (!pending.length) bookingRows.push({ icon: 'fa-solid fa-check', iconColor: '#10b981', title: 'All bookings confirmed', sub: '' });
    return {
      kpis: [
        { label: 'New leads today', value: String(news), sub: '2 from website', icon: 'fa-solid fa-user-plus' },
        { label: 'Follow-ups due', value: String(s.leads.filter(l => l.follow).length), sub: 'call list', icon: 'fa-regular fa-clock', color: '#f59e0b' },
        { label: 'Pending confirm', value: String(pending.length), sub: 'website bookings', icon: 'fa-solid fa-hourglass-half', color: '#f59e0b' },
        { label: 'Bookings this week', value: '23', sub: '+4 vs last week', icon: 'fa-regular fa-calendar-check', color: '#10b981' }
      ],
      widgets: [
        { title: 'Follow-ups due today', sub: 'call list', span: 1, rows: followRows },
        { title: 'Website bookings to confirm', sub: '', span: 1, rows: bookingRows }
      ]
    };
  }

  /* ---------------- analysis ---------------- */
  function analysisPage() {
    return {
      charts: [
        { title: 'Funnel (this month)', type: 'funnel', bars: [['New', 120], ['Contacted', 95], ['Interested', 50], ['Booked', 32], ['Converted', 25]].map(b => ({ label: b[0], value: String(b[1]) })) },
        { title: 'Lead source', type: 'bars', bars: UI.bars([['Website', 42, 'n'], ['Facebook', 31, 'n'], ['Walk-in', 20, 'n'], ['Instagram', 14, 'n'], ['Referral', 9, 'n'], ['TikTok', 4, 'n']]) },
        { title: 'Conversion by staff', type: 'bars', bars: UI.bars([['Farah', 14, 'n'], ['Aiman', 8, 'n'], ['Kiyo', 3, 'n']], '#10b981') },
        { title: 'Lost reasons', type: 'bars', bars: UI.bars([['Price', 11, 'n'], ['Distance', 6, 'n'], ['Went elsewhere', 4, 'n'], ['No response', 9, 'n']], '#ef4444') }
      ]
    };
  }

  /* ---------------- leads: kanban + table + modal ---------------- */
  function kanbanHtml(ctx) {
    const cols = LEAD_ORDER.map(st => {
      const cards = ctx.state.leads.filter(l => l.status === st);
      const color = badge(st).fg;
      const canAdvance = st !== 'CONVERTED' && st !== 'LOST';
      const cardsHtml = cards.map(l => `<div class="mkt-card" style="border-top-color:${color}" ${UI.click(() => openLead(ctx, l.id))}>
          <div class="mkt-card-name">${esc(l.name)}</div>
          <div class="mkt-card-phone">${esc(l.phone)}</div>
          <div class="mkt-chips"><span class="mkt-chip mkt-chip-source">${esc(l.source)}</span><span class="mkt-chip">${esc(l.interest)}</span></div>
          ${l.follow ? `<div class="mkt-card-follow"><i class="fa-regular fa-clock"></i>${esc(l.follow)}</div>` : ''}
          <div class="mkt-card-actions">
            <button class="mkt-card-open" ${UI.click(() => openLead(ctx, l.id))}>Open</button>
            ${canAdvance ? `<button class="mkt-card-advance" title="Move to next stage" aria-label="Move ${esc(l.name)} to next stage" ${UI.click(e => { e.stopPropagation(); advanceLead(ctx, l); })}><i class="fa-solid fa-arrow-right"></i></button>` : ''}
          </div>
        </div>`).join('');
      return `<section class="mkt-col" aria-label="${esc(st)} leads">
        <div class="mkt-col-head"><span style="color:${color}">${esc(st)}</span><span class="mkt-col-count">${cards.length}</span></div>
        ${cardsHtml}
      </section>`;
    }).join('');
    return `<div class="mkt-kanban">${cols}</div>`;
  }

  function leadsTable(ctx) {
    return {
      cols: ['Name', 'Phone', 'Source', 'Interest', 'Status', 'Follow-up', 'Attempts', 'Actions'],
      rows: ctx.state.leads.map(l => ({
        cells: [
          T(l.name, { bold: true }), T(l.phone), T(l.source, { color: '#4b5563' }), T(l.interest), B(l.status),
          T(l.follow || '—', { color: l.follow ? '#b45309' : '#4b5563' }), T(String(l.attempts)),
          A([['fa-regular fa-eye', 'Open', '#2563eb', () => openLead(ctx, l.id)], ['fa-solid fa-phone', 'Log call', '#10b981', () => openLead(ctx, l.id)]])
        ]
      }))
    };
  }

  function leadModal(ctx) {
    const lo = ctx.state.leads.find(l => l.id === ctx.state.mkt_leadOpen);
    if (!lo) return '';
    const info = [['Phone', lo.phone], ['Source', lo.source], ['Interest', lo.interest], ['Follow-up', lo.follow || 'none'], ['Attempts', String(lo.attempts)]]
      .map(i => `<div class="mkt-info-item"><div class="mkt-info-label">${esc(i[0])}</div><div class="mkt-info-value">${esc(i[1])}</div></div>`).join('');
    const log = lo.log.length
      ? lo.log.map(a => `<div class="mkt-log-item"><div class="mkt-log-when">${esc(a.when)}</div><div><b>${esc(a.type)}</b> · ${esc(a.outcome)} <span class="muted">${esc(a.note)}</span></div></div>`).join('')
      : '<div class="mkt-log-item"><div class="mkt-log-when">—</div><div><b>No activity yet</b></div></div>';
    return `<div class="modal-backdrop" ${UI.click((e, el) => { if (e.target === el) closeLead(ctx); })}>
      <div class="modal mkt-modal fade-in" role="dialog" aria-modal="true" aria-labelledby="mkt-lead-title">
        <div class="modal-head">
          <div class="mkt-modal-heading"><div class="mkt-modal-name" id="mkt-lead-title">${esc(lo.name)}</div><div class="mkt-modal-sub">${esc(lo.phone)} · Source: ${esc(lo.source)} · Assigned: Farah</div></div>
          ${badgeHtml(lo.status)}
          <button class="modal-close" aria-label="Close" ${UI.click(() => closeLead(ctx))}><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="mkt-actions">
            <button class="btn btn-primary mkt-action" ${UI.click(() => logCall(ctx, lo))}><i class="fa-solid fa-phone"></i>Log call</button>
            <button class="btn btn-outline mkt-action mkt-action-plain" ${UI.click(() => ctx.toast(`WhatsApp chat with ${lo.name} opens here`))}><i class="fa-brands fa-whatsapp" style="color:#10b981"></i>WhatsApp</button>
            <button class="btn btn-outline mkt-action mkt-action-plain" ${UI.click(() => bookLead(ctx, lo))}><i class="fa-regular fa-calendar" style="color:#2563eb"></i>Book appointment</button>
            <button class="btn btn-outline mkt-action mkt-action-danger" ${UI.click(() => markLost(ctx, lo))}><i class="fa-solid fa-xmark"></i>Mark lost</button>
          </div>
          <div class="mkt-info">${info}</div>
          <div class="mkt-log-title">Activity log</div>
          <div class="mkt-log">${log}</div>
        </div>
      </div>
    </div>`;
  }

  function leadsPage(ctx) {
    const spec = {
      tabs: ['Kanban', 'Table'],
      toolbar: {
        search: 'Search lead / phone',
        filters: [['All sources', 'Website', 'Facebook', 'Instagram', 'TikTok', 'Walk-in', 'Referral', 'Cold list'], ['Assigned: all', 'Farah', 'Aiman']],
        primary: 'New Lead', onPrimary: () => ctx.toast('New lead created (NEW)'),
        secondary: 'Import CSV'
      },
      modal: leadModal(ctx)
    };
    if (ctx.tab === 1) spec.table = leadsTable(ctx);
    else spec.html = kanbanHtml(ctx);
    return spec;
  }

  /* ---------------- schedule ---------------- */
  function scheduleHtml(ctx) {
    const head = `<div class="mkt-sched-cell mkt-sched-head"></div>` +
      DENTISTS.map(d => `<div class="mkt-sched-cell mkt-sched-head mkt-sched-dentist"><span class="mkt-dot" style="background:${d.color}"></span>${esc(d.name)}</div>`).join('');
    const rows = ALL_SLOTS.slice(0, 7).map(t => {
      const cells = DENTISTS.map(d => {
        const a = ctx.state.appts.find(x => x.time === t && x.dentist === d.id);
        const leave = d.id === 'mei' && (t === '10:00' || t === '10:30');
        let inner = '';
        if (a) {
          inner = `<button class="mkt-appt" style="border-left-color:${d.color}" title="Click to advance status" ${UI.click(() => {
            const next = CYCLE[a.status];
            if (!next) return;
            ctx.update('appts', a.id, { status: next });
            ctx.toast(`${a.patient} → ${next.replace('_', ' ')}`);
          })}><span class="mkt-appt-patient">${esc(a.patient)}</span><span class="mkt-appt-treatment">${esc(a.treatment)}</span>${badgeHtml(a.status)}</button>`;
        }
        if (leave) inner += '<div class="mkt-leave">leave</div>';
        return `<div class="mkt-sched-cell mkt-sched-slot${leave ? ' is-leave' : ''}">${inner}</div>`;
      }).join('');
      return `<div class="mkt-sched-cell mkt-sched-time">${esc(t)}</div>${cells}`;
    }).join('');
    return `<div class="card mkt-sched">
      <div class="mkt-sched-scroll"><div class="mkt-sched-grid">${head}${rows}</div></div>
      <div class="mkt-sched-foot">Click an appointment to move it through PENDING → CONFIRMED → CHECKED_IN. Double-booking is blocked server-side (row lock + UNIQUE).</div>
    </div>`;
  }

  function schedulePage(ctx) {
    return {
      toolbar: {
        filters: [['All dentists', 'Dr. Aina', 'Dr. Hafiz', 'Dr. Mei'], ['All status', 'PENDING', 'CONFIRMED', 'CHECKED_IN'], ['Week 38 · 14–20 Sep', 'Day', 'Week', 'Month']],
        primary: 'New appointment', onPrimary: () => ctx.toast('New appointment — slot locked with PESSIMISTIC_WRITE')
      },
      html: scheduleHtml(ctx)
    };
  }

  /* ---------------- register ---------------- */
  Roles.marketing = {
    render(ctx) {
      switch (ctx.page) {
        case 'main': return mainPage(ctx);
        case 'analysis': return analysisPage(ctx);
        case 'leads': return leadsPage(ctx);
        case 'schedule': return schedulePage(ctx);
        case 'setting': return { html: SettingKit.page(SettingKit.profile(ctx.user, SETTING_EXTRA)) };
        default: return {};
      }
    },
    menuCounts(state) {
      return { leads: state.leads.filter(l => l.status === 'NEW').length };
    }
  };

  /* Escape closes the lead modal (the shell only handles drawer / notifications). */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && Store.get().mkt_leadOpen != null) Store.set({ mkt_leadOpen: null });
  });
})();
