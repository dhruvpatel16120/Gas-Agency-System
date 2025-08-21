#!/usr/bin/env node

try {
  require("dotenv").config();
} catch (_) {}

const readline = require("readline");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

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

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile format
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

function generateAdminUserId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `ADMIN${timestamp}${random}`;
}

async function createOrUpdateAdmin() {
  console.log(colorize("\n👤 Admin Account Creator", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan"));

  try {
    let name = await askQuestion(colorize("Name", "blue"), "Admin");

    let email = "";
    while (!email) {
      const val = await askQuestion(colorize("Email", "blue"));
      if (isValidEmail(val)) {
        email = val;
      } else {
        console.log(colorize("❌ Invalid email format", "red"));
      }
    }

    let phone = "";
    while (!phone) {
      const val = await askQuestion(
        colorize("Phone (10 digits, India)", "blue"),
        "9999999999",
      );
      if (isValidPhone(val)) {
        phone = val.replace(/\s/g, "");
      } else {
        console.log(colorize("❌ Invalid phone format", "red"));
      }
    }

    let address = "";
    while (!address) {
      address = await askQuestion(colorize("Address", "blue"), "Head Office");
      if (!address) console.log(colorize("❌ Address is required", "red"));
    }

    console.log(
      colorize("\nCreate password for admin (input will be visible)", "yellow"),
    );
    let password = "";
    while (true) {
      const p1 = await askQuestion(
        colorize(
          "Password (min 8 chars, include upper/lower/number/special)",
          "blue",
        ),
      );
      const p2 = await askQuestion(colorize("Confirm Password", "blue"));
      if (p1 !== p2) {
        console.log(colorize("❌ Passwords do not match", "red"));
        continue;
      }
      const errors = [];
      if (p1.length < 8) errors.push("at least 8 characters");
      if (!/[A-Z]/.test(p1)) errors.push("one uppercase letter");
      if (!/[a-z]/.test(p1)) errors.push("one lowercase letter");
      if (!/\d/.test(p1)) errors.push("one number");
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(p1))
        errors.push("one special character");
      if (errors.length) {
        console.log(
          colorize(`❌ Password must contain: ${errors.join(", ")}`, "red"),
        );
        continue;
      }
      password = p1;
      break;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    const hashed = await bcrypt.hash(password, 12);

    const userId = existing ? existing.userId : generateAdminUserId();

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        phone,
        address,
        password: hashed,
        role: "ADMIN",
        emailVerified: new Date(),
      },
      create: {
        name,
        email,
        phone,
        address,
        userId,
        password: hashed,
        role: "ADMIN",
        emailVerified: new Date(),
      },
      select: { id: true, name: true, email: true, userId: true, role: true },
    });

    console.log(colorize("\n✅ Admin account saved successfully", "green"));
    console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "green"));
    console.log(`Name     : ${user.name}`);
    console.log(`Email    : ${user.email}`);
    console.log(`User ID  : ${user.userId}`);
    console.log(`Role     : ${user.role}`);
    console.log(
      colorize(
        "Note: The password is shown for confirmation only; it is stored hashed in the database.",
        "dim",
      ),
    );
    console.log(`Password : ${password}`);
  } catch (error) {
    console.error(
      colorize(`\n❌ Failed to create admin: ${error.message}`, "red"),
    );
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createOrUpdateAdmin();
