#!/usr/bin/env node

const readline = require("readline");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

// Helper function to colorize text
function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// Helper function to generate secure random string
function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

// Helper function to ask questions
function askQuestion(question, defaultValue = "") {
  return new Promise((resolve) => {
    const prompt = defaultValue
      ? `${question} ${colorize(`(default: ${defaultValue})`, "dim")}: `
      : `${question}: `;

    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

// Helper function to ask yes/no questions
function askYesNo(question, defaultValue = "y") {
  return new Promise((resolve) => {
    const prompt = `${question} ${colorize(`(y/n, default: ${defaultValue})`, "dim")}: `;
    rl.question(prompt, (answer) => {
      const response = answer.trim().toLowerCase() || defaultValue;
      resolve(response === "y" || response === "yes");
    });
  });
}

// Helper function to validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Main setup function
async function setupEnvironment() {
  console.log(colorize("\n🚀 Gas Agency System - Environment Setup", "cyan"));
  console.log(colorize("==========================================\n", "cyan"));

  console.log(
    colorize(
      "This script will help you configure your environment variables.",
      "white",
    ),
  );
  console.log(
    colorize("Press Enter to use default values or type your own.\n", "dim"),
  );

  const config = {};

  try {
    // Database Configuration
    console.log(colorize("📊 DATABASE CONFIGURATION", "yellow"));
    console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "yellow"));

    let databaseUrl = "";
    while (!databaseUrl) {
      databaseUrl = await askQuestion(
        colorize("Railway PostgreSQL Database URL", "blue"),
        "postgresql://postgres:password@host:port/database",
      );

      if (!databaseUrl.startsWith("postgresql://")) {
        console.log(
          colorize(
            '❌ Invalid database URL. Must start with "postgresql://"',
            "red",
          ),
        );
        databaseUrl = "";
      }
    }
    config.DATABASE_URL = databaseUrl;

    // NextAuth Configuration
    console.log(colorize("\n🔐 AUTHENTICATION CONFIGURATION", "yellow"));
    console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "yellow"));

    config.NEXTAUTH_URL = await askQuestion(
      colorize("Application URL (for development)", "blue"),
      "http://localhost:3000",
    );

    const generateSecret = await askYesNo(
      colorize("Generate secure NextAuth secret automatically?", "blue"),
      "y",
    );

    if (generateSecret) {
      config.NEXTAUTH_SECRET = generateSecureKey();
      console.log(colorize("✅ Generated secure NextAuth secret", "green"));
    } else {
      config.NEXTAUTH_SECRET = await askQuestion(
        colorize("NextAuth Secret (minimum 32 characters)", "blue"),
        generateSecureKey(),
      );
    }

    // Email Configuration
    console.log(colorize("\n📧 EMAIL CONFIGURATION (Gmail SMTP)", "yellow"));
    console.log(
      colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "yellow"),
    );

    const setupEmail = await askYesNo(
      colorize("Do you want to configure email notifications?", "blue"),
      "y",
    );

    if (setupEmail) {
      config.EMAIL_SERVER_HOST = await askQuestion(
        colorize("SMTP Host", "blue"),
        "smtp.gmail.com",
      );

      config.EMAIL_SERVER_PORT = await askQuestion(
        colorize("SMTP Port", "blue"),
        "587",
      );

      let email = "";
      while (!email) {
        email = await askQuestion(colorize("Your Gmail address", "blue"));
        if (!isValidEmail(email)) {
          console.log(colorize("❌ Invalid email format", "red"));
          email = "";
        }
      }
      config.EMAIL_SERVER_USER = email;

      console.log(colorize("\n📝 Gmail App Password Setup:", "cyan"));
      console.log(
        colorize(
          "1. Enable 2-Factor Authentication on your Gmail account",
          "dim",
        ),
      );
      console.log(
        colorize(
          "2. Go to Google Account → Security → 2-Step Verification → App passwords",
          "dim",
        ),
      );
      console.log(colorize('3. Generate a new app password for "Mail"', "dim"));
      console.log(
        colorize(
          "4. Use that password below (not your regular Gmail password)\n",
          "dim",
        ),
      );

      config.EMAIL_SERVER_PASSWORD = await askQuestion(
        colorize("Gmail App Password (16 characters)", "blue"),
      );
    } else {
      config.EMAIL_SERVER_HOST = "smtp.gmail.com";
      config.EMAIL_SERVER_PORT = "587";
      config.EMAIL_SERVER_USER = "your-email@gmail.com";
      config.EMAIL_SERVER_PASSWORD = "your-gmail-app-password";
    }

    // Application Configuration
    console.log(colorize("\n⚙️  APPLICATION CONFIGURATION", "yellow"));
    console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "yellow"));

    config.NEXT_PUBLIC_APP_URL = config.NEXTAUTH_URL;

    config.NEXT_PUBLIC_APP_NAME = await askQuestion(
      colorize("Application Name", "blue"),
      "Gas Agency System",
    );

    const generateAdminSecret = await askYesNo(
      colorize("Generate secure admin secret automatically?", "blue"),
      "y",
    );

    if (generateAdminSecret) {
      config.ADMIN_SECRET_KEY = generateSecureKey(16);
      console.log(colorize("✅ Generated secure admin secret", "green"));
    } else {
      config.ADMIN_SECRET_KEY = await askQuestion(
        colorize("Admin Secret Key", "blue"),
        generateSecureKey(16),
      );
    }

    config.NODE_ENV = await askQuestion(
      colorize("Environment", "blue"),
      "development",
    );

    // Generate .env file content
    console.log(colorize("\n📝 GENERATING ENVIRONMENT FILE", "yellow"));
    console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "yellow"));

    const envContent = `# Gas Agency System - Environment Configuration
# Generated on ${new Date().toISOString()}

# Railway Database Configuration
DATABASE_URL="${config.DATABASE_URL}"

# NextAuth.js Configuration
NEXTAUTH_URL="${config.NEXTAUTH_URL}"
NEXTAUTH_SECRET="${config.NEXTAUTH_SECRET}"

# Email Configuration (Gmail SMTP)
EMAIL_SERVER_HOST="${config.EMAIL_SERVER_HOST}"
EMAIL_SERVER_PORT=${config.EMAIL_SERVER_PORT}
EMAIL_SERVER_USER="${config.EMAIL_SERVER_USER}"
EMAIL_SERVER_PASSWORD="${config.EMAIL_SERVER_PASSWORD}"

# Application Configuration
NEXT_PUBLIC_APP_URL="${config.NEXT_PUBLIC_APP_URL}"
NEXT_PUBLIC_APP_NAME="${config.NEXT_PUBLIC_APP_NAME}"

# Admin Configuration
ADMIN_SECRET_KEY="${config.ADMIN_SECRET_KEY}"

# Development Configuration
NODE_ENV="${config.NODE_ENV}"
`;

    // Check if .env file exists
    const envPath = path.join(process.cwd(), ".env");
    const envExists = fs.existsSync(envPath);

    if (envExists) {
      console.log(colorize("⚠️  .env file already exists!", "yellow"));
      const overwrite = await askYesNo(
        colorize("Do you want to overwrite it?", "yellow"),
        "n",
      );

      if (!overwrite) {
        console.log(
          colorize("❌ Setup cancelled. Existing .env file preserved.", "red"),
        );
        rl.close();
        return;
      }
    }

    // Write .env file
    fs.writeFileSync(envPath, envContent);
    console.log(colorize("✅ Successfully created .env file!", "green"));

    // Display summary
    console.log(colorize("\n📋 CONFIGURATION SUMMARY", "cyan"));
    console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan"));
    console.log(
      colorize(
        `Database: ${config.DATABASE_URL.replace(/password:[^@]*@/, "password:***@")}`,
        "white",
      ),
    );
    console.log(colorize(`App URL: ${config.NEXT_PUBLIC_APP_URL}`, "white"));
    console.log(colorize(`App Name: ${config.NEXT_PUBLIC_APP_NAME}`, "white"));
    console.log(colorize(`Email: ${config.EMAIL_SERVER_USER}`, "white"));
    console.log(colorize(`Environment: ${config.NODE_ENV}`, "white"));

    // Next steps
    console.log(colorize("\n🎉 SETUP COMPLETE!", "green"));
    console.log(colorize("━━━━━━━━━━━━━━━━━━━", "green"));
    console.log(colorize("Next steps:", "white"));
    console.log(colorize("1. Run: npm run db:migrate", "cyan"));
    console.log(colorize("2. Run: npm run dev", "cyan"));
    console.log(colorize("3. Open: http://localhost:3000", "cyan"));

    console.log(colorize("\n📚 Additional Commands:", "white"));
    console.log(colorize("• npm run db:reset     - Reset database", "dim"));
    console.log(colorize("• npm run db:seed      - Seed sample data", "dim"));
    console.log(colorize("• npm run db:studio    - Open Prisma Studio", "dim"));
  } catch (error) {
    console.error(colorize(`\n❌ Setup failed: ${error.message}`, "red"));
  }

  rl.close();
}

// Start the setup
console.log(colorize("Starting Gas Agency System setup...", "cyan"));
setupEnvironment();
