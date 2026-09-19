/* Orchid Dental Care — static reference data + demo seed.
 * Ported verbatim from the Claude Design prototype (Orchid Dental Care.dc.html, script block).
 * Classic script: the consts below are shared globals for every page script loaded after it.
 * Mutable demo state lives in SEED_STATE and is cloned into localStorage by store.js.
 */
const TREATMENTS=[
 ['Consult','General',50,80,30,true,'fa-solid fa-stethoscope'],['Scaling','Hygiene',120,40,30,true,'fa-solid fa-tooth'],['Filling','Restorative',150,40,30,true,'fa-solid fa-fill-drip'],['Extraction','Surgery',150,40,30,true,'fa-solid fa-hand-holding-medical'],
 ['X-ray','Diagnostic',60,20,15,true,'fa-solid fa-x-ray'],['Whitening','Cosmetic',500,20,60,true,'fa-solid fa-star'],['Crown','Restorative',900,40,60,true,'fa-solid fa-crown'],['RCT','Endodontic',800,40,60,true,'fa-solid fa-syringe'],
 ['Braces','Orthodontic',4500,60,45,true,'fa-solid fa-grip-lines'],['Implant','Surgery',3800,60,90,true,'fa-solid fa-screwdriver'],['Denture','Prosthodontic',1200,40,45,true,'fa-solid fa-teeth'],['Trauma','Emergency',200,40,30,false,'fa-solid fa-kit-medical'],
 ['Surgery','Surgery',1500,30,90,false,'fa-solid fa-user-doctor'],['Package','Package',0,30,0,false,'fa-solid fa-box'],['Medication','Pharmacy',0,0,0,false,'fa-solid fa-pills']
].map(t=>({name:t[0],category:t[1],price:t[2],pct:t[3],duration:t[4],isPublic:t[5],icon:t[6]}));
const DENTISTS=[{id:'aina',name:'Dr. Aina',short:'Dr. Aina',initials:'AR',specialty:'General & Cosmetic Dentistry',color:'#2563eb',days:'Mon – Fri',on:[1,2,3,4,5]},{id:'hafiz',name:'Dr. Hafiz',short:'Dr. Hafiz',initials:'HZ',specialty:'Oral Surgery & Implants',color:'#10b981',days:'Tue – Sat',on:[2,3,4,5,6]},{id:'mei',name:'Dr. Mei',short:'Dr. Mei',initials:'LM',specialty:'Orthodontics',color:'#8b5cf6',days:'Mon, Wed, Fri, Sat',on:[1,3,5,6]}];
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const USERS={admin:{name:'Kiyo',initials:'KY',roleLabel:'Admin',email:'kiyo@orchiddental.my',phone:'012-000 1111'},marketing:{name:'Farah',initials:'FR',roleLabel:'Marketing',email:'farah@orchiddental.my',phone:'013-222 3344'},dentist:{name:'Dr. Aina',initials:'AR',roleLabel:'Dentist',email:'aina@orchiddental.my',phone:'012-345 0000'},cashier:{name:'Suraya',initials:'SR',roleLabel:'Cashier',email:'suraya@orchiddental.my',phone:'017-888 9900'},patient:{name:'Nik Ahmad',initials:'NA',roleLabel:'Patient · P-000123',email:'nik@gmail.com',phone:'012-345 6789'}};
const MENUS={
 admin:[['main','Main','fa-solid fa-table-cells-large'],['analysis','Analysis','fa-solid fa-chart-line'],['users','User Management','fa-solid fa-users'],['treatments','Treatment Management','fa-solid fa-tooth'],['inventory','Inventory Management','fa-solid fa-boxes-stacked'],['report','Report','fa-solid fa-file-lines'],['patients','Patient Database','fa-solid fa-folder-open'],['setting','Setting','fa-solid fa-gear']],
 marketing:[['main','Main','fa-solid fa-table-cells-large'],['analysis','Analysis','fa-solid fa-chart-line'],['leads','Patient Management','fa-solid fa-phone'],['schedule','Schedule Management','fa-regular fa-calendar'],['setting','Setting','fa-solid fa-gear']],
 dentist:[['main','Main','fa-solid fa-table-cells-large'],['analysis','Analysis','fa-solid fa-chart-line'],['record','Patient Management','fa-solid fa-tooth'],['setting','Setting','fa-solid fa-gear']],
 cashier:[['main','Main','fa-solid fa-table-cells-large'],['analysis','Analysis','fa-solid fa-chart-line'],['bills','Patient Management','fa-solid fa-credit-card'],['setting','Setting','fa-solid fa-gear']],
 patient:[['main','Main','fa-solid fa-table-cells-large'],['appointments','My Appointments','fa-regular fa-calendar'],['history','Treatment History','fa-solid fa-tooth'],['receipts','Bills & Receipts','fa-solid fa-receipt'],['setting','Setting','fa-solid fa-gear']]};
