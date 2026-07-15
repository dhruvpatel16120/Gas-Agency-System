const fs = require("fs");
const path = require("path");
const { 
  colorize, 
  generateSecureKey, 
  askQuestion, 
  askYesNo, 
  isValidEmail, 
  closeRL 
} = require("./utils");

async function setupEnv() {
  console.log(colorize("\n🚀 Gas Agency System - Environment Setup", "cyan"));
  console.log(colorize("==========================================\n", "cyan"));
  console.log(colorize("This script will help you configure your environment variables.", "white"));
  console.log(colorize("Press Enter to use default values or type your own.\n", "dim"));

  const config = {};

  try {
    // Database Configuration
    console.log(colorize("📊 DATABASE CONFIGURATION", "yellow"));
    console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "yellow"));

    let databaseUrl = "";
    while (!databaseUrl) {
      databaseUrl = await askQuestion(
        colorize("PostgreSQL Database URL (Pooler/Transaction URL)", "blue"),
        "postgresql://postgres:password@host:port/database?pgbouncer=true"
      );
      if (!databaseUrl.startsWith("postgresql://")) {
        console.log(colorize('❌ Invalid database URL. Must start with "postgresql://"', "red"));
        databaseUrl = "";
      }
    }
    config.DATABASE_URL = databaseUrl;

    let directUrl = "";
    while (!directUrl) {
      directUrl = await askQuestion(
        colorize("PostgreSQL Direct URL (For Migrations)", "blue"),
        "postgresql://postgres:password@host:5432/database"
      );
      if (!directUrl.startsWith("postgresql://")) {
        console.log(colorize('❌ Invalid direct URL. Must start with "postgresql://"', "red"));
        directUrl = "";
      }
    }
    config.DIRECT_URL = directUrl;

    // NextAuth Configuration
    console.log(colorize("\n🔐 AUTHENTICATION CONFIGURATION", "yellow"));
    console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "yellow"));

    config.NEXTAUTH_URL = await askQuestion(
      colorize("Application URL (for NextAuth)", "blue"),
      "http://localhost:3000"
    );

    const generateSecret = await askYesNo(
      colorize("Generate secure NextAuth secret automatically?", "blue"),
      "y"
    );

    if (generateSecret) {
      config.NEXTAUTH_SECRET = generateSecureKey();
      console.log(colorize("✅ Generated secure NextAuth secret", "green"));
    } else {
      config.NEXTAUTH_SECRET = await askQuestion(
        colorize("NextAuth Secret (minimum 32 characters)", "blue"),
        generateSecureKey()
      );
    }

    // Email Configuration
    console.log(colorize("\n📧 EMAIL CONFIGURATION (Gmail SMTP)", "yellow"));
    console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "yellow"));

    const setupEmail = await askYesNo(
      colorize("Do you want to configure email notifications?", "blue"),
      "y"
    );

    if (setupEmail) {
      config.EMAIL_SERVER_HOST = await askQuestion(colorize("SMTP Host", "blue"), "smtp.gmail.com");
      config.EMAIL_SERVER_PORT = await askQuestion(colorize("SMTP Port", "blue"), "587");

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
      console.log(colorize("1. Enable 2-Factor Authentication on your Gmail account", "dim"));
      console.log(colorize("2. Go to Google Account → Security → 2-Step Verification → App passwords", "dim"));
      console.log(colorize('3. Generate a new app password for "Mail"', "dim"));
      console.log(colorize("4. Use that password below (not your regular Gmail password)\n", "dim"));

      config.EMAIL_SERVER_PASSWORD = await askQuestion(
        colorize("Gmail App Password (16 characters)", "blue")
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

    config.NEXT_PUBLIC_APP_URL = await askQuestion(
      colorize("Public Application URL", "blue"), 
      config.NEXTAUTH_URL
    );

    config.NEXT_PUBLIC_APP_NAME = await askQuestion(
      colorize("Application Name", "blue"),
      "Gas Agency System"
    );

    const generateAdminSecret = await askYesNo(
      colorize("Generate secure admin secret automatically?", "blue"),
      "y"
    );

    if (generateAdminSecret) {
      config.ADMIN_SECRET_KEY = generateSecureKey(16);
      console.log(colorize("✅ Generated secure admin secret", "green"));
    } else {
      config.ADMIN_SECRET_KEY = await askQuestion(
        colorize("Admin Secret Key", "blue"),
        generateSecureKey(16)
      );
    }

    config.NODE_ENV = await askQuestion(
      colorize("Environment", "blue"),
      "development"
    );

    // Payment Gateway Configuration
    console.log(colorize("\n💳 PAYMENT GATEWAY CONFIGURATION", "yellow"));
    console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "yellow"));
    
    config.ADMIN_UPI_ID = await askQuestion(
      colorize("Admin UPI ID", "blue"),
      "upi-id@opensource"
    );
    config.NEXT_PUBLIC_ADMIN_UPI_ID = config.ADMIN_UPI_ID;

    // Generate .env file content
    console.log(colorize("\n📝 GENERATING ENVIRONMENT FILE", "yellow"));
    console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "yellow"));

    const envContent = `# Gas Agency System - Environment Configuration
# Generated on ${new Date().toISOString()}

# Database Configuration
DATABASE_URL="${config.DATABASE_URL}"
DIRECT_URL="${config.DIRECT_URL}"

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

# Payment Gateway Configuration
ADMIN_UPI_ID="${config.ADMIN_UPI_ID}"
NEXT_PUBLIC_ADMIN_UPI_ID="${config.NEXT_PUBLIC_ADMIN_UPI_ID}"
`;

    // Check if .env file exists
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      console.log(colorize("⚠️  .env file already exists!", "yellow"));
      const overwrite = await askYesNo(colorize("Do you want to overwrite it?", "yellow"), "n");

      if (!overwrite) {
        console.log(colorize("❌ Setup cancelled. Existing .env file preserved.", "red"));
        return false;
      }
    }

    // Write .env file
    fs.writeFileSync(envPath, envContent);
    console.log(colorize("✅ Successfully created .env file!", "green"));
    return true;

  } catch (error) {
    console.error(colorize(`\n❌ Environment setup failed: ${error.message}`, "red"));
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  setupEnv().then(() => closeRL());
}

module.exports = { setupEnv };
