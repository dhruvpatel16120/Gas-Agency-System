# User Dashboard & Booking System Documentation

Welcome to the documentation for the User Dashboard and Gas Cylinder Booking System.  
This guide provides an overview of the available features, usage instructions, and technical details for developers and users.

This document covers the architecture, data model, features, API surface area, and developer workflows for the Gas Agency System. It’s intended for engineers working on the app or operating it in production.

### Contents
- Overview and Tech Stack
- Local Setup and Environment
- Database Model (Prisma)
- Core Business Domains
  - Bookings and Payments
  - Inventory Management
  - Delivery Partners and Assignments
  - Users and Admins
  - Contact Management
- User Dashboard
- Admin Dashboard
- API Architecture and Endpoints
- Authentication and Authorization
- Email System
- Libraries and Utilities
- Error Handling and Security
- Testing and Quality
- Deployment Notes

---

#### Create build (fix: "Could not find a production build in the '.next' directory")

If you see this error when starting the server, it means the production build hasn't been created yet. Run:

```bash
npm run build && npm start
```

Notes:
- Ensure your environment variables (e.g., `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`) are set.
- The build script already runs `prisma generate`. Make sure your database is reachable in production.
- Re-run `npm run build` after dependency or code changes before `npm start`.
  
## Overview and Tech Stack

- Framework: Next.js App Router (TypeScript)
- ORM: Prisma (PostgreSQL)
- Auth: NextAuth (credentials + OAuth capable)
- Styling: Tailwind (through global CSS/utility classes in components)
- Email: SMTP (via `lib/email`)
- Payments: UPI (mock/gateway-like flow with admin review)
- Charts/Analytics UI: Rendered with custom React components (no external charting lib currently)

Repository structure highlights:
- `src/app` – All application routes (user/admin/api)
- `src/lib` – Auth, DB, email, security, validation, middleware
- `src/components` – UI and shared components
- `prisma` – Schema and migrations

---

## Local Setup and Environment

1) Install dependencies:

```bash
npm install
```

2) Configure environment:

Create `.env` with keys such as:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-strong-secret

# SMTP for email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-pass
SMTP_FROM="Gas Agency <no-reply@gasagency.com>"

