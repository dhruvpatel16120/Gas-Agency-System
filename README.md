# 🚀 Gas Agency System

<p align="center">
  <img src="preview/logo.png" alt="Gas Agency System Logo" width="180" />
</p>

<h2 align="center">Gas Agency System</h2>

<p align="center">
  A modern, full-stack gas cylinder booking and management platform designed for agencies and customers.<br>
  Built with <b>Next.js 15 (App Router)</b>, <b>TypeScript</b>, <b>Prisma</b>, and <b>PostgreSQL</b>.
</p>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-green?style=for-the-badge&logo=vercel)](https://agani-gas-agency-system.vercel.app/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.4.7-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.14.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> 🚀 **Live Application**: [agani-gas-agency-system.vercel.app](https://agani-gas-agency-system.vercel.app/)

---

## 🛠️ Tech Stack

Our Gas Agency System is built with cutting-edge technologies to ensure performance, security, and scalability:

### **Frontend Technologies**
- **Next.js 15.4.7** - React framework with App Router
- **TypeScript 5.0** - Type-safe JavaScript
- **Tailwind CSS 4.0** - Utility-first CSS framework
- **React Hook Form** - Form handling and validation
- **Zod** - Schema validation
- **Framer Motion** - Animation library
- **Lucide React** - Beautiful icons

### **Backend & Database**
- **Next.js API Routes** - Server-side API endpoints
- **Prisma 6.14.0** - Database ORM
- **PostgreSQL** - Multi-environment cloud or local database support
- **NextAuth.js 4.24.11** - Authentication framework
- **Nodemailer** - Email service
- **Puppeteer** - PDF invoice generation

### **Development Tools**
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Jest** - Testing framework

---

## ✨ Features

### 🔐 **Authentication & Security**
- **Multi-role Authentication**: User and Admin roles with secure session management.
- **Email Verification**: Account verification with email confirmation.
- **Password Reset**: Secure password reset with email tokens.
- **Session Security**: NextAuth.js with secure session handling.

### 📱 **User Dashboard**
- **Quota Management**: Track remaining cylinder quota (12 per year).
- **Booking System**: Easy cylinder booking with multiple payment options.
- **Booking History**: Complete booking history with status tracking.
- **Real-time Tracking**: Live delivery tracking with status updates.
- **Payment Integration**: UPI and Cash on Delivery (COD) support.
- **Profile Management**: Update personal information and preferences.

### 🏢 **Admin Dashboard**
- **Comprehensive Analytics**: Revenue, bookings, deliveries, and user statistics.
- **User Management**: View, edit, and manage user accounts.
- **Booking Management**: Approve, reject, and track all bookings.
- **Inventory Management**: Real-time cylinder stock monitoring.
- **Delivery Management**: Assign delivery partners and track deliveries.
- **Payment Review**: Review and approve UPI payments.
- **Contact Management**: Handle customer support inquiries.
- **Reporting**: Export data and generate reports.

---

## 📸 Application Preview

Here's a preview of the key features and interfaces in the Gas Agency System:

| Feature | Preview |
|:--------:|:-------:|
| **User Dashboard** | ![User Dashboard](preview/user_dashboard.png) |
| **Booking Form** | ![Booking Form](preview/booking.png) |
| **Payment Interface** | ![Payment Interface](preview/payment.png) |
| **Tracking Page** | ![Tracking Page](preview/track.png) |
| **Admin Dashboard** | ![Admin Dashboard](preview/admin_dashboard.png) |
| **Booking Management** | ![Booking Management](preview/admin_booking.png) |
| **Inventory Management** | ![Inventory Management](preview/inventory.png) |
| **User Management** | ![User Management](preview/users.png) |

---

## 📦 Prerequisites

Before setting up the Gas Agency System, ensure you have the following:

- **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (v9.0.0 or higher) or **yarn**
- **Git** for version control
- **PostgreSQL Database** (You can choose one of the options below):
  - **Local PostgreSQL**: Installed on your local machine (port 5432).
  - **Supabase**: Managed PostgreSQL database with built-in connection pooling.
  - **Railway**: Cloud PostgreSQL hosting.
  - **Neon**: Serverless Cloud PostgreSQL database.
- **Gmail Account**: Required for email notifications (with 2-Factor Authentication enabled to generate an App Password).

---

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/dhruvpatel16120/Gas-Agency-System.git
cd Gas-Agency-System
npm install
```

### 2. Run Interactive Setup Script
Configure environment variables quickly and interactively by running:
```bash
npm run setup
```
This guided CLI will prompt you for:
- Database Connection URLs (Pooler/Transaction and Direct URLs)
- NextAuth configuration details (automatically generating secure secrets if needed)
- SMTP Gmail credentials (providing steps to generate a Gmail App Password)
- Payment gateway configurations (`ADMIN_UPI_ID`)

### 3. Database Configuration
Based on your database choice in the [Prerequisites](#-prerequisites), configure your `.env` variables accordingly. 

> [!IMPORTANT]
> Since Prisma migrations execute DDL commands, connecting to a pooled database in Transaction Mode (e.g. Supabase port 6543) will result in `prepared statement "s1" already exists` errors. You must provide a **DIRECT_URL** connecting to port 5432 (or direct database host) to bypass the connection pooler.

Follow the instructions below for your selected setup:

#### Option A: Local PC PostgreSQL Setup
1. Make sure your local PostgreSQL service is running.
2. In `.env`, set:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/gas_agency?schema=public"
   DIRECT_URL="postgresql://postgres:password@localhost:5432/gas_agency?schema=public"
   ```

#### Option B: Supabase Setup
1. Go to [Supabase Console](https://supabase.com/) and provision a new project.
2. Under **Project Settings** → **Database**, get your connection strings.
3. Select **Transaction Mode** (port 6543) for `DATABASE_URL` (requires `?pgbouncer=true` parameter).
4. Select **Session Mode** or use the direct connection (port 5432) for `DIRECT_URL`.
   ```env
   DATABASE_URL="postgresql://postgres.ref:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.ref:password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
   ```

#### Option C: Railway Setup
1. Go to [Railway](https://railway.com/) and create a new project with PostgreSQL.
2. Under variables, copy the **`DATABASE_PUBLIC_URL`** (or `DATABASE_URL`).
3. If not using a pooler, you can point both variables to the same connection URL:
   ```env
   DATABASE_URL="postgresql://postgres:password@host:port/railway"
   DIRECT_URL="postgresql://postgres:password@host:port/railway"
   ```

#### Option D: Neon Setup
1. Go to [Neon Console](https://neon.tech/) and create a database project.
2. In your connection details, choose the **pooled** connection URL for `DATABASE_URL` (for transaction handling).
3. Choose the **unpooled** direct connection URL for `DIRECT_URL`.
   ```env
   DATABASE_URL="postgresql://user:password@ep-pooled-instance.aws.neon.tech/neondb?sslmode=require"
   DIRECT_URL="postgresql://user:password@ep-direct-instance.aws.neon.tech/neondb?sslmode=require"
   ```

### 4. Apply Database Schema & Seed Data
You can easily handle this step interactively by running:
```bash
npm run setup:db
```
This CLI tool allows you to:
1. Generate the Prisma Client
2. Run migrations (`npm run db:migrate` / `npm run db:push`)
3. Reset Database (⚠️ Destructive)
4. Seed Sample Data (`npm run db:seed`)
5. Launch Prisma Studio (`npm run db:studio`)

### 5. Create Admin Account
Create and manage your administrator account interactively:
```bash
npm run admin
```
Select **Create or Update Admin User** from the menu and follow the prompts.

### 6. Run Development Server
```bash
npm run dev
```
Visit **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🛡️ Admin CLI Operations

Our system comes with a built-in admin utility to manage roles, credentials, and user deletion.
Run:
```bash
npm run admin
```
**Available Commands in Menu:**
- **Create or Update Admin User**: Register new administrators or promote existing users.
- **List Admin Users**: Quickly view all admin emails and identifiers.
- **Change Admin Password**: Prompt to securely change password with validation checks.
- **Delete Admin User**: Permanently remove administrator users from the database.

---

## 📁 Project Structure

```
gas-agency-system/
├── 📁 prisma/                    # Database schema and migrations
│   ├── 📁 migrations/           # Database migration files
│   └── schema.prisma           # Database schema definition
├── 📁 public/                   # Static assets
├── 📁 scripts/                  # Setup and utility scripts
│   ├── utils.js                # Core interactive prompts utilities
│   ├── setup-project.js        # Master setup orchestrator
│   ├── setup-env.js            # Environment setup module
│   ├── setup-db.js             # Database command manager
│   └── admin-ops.js            # Unified Admin operations CLI
├── 📁 src/
│   ├── 📁 app/                 # Next.js App Router pages & API
│   ├── 📁 components/          # Reusable UI & Context providers
│   └── 📁 lib/                 # Auth, DB, email, security, validation
├── package.json                # Dependencies and scripts
└── tsconfig.json              # TypeScript configuration
```

---

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts Next.js development server in Turbopack mode |
| `npm run build` | Builds the application for production (includes client generation) |
| `npm run start` | Starts Next.js production server |
| `npm run setup` | Launches master interactive project setup menu |
| `npm run setup:env` | Launches interactive environment config builder |
| `npm run setup:db` | Launches interactive database migrations and commands utility |
| `npm run admin` | Launches interactive administrator account manager |
| `npm run db:generate` | Manually generates the Prisma Client |
| `npm run db:push` | Syncs schema changes directly with the database |
| `npm run db:migrate` | Runs database migrations safely via Prisma Migrate |
| `npm run db:reset` | Wipes and resets database schema and data (⚠️ Destructive) |
| `npm run db:seed` | Runs seed script to populate sample cylinders and data |
| `npm run db:studio` | Opens Prisma Studio GUI in your browser |
| `npm run lint` | Runs ESLint analysis for code quality |
| `npm run format` | Formats codebase with Prettier |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Dhruv Patel**
- GitHub: [@dhruvpatel16120](https://github.com/dhruvpatel16120)
- Portfolio: [dhruvpatelofficial.vercel.app](https://dhruvpatelofficial.vercel.app/)

---

## 📞 Support

If you have questions or need support:
1. Refer to our [Technical Documentation](Documentation.md)
2. Open an Issue on our repository
3. Star this project if you find it helpful! ⭐
