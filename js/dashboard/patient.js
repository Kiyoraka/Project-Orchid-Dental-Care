/* Orchid Dental Care — PATIENT dashboard role module (logged-in patient: Nik Ahmad, P-000123).
 * Ported from the prototype renderVals(): the role==='patient' branch of the main block and the
 * "// patient" block. Pages (MENUS.patient): main, appointments, history, receipts, setting.
 * All patient screens are static demo tables, exactly as in the prototype.
 */
(() => {
  const RESCHEDULE_TEXT = 'Reschedule allowed up to 24h before';

  function main(ctx) {
    return {
      title: 'Welcome back, Nik',
      kpis: [
        { label: 'Next appointment', value: 'Thu 24 Sep, 10:00', sub: 'Dr. Aina · Follow-up', icon: 'fa-regular fa-calendar' },
        { label: 'Outstanding', value: money(0), sub: 'all bills settled', icon: 'fa-solid fa-sack-dollar', color: '#10b981' },
        { label: 'Visits', value: '7', sub: 'since Jan 2025', icon: 'fa-solid fa-tooth' }
      ],
      widgets: [
        { title: 'Recommended', sub: 'from Dr. Aina', span: 1, rows: [
          { icon: 'fa-solid fa-stethoscope', iconColor: '#2563eb', title: 'Follow-up in 2 weeks', sub: 'after extraction (tooth 38)', action: 'Book now', onAction: () => ctx.go('appointments') }
        ] },
        { title: 'Upcoming', sub: '', span: 1, rows: [
          { time: '24 Sep', title: 'Thu 10:00 · Dr. Aina', sub: 'Follow-up', badge: 'CONFIRMED', action: 'Reschedule', onAction: () => ctx.toast(RESCHEDULE_TEXT) }
        ] }
      ]
    };
  }

  function appointments(ctx) {
    const upcoming = {
      cols: ['Date', 'Time', 'Dentist', 'Treatment', 'Status', 'Actions'],
      rows: [{ cells: [
        T('Thu 24 Sep 2026', { bold: true }), T('10:00'), T('Dr. Aina'), T('Follow-up'), B('CONFIRMED'),
        A([
          ['fa-solid fa-calendar-day', 'Reschedule', '#2563eb', () => ctx.toast(RESCHEDULE_TEXT)],
          ['fa-solid fa-xmark', 'Cancel', '#ef4444', () => ctx.toast('Cancel allowed up to 24h before')]
        ])
      ] }],
      footer: 'Cancel / reschedule up to 24 hours before (Setting).'
    };
    const past = {
      cols: ['Date', 'Time', 'Dentist', 'Treatment', 'Status'],
      rows: [
        ['18 Sep 2026', '09:00', 'Dr. Aina', 'Extraction', 'COMPLETED'],
        ['14 Mar 2026', '11:00', 'Dr. Aina', 'Scaling · Consult', 'COMPLETED'],
        ['2 Nov 2025', '15:30', 'Dr. Hafiz', 'Filling', 'COMPLETED'],
        ['20 Aug 2025', '10:00', 'Dr. Aina', 'Consult', 'NO_SHOW']
      ].map(r => ({ cells: [T(r[0], { bold: true }), T(r[1]), T(r[2]), T(r[3]), B(r[4])] }))
    };
    return {
      tabs: ['Upcoming', 'Past'],
      toolbar: {
        primary: 'Book appointment',
        /* prototype: switch to the landing page's schedule view */
        onPrimary: () => { location.href = 'index.html#schedule'; }
      },
      table: ctx.tab === 0 ? upcoming : past
    };
  }

  function history() {
    return {
      table: {
        cols: ['Date', 'Dentist', 'Treatments', 'Tooth', 'Next visit'],
        rows: [
          ['18 Sep 2026', 'Dr. Aina', 'Extraction · Medication', '38', '2 weeks'],
          ['14 Mar 2026', 'Dr. Aina', 'Scaling · Consult', '—', '6 months'],
          ['2 Nov 2025', 'Dr. Hafiz', 'Filling', '36', '—'],
          ['18 Apr 2025', 'Dr. Aina', 'Consult · X-ray', '—', '—']
        ].map(r => ({ cells: [T(r[0], { bold: true }), T(r[1]), T(r[2]), T(r[3], { color: '#2563eb', bold: true }), T(r[4], { color: '#4b5563' })] })),
        footer: 'Clinical notes are hidden unless your dentist marks them shareable.'
      }
    };
  }

  function receipts(ctx) {
    return {
      table: {
        cols: ['Invoice', 'Date', 'Dentist', 'Amount (RM)', 'Method', 'Status', 'Receipt'],
        rows: [
          ['INV-20260918-001', '18 Sep 2026', 'Dr. Aina', '850.00', 'Cash', 'SETTLED'],
          ['INV-20260314-007', '14 Mar 2026', 'Dr. Aina', '170.00', 'Debit Card', 'SETTLED'],
          ['INV-20251102-003', '2 Nov 2025', 'Dr. Hafiz', '150.00', 'Online', 'SETTLED']
        ].map(r => ({ cells: [
          T(r[0]), T(r[1]), T(r[2]), T(r[3], { bold: true }), T(r[4], { color: '#4b5563' }), B(r[5]),
          A([['fa-solid fa-file-pdf', 'Download PDF', '#ef4444', () => ctx.toast(r[0] + '.pdf downloading')]])
        ] })),
        footer: 'Doctor / clinic split hidden on patient copy (open question #8).'
      }
    };
  }

  function setting(ctx) {
    return {
      html: SettingKit.page(SettingKit.profile(ctx.user, 'Login: phone + password (WhatsApp OTP option pending — open question #2)'))
    };
  }

  const PAGES = { main, appointments, history, receipts, setting };

  Roles.patient = {
    render(ctx) {
      const page = PAGES[ctx.page] || main;
      return page(ctx);
    }
  };
})();
