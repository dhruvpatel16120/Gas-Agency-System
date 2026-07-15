# 🛠️ Contributing Guide

Welcome! 🎉 Thank you for your interest in contributing to **Gas Agency System**. Your help is highly appreciated, whether you are fixing bugs, writing tests, improving documentation, or building features.

Please read through this guide to ensure a smooth and productive workflow.

---

## 🚀 Quick Start

### 1. Fork the Repository

Click the **"Fork"** button at the top right of the [main repository page](https://github.com/dhruvpatel16120/Gas-Agency-System) on GitHub.

### 2. Clone Your Fork

```bash
git clone https://github.com/your-username/Gas-Agency-System.git
cd Gas-Agency-System
```

### 3. Install Project Dependencies

```bash
npm install
```

### 4. Create Local Configuration

Ensure you have a PostgreSQL database ready (Local, Supabase, Neon, or Railway) as detailed in the [Technical Documentation](Documentation.md#-installation--setup-guide).
Run our interactive CLI configuration tool:

```bash
npm run setup
```

### 5. Setup & Migrate Database

Apply migration files and seed sample inventory/admin schemas:

```bash
npm run setup:db
```

Inside the CLI menu:

- Run **Option 1** to generate the Prisma Client.
- Run **Option 2** or **Option 3** to push migrations.
- Run **Option 5** to seed default variables.

### 6. Create Admin Account

```bash
npm run admin
```

Select **Create or Update Admin User** from the menu.

### 7. Run Local Development Server

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000).

---

## 🧑‍💻 How to Make Contributions

### Step 1: Create a Feature Branch

Always work on a dedicated branch rather than `main`:

```bash
git checkout -b feature/your-feature-name
```

Use concise, descriptive names like `feature/booking-sorting` or `bugfix/email-verification-timeout`.

### Step 2: Write Clean Code

- Adhere to the existing design style and folder conventions.
- Format files before committing:
  ```bash
  npm run format
  ```
- Validate code quality by running standard checks:
  ```bash
  npm run lint
  npx tsc --noEmit
  ```

### Step 3: Commit and Push

Ensure you write meaningful commit messages:

```bash
git add .
git commit -m "feat: implement booking filter criteria"
git push origin feature/your-feature-name
```

### Step 4: Open a Pull Request (PR)

1. Go to your fork on GitHub.
2. Click **"Compare & pull request"**.
3. Clearly summarize your changes, list any issue tickets fixed, and explain how you verified the changes.
4. Submit the PR for review!

---

## 📝 Commit Code Styles

We recommend following the [Conventional Commits](https://www.conventionalcommits.org/) format:

- `feat:` for new capabilities.
- `fix:` for bug resolutions.
- `docs:` for documentation updates.
- `style:` for code styling (spacing, semicolons).
- `refactor:` for architectural reorganizations.
- `test:` for writing tests.

---

## 📞 Support and Questions

If you have questions or need help with code integration, please:

- Open a GitHub issue.
- Email me directly at **digitaldhruv21@gmail.com**.
