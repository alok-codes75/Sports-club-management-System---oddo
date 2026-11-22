# Udaan Sports Club — Chandigarh Sports Club Management Platform

A full-stack sports club web application and enterprise operations suite for **Udaan Sports Club Pvt. Ltd. (Sector 34, Chandigarh, Punjab)** built with **React, TypeScript, Tailwind CSS, and Firebase (Auth + Cloud Firestore)**. It unifies public court scheduling, member self-service, front desk bookings, a shared pro-gear shop, clubhouse bar POS & kitchen tickets, and owner finance/HR payroll reporting in **INR (`₹`)** with **UPI, Card, and Cash** support.

---

## Local Setup (VS Code on Windows, macOS & Linux)

### Prerequisites
- **Node.js 20+** (LTS recommended) — check with `node -v` and `npm -v`
- **Visual Studio Code**

### Quick Start
1. Extract the project ZIP into a local folder and open it in **VS Code** (`File → Open Folder`).
2. Install the recommended VS Code extensions when prompted (Tailwind CSS IntelliSense, ESLint, Prettier, Firestore syntax highlighting).
3. Open the integrated terminal (`Ctrl + \`` on Windows/Linux or `Cmd + \`` on macOS) and run:

```bash
npm install
npm run dev
```

4. Open **`http://localhost:3000`** in your browser.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts Vite dev server at `http://localhost:3000` |
| `npm run lint` | Runs strict TypeScript type-checking (`tsc --noEmit`) |
| `npm run build` | Builds the production bundle into `dist/` |
| `npm run preview` | Previews the production build locally at `http://localhost:4173` |
| `npm run rules:lint` | Audits `firestore.rules` with `@firebase/eslint-plugin-security-rules` |
| `npm run clean` | Cross-platform cleanup of `dist/` |

### Firebase Setup & Troubleshooting on Local PC
1. **Always open `http://localhost:3000`** (not `http://127.0.0.1:3000` or your `192.168.x.x` LAN IP), and verify `localhost` is listed under **Firebase Console → Authentication → Settings → Authorized domains**.
2. **Enable Email/Password Auth**: In **Firebase Console → Authentication → Sign-in method**, enable both **Google** and **Email/Password**.
3. **API Key / Referrer Blocked (`requests-from-referer`)**: If Google Cloud restricts the pre-configured API key to cloud preview URLs, either add `http://localhost:3000/*` under **Google Cloud Console → APIs & Services → Credentials**, or create your own free Firebase project:
   - Create a Web App in Firebase Console and paste its config into `firebase-applet-config.json` (set `"firestoreDatabaseId": "(default)"`).
   - Enable **Cloud Firestore**, **Google Sign-In**, and **Email/Password** in that project.
   - Copy `firestore.rules` into **Firestore Database → Rules** and click **Publish**.
4. **Windows PowerShell policy error (`npm.ps1 cannot be loaded`)**: Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use Command Prompt / Git Bash in VS Code.
5. **Port 3000 busy**: Run `npx vite --port=3001`.

---

## Folder Structure

