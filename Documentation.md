# 📚 Gas Agency System - Technical Documentation

> Comprehensive technical documentation for the Gas Agency System full-stack platform.

## 📋 Table of Contents

1. [System Overview](#-system-overview)
2. [Architecture](#-architecture)
3. [Installation &amp; Setup Guide](#-installation--setup-guide)
4. [Authentication System](#-authentication-system)
5. [Database Schema](#-database-schema)
6. [API Reference](#-api-reference)
7. [Security Implementation](#-security-implementation)
8. [Deployment Guide](#-deployment-guide)
9. [Troubleshooting](#-troubleshooting)
10. [Performance Optimization](#-performance-optimization)
11. [Testing Strategy](#-testing-strategy)
12. [Contributing Guidelines](#-contributing-guidelines)

---

## 🏗️ System Overview

The **Gas Agency System** is a modern full-stack web application designed to streamline gas cylinder bookings, payment validation, quota allocations, inventory auditing, and delivery operations. It provides role-based workspaces for **Customers (Users)** and **Administrators (Admins)**.

### Key Functional Domains

- **User Dashboard & Bookings**: Order cylinders, trace delivery timeline, submit payment confirmations.
- **Quota Control**: Limits users to 12 cylinder bookings per calendar year.
- **Admin Dashboard**: Real-time business analytics, user lists, support ticketing, settings.
- **Inventory Control**: Live stock counts, adjustments logging, intake batch supplier invoicing.
- **Delivery Workflow**: Active assignment to service area partners and multi-step delivery status tracking.

---

## 🏛️ Architecture

### Application Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
├─────────────────────────────────────────────────────────────┤
│  React Components, Next.js Pages (src/app), Framer Motion  │
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Next.js Server Actions & API Handlers, Zod Validation      │
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Prisma ORM, PostgreSQL Databases, NextAuth Session Context │
└─────────────────────────────────────────────────────────────┘
```

### Technology Matrix

- **Core Framework**: Next.js 15 (App Router, TypeScript)
- **Database Engine**: PostgreSQL (Local/Supabase/Railway/Neon)
- **Database ORM**: Prisma Client 6.14.0
- **Auth Provider**: NextAuth.js (Session-based, Credentials flow)
- **Notification Engine**: SMTP (Nodemailer)
- **Invoice Engine**: Puppeteer PDF generator

---

## 🚀 Installation & Setup Guide

### System Prerequisites

Ensure the following are installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher) or **yarn**
- **Git**
- **PostgreSQL Database** (supported types below)

### Step-by-Step Installation

#### 1. Clone the Codebase

```bash
git clone https://github.com/dhruvpatel16120/Gas-Agency-System.git
cd Gas-Agency-System
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Database Selection & Connection Parameters

Prisma requires two variables in a pooled cloud database environment to function correctly:

- `DATABASE_URL`: Transaction-based pooled connection (e.g. port 6543) for application queries.
- `DIRECT_URL`: Unpooled direct connection (e.g. port 5432) to execute database migrations (DDL commands) without `prepared statement "s1" already exists` errors.

Choose your connection setup:

##### Option A: Local PC PostgreSQL

1. Ensure PostgreSQL is installed locally and started.
2. Create a database called `gas_agency`.
3. Configure your `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/gas_agency?schema=public"
   DIRECT_URL="postgresql://postgres:yourpassword@localhost:5432/gas_agency?schema=public"
   ```

##### Option B: Supabase PostgreSQL

1. Create a Supabase Project.
2. Navigate to **Project Settings** → **Database**.
3. Under **Connection Pooler**, copy the **Transaction Mode** URI (port `6543`) for `DATABASE_URL`. Ensure it includes `?pgbouncer=true`.
4. Copy the **Session Mode** URI or direct connection URI (port `5432`) for `DIRECT_URL`.
   ```env
   DATABASE_URL="postgresql://postgres.yourprojectref:yourpassword@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.yourprojectref:yourpassword@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
   ```

##### Option C: Railway PostgreSQL

1. Launch a PostgreSQL instance in Railway.
2. Copy the **`DATABASE_PUBLIC_URL`** from your PostgreSQL variables.
3. Configure your `.env` (since Railway doesn't enforce transaction pooling by default, you can point both to the same URL unless using a PgBouncer plugin):
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@host:port/railway"
   DIRECT_URL="postgresql://postgres:yourpassword@host:port/railway"
   ```

##### Option D: Neon Serverless PostgreSQL

1. Create a Neon Project.
2. In the Neon dashboard, configure connection details.
3. Copy the **Pooled Connection** string for `DATABASE_URL`.
4. Copy the **Unpooled Connection** string (check "Use pooled connection" off) for `DIRECT_URL`.
   ```env
   DATABASE_URL="postgresql://user:password@ep-pooled-instance.aws.neon.tech/neondb?sslmode=require"
   DIRECT_URL="postgresql://user:password@ep-direct-instance.aws.neon.tech/neondb?sslmode=require"
   ```

#### 4. Run Interactive Setup CLI

Configure all local parameters easily:

```bash
npm run setup
```

Follow the steps to configure emails (SMTP Gmail App Passwords), Auth URLs, and your database connection strings.

#### 5. Provision the Database & Client

Launch the interactive database setup CLI to push the schema, generate Prisma Client, and seed the default data:

```bash
npm run setup:db
```

Inside the CLI, run:

1. **Option 1**: Generate Prisma Client.
2. **Option 2** or **Option 3**: Run database setup/migrations.
3. **Option 5**: Run database seed.

#### 6. Create Initial Admin Credentials

Run the admin operations tool to create your first administrative user:

```bash
npm run admin
```

Select **Create or Update Admin User** from the menu and fill in the credentials.

#### 7. Launch Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to verify.

---

## 🔐 Authentication System

The application uses **NextAuth.js v4** with the Credentials authentication strategy and Prisma adapter:

- **Authentication Flow**: Users log in via email and password. NextAuth generates a secure session cookie.
- **Permissions Middleware**: Handled inside `src/middleware.ts` and the `withMiddleware` API wrapper. Ensures users cannot query administrative folders `/admin/*` or endpoint routes `/api/admin/*`.
- **Password Hashing**: `bcryptjs` (salt rounds: 12) secures passwords before database storage.
- **Verification Tokens**: Generated securely via crypto utils to verify emails and reset credentials.

---

## 🗄️ Database Schema

Here is a breakdown of the primary database entities defined in `prisma/schema.prisma`:

### Model Relationships

```mermaid
erDiagram
    users ||--o{ bookings : "places"
    users ||--o{ accounts : "contains"
    users ||--o{ sessions : "has"
    users ||--o{ contact_messages : "submits"
    users ||--o{ contact_replies : "replies"

    bookings ||--o{ payments : "paid_by"
    bookings ||--o{ booking_events : "logs"
    bookings ||--o| stock_reservations : "reserves"
    bookings ||--o| delivery_assignments : "assigns"
    bookings ||--o{ stock_adjustments : "adjusts"

    cylinder_stock ||--o{ stock_adjustments : "tracks"
    cylinder_stock ||--o{ stock_reservations : "holds"

    cylinder_batches ||--o{ stock_adjustments : "creates"
    delivery_partners ||--o{ delivery_assignments : "assigned_to"
```

### Table Specifications

- **`users`**: Manages customer and administrator profiles, email verification tokens, and quota limits.
- **`bookings`**: Stores cylinder quantities, shipping coordinates, status, and expected delivery windows.
- **`booking_events`**: Tracks real-time events (e.g. `PENDING`, `APPROVED`, `DELIVERED`) displayed on the user's progress timeline.
- **`payments`**: Handles Cash on Delivery and UPI tracking (storing transaction IDs for administrative review).
- **`cylinder_stock`**: Singleton row tracking current global available cylinders.
- **`stock_adjustments`**: Records all changes to the inventory (intakes, issues, corrections).
- **`cylinder_batches`**: Tracks cylinder shipments received from suppliers.
- **`delivery_partners`**: Lists dispatch agents, their service zones, and capacity constraints.
- **`delivery_assignments`**: Maps an approved booking to a delivery partner with status timelines.

---

## 🔌 API Reference

API routes are structured under `/api/*` and use a unified response format:

- **Success Format**: `{ success: true, data: [...] }`
- **Error Format**: `{ success: false, error: "Reason" }`

### Selected API Handlers

- **Authentication**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/verify-email`.
- **User Commands**: `GET /api/bookings` (list bookings), `POST /api/bookings` (request cylinder), `GET /api/bookings/track/[id]` (timeline tracking).
- **Admin Commands**:
  - `GET /api/admin/dashboard` (business metrics).
  - `GET /api/admin/users` (list/edit accounts).
  - `GET /api/admin/bookings/review-payments` (review pending UPI submissions).
  - `POST /api/admin/deliveries/assignments` (assign courier to booking).
  - `POST /api/admin/inventory/batches` (receive stock intake).

---

## 🔒 Security Implementation

### Rate Limiting & CSRF Protection

- **CSRF Token Validation**: Validates client session headers on all mutable REST methods (POST, PUT, DELETE).
- **Security Headers**: Standard headers injected automatically via `src/lib/api-middleware.ts` including Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), and Frame Options.

### Data Sanitization & Schema Validation

All inbound parameters are parsed through strict **Zod Schemas** (`src/lib/validation.ts`) to prevent type-tampering or payload injection.

---

## 🚀 Deployment Guide

### Vercel Deployment Flow

1. Fork and connect the GitHub repository to your **Vercel** dashboard.
2. In Vercel, configure the Environment variables corresponding to your `.env` (including `DATABASE_URL` and `DIRECT_URL`).
3. Set the **Build Command** to `npm run build`.
4. Run `npx prisma migrate deploy` in your production build phase.

---

## 🔧 Troubleshooting

### 1. `Could not find a production build in the '.next' directory`

- **Cause**: Next.js was started (`npm run start`) before a production build was created.
- **Solution**: Execute `npm run build` prior to starting the production server.

### 2. `EPERM: operation not permitted` on Windows

- **Cause**: The local Next.js development server is active and locks the generated Prisma client node modules.
- **Solution**: Stop your development server (Ctrl+C), run `npm run db:generate`, and restart your server.

### 3. `ERROR: prepared statement "s1" already exists`

- **Cause**: Running database migrations directly against a transaction pooler (e.g. Supabase port 6543).
- **Solution**: Ensure your `DIRECT_URL` is set to an unpooled session-mode database endpoint (port 5432) and configured in your `schema.prisma` file.

---

## 📊 Performance Optimization

- **Prisma Client Singleton**: Generated in `src/lib/db.ts` to prevent open connection exhaustion in Serverless environments.
- **Index Optimization**: Composite database indexes configured on high-volume columns such as `bookingId` inside `payments` and `booking_events` to accelerate analytical scans.

---

## 🤝 Contributing Guidelines

Please consult our [Contributing Guide](CONTRIBUTING.md) and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).