const TITLES={main:'Main',analysis:'Analysis',users:'User Management',treatments:'Treatment Management',inventory:'Inventory Management',report:'Report',patients:'Patient Database',setting:'Setting',leads:'Patient Management — Leads & Cold Calling',schedule:'Schedule Management',record:'Patient Management — Treatment Record',bills:'Patient Management — Bill Settlement',appointments:'My Appointments',history:'Treatment History',receipts:'Bills & Receipts'};
const BADGE={PENDING:['#fef3c7','#92400e'],CONFIRMED:['#dbeafe','#1e40af'],CHECKED_IN:['#e0f2fe','#075985'],IN_TREATMENT:['#e0f2fe','#075985'],COMPLETED:['#d1fae5','#065f46'],CANCELLED:['#fee2e2','#991b1b'],NO_SHOW:['#fee2e2','#991b1b'],DRAFT:['#fef3c7','#92400e'],SETTLED:['#d1fae5','#065f46'],VOID:['#fee2e2','#991b1b'],NEW:['#f1f5f9','#334155'],CONTACTED:['#dbeafe','#1e40af'],INTERESTED:['#e0f2fe','#075985'],BOOKED:['#ede9fe','#5b21b6'],CONVERTED:['#d1fae5','#065f46'],LOST:['#fee2e2','#991b1b'],ACTIVE:['#d1fae5','#065f46'],INACTIVE:['#f1f5f9','#4b5563'],LOW:['#fef3c7','#92400e'],OK:['#d1fae5','#065f46'],OUT:['#fee2e2','#991b1b'],ADMIN:['#dbeafe','#1e40af'],MARKETING:['#ede9fe','#5b21b6'],DENTIST:['#e0f2fe','#075985'],CASHIER:['#d1fae5','#065f46'],PATIENT:['#f1f5f9','#334155']};
const ALL_SLOTS=['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];
const LEAD_ORDER=['NEW','CONTACTED','INTERESTED','BOOKED','CONVERTED','LOST'];

/* Prototype "today": the demo clinic day is Friday 18 Sep 2026 (September 2026 starts on a Tuesday). */
const DEMO_TODAY = { day: 18, month: 'September', monthShort: 'Sep', year: 2026, firstDow: 2, daysInMonth: 30, dateIso: '2026-09-18' };
const INVOICE_PREFIX = 'INV-20260918-';

/* ---------- landing content ---------- */
const LANDING = {
  stats: [{ value: '12,000+', label: 'patients treated' }, { value: '4.9 / 5', label: 'Google rating' }, { value: '3', label: 'specialist dentists' }],
  whyUs: [
    { icon: 'fa-solid fa-user-doctor', title: 'Expert dentists', text: 'Three specialists, one clinic.' },
    { icon: 'fa-solid fa-microscope', title: 'Modern equipment', text: 'Digital X-ray, low radiation.' },
    { icon: 'fa-solid fa-hand-holding-heart', title: 'Friendly care', text: 'Gentle with kids and nervous patients.' },
    { icon: 'fa-solid fa-tag', title: 'Clear pricing', text: 'Prices listed, no surprises.' }
  ],
  homeServices: ['Scaling', 'Filling', 'Braces', 'Implant'],
  packages: [
    { name: 'Basic Check-up', desc: 'Your yearly essentials in one visit.', items: ['Consult', 'Scaling', 'X-ray'], priceText: '199.00' },
    { name: 'Smile Makeover', desc: 'Brighter smile in two appointments.', items: ['Scaling', 'Whitening', 'Shade check & aftercare kit'], priceText: '580.00', popular: true },
    { name: 'Family Package', desc: 'For up to four family members.', items: ['4 × Consult', '4 × Scaling', 'Priority booking'], priceText: '599.00' }
  ],
  promos: [
    { title: 'Free consult with any scaling', text: 'Book Scaling this month and the Consult is on us.', valid: '1 – 30 Sep 2026' },
    { title: 'Smile Makeover RM 580', text: 'Scaling + Whitening bundle, save RM 40.', valid: 'until 31 Dec 2026' }
  ],
  testimonials: [
    { quote: 'Painless extraction, Dr. Aina explained every step.', name: 'Nik A.' },
    { quote: 'Booked online at midnight, confirmed by WhatsApp next morning.', name: 'Hana L.' }
  ],
  faqs: [
    ['Do you accept walk-ins?', 'Yes, but booked patients are seen first. Book online to hold a slot.'],
    ['How do I pay?', 'Cash, online transfer, debit and credit cards.'],
    ['Is the X-ray safe?', 'Digital X-ray uses very low radiation and is safe for adults and children.'],
    ['Can I cancel my booking?', 'Yes, up to 24 hours before via your patient dashboard or WhatsApp.']
  ],
  hours: [['Monday', '09:00', '18:00'], ['Tuesday', '09:00', '18:00'], ['Wednesday', '09:00', '18:00'], ['Thursday', '09:00', '18:00'], ['Friday', '09:00', '13:00'], ['Saturday', '09:00', '17:00'], ['Sunday', '', '']]
};

/* ---------- mutable demo state (cloned into localStorage by store.js) ---------- */
const SEED_STATE = {
  leads: [
    { id: 1, name: 'Siti Aminah', phone: '013-222 3344', source: 'Facebook', interest: 'Braces', status: 'INTERESTED', follow: '20 Sep', attempts: 2, log: [{ when: '18 Sep 10:12', type: 'Call', outcome: 'Answered', note: '"asking price for braces"' }, { when: '16 Sep 15:40', type: 'Call', outcome: 'No answer', note: '' }] },
    { id: 2, name: 'Ali Hassan', phone: '019-555 1212', source: 'Website', interest: 'Scaling', status: 'BOOKED', follow: '', attempts: 1, log: [{ when: '17 Sep 09:02', type: 'Status', outcome: 'Booked online', note: 'Thu 10:00 Dr. Aina' }] },
    { id: 3, name: 'Wong Li Ling', phone: '016-777 8899', source: 'Instagram', interest: 'Whitening', status: 'NEW', follow: 'Today', attempts: 0, log: [] },
    { id: 4, name: 'Ramesh Kumar', phone: '011-2345 6789', source: 'Referral', interest: 'Implant', status: 'CONTACTED', follow: '19 Sep', attempts: 1, log: [{ when: '18 Sep 11:30', type: 'Call', outcome: 'Call back', note: '"after work hours"' }] },
    { id: 5, name: 'Nurul Izzah', phone: '014-333 2211', source: 'Walk-in', interest: 'Consult', status: 'CONVERTED', follow: '', attempts: 1, log: [] },
    { id: 6, name: 'David Tan', phone: '012-999 0000', source: 'Cold list', interest: 'Denture', status: 'LOST', follow: '', attempts: 3, log: [{ when: '12 Sep', type: 'Status', outcome: 'Lost', note: 'reason: distance' }] },
    { id: 7, name: 'Aisyah Rahim', phone: '017-121 3434', source: 'TikTok', interest: 'Whitening', status: 'NEW', follow: 'Today', attempts: 0, log: [] }
  ],
  appts: [
    { id: 1, time: '09:00', dentist: 'aina', patient: 'Nik Ahmad', treatment: 'Extraction', status: 'CHECKED_IN' },
    { id: 2, time: '09:30', dentist: 'hafiz', patient: 'Siti Zulaikha', treatment: 'Consult', status: 'CONFIRMED' },
    { id: 3, time: '09:00', dentist: 'mei', patient: 'Ali Hassan', treatment: 'Braces review', status: 'PENDING' },
    { id: 4, time: '10:00', dentist: 'aina', patient: 'Farid Kamil', treatment: 'Scaling', status: 'CONFIRMED' },
    { id: 5, time: '11:00', dentist: 'hafiz', patient: 'Chong Wei', treatment: 'Implant consult', status: 'CONFIRMED' },
    { id: 6, time: '10:30', dentist: 'aina', patient: 'Puan Rosnah', treatment: 'Filling', status: 'IN_TREATMENT' },
    { id: 7, time: '11:30', dentist: 'aina', patient: 'Hana Lee', treatment: 'Whitening', status: 'CONFIRMED' }
  ],
  rec: { apptId: null, tab: 0, teeth: [], rows: [], notes: '', newTreatment: 'Extraction', newQty: 1, newNotes: '' },
  bills: [
    { id: 1, patient: 'Nik Ahmad', code: 'P-000123', dentist: 'Dr. Aina', visit: '18 Sep 2026 09:00', status: 'DRAFT', invoice: '', terminal: '', method: 'Cash', services: [{ name: 'Extraction', pct: 40, amount: 300 }, { name: 'Whitening', pct: 20, amount: 500 }], others: [{ desc: 'Medication', amount: 50 }] },
    { id: 2, patient: 'Siti Zulaikha', code: 'P-000088', dentist: 'Dr. Hafiz', visit: '18 Sep 2026 09:30', status: 'DRAFT', invoice: '', terminal: '', method: 'Cash', services: [{ name: 'Consult', pct: 80, amount: 50 }, { name: 'X-ray', pct: 20, amount: 70 }], others: [] },
    { id: 3, patient: 'Farid Kamil', code: 'P-000201', dentist: 'Dr. Aina', visit: '17 Sep 2026 15:00', status: 'SETTLED', invoice: 'INV-20260917-004', terminal: 'T88213', method: 'Debit Card', services: [{ name: 'Scaling', pct: 40, amount: 120 }], others: [] },
    { id: 4, patient: 'Hana Lee', code: 'P-000177', dentist: 'Dr. Mei', visit: '17 Sep 2026 11:00', status: 'SETTLED', invoice: 'INV-20260917-002', terminal: '', method: 'Online', services: [{ name: 'Braces', pct: 60, amount: 1500 }], others: [] },
    { id: 5, patient: 'Chong Wei', code: 'P-000150', dentist: 'Dr. Hafiz', visit: '16 Sep 2026 10:00', status: 'VOID', invoice: 'INV-20260916-003', terminal: '', method: 'Cash', services: [{ name: 'Consult', pct: 80, amount: 50 }], others: [] }
  ],
  seq: 5,
  methods: [
    { name: 'Cash', fee: 0, active: true, icon: 'fa-solid fa-money-bill' },
    { name: 'Online', fee: 0, active: true, icon: 'fa-solid fa-qrcode' },
    { name: 'Debit Card', fee: 0.5, active: true, icon: 'fa-regular fa-credit-card' },
    { name: 'Credit Card', fee: 1.2, active: true, icon: 'fa-solid fa-credit-card' },
    { name: 'Mastercard', fee: 2.5, active: true, icon: 'fa-brands fa-cc-mastercard' },
    { name: 'Union', fee: 1.0, active: false, icon: 'fa-solid fa-building-columns' }
  ],
  showSplit: false,
  notifs: {
    admin: [
      { text: 'Lidocaine 2% low — 4 left', icon: 'fa-solid fa-triangle-exclamation', color: '#f59e0b', time: '8 min ago' },
      { text: 'Bill INV-20260916-003 voided by Kiyo', icon: 'fa-solid fa-ban', color: '#ef4444', time: 'Yesterday' },
      { text: 'New user created: Suraya (CASHIER)', icon: 'fa-solid fa-user-plus', color: '#2563eb', time: '2 days ago' }
    ],
    marketing: [
      { text: 'New website booking: Ali Hassan, Thu 10:00', icon: 'fa-solid fa-globe', color: '#2563eb', time: '1 h ago' },
      { text: '2 follow-ups due today', icon: 'fa-regular fa-clock', color: '#f59e0b', time: 'Today' }
    ],
    dentist: [{ text: 'Nik Ahmad checked in for 09:00', icon: 'fa-solid fa-user-check', color: '#10b981', time: '5 min ago' }],
    cashier: [{ text: 'New draft bill ready: Nik Ahmad', icon: 'fa-solid fa-file-invoice-dollar', color: '#2563eb', time: 'Just now' }],
    patient: [{ text: 'Appointment Thu 24 Sep 10:00 confirmed', icon: 'fa-solid fa-check', color: '#10b981', time: 'Yesterday' }]
  }
};
