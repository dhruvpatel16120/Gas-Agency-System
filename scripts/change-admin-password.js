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

function validatePassword(pwd) {
  const errors = [];
  if (pwd.length < 8) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(pwd)) errors.push("one uppercase letter");
  if (!/[a-z]/.test(pwd)) errors.push("one lowercase letter");
  if (!/\d/.test(pwd)) errors.push("one number");
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) errors.push("one special character");
  return errors;
}

async function changePassword() {
  console.log(colorize("\n🔑 Change Admin Password", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━", "cyan"));

  try {
    let email = "";
    while (!email) {
      const val = await askQuestion(colorize("Admin Email", "blue"));
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(val)) {
        email = val;
      } else {
        console.log(colorize("❌ Invalid email format", "red"));
      }
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(colorize("❌ No user found with that email", "red"));
      return;
    }

    if (user.role !== "ADMIN") {
      console.log(
        colorize("❌ The specified user is not an ADMIN. Aborting.", "red"),
      );
      return;
    }

    console.log(
      colorize("\nEnter new password (input will be visible)", "yellow"),
    );
    let password = "";
    while (true) {
      const p1 = await askQuestion(colorize("New Password", "blue"));
      const p2 = await askQuestion(colorize("Confirm New Password", "blue"));
      if (p1 !== p2) {
        console.log(colorize("❌ Passwords do not match", "red"));
        continue;
      }
      const errors = validatePassword(p1);
      if (errors.length) {
        console.log(
          colorize(`❌ Password must contain: ${errors.join(", ")}`, "red"),
        );
        continue;
      }
      password = p1;
      break;
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    console.log(colorize("\n✅ Password updated successfully", "green"));
    console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━", "green"));
    console.log(`Email    : ${user.email}`);
    console.log(`User ID  : ${user.userId}`);
    console.log(
      colorize(
        "Note: The password is shown for confirmation only; it is stored hashed in the database.",
        "dim",
      ),
    );
    console.log(`Password : ${password}`);
  } catch (error) {
    console.error(
      colorize(`\n❌ Failed to change password: ${error.message}`, "red"),
    );
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

changePassword();
