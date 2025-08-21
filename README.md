# 🚀 Gas Agency System


<p align="center">
  <img src="preview/logo.png" alt="Gas Agency System Logo" width="180" />
</p>

<h2 align="center">Gas Agency System</h2>

<p align="center">
  A modern, full-stack gas cylinder booking and management platform designed for agencies and customers.<br>
  Built with <b>Next.js 15</b>, <b>TypeScript</b>, <b>Prisma</b>, and <b>PostgreSQL</b>.
</p>

**Key Features:**
- User and Admin roles with secure authentication
- Cylinder booking with real-time status tracking
- UPI and Cash on Delivery payment options
- Email verification and password reset
- Admin dashboard for managing users, bookings, inventory, and deliveries
- Quota management (12 cylinders/year per user)
- Modern UI with responsive design
- Built-in API endpoints for extensibility



[![Next.js](https://img.shields.io/badge/Next.js-15.4.7-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.14.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth.js-4.24.11-000000?style=for-the-badge&logo=next.js)](https://next-auth.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)

> **A modern, full-stack gas cylinder booking and management system built with Next.js 15, TypeScript, and PostgreSQL.**

## 📋 Table of Contents

- [🌟 Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📦 Prerequisites](#-prerequisites)
- [🚀 Quick Start](#-quick-start)
- [🗄️ Database Setup](#️-database-setup)
- [⚙️ Environment Configuration](#️-environment-configuration)
- [👥 Admin Management](#-admin-management)
- [📁 Project Structure](#-project-structure)
- [🔗 URL Structure](#-url-structure)
- [📊 Database Schema](#-database-schema)
- [🎨 Screenshots](#-screenshots)
- [🔧 Available Scripts](#-available-scripts)
- [📚 API Documentation](#-api-documentation)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [📞 Contact](#-contact)

## 🌟 Features

### 🔐 **Authentication & User Management**

- **Multi-role Authentication**: User and Admin roles with secure session management
- **Email Verification**: Account verification with email confirmation
- **Password Reset**: Secure password reset with email tokens
- **Profile Management**: User profile editing and quota tracking
- **Session Security**: NextAuth.js with secure session handling

### 📱 **User Dashboard**

- **Quota Management**: Track remaining cylinder quota (12 per year)
- **Booking System**: Easy cylinder booking with multiple payment options
- **Booking History**: Complete booking history with status tracking
- **Real-time Tracking**: Live delivery tracking with status updates
- **Payment Integration**: UPI and Cash on Delivery (COD) support
- **Profile Management**: Update personal information and preferences

### 🏢 **Admin Dashboard**

- **Comprehensive Analytics**: Revenue, bookings, deliveries, and user statistics
- **User Management**: View, edit, and manage user accounts
- **Booking Management**: Approve, reject, and track all bookings
- **Inventory Management**: Real-time cylinder stock monitoring
- **Delivery Management**: Assign delivery partners and track deliveries
- **Payment Review**: Review and approve UPI payments
- **Contact Management**: Handle customer support inquiries
- **Reporting**: Export data and generate reports

### 💳 **Payment System**

- **UPI Integration**: Secure UPI payment processing
- **Payment Verification**: Admin review and approval system
- **Transaction Tracking**: Complete payment history and status
- **Refund Handling**: Automatic refund processing for cancellations

### 🚚 **Delivery Management**

- **Partner Management**: Manage delivery partners and their areas
- **Assignment System**: Intelligent delivery assignment
- **Status Tracking**: Real-time delivery status updates
- **Route Optimization**: Efficient delivery scheduling

### 📦 **Inventory Management**

- **Stock Monitoring**: Real-time cylinder availability
- **Batch Management**: Track cylinder batches and suppliers
- **Stock Adjustments**: Handle stock corrections and audits
- **Reservation System**: Prevent overbooking with stock reservations

### 📧 **Communication System**

- **Email Notifications**: Automated email notifications for all events
- **Contact Support**: Customer support ticket system
- **Status Updates**: Real-time booking and delivery updates
- **Invoice Generation**: Automated PDF invoice generation

## 🛠️ Tech Stack

### **Frontend**

- **Next.js 15.4.7** - React framework with App Router
- **TypeScript 5.0** - Type-safe JavaScript
- **Tailwind CSS 4.0** - Utility-first CSS framework
- **React Hook Form** - Form handling and validation
- **Zod** - Schema validation
- **Framer Motion** - Animation library
- **Lucide React** - Icon library

### **Backend**

- **Next.js API Routes** - Server-side API endpoints
- **Prisma 6.14.0** - Database ORM
- **PostgreSQL** - Primary database
- **NextAuth.js 4.24.11** - Authentication framework
- **Nodemailer** - Email service
- **Puppeteer** - PDF generation

### **Development Tools**

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Jest** - Testing framework
- **TypeScript** - Type checking

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher) or **yarn**
- **Git**
- **PostgreSQL** database (local or cloud)
- **Gmail account** (for email notifications)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/dhruvpatel16120/Gas-Agency-System.git
cd Gas-Agency-System
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Setup Script

```bash
npm run setup
```

This interactive script will help you configure:

- Database connection (Railway PostgreSQL)
- Email settings (Gmail SMTP)
- NextAuth configuration

### 4. Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

```

### 5. Create Admin Account

```bash
npm run admin:create
```

### 6. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🗄️ Database Setup

### Railway PostgreSQL Setup

1. **Create Railway Account**
   - Visit [railway.com](https://railway.com)
   - Sign up with GitHub or Google

2. **Create New Project**
   - Click "New Project"
   - Select "Provision PostgreSQL"

3. **Get Connection String**
   - Go to your PostgreSQL database
   - select & navigate to variables tab
   - you got Service Variables
   - Copy the DATABASE_PUBLIC_URL and comeback to project

4. **Configure Environment**
   - Update your `.env` file with the Railway connection string or paste it in setup
   - Format: `postgresql://username:password@host:port/database`

### Database Migrations

The project includes comprehensive database migrations:

```bash
# View migration history
npm run db:studio

# Reset database (⚠️ Destructive)
npm run db:reset

# Push schema changes
npm run db:push
```

## ⚙️ Environment Configuration

Create a `.env` file in the root directory:

```env
# Railway Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secure-secret-key"

# Email Configuration (Gmail SMTP)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-gmail-app-password"

# Application Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Gas Agency System"

# Admin Configuration
ADMIN_SECRET_KEY="your-admin-secret-key"

# Development Configuration
NODE_ENV="development"


# upi id for payment gatway
ADMIN_UPI_ID="upi-id@opensource"
NEXT_PUBLIC_ADMIN_UPI_ID="upi-id@opensource"
```

### Gmail App Password Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account → Security → 2-Step Verification → App passwords or just search App passwords
3. Generate a new app password for "Mail"
4. Use this password in `EMAIL_SERVER_PASSWORD` and Use your gmail address as `EMAIL_SERVER_USER`

## 👥 Admin Management

### Create Admin Account

```bash
npm run admin:create
```

### Change Admin Password

```bash
npm run admin:password
```

### Delete Admin Account

```bash
npm run admin:delete
```

## 📁 Project Structure

```
gas-agency-system/
├── 📁 prisma/                    # Database schema and migrations
│   ├── 📁 migrations/           # Database migration files
│   └── schema.prisma           # Database schema definition
├── 📁 public/                   # Static assets
├── 📁 scripts/                  # Setup and utility scripts
│   ├── setup.js                # Environment setup script
│   ├── create-admin.js         # Admin account creation
│   ├── change-admin-password.js # Password change utility
│   └── delete-admin.js         # Admin deletion utility
├── 📁 src/
│   ├── 📁 app/                 # Next.js App Router pages
│   │   ├── 📁 (auth)/          # Authentication pages
│   │   ├── 📁 admin/           # Admin dashboard pages
│   │   ├── 📁 api/             # API routes
│   │   ├── 📁 user/            # User dashboard pages
│   │   └── layout.tsx          # Root layout
│   ├── 📁 components/          # Reusable UI components
│   │   ├── 📁 providers/       # Context providers
│   │   └── 📁 ui/              # UI components
│   ├── 📁 lib/                 # Utility libraries
│   │   ├── auth.ts             # Authentication utilities
│   │   ├── db.ts               # Database utilities
│   │   ├── email.ts            # Email utilities
│   │   └── utils.ts            # General utilities
│   ├── 📁 types/               # TypeScript type definitions
│   └── middleware.ts           # Next.js middleware
├── package.json                # Dependencies and scripts
├── next.config.ts             # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

## 🔗 URL Structure

### **Public Routes**

- `/` - Home page (redirects to login)
- `/login` - User login
- `/register` - User registration
- `/forgot-password` - Password reset
- `/reset-password` - Password reset confirmation
- `/verify-email` - Email verification

### **User Routes**

- `/user` - User dashboard
- `/user/book` - Book new cylinder
- `/user/bookings` - Booking history
- `/user/bookings/[id]` - Booking details
- `/user/bookings/[id]/receipt` - Booking receipt
- `/user/track/[id]` - Track delivery
- `/user/profile` - User profile
- `/user/profile/edit` - Edit profile
- `/user/pay/upi/[bookingId]` - UPI payment
- `/user/repay/[id]` - Retry payment
- `/user/contact` - Contact support

### **Admin Routes**

- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/users/[id]` - User details
- `/admin/users/new` - Create user
- `/admin/bookings` - Booking management
- `/admin/bookings/[id]` - Booking details
- `/admin/bookings/[id]/edit` - Edit booking
- `/admin/bookings/[id]/invoice` - Generate invoice
- `/admin/bookings/analytics` - Booking analytics
- `/admin/inventory` - Inventory management
- `/admin/deliveries` - Delivery management
- `/admin/contacts` - Contact management
- `/admin/settings` - System settings

### **API Routes**

- `/api/auth/*` - Authentication endpoints
- `/api/bookings/*` - Booking management
- `/api/payments/*` - Payment processing
- `/api/admin/*` - Admin operations
- `/api/user/*` - User operations

## 📊 Database Schema

### **Core Models**

#### **User Management**

```sql
-- Users table
users (
  id, email, name, userId, phone, address,
  password, role, remainingQuota, emailVerified,
  resetToken, resetTokenExpiry, emailVerificationToken,
  emailVerificationExpiry, createdAt, updatedAt
)

-- Authentication tables
accounts (id, userId, type, provider, providerAccountId, ...)
sessions (id, sessionToken, userId, expires)
verification_tokens (identifier, token, expires)
```

#### **Booking System**

```sql
-- Bookings table
bookings (
  id, userId, userName, userEmail, userPhone, userAddress,
  paymentMethod, quantity, receiverName, receiverPhone,
  status, requestedAt, deliveryDate, expectedDate,
  deliveredAt, notes, createdAt, updatedAt
)

-- Booking events for tracking
booking_events (id, bookingId, status, title, description, createdAt)
```

#### **Payment System**

```sql
-- Payments table
payments (
  id, bookingId, amount, method, status, upiTxnId, createdAt
)
```

#### **Inventory Management**

```sql
-- Stock management
cylinder_stock (id, totalAvailable, updatedAt, createdAt)
stock_adjustments (id, stockId, delta, type, reason, notes, ...)
stock_reservations (id, stockId, bookingId, quantity, status, ...)
cylinder_batches (id, supplier, invoiceNo, quantity, receivedAt, ...)
```

#### **Delivery System**

```sql
-- Delivery partners
delivery_partners (
  id, name, phone, email, vehicleNumber, serviceArea,
  capacityPerDay, isActive, createdAt, updatedAt
)

-- Delivery assignments
delivery_assignments (
  id, bookingId, partnerId, status, scheduledDate,
  scheduledTime, priority, notes, assignedAt, updatedAt
)
```

#### **Contact Management**

```sql
-- Contact messages
contact_messages (
  id, userId, subject, message, category, priority,
  relatedBookingId, preferredContact, phone, status,
  lastRepliedAt, createdAt, updatedAt
)

-- Contact replies
contact_replies (id, messageId, authorId, body, isAdmin, createdAt)
```

## 🎨 Screenshots

### **User Interface**

|        ![User Dashboard](preview/user_dashboard.png)         |       ![Booking Form](preview/booking.png)       |
| :----------------------------------------------------------: | :----------------------------------------------: |
| **User Dashboard** - Main user interface with quota tracking | **Booking Form** - Easy cylinder booking process |

|       ![Payment Interface](preview/payment.png)       |       ![Tracking Page](preview/track.png)       |
| :---------------------------------------------------: | :---------------------------------------------: |
| **Payment Interface** - Secure UPI payment processing | **Tracking Page** - Real-time delivery tracking |

### **Admin Interface**

|      ![Admin Dashboard](preview/admin_dashboard.png)       |   ![Booking Management](preview/admin_booking.png)   |
| :--------------------------------------------------------: | :--------------------------------------------------: |
| **Admin Dashboard** - Comprehensive analytics and overview | **Booking Management** - Approve and manage bookings |

|       ![Inventory Management](preview/inventory.png)        |       ![User Management](preview/users.png)       |
| :---------------------------------------------------------: | :-----------------------------------------------: |
| **Inventory Management** - Stock monitoring and adjustments | **User Management** - User account administration |

## 🔧 Available Scripts

### **Development**

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking
```

### **Database**

```bash
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:reset     # Reset database (⚠️ Destructive)
npm run db:seed      # Seed sample data
npm run db:studio    # Open Prisma Studio
npm run db:push      # Push schema changes
```

### **Setup & Management**

```bash
npm run setup        # Interactive environment setup
npm run admin:create # Create admin account
npm run admin:delete # Delete admin account
npm run admin:password # Change admin password
```

## 📚 API Documentation

### **Authentication Endpoints**

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/verify-email` - Email verification

### **Booking Endpoints**

- `GET /api/bookings` - List user bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/[id]` - Get booking details
- `PUT /api/bookings/[id]` - Update booking
- `GET /api/bookings/track/[id]` - Track booking

### **Payment Endpoints**

- `POST /api/payments/upi` - Process UPI payment
- `POST /api/payments/upi/confirm-and-create` - Confirm UPI payment
- `POST /api/payments/upi/retry` - Retry failed payment
- `POST /api/payments/webhook` - Payment webhook

### **Admin Endpoints**

- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - List users
- `GET /api/admin/bookings` - List all bookings
- `PUT /api/admin/bookings/[id]/status` - Update booking status
- `GET /api/admin/inventory` - Inventory data
- `GET /api/admin/deliveries` - Delivery data

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Setup**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### **Code Style**

- Follow TypeScript best practices
- Use Prettier for code formatting
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Dhruv Patel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 📞 Contact

### 👨‍💻 Developer

**Dhruv Patel**
- **GitHub**: [@dhruvpatel16120](https://github.com/dhruvpatel16120)
- **LinkedIn**: [dhruvpatel16120](https://www.linkedin.com/in/dhruvpatel16120/)
- **Portfolio**: [dhruvpatelofficial.vercel.app](https://dhruvpatelofficial.vercel.app/)
- **Email**: [digitaldhruv21@gmail.com](mailto:digitaldhruv21@gmail.com)

### 🌐 Project Links

- **Live Demo**: [gas-agency-system.vercel.app](https://gas-agency-system.vercel.app/)
- **Repository**: [github.com/dhruvpatel16120/Gas-Agency-System/](https://github.com/dhruvpatel16120/Gas-Agency-System/)
- **Documentation**: [Gas-Agency-System/Documentation.md](https://github.com/dhruvpatel16120/Gas-Agency-System/Documentation.md)
- **Issues**: [GitHub Issues](https://github.com/dhruvpatel16120/Gas-Agency-System/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dhruvpatel16120/Gas-Agency-System/discussions)

### 💬 Support

- **Documentation**: Check this [Documentation.md](https://github.com/dhruvpatel16120/Gas-Agency-System/Documentation.md) as Documentation
- **Issues**: Report bugs and request features on GitHub
- **Discussions**: Ask questions and share ideas in GitHub Discussions
- **Email**: For private inquiries, use the contact form on the [portfolio](https://dhruvpatelofficial.vercel.app/) or email above

---

<div align="center">

**Made with ❤️ using Next.js, Prisma, and Tailwind CSS**

### If you find this project helpful, please give it a ⭐ star on GitHub!

</div>
