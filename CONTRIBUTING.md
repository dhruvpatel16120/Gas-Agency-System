# 🛠️ Contributing Guide

Welcome! 🎉 Thank you for your interest in contributing to **Gas Agency System**. Your help is highly appreciated, whether you're fixing bugs, adding features,fix the readme.md and other .md files , improving documentation, or suggesting ideas.

This guide will walk you through the process of contributing like a pro. Please read it carefully to ensure a smooth and productive collaboration.

---

## 🚀 Quick Start

1. **Fork the Repository**  
   Click the "Fork" button at the top right of the [main repository](https://github.com/dhruvpatel16120/Gas-Agency-System).

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/dhruvpatel16120/Gas-Agency-System.git
   cd Gas-Agency-System
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Set Up Environment Variables**  
   Copy `.env.example` to `.env` and fill in the required values.
   ```bash
   cp .env.example .env
   ```
   ## or run the setup script 

5. **Set Up the Database**
   ```bash
   npm run db:generate  # generate the Database Schema
   npm run db:push      # Push schema to database
   ```

6. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) to see the app.

7. **Setup & Management of Admin**

```bash
npm run setup        # Interactive environment setup
npm run admin:create # Create admin account
npm run admin:delete # Delete admin account
npm run admin:password # Change admin password
```
---

## 🧑‍💻 How to Contribute

### 1. Create a Feature Branch

Always create a new branch for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   Replace `your-feature-name` with a concise description of your change.

### 2. Make Your Changes

- Write clear, maintainable code.
- Follow the existing code style and conventions.
- Add or update tests if applicable.
- Update documentation if your change affects usage or APIs.

### 3. Commit Your Changes

Write a clear and descriptive commit message:
   ```bash
   git add .
   git commit -m "feat: add <short description of your change>"
   ```

### 4. Push to Your Fork

   ```bash
   git push origin feature/your-feature-name
   ```

### 5. Open a Pull Request

- Go to your fork on GitHub.
- Click "Compare & pull request".
- Fill out the PR template and describe your changes.
- Link related issues if any.

---

## 📝 Code Style & Best Practices

- Use [Prettier](https://prettier.io/) for code formatting.
- Use [ESLint](https://eslint.org/) to catch common issues.
- Write descriptive variable and function names.
- Keep functions small and focused.
- Add comments where necessary, but prefer self-explanatory code.

---