# UPI config (admin collection ID)
ADMIN_UPI_ID=merchant@upi
```

3) Apply database migrations and generate Prisma client:

```bash
npx prisma migrate deploy
npx prisma generate
```

4) Start dev server:

```bash
npm run dev
```

Linting and type checks:

```bash
npm run lint
npx tsc --noEmit
```

---

## Database Model (Prisma)

Models (selected fields):

- `User`
  - `id`, `email`, `name`, `userId`, `phone`, `address`, `role (USER|ADMIN)`
  - `remainingQuota`, `emailVerified`, `resetToken`, `emailVerificationToken`
  - Relations: `bookings`, `accounts`, `sessions`, contact messages/replies

- `Booking`
  - `id`, `userId`, `userName`, `userEmail`, `userPhone`, `userAddress`
  - `paymentMethod (COD|UPI)`, `quantity`, `status (PENDING|APPROVED|OUT_FOR_DELIVERY|DELIVERED|CANCELLED)`
  - `requestedAt`, `deliveryDate`, `expectedDate`, `deliveredAt`
  - Relations: `events`, `payments`, `reservation`, `assignment`, `adjustments`

- `BookingEvent`
  - Timeline of status changes and notable actions for each booking

- `Payment`
  - `id`, `bookingId`, `amount` (INR), `method (COD|UPI)`
  - `status (PENDING|SUCCESS|FAILED|CANCELLED)`, `upiTxnId`

- `CylinderStock`
  - Singleton `id = "default"`, `totalAvailable`
  - Relations: `adjustments`, `reservations`

- `StockAdjustment`
  - `delta`, `type (RECEIVE|ISSUE|DAMAGE|AUDIT|CORRECTION)`, `reason`, `notes`
  - Optional links: `bookingId`, `batchId`

- `CylinderBatch`
  - Supplier intakes. Fields: `supplier`, `invoiceNo`, `quantity`, `receivedAt`, `status (ACTIVE|DEPLETED|EXPIRED)`

- `DeliveryPartner`
  - `name`, `phone`, `email?`, `vehicleNumber?`, `serviceArea?`, `isActive`

- `DeliveryAssignment`
  - `bookingId`, `partnerId`, `status (ASSIGNED|PICKED_UP|OUT_FOR_DELIVERY|DELIVERED|FAILED)`
  - `scheduledDate?`, `scheduledTime?`, `priority`, `notes`

- `ContactMessage` / `ContactReply`
  - Simple support/ticketing between users and admins.

See full schema in `prisma/schema.prisma`.

---

## Core Business Domains

### Bookings and Payments
- A `Booking` is created by the admin or a user (user flow depends on application settings).
- Each booking has a payment method: `COD` or `UPI`.
- UPI flow: User submits a UPI transaction ID; an admin reviews and marks the latest payment `SUCCESS` or `FAILED`.
- Events (`BookingEvent`) are recorded on updates (approval, out for delivery, delivered, cancellation, payment review, etc.).

### Inventory Management
- Central stock (`CylinderStock`) increases with `CylinderBatch` receipts and decreases with `ISSUE` adjustments.
- Adjustments are logged as `StockAdjustment` records.
- Admin can add/edit/delete batches and adjust stock via API/console.

### Delivery Partners and Assignments
- Admin can create and manage `DeliveryPartner` records (name, phone, service area, activity status).
- Bookings can be assigned to a partner (`DeliveryAssignment`) once approved.
- Status transitions in assignments update booking status and create events.

### Users and Admins
- Roles: `USER`, `ADMIN`.
- Admins manage users (create, edit, stats) and bookings, inventory, deliveries, settings.
- Users manage profile, bookings, and repayment flows for failed UPI.

### Contact Management
- Users can submit messages; admins can reply.
- Stats API aggregates counts and trends.

---

## User Dashboard

Key pages under `src/app/user`:
- `page.tsx` – Landing dashboard
- `book/` – Book a cylinder
- `bookings/` – History and details
- `track/[id]/` – Booking tracking timeline and delivery progress
- `pay/upi/` – Initial UPI payment flow
- `repay/[id]/` – Retry UPI payment with new transaction ID
- `profile/` – Profile summary and edit screen
- `contact/` – Contact/support form

Highlights:
- Clear status chips (`PENDING`, `APPROVED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`).
- Booking timeline shows key milestones + synthesized events when none exist.
- UPI repay page validates UPI transaction format prior to submission.

---

## Admin Dashboard

Key pages under `src/app/admin`:
- `page.tsx` – Admin landing (KPIs)
- `bookings/` – List, review payments, analytics, export, and bulk actions
- `deliveries/` – Active, analytics, partners CRUD, assignments, stats
- `inventory/` – Batches list, new/edit batches, stock adjustments
- `users/` – Users CRUD and stats
- `contacts/` – Manage contact messages and replies
- `settings/` – System settings (API available, page placeholder)

Highlights:
- Delivery analytics and exports (time series, partner and area performance, trends).
- Payment review flows for UPI with event logging and optional customer emails.
- Bulk actions for approving, assigning deliveries, and cancelling.

---

## API Architecture and Endpoints

All APIs are under `src/app/api`. The `withMiddleware` wrapper enforces:
- Auth (requireAuth, requireAdmin)
- Content-Type checks
- Optional CSRF/rate limiting presets

Selected endpoint groups:

- Auth: `api/auth/*` (NextAuth handlers)
- Settings: `api/settings/`
- Users (Admin): `api/admin/users` (+ `.../stats`, `.../[id]`, `.../[id]/action`)
- Bookings (Admin): `api/admin/bookings` (+ `analytics`, `stats`, `review-payments`, `bulk-action`)
- Deliveries (Admin): `api/admin/deliveries` (+ `analytics`, `partners`, `assignments`, `active`, `recent`, `stats`)
- Inventory (Admin): `api/admin/inventory` (+ `batches`, `adjustments`, `analytics`)
- Public User APIs: `api/bookings`, `api/bookings/track/[id]`, `api/user/profile`, `api/payments/upi/*`, `api/contact`

Conventions:
- Success responses use `{ success: true, data, message? }` via `successResponse`.
- Errors use `errorResponse` or centralized `handleAPIError`.
- Most handlers accept query parameters for pagination, sorting, and filters.

---

## Authentication and Authorization

- Session managed by NextAuth (`src/lib/auth.ts`).
- `withMiddleware` can enforce:
  - `requireAuth: true` (must be logged in)
  - `requireAdmin: true` (must be ADMIN)
  - `validateContentType` for POST/PUT/PATCH
  - Optional CSRF/token validation for state-changing operations

---

## Email System

`src/lib/email.ts` provides helpers to send emails via SMTP and feature-specific templates:
- Verification
- Password reset
- Booking approval/delivery status
- Payment confirmation/issue for UPI

Debug endpoint (`api/debug/email`) verifies SMTP envs and attempts a connection.

Environment keys:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Optionally `EMAIL_SERVER_*` if using NextAuth email provider

---

## Libraries and Utilities

- `lib/db.ts` – Prisma client singleton
- `lib/api-middleware.ts` – Middleware, response helpers, CORS/security headers
- `lib/security.ts` – CSRF helpers, IP detection, rate limiting
- `lib/validation.ts` / `lib/input-validation.ts` – zod schemas and helpers
- `lib/utils.ts` – UI/status helpers and formatting
- `lib/error-handler.ts` – Consistent API error handling and typed errors

---

## Error Handling and Security

- Central `handleAPIError` returns structured JSON with status codes.
- Rate limiting and CSRF configurable per route via `withMiddleware` options.
- Response headers (CSP, HSTS in prod, X-Frame-Options, etc.) added by `addSecurityHeaders`.

---

## Testing and Quality

- Linting: `npm run lint` (Next.js + ESLint + TypeScript rules)
- Type-check: `npx tsc --noEmit`
- Recommended: add CI steps to run both on every PR.

Manual testing checklist (high-value):
- Booking creation → stock reservation (optional) → event logs
- UPI payment submit → admin review confirm/reject → emails
- Delivery assignment → status progression → invoice PDF
- Inventory batch adds/edits → stock adjustments → analytics
- User profile load/edit, dashboard stats

---

## Deployment Notes

- Ensure `DATABASE_URL`, `NEXTAUTH_*`, SMTP, and `ADMIN_UPI_ID` are configured.
- Run `prisma migrate deploy` on release initialization.
- Serve over HTTPS (CSP/HSTS improvements activate in production mode).
- Scale considerations:
  - Add background queue for email dispatch in high volume scenarios.
  - Offload PDF generation to a worker if needed.
  - Use CDN for static assets.

---

## Appendix – Frequently Used Admin Flows

- Approve UPI bookings with successful payment only (guard rails in API ensure pending/failed UPI cannot be approved).
- Assign delivery partner only for `APPROVED` bookings (and not already assigned).
- Mark delivery statuses in sequence (`ASSIGNED` → `PICKED_UP` → `OUT_FOR_DELIVERY` → `DELIVERED`).
- Cancelling bookings:
  - Updates booking status to `CANCELLED`
  - Cancels non-success payments
  - Restores user quota
  - Adds reason to booking notes

---
