> **Note:** reference copy of the system design document from the Claude Design project. It was written against the Dentist Receipt Calculator repository, so "this repository" below means that project. This repo holds the vanilla HTML/CSS/JS front-end prototype; see README.md.

# 🦷 Orchid Dental Care — System Design Document

> **Purpose**: Build specification for a brand-new, custom-built dental clinic management system.
> It absorbs the existing **Dentist Receipt Calculator** (this repository) into the new Cashier module and migrates its data.
>
> **Audience**: Claude Code (implementation) + Kiyo (owner / reviewer)
> **Status**: Draft v1.0 — September 18, 2026
> **Scope**: Single clinic · Landing page + 5 role dashboards · WhatsApp Business API = placeholder (detail to follow)

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [Current System Analysis (Dentist Receipt Calculator)](#2-current-system-analysis-dentist-receipt-calculator)
3. [Tech Stack & Architecture](#3-tech-stack--architecture)
4. [Design System (Theme)](#4-design-system-theme)
5. [Roles, Sitemap & Access Matrix](#5-roles-sitemap--access-matrix)
6. [Landing Page](#6-landing-page)
7. [Shared Dashboard Layout](#7-shared-dashboard-layout)
8. [Admin Dashboard](#8-admin-dashboard)
9. [Marketing Dashboard](#9-marketing-dashboard)
10. [Dentist Dashboard](#10-dentist-dashboard)
11. [Cashier Dashboard](#11-cashier-dashboard)
12. [Patient Dashboard](#12-patient-dashboard)
13. [Core Workflows](#13-core-workflows)
14. [Receipt Calculator → Cashier Bill Settlement](#14-receipt-calculator--cashier-bill-settlement)
15. [Data Model](#15-data-model)
16. [API Overview](#16-api-overview)
17. [Data Migration from `dental_system`](#17-data-migration-from-dental_system)
18. [WhatsApp Business API (Placeholder)](#18-whatsapp-business-api-placeholder)
19. [Reports](#19-reports)
20. [Non-Functional Requirements](#20-non-functional-requirements)
21. [Build Phases](#21-build-phases)
22. [Open Questions](#22-open-questions)

---

## 1. Overview & Goals

Orchid Dental Care is one system for the whole clinic: patients find and book on the public landing page, marketing works leads, dentists record treatments, the cashier settles bills, admin runs the clinic, and patients see their own history.

```
                        ┌──────────────────────────────┐
                        │      ORCHID DENTAL CARE      │
                        └──────────────┬───────────────┘
      ┌──────────────┬─────────────────┼────────────────┬──────────────┬──────────────┐
      ▼              ▼                 ▼                ▼              ▼              ▼
 ┌──────────┐  ┌───────────┐   ┌──────────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
 │ Landing  │  │  Admin    │   │  Marketing   │  │  Dentist  │  │  Cashier  │  │  Patient  │
 │ (public) │  │ run clinic│   │ leads, calls,│  │ treatment │  │ bill      │  │ own appts,│
 │ book     │  │ users,    │   │ schedule     │  │ records   │  │ settlement│  │ history,  │
 │ online   │  │ inventory │   │              │  │           │  │ receipts  │  │ receipts  │
 └──────────┘  └───────────┘   └──────────────┘  └───────────┘  └───────────┘  └───────────┘
```

**Core modules**

| Module | Owner role(s) | Summary |
|--------|---------------|---------|
| Patient Database | Admin (full), others scoped | Single source of truth for patients — unique phone, no duplicates |
| Schedule Management | Marketing, Admin, Patient (own), Landing (public slots) | Dentist calendars, appointment booking, no double-booking |
| Dentist Management | Admin | Dentist profiles, working hours, leave, doctor-fee % per treatment |
| Treatment Management | Admin | Treatments, categories, prices, doctor-fee %, packages |
| Inventory Management | Admin | Items, stock ledger, suppliers, low-stock alerts, consumables per treatment |
| Lead / Cold Call | Marketing | Lead pipeline, call log, follow-ups, conversion to patient |
| Treatment Records | Dentist | Per-visit record (tooth, treatment, notes, attachments) → auto draft bill |
| Bill Settlement | Cashier | **Ported Dentist Receipt Calculator** — doctor/clinic fee split + payment fee |
| WhatsApp Business API | Admin ▸ Setting | Placeholder — detail to follow |

---

## 2. Current System Analysis (Dentist Receipt Calculator)

### 2.1 What exists today

```
 CURRENT: Dentist Receipt Calculator  (native PHP 7.4+ · PDO · MariaDB `dental_system`)
 ┌──────────────┐    ┌───────────────────────┐    ┌────────────────────────────┐
 │ login.php    │──▶ │ index.php             │──▶ │ modules/financial.php      │ ◀── the calculator
 │ users table  │    │ dashboard (Chart.js)  │    │ modules/receipts.php (edit)│
 └──────────────┘    └───────────────────────┘    │ modules/patients.php       │
                                                  │ modules/export-excel.php   │
                                                  │ modules/export-all.php     │
                                                  │ includes/pdf-generator.php │
                                                  └─────────────┬──────────────┘
                                                                ▼
                         MariaDB `dental_system`
   ┌─────────┐   ┌──────────┐ 1   N ┌──────────┐ 1   N ┌──────────────────┐
   │ users   │   │ patients │───────│ receipts │───────│ receipt_services │ (service_name only)
   └─────────┘   └──────────┘       └────┬─────┘       └──────────────────┘
                                         │ 1   N ┌──────────────────┐
                                         └───────│ receipt_charges  │ (service lines AND other charges)
                                                 └──────────────────┘
   ┌─────────────────────────────────────────────────────────┐
   │ dental_services (service_name, percentage = doctor fee %)│
   └─────────────────────────────────────────────────────────┘
```

**Existing tables** (`database/dentist-system.sql`)

| Table | Key columns |
|-------|-------------|
| `users` | username, password (bcrypt), full_name, email, role `admin\|dentist\|staff`, is_active, last_login |
| `patients` | name, phone, email, address |
| `dental_services` | service_name, percentage (doctor fee %) |
| `receipts` | patient_id, invoice_number (UNIQUE), terminal_invoice_number, invoice_date, clinic_fee, doctor_fee, other_charges, payment_method, payment_fee_percentage, payment_fee_amount, terminal_charge_percentage, terminal_charge_amount, subtotal, total_amount |
| `receipt_services` | receipt_id, service_name |
| `receipt_charges` | receipt_id, description, amount |

**Current service list & doctor-fee %**

| Service | Doctor % | Service | Doctor % | Service | Doctor % |
|---------|---------:|---------|---------:|---------|---------:|
| Medication | 0 | Crown | 40 | X-ray | 20 |
| Consult | 80 | Extraction | 40 | Trauma | 40 |
| Filling | 40 | Package | 30 | Whitening | 20 |
| Scaling | 40 | Braces | 60 | RCT | 40 |
| Implant | 60 | Denture | 40 | Surgery | 30 |

### 2.2 The live calculation (source of truth: `assets/js/financial.js:284-293`)

> ⚠️ `README.md` / `project-scope.md` are **stale** — they describe an 8% terminal charge that is **added**. The live code has **no terminal charge**, and the card fee is **deducted**.

```
 For each service line the cashier adds:

      charge amount (RM)
            │
            ├──▶ doctor_fee = amount × service_doctor_% / 100
            │
            └──▶ clinic_fee = amount − doctor_fee

 subtotal     = Σ clinic_fee + Σ doctor_fee + Σ other_charges
 payment_fee  = subtotal × payment_method_fee% / 100
 GRAND TOTAL  = subtotal − payment_fee          ◀── fee DEDUCTED (clinic absorbs card cost)

 Payment methods today:  Cash 0% · Online 0% · Debit Card 0.5% · Credit Card 1.2% · Mastercard 2.5%
```

### 2.3 Keep vs fix

```
 KEEP ✅                                          FIX 🔧
 ─────────────────────────────────────           ───────────────────────────────────────────────
 Doctor/clinic split per service line            Fee % lives only in HTML data-fee (lost on reload)
 Invoice no. + terminal invoice no.                → payment_methods table, editable in Setting
 Other charges (free-text + amount)              Patients matched by NAME only (duplicates)
 Payment-fee deduction                             → unique phone, patient code, merge tool
 Receipt layout, print, PDF, Excel export        Service lines + other charges mixed in one table
 Dashboard KPI cards + charts                      → bill_items.item_type SERVICE | OTHER
 Blue & white medical theme                      receipt_services duplicates receipt_charges
                                                   → dropped (derived from bill_items)
                                                 Doctor % not stored on the receipt line
                                                   → snapshot % on every bill_item
                                                 DB default charset armscii8 → utf8mb4
```

---

## 3. Tech Stack & Architecture

### 3.1 Stack

| Layer | Choice |
|-------|--------|
| Backend | **Spring Boot 3**, Java 21, Spring Web, Spring Security (JWT), Spring Data JPA, Bean Validation |
| Database | **MySQL 8** (`orchid_dental`, utf8mb4), **Flyway** migrations |
| Frontend | **Vue 3** (Composition API) + Vite + Pinia + Vue Router + **Tailwind CSS** |
| Charts | Chart.js (vue-chartjs) |
| Calendar | FullCalendar (Vue 3 adapter) |
| PDF | OpenPDF / Flying Saucer (server-side receipt & report PDF) |
| Excel | Apache POI |
| Icons | Font Awesome 6 (same as current system) |

### 3.2 System architecture

```
                         ┌──────────────────────────────────────────────┐
  Public visitor ───────▶│  Vue 3 SPA (Vite · Pinia · Router · Tailwind)│
  Admin / Marketing ────▶│   /                landing page (public)     │
  Dentist / Cashier ────▶│   /admin /marketing /dentist /cashier        │
  Patient ──────────────▶│   /patient         (role-guarded routes)     │
                         └──────────────────────┬───────────────────────┘
                                                │  REST JSON  +  JWT (Bearer)
                         ┌──────────────────────▼───────────────────────┐
                         │  Spring Boot 3 API  (Java 21, port 8080 FIXED)│
                         │  ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────┐ │
                         │  │ auth   │ │ patients │ │schedule│ │leads │ │
                         │  ├────────┤ ├──────────┤ ├────────┤ ├──────┤ │
                         │  │treatmt │ │ billing  │ │invntory│ │report│ │
                         │  ├────────┤ ├──────────┤ ├────────┤ ├──────┤ │
                         │  │settings│ │ public   │ │ audit  │ │ wa * │ │
                         │  └────────┘ └──────────┘ └────────┘ └──────┘ │
                         └───────┬───────────────────────────┬──────────┘
                                 ▼                           ▼
                     ┌───────────────────────┐   ┌──────────────────────────┐
                     │ MySQL `orchid_dental` │   │ WhatsApp Cloud API (Meta)│
                     │ Flyway migrations     │   │ Phase 10 — TBD           │
                     └───────────────────────┘   └──────────────────────────┘
                                                        * wa = reserved
```

### 3.3 Repository layout

```
orchid-dental-care/
├── backend/
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/orchiddental/
│       │   ├── OrchidDentalApplication.java
│       │   ├── config/          (security, jwt, cors, port-in-use handler)
│       │   ├── common/          (exceptions, api response, audit, pagination)
│       │   ├── auth/
│       │   ├── user/
│       │   ├── dentist/
│       │   ├── patient/
│       │   ├── lead/
│       │   ├── appointment/
│       │   ├── treatment/       (treatments, categories, packages)
│       │   ├── record/          (treatment records, attachments)
│       │   ├── billing/         (bills, bill items, payments, payment methods, invoice sequence)
│       │   ├── inventory/
│       │   ├── report/
│       │   ├── setting/
│       │   ├── publicsite/      (landing page read-only endpoints + booking)
│       │   ├── whatsapp/        (reserved)
│       │   └── migration/       (one-shot import from dental_system)
│       └── resources/
│           ├── application.yml
│           └── db/migration/    (V1__init.sql, V2__..., never edited once created)
└── frontend/
    ├── vite.config.js           (NO strictPort — floats to next free port)
    ├── tailwind.config.js       (theme tokens from §4)
    └── src/
        ├── router/              (role guards)
        ├── stores/              (Pinia: auth, settings, ...)
        ├── api/                 (axios client + per-module api files)
        ├── composables/         (shared screen logic: useBillSettlement.js, ...)
        ├── layouts/             (PublicLayout, DashboardLayout)
        ├── components/          (ui kit: KpiCard, DataTable, Modal, StatusBadge, ...)
        └── views/
            ├── public/          (Home, Services, Packages, Schedule, Dentists, Contact, Book)
            ├── admin/
            ├── marketing/
            ├── dentist/
            ├── cashier/
            └── patient/
```

### 3.4 Engineering rules (mandatory)

| # | Rule |
|---|------|
| 1 | **No Lombok** — explicit getters/setters/constructors |
| 2 | **Flyway: new migration only** — never edit an existing `V*.sql`; fixes go in a new file |
| 3 | **English identifiers** everywhere (tables, columns, classes, routes). Malay allowed only in UI labels |
| 4 | **No check-then-act races** — invariants enforced by DB `UNIQUE` or `PESSIMISTIC_WRITE` lock taken before the read (appointment slots, invoice sequence, stock deduction) |
| 5 | **Ports** — API fixed on 8080 (fail fast with friendly message if busy); Vite floats to next free port |
| 6 | **Mobile/desktop** — logic in `use<Screen>.js` composables; diverging layouts split into `<Screen>Mobile.vue` / `<Screen>Desktop.vue` |
| 7 | **Money** — `DECIMAL(12,2)` in DB, `BigDecimal` in Java, `HALF_UP` rounding to 2 dp per line |
| 8 | **No hardcoded data** — services, fees, payment methods, clinic info all from DB/settings (seeded by migration) |

---

## 4. Design System (Theme)

Same theme as the current system (`assets/css/style.css`, `assets/css/dashboard.css`).

### 4.1 Colour tokens

```
 ┌────────────────┬──────────┬───────────────────────────────────────────┐
 │ Token          │ Hex      │ Used for                                  │
 ├────────────────┼──────────┼───────────────────────────────────────────┤
 │ primary        │ #2563eb  │ buttons, links, headings, active nav      │
 │ primary-dark   │ #1e40af  │ hover, pressed                            │
 │ primary-deep   │ #1d4ed8  │ sidebar gradient end                      │
 │ accent         │ #3b82f6  │ interactive elements, gradient end        │
 │ light          │ #dbeafe  │ highlights, selected rows, badges bg      │
 │ white          │ #ffffff  │ cards, surfaces                           │
 │ bg             │ #f8fafc  │ page background                           │
 │ text           │ #1f2937  │ primary text                              │
 │ text-muted     │ #4b5563  │ secondary text                            │
 │ border         │ #e2e8f0  │ borders, dividers                         │
 │ success        │ #10b981  │ paid, completed, in stock                 │
 │ warning        │ #f59e0b  │ pending, low stock, follow-up due         │
 │ danger         │ #ef4444  │ cancelled, no-show, out of stock, void    │
 └────────────────┴──────────┴───────────────────────────────────────────┘

 Sidebar / hero gradient :  linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)
 Primary button          :  linear-gradient(135deg, #2563eb, #3b82f6)
 Shadow                  :  0 4px 6px -1px rgba(0,0,0,.1)   ·  lg: 0 10px 15px -3px rgba(0,0,0,.1)
 Font                    :  'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
 Icons                   :  Font Awesome 6
 Radius                  :  cards 12px · inputs/buttons 8px
```

> `warning` and `danger` are new tokens (status needs); everything else is copied as-is.

### 4.2 Status badges

```
 Appointment: [PENDING ▒ warning] [CONFIRMED ▒ primary] [CHECKED_IN ▒ accent] [IN_TREATMENT ▒ accent]
              [COMPLETED ▒ success] [CANCELLED ▒ danger] [NO_SHOW ▒ danger]
 Bill:        [DRAFT ▒ warning] [SETTLED ▒ success] [VOID ▒ danger]
 Lead:        [NEW] [CONTACTED] [INTERESTED] [BOOKED] [CONVERTED ▒ success] [LOST ▒ danger]
 Stock:       [IN STOCK ▒ success] [LOW ▒ warning] [OUT ▒ danger]
```

---

## 5. Roles, Sitemap & Access Matrix

### 5.1 Roles

| Role | Who | Login |
|------|-----|-------|
| `ADMIN` | Clinic owner / manager | username + password |
| `MARKETING` | Marketing / front desk / call staff | username + password |
| `DENTIST` | Dentists (linked to `dentists` profile) | username + password |
| `CASHIER` | Cashier / billing staff | username + password |
| `PATIENT` | Registered patients | phone + password (see §22 — WhatsApp OTP option) |

### 5.2 Sitemap

```
 Orchid Dental Care
 ├── Landing (public, no login)
 │   ├── /                 Home
 │   ├── /services         Services (treatments marked public)
 │   ├── /packages         Packages
 │   ├── /schedule         Schedule — calendar + dentist filter
 │   ├── /dentists         Our Dentists
 │   ├── /promotions       Promotions
 │   ├── /faq              FAQ
 │   ├── /contact          Contact & Location
 │   └── /book             Book Appointment ──▶ creates Lead + PENDING Appointment
 │
 ├── /login  ──▶ redirect by role
 │
 ├── /admin       Main · Analysis · User Management · Treatment Management ·
 │                Inventory Management · Report · Patient Database · Setting
 ├── /marketing   Main · Analysis · Patient Management (lead & cold call) ·
 │                Schedule Management · Setting
 ├── /dentist     Main · Analysis · Patient Management (treatment records) · Setting
 ├── /cashier     Main · Analysis · Patient Management (bill settlement) · Setting
 └── /patient     Main · My Appointments · Treatment History · Bills & Receipts · Setting
```

### 5.3 Access matrix

```
 R = read · W = write · own = only own rows · - = no access

                         ADMIN   MARKETING   DENTIST     CASHIER   PATIENT
 Users                    W        -           -           -         -
 Dentist profiles         W        R           own W       R         R (public fields)
 Treatments / Packages    W        R           R           R         R (public)
 Inventory                W        -           R           -         -
 Patients                 W        W (basic)   R + notes   R         own
 Leads / call log         R        W           -           -         -
 Appointments             W        W           own (R)     R         own
 Treatment records        R        -           W (own)     R         own (R)
 Bills / payments         R        -           draft (auto) W         own (R)
 Reports                  W (all)  own module  own         own       -
 Settings                 W (all)  own profile own profile own prof. own profile
 Audit log                R        -           -           -         -
```

---

## 6. Landing Page

Public, SEO-friendly, mobile-first. All content from DB (clinic info, treatments, packages, dentists, promotions, FAQ) — editable by Admin.

### 6.1 Page wireframe (Home, scrolling sections)

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │ 🦷 Orchid Dental Care   Home Services Packages Schedule Dentists Contact  [Book Now] [Login] │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │                                                                              │
 │   HERO (blue gradient)                                                       │
 │   "Your smile, our care."                                                    │
 │   Short clinic tagline · opening hours today                                 │
 │   [ Book Appointment ]   [ 💬 WhatsApp Us ]                                  │
 │                                                                              │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │  WHY US    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
 │            │ Expert   │ │ Modern   │ │ Friendly │ │ Clear    │               │
 │            │ dentists │ │ equipment│ │ care     │ │ pricing  │               │
 │            └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │  SERVICES  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   [View all →]         │
 │            │Scaling │ │Filling │ │Braces  │ │Implant │                        │
 │            │from RM │ │from RM │ │from RM │ │from RM │                        │
 │            └────────┘ └────────┘ └────────┘ └────────┘                        │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │  PACKAGES  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐     │
 │            │ Basic Check-up   │ │ Smile Makeover   │ │ Family Package   │     │
 │            │ • Consult        │ │ • Scaling        │ │ • 4 × Consult    │     │
 │            │ • Scaling        │ │ • Whitening      │ │ • 4 × Scaling    │     │
 │            │ • X-ray          │ │                  │ │                  │     │
 │            │ RM xxx  [Book]   │ │ RM xxx  [Book]   │ │ RM xxx  [Book]   │     │
 │            └──────────────────┘ └──────────────────┘ └──────────────────┘     │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │  SCHEDULE (see 6.2)                                                          │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │  OUR DENTISTS  ( photo · name · specialty · working days · [Book with me] )  │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │  PROMOTIONS  (active promos with validity dates)                             │
 │  TESTIMONIALS (admin-curated quotes)                                         │
 │  FAQ (accordion)                                                             │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │  CONTACT: address · map embed · phone · WhatsApp · operating hours table     │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │  FOOTER: © Orchid Dental Care · Privacy (PDPA) · social links                │
 └──────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Schedule — calendar with dentist filter

```
 ┌──────────────────────────────────────────────────────────────────────┐
 │ SCHEDULE                                                             │
 │ Dentist: [ All dentists ▾ ]   Treatment: [ Any ▾ ]                   │
 │                    ◀  September 2026  ▶          [ Month | Week ]    │
 ├─────┬─────┬─────┬─────┬─────┬─────┬─────┐                            │
 │ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │   ▓ green  = slots free    │
 ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤   ▒ amber  = few left      │
 │     │  ▓  │  ▓  │  ▒  │  ▓  │  ░  │  ▓  │   ░ grey   = full / closed │
 │  ░  │  ▓  │  ▒  │  ▓  │  ▓  │  ░  │  ▓  │                            │
 └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                            │
 │                                                                      │
 │ Click a day ──▶  Thu 24 Sep · Dr. Aina                               │
 │                  [09:00] [09:30] [10:00] [11:30] [14:00] [15:30]     │
 │                  click slot ──▶ /book (pre-filled dentist/date/time) │
 └──────────────────────────────────────────────────────────────────────┘
```

**Rules**
- Only **availability** is public — never patient names or treatment details.
- Slots = dentist working hours − leave − breaks − existing appointments (non-cancelled). Slot length from Setting (default 30 min).
- "All dentists" shows union of free slots; picking a slot then asks which dentist (or "any available").

### 6.3 Book Appointment flow

```
 /book form: name · phone · email (opt) · dentist · date · time · treatment/package (opt) · notes
      │
      ▼
 phone exists in patients? ──yes──▶ link appointment to patient
      │ no
      ▼
 create Lead (source = WEBSITE, status = BOOKED)
      │
      ▼
 Appointment status = PENDING  (slot held — UNIQUE dentist+start)
      │
      ▼
 Marketing sees it in "Pending confirmation" ──▶ calls / WhatsApp ──▶ CONFIRMED
```

---

## 7. Shared Dashboard Layout

All five dashboards share one `DashboardLayout` — only the sidebar menu and pages differ.

### 7.1 Desktop

```
 ┌────────────────────┬──────────────────────────────────────────────────────────┐
 │ 🦷 Orchid          │  Main                                   🔔 3   Dr. Aina ▾ │
 │    Dental Care     ├──────────────────────────────────────────────────────────┤
 │ (blue gradient)    │ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐│
 │                    │ │ 💰 Today   │ │ 📅 Appts   │ │ 👤 New     │ │ ⚠ Low     ││
 │ ▣ Main        ◀──  │ │ RM 4,250   │ │ 18         │ │ patients 5 │ │ stock 3    ││
 │ ▤ Analysis         │ └────────────┘ └────────────┘ └────────────┘ └────────────┘│
 │ ▥ <module 1>       │ ┌──────────────────────────────┐ ┌───────────────────────┐ │
 │ ▥ <module 2>       │ │ Chart / main table           │ │ Side list / queue     │ │
 │ ▥ ...              │ │                              │ │                       │ │
 │ ⚙ Setting          │ │                              │ │                       │ │
 │                    │ └──────────────────────────────┘ └───────────────────────┘ │
 │ ─────────────────  │                                                            │
 │ 👤 Dr. Aina        │                                                            │
 │ ⎋ Logout           │                                                            │
 └────────────────────┴──────────────────────────────────────────────────────────┘
```

### 7.2 Mobile

```
 ┌──────────────────────────┐        ┌──────────────────────────┐
 │ ☰  Main          🔔  👤  │  ☰ ──▶ │ 🦷 Orchid Dental Care  ✕ │
 ├──────────────────────────┤        │ ▣ Main                   │
 │ ┌──────────────────────┐ │        │ ▤ Analysis               │
 │ │ KPI (stacked)        │ │        │ ▥ Patient Management     │
 │ └──────────────────────┘ │        │ ⚙ Setting                │
 │ ┌──────────────────────┐ │        │ ⎋ Logout                 │
 │ │ table → card list    │ │        └──────────────────────────┘
 │ └──────────────────────┘ │          slide-in drawer
 └──────────────────────────┘
```

### 7.3 Shared "Setting" page (every role)

```
 Setting
 ├── My Profile      (name, email, phone, photo)
 ├── Change Password
 └── + role-specific tabs (Admin gets clinic-wide settings — §8.8)
```

### 7.4 Notifications (🔔)

| Role | Examples |
|------|----------|
| Admin | Low stock, bill voided, new user created |
| Marketing | New website booking, follow-up due today |
| Dentist | Patient checked-in for you |
| Cashier | New draft bill ready to settle |
| Patient | Appointment confirmed / reminder |

---

## 8. Admin Dashboard

```
 ADMIN SIDEBAR
 ├── ▣ Main
 ├── ▤ Analysis
 ├── 👥 User Management
 ├── 🦷 Treatment Management
 ├── 📦 Inventory Management
 ├── 📄 Report
 ├── 🗂 Patient Database
 └── ⚙ Setting
```

### 8.1 Main

```
 ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
 │ Today      │ │ This month │ │ Appts today│ │ New pts    │ │ Low stock  │
 │ revenue    │ │ revenue    │ │ 18 (3 left)│ │ this month │ │ 3 items    │
 └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘
 ┌─────────────────────────────────────┐ ┌──────────────────────────────┐
 │ Today's schedule (all dentists)     │ │ Alerts                       │
 │ 09:00 Dr. Aina   · Nik Ahmad  ✓     │ │ ⚠ Lidocaine low (4 left)     │
 │ 09:30 Dr. Hafiz  · Siti      ⏳     │ │ ⚠ 2 bills in DRAFT > 1 day   │
 │ ...                                 │ │ ⚠ 5 follow-ups overdue       │
 └─────────────────────────────────────┘ └──────────────────────────────┘
```

### 8.2 Analysis

```
 Filters: [ Date range ▾ ]  [ Dentist ▾ ]  [ Treatment ▾ ]

 ┌──────────────────────────────────┐ ┌──────────────────────────────────┐
 │ Revenue trend (line, daily/mthly)│ │ Revenue by treatment (bar)       │
 └──────────────────────────────────┘ └──────────────────────────────────┘
 ┌──────────────────────────────────┐ ┌──────────────────────────────────┐
 │ Revenue by dentist (bar)         │ │ Doctor fee vs clinic fee (pie)   │
 └──────────────────────────────────┘ └──────────────────────────────────┘
 ┌──────────────────────────────────┐ ┌──────────────────────────────────┐
 │ Payment method mix + fee cost    │ │ Appointments: completed / no-show│
 └──────────────────────────────────┘ └──────────────────────────────────┘
```

### 8.3 User Management

```
 [+ Add User]   Search [__________]   Role [All ▾]   Status [Active ▾]
 ┌──────────────┬───────────────┬───────────┬─────────┬────────────┬──────────┐
 │ Name         │ Username      │ Role      │ Status  │ Last login │ Actions  │
 ├──────────────┼───────────────┼───────────┼─────────┼────────────┼──────────┤
 │ Dr. Aina     │ aina          │ DENTIST   │ Active  │ 18 Sep     │ ✎ 🔑 ⏻  │
 │ Farah        │ farah         │ CASHIER   │ Active  │ 18 Sep     │ ✎ 🔑 ⏻  │
 └──────────────┴───────────────┴───────────┴─────────┴────────────┴──────────┘
  ✎ edit · 🔑 reset password · ⏻ activate/deactivate (no hard delete)

 Role = DENTIST opens extra "Dentist Profile" tab:
   display name · photo · specialty · calendar colour · show on landing? ·
   weekly working hours (per day start/end/break) · leave dates
```

### 8.4 Treatment Management

```
 Tabs: [ Treatments ] [ Categories ] [ Packages ]

 Treatments
 ┌──────────────┬────────────┬───────────┬────────────┬──────────┬────────┬────────┐
 │ Name         │ Category   │ Price (RM)│ Doctor fee%│ Duration │ Public │ Active │
 ├──────────────┼────────────┼───────────┼────────────┼──────────┼────────┼────────┤
 │ Consult      │ General    │  50.00    │ 80         │ 30 min   │  ✓     │  ✓     │
 │ Extraction   │ Surgery    │ 150.00    │ 40         │ 30 min   │  ✓     │  ✓     │
 │ Medication   │ Pharmacy   │   0.00    │  0         │  -       │  ✗     │  ✓     │
 └──────────────┴────────────┴───────────┴────────────┴──────────┴────────┴────────┘
  Price = default charge (cashier can override per bill line)
  Consumables sub-table per treatment: item · qty used (for auto stock deduction)

 Packages: name · description · items (treatment × qty) · package price · valid from/to · public?
```

### 8.5 Inventory Management

```
 Tabs: [ Items ] [ Stock In ] [ Stock Adjust ] [ Movements ] [ Suppliers ] [ Categories ]

 Items
 ┌──────────────┬───────────┬──────┬────────┬─────────┬──────────┬────────┐
 │ Item         │ Category  │ Unit │ On hand│ Reorder │ Cost (RM)│ Status │
 ├──────────────┼───────────┼──────┼────────┼─────────┼──────────┼────────┤
 │ Lidocaine 2% │ Anaesth.  │ amp  │   4    │   10    │  3.50    │ LOW    │
 │ Gloves (M)   │ Consumable│ box  │  22    │    5    │ 18.00    │ OK     │
 └──────────────┴───────────┴──────┴────────┴─────────┴──────────┴────────┘

 Stock flow (ledger — on_hand is always Σ movements):

   Stock In (supplier, qty, cost, expiry, batch) ──▶ +qty ─┐
   Treatment settled (consumables)               ──▶ −qty ─┼──▶ stock_movements ──▶ on_hand
   Adjust (damage / expired / count correction)  ──▶ ±qty ─┘        (row-locked per item)
```

### 8.6 Report

See §19 — list of reports, date filters, export Excel / PDF.

### 8.7 Patient Database

```
 Search [name / phone / IC / code]  [+ Add Patient]  [Merge duplicates]
 ┌──────────┬──────────────────┬──────────────┬─────────────┬────────────┬─────────┐
 │ Code     │ Name             │ Phone        │ Last visit  │ Total spent│ Actions │
 ├──────────┼──────────────────┼──────────────┼─────────────┼────────────┼─────────┤
 │ P-000123 │ Nik Ahmad        │ 012-345 6789 │ 14 Sep 2026 │ RM 850.00  │ 👁 ✎    │
 └──────────┴──────────────────┴──────────────┴─────────────┴────────────┴─────────┘

 Patient profile (👁):
 ┌───────────────────────────────────────────────────────────────────┐
 │ Nik Ahmad · P-000123 · 012-345 6789 · IC ****-**-1234             │
 │ Tabs: [Overview] [Appointments] [Treatment records] [Bills] [Files]│
 └───────────────────────────────────────────────────────────────────┘

 Merge duplicates: pick 2 patients ──▶ choose master ──▶ move appts/records/bills ──▶ archive other
```

### 8.8 Setting (Admin)

```
 Tabs:
 ├── Clinic Profile ....... name, logo, address, phone, email, map link, registration no.
 ├── Operating Hours ...... per weekday open/close, public holidays / closed dates
 ├── Appointment .......... slot length (min), max advance booking days, auto-cancel PENDING after N hours
 ├── Payment Methods ...... name · fee % · active · sort   (replaces old HTML data-fee)
 ├── Invoice & Receipt .... invoice prefix (INV-), format INV-YYYYMMDD-NNN, receipt footer text, logo
 ├── Landing Content ...... hero text, why-us, promotions, testimonials, FAQ
 └── WhatsApp API ......... placeholder — see §18
```

---

## 9. Marketing Dashboard

```
 MARKETING SIDEBAR
 ├── ▣ Main
 ├── ▤ Analysis
 ├── 📞 Patient Management   (lead & cold calling)
 ├── 📅 Schedule Management
 └── ⚙ Setting
```

### 9.1 Main

```
 ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
 │ New leads  │ │ Follow-ups │ │ Pending    │ │ Bookings   │
 │ today 7    │ │ due 12     │ │ confirm 4  │ │ this week  │
 └────────────┘ └────────────┘ └────────────┘ └────────────┘
 ┌──────────────────────────────────┐ ┌─────────────────────────────┐
 │ Follow-ups due today (call list) │ │ Website bookings to confirm │
 │ Siti · 013-... · Interested [📞] │ │ Ali · Thu 10:00 Dr. Aina [✓]│
 └──────────────────────────────────┘ └─────────────────────────────┘
```

### 9.2 Analysis

```
 Funnel (period):  New 120 ─▶ Contacted 95 ─▶ Interested 50 ─▶ Booked 32 ─▶ Converted 25
 ┌──────────────────────────┐ ┌──────────────────────────┐ ┌──────────────────────────┐
 │ Lead source (pie)        │ │ Conversion by staff (bar)│ │ Lost reasons (bar)       │
 │ Website/Walk-in/FB/Ref.. │ │                          │ │ price / distance / ...   │
 └──────────────────────────┘ └──────────────────────────┘ └──────────────────────────┘
```

### 9.3 Patient Management — Lead & Cold Calling

Lead pipeline:

```
 ┌──────┐ call  ┌───────────┐       ┌────────────┐ book  ┌────────┐ visit ┌───────────┐
 │ NEW  │──────▶│ CONTACTED │──────▶│ INTERESTED │──────▶│ BOOKED │──────▶│ CONVERTED │ = patient
 └──┬───┘       └─────┬─────┘       └─────┬──────┘       └───┬────┘       └───────────┘
    │ no answer       │ not now           │ follow-up date   │ no-show
    ▼                 ▼                   ▼                  ▼
  retry (attempt+1) / follow-up date ─────────────────────▶ ┌──────┐
                                                            │ LOST │ (reason required)
                                                            └──────┘
```

Views: **Kanban** (drag between columns) and **Table** (bulk import CSV, assign to staff, filter by source/status/follow-up date).

```
 Lead detail
 ┌──────────────────────────────────────────────────────────────────┐
 │ Siti Aminah · 013-222 3344 · Source: Facebook · Assigned: Farah │
 │ Interest: Braces · Status: INTERESTED · Follow-up: 20 Sep       │
 ├──────────────────────────────────────────────────────────────────┤
 │ [📞 Log call] [💬 WhatsApp] [📅 Book appointment] [✗ Mark lost] │
 ├──────────────────────────────────────────────────────────────────┤
 │ Activity log                                                     │
 │ 18 Sep 10:12  Call · Answered · "asking price for braces"        │
 │ 16 Sep 15:40  Call · No answer                                   │
 └──────────────────────────────────────────────────────────────────┘
 Call outcome options: ANSWERED · NO_ANSWER · BUSY · WRONG_NUMBER · CALL_BACK
```

Booking from a lead creates/links the patient (by phone) and moves the lead to `BOOKED`. When that appointment reaches `COMPLETED`, lead → `CONVERTED` automatically.

### 9.4 Schedule Management

```
 Dentist: [All ▾]  Status: [All ▾]        ◀ Week 38 ▶   [Day | Week | Month]   [+ New appointment]
 ┌───────┬──────────────────┬──────────────────┬──────────────────┐
 │       │ Dr. Aina (blue)  │ Dr. Hafiz (green)│ Dr. Mei (purple) │
 ├───────┼──────────────────┼──────────────────┼──────────────────┤
 │ 09:00 │ Nik Ahmad  CONF  │                  │ Ali  PENDING     │
 │ 09:30 │   (Extraction)   │ Siti  CONF       │                  │
 │ 10:00 │                  │                  │ ░░ leave ░░      │
 └───────┴──────────────────┴──────────────────┴──────────────────┘
  Drag to reschedule · click to confirm / cancel / mark no-show · check-in button on the day
```

### 9.5 Setting

Profile + password (§7.3), personal call-list preferences.

---

## 10. Dentist Dashboard

```
 DENTIST SIDEBAR
 ├── ▣ Main
 ├── ▤ Analysis
 ├── 🦷 Patient Management   (record treatment)
 └── ⚙ Setting
```

### 10.1 Main — today's queue

```
 ┌────────────┐ ┌────────────┐ ┌────────────┐
 │ Today appts│ │ Waiting    │ │ Completed  │
 │ 9          │ │ 2          │ │ 5          │
 └────────────┘ └────────────┘ └────────────┘
 ┌──────────────────────────────────────────────────────────────────┐
 │ Queue                                                            │
 │ 09:00 Nik Ahmad   CHECKED_IN   [▶ Start treatment]               │
 │ 09:30 Siti        CONFIRMED    (not arrived)                     │
 │ 10:00 Ali         IN_TREATMENT [📝 Continue record]              │
 └──────────────────────────────────────────────────────────────────┘
```

### 10.2 Analysis (own data only)

Treatments performed (by type, by month) · own doctor-fee earnings (from settled bills) · patients seen · no-show rate.

### 10.3 Patient Management — Treatment Record

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Nik Ahmad · P-000123 · Age 34 · ⚠ Allergy: Penicillin                    │
 │ Tabs: [ This visit ] [ History ] [ Files ]                               │
 ├──────────────────────────────────────────────────────────────────────────┤
 │ Tooth chart (FDI numbering) — click to select                            │
 │   18 17 16 15 14 13 12 11 │ 21 22 23 24 25 26 27 28                      │
 │   48 47 46 45 44 43 42 41 │ 31 32 33 34 35 36 37 38                      │
 ├──────────────────────────────────────────────────────────────────────────┤
 │ Treatments performed                                                     │
 │ ┌──────────────┬────────┬───────────┬──────────────────────────────────┐ │
 │ │ Treatment    │ Tooth  │ Qty       │ Notes                            │ │
 │ ├──────────────┼────────┼───────────┼──────────────────────────────────┤ │
 │ │ Extraction   │ 38     │ 1         │ impacted, sutured                │ │
 │ │ Medication   │ -      │ 1         │ Amoxicillin 500mg                │ │
 │ └──────────────┴────────┴───────────┴──────────────────────────────────┘ │
 │ [+ Add treatment]                                                        │
 │ Clinical notes: [.........................................]              │
 │ Attachments: [📎 X-ray / photo upload]                                   │
 │ Next visit recommended: [ 2 weeks ▾ ]                                    │
 ├──────────────────────────────────────────────────────────────────────────┤
 │                     [ Save draft ]  [ ✓ Complete & send to cashier ]     │
 └──────────────────────────────────────────────────────────────────────────┘
```

"Complete & send to cashier" ⇒ appointment → `COMPLETED`, draft **bill** created with one `SERVICE` line per treatment row (default price, doctor-fee % snapshot). Dentists do **not** see or set prices.

### 10.4 Setting

Profile + password · own weekly availability (view; edit if Admin allows) · request leave.

---

## 11. Cashier Dashboard

```
 CASHIER SIDEBAR
 ├── ▣ Main
 ├── ▤ Analysis
 ├── 💳 Patient Management   (bill settlement)  ◀── ported Dentist Receipt Calculator
 └── ⚙ Setting
```

### 11.1 Main

```
 ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
 │ Awaiting   │ │ Collected  │ │ Receipts   │ │ Card fees  │
 │ payment 3  │ │ today RM.. │ │ today 14   │ │ today RM.. │
 └────────────┘ └────────────┘ └────────────┘ └────────────┘
 ┌───────────────────────────────────────┐ ┌───────────────────────────┐
 │ Awaiting payment (DRAFT bills)        │ │ Today by payment method   │
 │ Nik Ahmad · Dr. Aina · RM 850 [Settle]│ │ Cash        RM 1,200      │
 │ Siti      · Dr. Hafiz· RM 120 [Settle]│ │ Debit Card  RM   800      │
 └───────────────────────────────────────┘ │ Online      RM   450      │
                                           └───────────────────────────┘
```

### 11.2 Analysis

Collections trend · by payment method · card fee cost (Σ payment_fee) · doctor fee vs clinic fee totals · daily closing summary (print) for cash drawer reconciliation.

### 11.3 Patient Management — Bill Settlement

Full spec in **§14**. List view:

```
 Tabs: [ Awaiting payment ] [ Settled ] [ Void ]      Search [name/invoice/terminal no.]  [+ Walk-in bill]
 ┌──────────────────┬──────────────┬───────────┬───────────┬──────────┬──────────┐
 │ Invoice          │ Patient      │ Dentist   │ Amount    │ Status   │ Actions  │
 ├──────────────────┼──────────────┼───────────┼───────────┼──────────┼──────────┤
 │ (draft)          │ Nik Ahmad    │ Dr. Aina  │ 850.00    │ DRAFT    │ [Settle] │
 │ INV-20260918-001 │ Siti         │ Dr. Hafiz │ 120.00    │ SETTLED  │ 🖨 📄 ✎  │
 └──────────────────┴──────────────┴───────────┴───────────┴──────────┴──────────┘
 "+ Walk-in bill" = old manual flow (e.g. medication-only purchase), patient search/create by phone.
```

### 11.4 Setting

Profile + password · receipt printer paper size (A4 / 80mm thermal) · default payment method.

---

## 12. Patient Dashboard

```
 PATIENT SIDEBAR
 ├── ▣ Main
 ├── 📅 My Appointments
 ├── 🦷 Treatment History
 ├── 🧾 Bills & Receipts
 └── ⚙ Setting
```

```
 Main
 ┌──────────────────────────────────┐ ┌──────────────────────────────┐
 │ Next appointment                 │ │ Outstanding                  │
 │ Thu 24 Sep, 10:00 · Dr. Aina     │ │ RM 0.00                      │
 │ [Reschedule] [Cancel]            │ │                              │
 └──────────────────────────────────┘ └──────────────────────────────┘
 ┌──────────────────────────────────────────────────────────────────┐
 │ Recommended: follow-up in 2 weeks (from Dr. Aina)  [Book now]    │
 └──────────────────────────────────────────────────────────────────┘
```

| Page | Content |
|------|---------|
| My Appointments | Upcoming + past; book (same calendar as §6.2), cancel/reschedule up to N hours before (Setting) |
| Treatment History | Per visit: date, dentist, treatments, tooth numbers (clinical notes hidden unless marked shareable) |
| Bills & Receipts | Settled bills, download receipt PDF |
| Setting | Profile (name, email, address), change password |

---

## 13. Core Workflows

### 13.1 End-to-end patient journey

```
 Landing booking / Walk-in / Cold call
        │
        ▼
 ┌────────────┐ book  ┌──────────────┐ arrive ┌────────────┐ start ┌──────────────┐
 │ Lead (MKT) │──────▶│ Appointment  │───────▶│ CHECKED_IN │──────▶│ IN_TREATMENT │
 └────────────┘       │ PENDING →    │ (front │            │(dentist)│             │
                      │ CONFIRMED    │  desk) └────────────┘       └──────┬───────┘
                      └──────────────┘                                    │ Complete & send
                                                                          ▼
 ┌──────────────┐  view  ┌────────────────────┐  settle ┌──────────────────────────────┐
 │ Patient      │◀───────│ Bill SETTLED       │◀────────│ Draft bill (cashier queue)   │
 │ dashboard    │        │ receipt PDF/print  │         │ lines from treatment record  │
 └──────────────┘        │ stock deducted     │         └──────────────────────────────┘
                         │ (WhatsApp later)   │
                         └────────────────────┘
```

### 13.2 Appointment state machine

```
                 confirm              check-in              start               complete
 ┌─────────┐ ─────────────▶ ┌───────────┐ ─────────▶ ┌────────────┐ ───────▶ ┌──────────────┐ ───────▶ ┌───────────┐
 │ PENDING │                │ CONFIRMED │            │ CHECKED_IN │          │ IN_TREATMENT │          │ COMPLETED │
 └────┬────┘                └─────┬─────┘            └────────────┘          └──────────────┘          └───────────┘
      │ cancel / auto-expire      │ cancel      │ not arrived by end of day
      ▼                           ▼             ▼
 ┌───────────┐              ┌───────────┐  ┌─────────┐
 │ CANCELLED │              │ CANCELLED │  │ NO_SHOW │
 └───────────┘              └───────────┘  └─────────┘
```

**Double-booking prevention**: booking/rescheduling takes `PESSIMISTIC_WRITE` on the `dentists` row, re-checks overlap (start < other.end AND end > other.start, status not CANCELLED/NO_SHOW), then inserts. Also `UNIQUE (dentist_id, start_at, active_flag)` as a backstop. Frontend disabling the button is **not** the guard.

### 13.3 Bill lifecycle

```
 ┌───────┐  cashier settles (payment saved,     ┌─────────┐   admin voids (reason,   ┌──────┐
 │ DRAFT │  invoice no. assigned, stock OUT) ──▶│ SETTLED │ ── stock reversed) ─────▶│ VOID │
 └───┬───┘                                      └────┬────┘                          └──────┘
     │ cashier edits lines freely                    │ edit after settle = allowed for ADMIN/CASHIER
     └───────────────────────────────────────────────┘ but every change → audit_logs (before/after JSON)
```

### 13.4 Invoice numbering

`INV-YYYYMMDD-NNN` (same format as old system), NNN resets daily. Generated **at settlement** from `invoice_sequences(seq_date, last_number)` row locked with `PESSIMISTIC_WRITE` — no gaps from abandoned drafts, no duplicates under concurrency. `invoice_number` also UNIQUE.

---

## 14. Receipt Calculator → Cashier Bill Settlement

This is the **integration** of the current repository into the new system. The cashier keeps the screen they already know; the difference is where the lines come from.

### 14.1 Before vs after

```
 OLD (Dentist Receipt Calculator)                NEW (Orchid Dental Care — Cashier)
 ───────────────────────────────────             ───────────────────────────────────────────
 cashier types patient NAME                      patient already linked (from appointment)
 cashier types amount + picks service            lines pre-filled from dentist's record
   for every line                                  (default price, doctor % snapshot)
 fee % hardcoded in HTML                         fee % from payment_methods (Admin ▸ Setting)
 invoice number typed manually                   invoice number auto at settlement
 terminal invoice typed                          terminal invoice typed (unchanged)
 save → receipts + receipt_charges               save → bills + bill_items + payments
 print from browser                              print + server PDF (+ WhatsApp later)
```

### 14.2 Bill Settlement screen

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Bill Settlement — Nik Ahmad (P-000123)             Dentist: Dr. Aina     │
 │ Visit: 18 Sep 2026 09:00                                                 │
 │ Invoice No: (auto on settle)          Terminal Invoice No: [__________]  │
 │ Invoice Date: [18/09/2026]                                               │
 ├──────────────────────┬──────────┬────────────┬────────────┬─────────────┤
 │ Service              │ Charge   │ Doctor Fee │ Clinic Fee │             │
 ├──────────────────────┼──────────┼────────────┼────────────┼─────────────┤
 │ Extraction (40%)     │  300.00  │  120.00    │  180.00    │ [✎] [✕]     │
 │ Whitening (20%)      │  500.00  │  100.00    │  400.00    │ [✎] [✕]     │
 ├──────────────────────┴──────────┴────────────┴────────────┴─────────────┤
 │ Charge [______] Service [ Select ▾ ]  [+ Add service]                    │
 ├──────────────────────────────────────────────────────────────────────────┤
 │ Other Charges                                                            │
 │ [ Medication         ] [  50.00 ] [✕]                                    │
 │ [+ Add charge]                                                           │
 ├──────────────────────────────────────────────────────────────────────────┤
 │ Payment Method                                                           │
 │ (•) Cash 0%  ( ) Online 0%  ( ) Debit Card 0.5%  ( ) Credit Card 1.2%    │
 │ ( ) Mastercard 2.5%                         ◀ loaded from payment_methods│
 ├──────────────────────────────────────────────────────────────────────────┤
 │ FINAL SUMMARY                                                            │
 │   Total Clinic Fee ............................ RM 580.00                │
 │   Total Doctor Fee ............................ RM 220.00                │
 │   Additional Charges .......................... RM  50.00                │
 │   Subtotal .................................... RM 850.00                │
 │   Payment Fee ................................. - RM  0.00               │
 │   GRAND TOTAL ................................. RM 850.00                │
 ├──────────────────────────────────────────────────────────────────────────┤
 │        [ 💾 Save & Settle ]   [ 🖨 Print ]   [ ↺ Reset to dentist lines ]│
 └──────────────────────────────────────────────────────────────────────────┘
```

Worked example with a card: same bill, **Credit Card 1.2%** → payment fee = 850.00 × 1.2% = 10.20 → **GRAND TOTAL = 839.80** (amount the clinic nets).

### 14.3 Calculation (ported exactly)

```
 for each SERVICE line:
     doctor_fee = round(amount × doctor_fee_percentage / 100, 2)
     clinic_fee = amount − doctor_fee

 total_clinic_fee = Σ clinic_fee (SERVICE lines)
 total_doctor_fee = Σ doctor_fee (SERVICE lines)
 other_charges    = Σ amount     (OTHER lines — no doctor split)
 subtotal         = total_clinic_fee + total_doctor_fee + other_charges
 payment_fee      = round(subtotal × payment_fee_percentage / 100, 2)
 grand_total      = subtotal − payment_fee
```

**Rules**
- Calculation lives in **one** backend service (`BillCalculator`) — the Vue composable `useBillSettlement.js` mirrors it for live preview, but the **server recomputes and is authoritative** on save (never trust client totals — the old app posted totals from hidden inputs).
- `doctor_fee_percentage` and `payment_fee_percentage` are **snapshotted** onto `bill_items` / `payments`, so later changes in Treatment Management or Setting never alter old bills.
- Settling in one DB transaction: lock invoice sequence → assign invoice no. → save payment → mark bill SETTLED → write stock OUT movements for treatment consumables → audit log.
- Receipt layout copied from the current receipt (clinic header, invoice + terminal invoice, patient, itemised services with doctor/clinic split hidden or shown per Setting, other charges, payment method, fee, grand total).

### 14.4 Why cashier is the main integration point

```
 Dentist Receipt Calculator features          →  lands in
 ──────────────────────────────────────────      ─────────────────────────────────────
 Charge calculator + summary                   →  Cashier ▸ Patient Management (Bill Settlement)
 Receipt management (list/edit/print)          →  Cashier ▸ Patient Management (Settled tab)
 Payment fee settings                          →  Admin ▸ Setting ▸ Payment Methods
 Dental services + %                           →  Admin ▸ Treatment Management
 Patients                                      →  Admin ▸ Patient Database
 Dashboard revenue cards + service bar chart   →  Admin/Cashier ▸ Main & Analysis
 Excel export / export-all                     →  Admin ▸ Report
```

---

## 15. Data Model

### 15.1 ER overview

```
 users ─1:1─ dentists ─1:N─ dentist_working_hours
   │            │    └─1:N─ dentist_leaves
   │            │
 leads ─1:N─ lead_activities          leads.converted_patient_id ──▶ patients
   │
   └──(optional)──▶ appointments
                         │
 patients ─1:N─ appointments ─N:1─ dentists
    │               │
    │               └─1:1─ treatment_records ─1:N─ treatment_record_items ─N:1─ treatments
    │                           │                                                 │
    │                           └─1:N─ attachments                                ├─N:1─ treatment_categories
    │                                                                              └─1:N─ treatment_consumables ─N:1─ inventory_items
    │
    └─1:N─ bills ─1:N─ bill_items (SERVICE | OTHER)
             │  └─(opt) treatment_record_id
             └─1:N─ payments ─N:1─ payment_methods

 packages ─1:N─ package_items ─N:1─ treatments
 inventory_items ─N:1─ inventory_categories
 inventory_items ─1:N─ stock_movements ─(opt)─▶ suppliers / bills
 invoice_sequences · settings · audit_logs · promotions · testimonials · faqs · whatsapp_* (reserved)
```

### 15.2 Tables (key columns)

All tables: `id BIGINT PK AUTO_INCREMENT`, `created_at`, `updated_at`; money `DECIMAL(12,2)`; charset `utf8mb4`.

| Table | Key columns / constraints |
|-------|---------------------------|
| `users` | username UNIQUE, password_hash, full_name, email, phone, role ENUM(ADMIN, MARKETING, DENTIST, CASHIER, PATIENT), is_active, last_login_at |
| `dentists` | user_id UNIQUE FK, display_name, specialty, photo_url, calendar_color, show_on_landing, is_active |
| `dentist_working_hours` | dentist_id, day_of_week (1-7), start_time, end_time, break_start, break_end · UNIQUE(dentist_id, day_of_week) |
| `dentist_leaves` | dentist_id, start_date, end_date, reason |
| `patients` | patient_code UNIQUE (P-000123), user_id (nullable, for portal login), full_name, phone UNIQUE (normalised +60…), ic_number UNIQUE nullable, email, gender, date_of_birth, address, allergies, medical_notes, source, is_archived, merged_into_id |
| `leads` | full_name, phone, email, source ENUM(WEBSITE, WALK_IN, FACEBOOK, INSTAGRAM, TIKTOK, REFERRAL, COLD_LIST, OTHER), interest, status ENUM(NEW, CONTACTED, INTERESTED, BOOKED, CONVERTED, LOST), lost_reason, assigned_to (user), next_follow_up_at, attempt_count, converted_patient_id |
| `lead_activities` | lead_id, user_id, type ENUM(CALL, WHATSAPP, NOTE, STATUS_CHANGE), outcome ENUM(ANSWERED, NO_ANSWER, BUSY, WRONG_NUMBER, CALL_BACK), notes, occurred_at |
| `appointments` | patient_id, dentist_id, lead_id (nullable), treatment_id / package_id (nullable, intent), start_at, end_at, status ENUM(PENDING, CONFIRMED, CHECKED_IN, IN_TREATMENT, COMPLETED, CANCELLED, NO_SHOW), source ENUM(WEBSITE, STAFF, PATIENT_PORTAL), notes, cancel_reason, created_by |
| `treatment_categories` | name UNIQUE, sort_order |
| `treatments` | category_id, name UNIQUE, description, default_price, doctor_fee_percentage DECIMAL(5,2), duration_minutes, is_public, is_active, sort_order |
| `treatment_consumables` | treatment_id, inventory_item_id, quantity · UNIQUE(treatment_id, inventory_item_id) |
| `packages` | name, description, price, valid_from, valid_to, is_public, is_active |
| `package_items` | package_id, treatment_id, quantity |
| `treatment_records` | appointment_id UNIQUE, patient_id, dentist_id, clinical_notes, next_visit_recommendation, status ENUM(DRAFT, COMPLETED), completed_at |
| `treatment_record_items` | treatment_record_id, treatment_id, tooth_numbers (e.g. "38" or "11,21"), quantity, notes |
| `attachments` | treatment_record_id / patient_id, file_name, file_path, mime_type, size_bytes, uploaded_by |
| `bills` | patient_id, dentist_id (nullable), treatment_record_id (nullable, UNIQUE when set), invoice_number UNIQUE nullable (set on settle), terminal_invoice_number, invoice_date, status ENUM(DRAFT, SETTLED, VOID), total_clinic_fee, total_doctor_fee, other_charges_total, subtotal, payment_fee_amount, grand_total, void_reason, settled_by, settled_at, legacy_receipt_id (migration) |
| `bill_items` | bill_id, item_type ENUM(SERVICE, OTHER), treatment_id (nullable), description, quantity, amount, doctor_fee_percentage (snapshot), doctor_fee, clinic_fee, sort_order |
| `payment_methods` | name UNIQUE, fee_percentage DECIMAL(5,2), is_active, sort_order — seeded: Cash 0, Online 0, Debit Card 0.5, Credit Card 1.2, Mastercard 2.5 |
| `payments` | bill_id, payment_method_id, method_name (snapshot), fee_percentage (snapshot), amount, fee_amount, reference_no, paid_at, received_by |
| `invoice_sequences` | seq_date PK, last_number |
| `inventory_categories` | name UNIQUE |
| `suppliers` | name, contact_person, phone, email, address |
| `inventory_items` | category_id, sku UNIQUE, name, unit, reorder_level, cost_price, quantity_on_hand (cached, updated in same txn as movement, row-locked), is_active |
| `stock_movements` | inventory_item_id, type ENUM(IN, OUT, ADJUST), quantity (signed), unit_cost, supplier_id, bill_id, batch_no, expiry_date, reason, created_by |
| `promotions` / `testimonials` / `faqs` | landing content, is_active, sort_order, validity dates |
| `settings` | setting_key UNIQUE, setting_value (JSON/text) — clinic profile, hours, slot length, invoice prefix, whatsapp.* |
| `audit_logs` | user_id, entity_type, entity_id, action, before_json, after_json, ip_address, created_at |

---

## 16. API Overview

Base: `/api`. JSON. JWT bearer. Role checks with `@PreAuthorize`. Paginated lists: `?page=&size=&sort=&q=`.

```
 PUBLIC (no auth)
   GET  /api/public/clinic                     clinic profile + hours
   GET  /api/public/treatments                 is_public = true
   GET  /api/public/packages
   GET  /api/public/dentists
   GET  /api/public/availability?dentistId=&from=&to=        free slots only
   GET  /api/public/promotions | /testimonials | /faqs
   POST /api/public/bookings                   → lead + PENDING appointment

 AUTH
   POST /api/auth/login        POST /api/auth/refresh        GET /api/auth/me
   POST /api/auth/change-password

 ADMIN
   /api/admin/users            CRUD, reset-password, activate/deactivate
   /api/admin/dentists         profile, working-hours, leaves
   /api/admin/treatments       CRUD  · /categories · /packages · /{id}/consumables
   /api/admin/inventory/items  CRUD  · /stock-in · /adjust · /movements · /suppliers · /categories
   /api/admin/patients         CRUD  · /{id}/merge
   /api/admin/settings         GET/PUT by group · /payment-methods CRUD
   /api/admin/landing          promotions / testimonials / faqs CRUD
   /api/admin/analysis/*       chart datasets
   /api/admin/reports/{type}   ?from=&to=&format=xlsx|pdf
   /api/admin/audit-logs

 MARKETING
   /api/marketing/leads        CRUD, import CSV, assign · /{id}/activities · /{id}/book · /{id}/lost
   /api/marketing/appointments CRUD, confirm, cancel, reschedule, check-in, no-show
   /api/marketing/analysis/*

 DENTIST
   GET  /api/dentist/queue?date=
   /api/dentist/records        GET by appointment, PUT draft, POST /{id}/complete  → draft bill
   /api/dentist/patients/{id}/history
   /api/dentist/analysis/*

 CASHIER
   GET  /api/cashier/bills?status=DRAFT|SETTLED|VOID
   GET  /api/cashier/bills/{id}         PUT /api/cashier/bills/{id} (lines, charges)
   POST /api/cashier/bills              walk-in bill
   POST /api/cashier/bills/{id}/settle  → invoice no., payment, stock OUT
   POST /api/cashier/bills/{id}/preview → server-computed totals
   GET  /api/cashier/bills/{id}/receipt.pdf
   /api/cashier/analysis/*

 PATIENT
   /api/patient/appointments   list, book, cancel, reschedule
   /api/patient/history        treatment history
   /api/patient/bills          list · /{id}/receipt.pdf
   /api/patient/profile
```

---

## 17. Data Migration from `dental_system`

### 17.1 Mapping

```
 OLD dental_system                        NEW orchid_dental
 ─────────────────────────────            ──────────────────────────────────────────────────
 users (admin)              ───────────▶  users (role ADMIN; keep bcrypt hash as-is —
                                          Spring BCryptPasswordEncoder accepts PHP's $2y$ prefix)
 dental_services            ───────────▶  treatments  (name, doctor_fee_percentage = percentage,
                                          default_price = 0, category "Imported")
 patients                   ──dedupe───▶  patients    (normalise name: trim + collapse spaces +
                                          case-fold; phone NULL → flag "needs phone")
 receipts                   ───────────▶  bills       (status SETTLED, invoice_number,
                                          terminal_invoice_number, invoice_date, totals,
                                          legacy_receipt_id = old id)
                            ───────────▶  payments    (method_name = payment_method,
                                          fee % / amount from receipt; payment_method_id by name,
                                          unknown names e.g. "Union" → created inactive)
 receipt_charges ─┬─ description = a dental_services name ─▶ bill_items SERVICE
                  │      doctor_fee = amount × service% (snapshot), clinic_fee = amount − doctor_fee
                  └─ otherwise ─────────────────────────────▶ bill_items OTHER
 receipt_services           ───────────▶  (dropped — service list is derivable from SERVICE lines)
 receipts with NO receipt_charges rows  ─▶ (older receipts — per-service amounts were never stored)
                                          one SERVICE line "Legacy: <service names>" with
                                          doctor_fee / clinic_fee copied from the receipt totals as-is
```

### 17.2 Process

```
 ┌───────────────┐   ┌──────────────────┐   ┌───────────────────┐   ┌─────────────────┐
 │ 1. Backup old │──▶│ 2. Run importer  │──▶│ 3. Verify         │──▶│ 4. Cut-over     │
 │ mysqldump     │   │ (Spring profile  │   │ counts + sums     │   │ old app read-   │
 │ dental_system │   │  `migrate-legacy`│   │ report printed    │   │ only, then off  │
 └───────────────┘   │  idempotent via  │   └───────────────────┘   └─────────────────┘
                     │  legacy ids)     │
                     └──────────────────┘
```

**Verification checks (all must pass)**
- `COUNT(receipts)` old = `COUNT(bills WHERE legacy_receipt_id IS NOT NULL)` new
- `Σ total_amount` old = `Σ grand_total` new
- `Σ doctor_fee` old = `Σ total_doctor_fee` new · `Σ clinic_fee` old = `Σ total_clinic_fee` new
- Every old patient maps to exactly one new patient (merge report lists collapsed duplicates)

Importer is **idempotent** (re-run skips rows whose `legacy_receipt_id` already exists).

---

## 18. WhatsApp Business API (Placeholder)

> ⏳ **Detail to be provided by Kiyo later.** Build only the settings shell and reserved tables in early phases.

```
 Admin ▸ Setting ▸ WhatsApp
 ┌──────────────────────────────────────────────────────────────────┐
 │ Status: ○ Not connected                                          │
 │ Phone Number ID      [____________________]                      │
 │ WhatsApp Business ID [____________________]                      │
 │ Access Token         [••••••••••••••••••••]  (stored encrypted)  │
 │ Webhook Verify Token [____________________]                      │
 │ Webhook URL          https://<domain>/api/whatsapp/webhook (copy)│
 │                                   [ Save ]  [ Send test message ]│
 └──────────────────────────────────────────────────────────────────┘

 Planned uses (to confirm):
   appointment confirmation · reminder (24h / 2h before) · receipt PDF after settle ·
   lead follow-up from Marketing · patient OTP login (see §22)
```

---

## 19. Reports

| Report | Role | Filters | Content |
|--------|------|---------|---------|
| Daily Collection | Admin, Cashier | date | bills settled, by payment method, card fees, cash total |
| Revenue by Treatment | Admin | date range | count, gross, doctor fee, clinic fee |
| Revenue by Dentist | Admin | date range, dentist | bills, gross, doctor fee |
| Doctor Fee Payout | Admin | month, dentist | per-bill doctor fee lines — payout statement |
| Payment Method Fees | Admin | date range | Σ payment_fee per method |
| Patient Visit | Admin | date range | new vs returning, visits |
| Appointment | Admin, Marketing | date range, dentist | booked, completed, cancelled, no-show |
| Lead Conversion | Admin, Marketing | date range, source, staff | funnel, conversion rate, lost reasons |
| Inventory Valuation | Admin | as of date | on hand × cost |
| Low Stock / Expiry | Admin | — | items ≤ reorder, batches expiring in 30/60/90 days |
| Stock Movement | Admin | date range, item | IN / OUT / ADJUST ledger |

Export: **Excel (.xlsx)** and **PDF**. Carries forward the old `export-excel.php` / `export-all.php` columns for the collection report.

---

## 20. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Security | BCrypt passwords · JWT (short access + refresh) · role guard on every endpoint · rate-limit login and public booking · server-side validation on all input · CORS locked to frontend origin |
| Privacy (PDPA) | Patient data only to roles that need it · IC number masked in lists · public calendar shows availability only · attachments served through authenticated endpoint, not public URL |
| Audit | Every create/update/void on bills, payments, treatments, prices, payment methods, users → `audit_logs` with before/after |
| Integrity | Money in BigDecimal · server recomputes totals · locks on invoice sequence, appointment slots, stock · FK constraints · soft delete (is_active / archived) for master data |
| Performance | Paginated lists · indexes on phone, patient_code, invoice_number, start_at, status · no N+1 (fetch joins / projections for lists) |
| Responsive | Mobile-first landing; dashboards usable on tablet (cashier counter) and phone |
| Backup | Daily MySQL dump, retained 30 days; uploaded files backed up with DB |
| Timezone | `Asia/Kuala_Lumpur` everywhere (same as old `config.php`) |
| i18n | UI labels English first; structure ready for Malay labels |

---

## 21. Build Phases

```
 P1 ──▶ P2 ──▶ P3 ──▶ P4 ──▶ P5 ──▶ P6 ──▶ P7 ──▶ P8 ──▶ P9 ──▶ P10
```

| Phase | Scope | Done when |
|-------|-------|-----------|
| **P1 Foundation** | Repo scaffold, Flyway V1, auth/JWT, roles, DashboardLayout + sidebar per role, theme tokens, Setting shell, audit log | Each role logs in and lands on its empty dashboard |
| **P2 Master data** | Users + dentist profiles/hours/leave, patients (unique phone, code, merge), treatments/categories/packages, payment methods | Admin manages all master data |
| **P3 Schedule + Landing** | Availability engine, appointments + state machine + locking, Marketing Schedule Management, public landing pages + /book | Visitor books online, Marketing confirms, no double-booking |
| **P4 Dentist + Cashier** | Treatment records + tooth chart + attachments, draft bill creation, **Bill Settlement (ported calculator)**, invoice sequence, receipt print/PDF | Full visit → settled receipt, totals match old formula |
| **P5 Inventory** | Items, suppliers, stock in/adjust, ledger, consumables deduction on settle, low-stock alerts | Settling a bill deducts stock |
| **P6 Marketing leads** | Lead pipeline kanban/table, call log, follow-ups, CSV import, auto-convert | Lead → booked → converted tracked end-to-end |
| **P7 Patient portal** | Patient login, appointments, history, bills & receipts | Patient self-serves |
| **P8 Reports & Analysis** | All Main/Analysis widgets, reports §19, Excel/PDF | Every report exports |
| **P9 Migration + cut-over** | `migrate-legacy` importer + verification report | All checks in §17.2 pass on production copy |
| **P10 WhatsApp** | Per Kiyo's detailed spec | TBD |

---

## 22. Open Questions

| # | Question | Default until answered |
|---|----------|------------------------|
| 1 | WhatsApp Business API — full scope and flows | Settings shell only (§18) |
| 2 | Patient login: phone + password, or WhatsApp OTP? | Phone + password |
| 3 | SST / tax on bills? | No tax line |
| 4 | Package pricing: fixed package price split across treatments how (for doctor fee)? | Split proportionally by treatment default price |
| 5 | Doctor fee payout cycle (monthly? per settlement?) | Monthly report only, no payout module |
| 6 | Online payment (deposit) when booking on landing page? | No online payment |
| 7 | Deposits / partial payments / instalments on bills? | Single full payment per bill (table supports many) |
| 8 | Should the receipt show doctor/clinic split to the patient? | Hidden on patient receipt, shown on internal copy |
| 9 | Front-desk check-in — Marketing role, or a separate RECEPTION role? | Marketing + Admin can check in |
| 10 | Domain / hosting target | TBD |
| 11 | Existing old "Union" payment method still used? | Imported as inactive |

---

*Orchid Dental Care — Design Document v1.0 · prepared from inspection of the Dentist Receipt Calculator repository (`modules/financial.php`, `assets/js/financial.js`, `database/dentist-system.sql`, `assets/css/style.css`).*
