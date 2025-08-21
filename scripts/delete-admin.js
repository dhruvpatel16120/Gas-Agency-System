#!/usr/bin/env node

try {
  require("dotenv").config();
} catch (_) {}

const readline = require("readline");
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

async function deleteAdmin() {
  console.log(colorize("\n🗑️  Delete Admin User", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━", "cyan"));

  try {
    let email = "";
    while (!email) {
      const val = await askQuestion(colorize("Admin Email to delete", "blue"));
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

    console.log(colorize(`\nAbout to delete ADMIN:`, "yellow"));
    console.log(`Name   : ${user.name}`);
    console.log(`Email  : ${user.email}`);
    console.log(`UserID : ${user.userId}`);

    const confirm = await askQuestion(
      colorize("Type the admin email to confirm deletion", "blue"),
    );
    if (confirm !== email) {
      console.log(colorize("❌ Confirmation did not match. Aborted.", "red"));
      return;
    }

    await prisma.user.delete({ where: { id: user.id } });
    console.log(colorize("\n✅ Admin deleted successfully", "green"));
  } catch (error) {
    console.error(
      colorize(`\n❌ Failed to delete admin: ${error.message}`, "red"),
    );
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

deleteAdmin();
