# Orchid Dental Care

Software Version: 0.1.0 (front-end prototype)

## Description
A clickable front-end prototype of the Orchid Dental Care clinic management system. It is built with plain **HTML, CSS and JavaScript**: no framework, no build step, no install.

It covers the public website and five role dashboards:

| Area | What you can do |
|------|-----------------|
| **Website** (`index.html`) | Browse services, packages and dentists, check the availability calendar, and book an appointment (the booking becomes a lead for Marketing) |
| **Admin** | Clinic overview, analysis, users, treatments, inventory, reports, patient database, and clinic settings (payment-method fees feed the cashier) |
| **Marketing** | Lead pipeline (kanban and table), call log, booking confirmation, and the weekly dentist schedule |
| **Dentist** | Today's queue, treatment record with an FDI tooth chart, and "Complete & send to cashier" (creates a draft bill) |
| **Cashier** | Bill settlement, ported from the Dentist Receipt Calculator: doctor/clinic fee split, payment-method fee, invoice numbering, printable receipt |
| **Patient** | Appointments, treatment history, and bills & receipts |

Demo data is saved in your browser (`localStorage`), so bookings, settled bills and lead moves survive a reload. **Reset demo data** in the dashboard sidebar restores the original seed.

## How to run
Open `index.html` in a browser. The prototype works straight from the file system, or you can serve the folder with any static server:

```bash
npx serve .
```

Font Awesome icons load from cdnjs, so an internet connection is needed for the icons.

## Demo accounts
On `login.html`, click a demo account, or type a username with any password:

| Role | Username |
|------|----------|
| Admin | `kiyo` or `admin` |
| Marketing | `farah` |
| Dentist | `aina` |
| Cashier | `suraya` |
| Patient | `0123456789` |

## Bill calculation
The payment fee is **deducted**, because the clinic absorbs the card cost:

```
per service line:  doctor fee = amount × doctor % ,  clinic fee = amount − doctor fee
subtotal    = Σ clinic fee + Σ doctor fee + Σ other charges
payment fee = subtotal × payment method %
grand total = subtotal − payment fee
```

Example: Extraction 300 + Whitening 500 + Medication 50, paid by Credit Card (1.2%): 850.00 − 10.20 = **RM 839.80**.

## Project structure
```
index.html            public website (home, services, schedule, dentists, contact, book)
login.html            login + demo accounts
dashboard.html        role dashboards  (dashboard.html#/<role>/<page>)
css/
  base.css            design tokens, reset, buttons, badges, toast
  landing.css         website styles
  login.css           login styles
  dashboard.css       dashboard shell + shared components + setting page
  roles/<role>.css    screen styles per role
js/
  data.js             reference data + demo seed
  utils.js            formatting, escaping, bill calculation
  store.js            state + localStorage persistence
  ui.js               event delegation + HTML builders
  landing.js          website
  login.js            login
  dashboard/shell.js  router, sidebar, topbar, notifications, shared setting page
  dashboard/<role>.js admin · marketing · dentist · cashier · patient
docs/
  DESIGN-DOCUMENT.md  full system design (target stack: Spring Boot 3 + Vue 3 + MySQL 8)
```

## Notes
- This is a **prototype**. Data is demo data and there is no backend. The production design (API, database, migration from the Dentist Receipt Calculator) is described in `docs/DESIGN-DOCUMENT.md`.
- Theme: Orchid blue and white medical palette (`#2563eb` primary), Segoe UI, Font Awesome 6.