```text
udaan-sports-club/
├── .vscode/                             # Editor settings & recommended extensions
├── docs/
│   ├── project-requirements.pdf         # Original club problem statement & specifications
│   └── security_spec.md                 # Firestore security invariants & blocked test cases
├── public/
│   └── images/                          # Static sports & clubhouse photography (/images/*)
│       ├── hero-champions-club.jpg
│       ├── tennis-cricket.jpg
│       ├── padel-badminton.jpg
│       ├── pro-gear-shop.jpg
│       └── clubhouse-bar.jpg
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   └── ErrorBoundary.tsx        # React & Firestore error boundary
│   │   └── public/                      # Landing page section components
│   │       ├── EnquiryFormSection.tsx
│   │       ├── FacilitiesShowcase.tsx
│   │       ├── LiveCourtsSection.tsx
│   │       └── PlansAndShopSection.tsx
│   ├── config/
│   │   └── clubImages.ts                # Static /images/* path registry
│   ├── contexts/
│   │   └── AuthContext.tsx              # Email/Password + Google auth, profile sync & role preview
│   ├── modules/                         # Operational feature views
│   │   ├── admin/RoleAccessView.tsx     # Owner RBAC user role assignment
│   │   ├── bar/BarPosView.tsx           # Bar POS, open member tabs, kitchen queue & shifts
│   │   ├── bookings/CourtBookingView.tsx# 30-min staggered court bookings & Friday Social Play
│   │   ├── crm/LeadCrmView.tsx          # Visitor trials, quotes & 1-click member conversion
│   │   ├── finance/OwnerFinanceHrView.tsx# Ledger, GST invoices, payroll, leave & CSV/Print
│   │   ├── members/MembersDirectoryView.tsx # Member directory, renewals & Junior <18 checks
│   │   └── shop/GearShopView.tsx        # Unified counter POS & online gear storefront
│   ├── pages/                           # Top-level application portals
│   │   ├── PublicWebsite.tsx            # Public club site & live court availability
│   │   ├── MemberAuthPage.tsx           # Member Sign In & New Member Registration form
│   │   ├── StaffLoginPage.tsx           # Staff & Admin RBAC login portal
│   │   ├── MemberDashboard.tsx          # Player portal (card, bookings, shop, history)
│   │   └── AdminWorkspace.tsx           # Role-scoped operations workspace
│   ├── services/                        # Firestore SDK & transactional domain services
│   │   ├── firebase.ts                  # Firebase initialization & structured error helper
│   │   ├── bookingService.ts            # Atomic slot locks, daily caps & social play joins
│   │   ├── shopService.ts               # Shared-shelf stock deduction & GST receipts
│   │   ├── barService.ts                # Bar orders, member tabs & shift totals
│   │   ├── memberService.ts             # Member enrollment & CRM conversion
│   │   ├── invoiceService.ts            # Invoice payment settlement
│   │   ├── clubServices.ts              # Barrel re-export of domain services
│   │   └── seedData.ts                  # One-click sample club data initializer
│   ├── types/
│   │   └── club.ts                      # Domain models, labels & tier definitions
│   ├── utils/
│   │   └── clubHelpers.ts               # Currency, date, slot-overlap & pricing helpers
│   ├── App.tsx                          # Multi-portal router
│   ├── index.css                        # Tailwind CSS v4 styles & typography
│   └── main.tsx                         # Application bootstrap
├── firestore.rules                      # Firestore role-based security rules
├── firestore.rules.test.ts              # Security test case definitions
├── eslint.config.js                     # ESLint config for Firestore rules auditing
├── index.html                           # HTML entry & Google Fonts
├── package.json                         # Scripts & dependencies
├── tsconfig.json                        # TypeScript config
└── vite.config.ts                       # Vite configuration
```

---

## Core Features

### Public Website & Portals
- **Live Weekly Court Schedule**: Displays open, booked, and Friday Social Play slots across 8 courts (Tennis, Box Cricket, Padel, Badminton) without exposing member PII.
- **Member Sign Up & Sign In (`MemberAuthPage`)**: Supports Email/Password registration (with optional instant Gold, Silver, or Junior `<18` activation), password reset, and Google Sign-In.
- **Admin & Staff Login (`StaffLoginPage`)**: Verifies staff roles (`owner`, `front_desk`, `bar_staff`) against Firestore before granting console access.

### Operations Modules
- **Court Bookings & Friday Social Play**: 1-hour slots opening every 30 minutes (`06:00–21:00`), atomic Firestore `slotLocks` to block overlapping bookings, max 2 sessions/day per member, and multi-player Friday Social Play enrollment.
- **Member Directory**: Instant lookup, expiry tracking (`Active`, `Expiring Soon`, `Expired`), 30-day renewals, Junior `<18` date-of-birth checks, and automatic tier discounts (Gold `₹4,999/mo`, Silver `₹2,499/mo`, Junior `₹1,499/mo`).
- **Unified Gear Shop**: Counter POS and Member Online Storefront deduct from the same live `products` collection with automatic tier discounts, GST calculation, low-stock alerts, restocking, and Click & Collect / Home Delivery tracking.
- **Clubhouse Bar POS & Kitchen Display**: Table ordering, automatic member discounts, open tabs with UPI/Card/Cash settlement, Kitchen Display status progression (`Queued → Preparing → Ready → Served`), and shift cash reconciliation.
- **Owner Finance, GST Invoicing & HR**: Today / Week / Month revenue by stream and payment mode, GST summary, CSV export & print report, corporate/member GST invoicing, staff shift roster, monthly payroll runs, and leave approvals.
