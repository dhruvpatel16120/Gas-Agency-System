const readline = require("readline");
const crypto = require("crypto");

let rl = null;

function getRL() {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return rl;
}

function closeRL() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

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
  return `${colors[color] || ""}${text}${colors.reset}`;
}

function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

function askQuestion(question, defaultValue = "") {
  return new Promise((resolve) => {
    const prompt = defaultValue
      ? `${question} ${colorize(`(default: ${defaultValue})`, "dim")}: `
      : `${question}: `;

    getRL().question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function askYesNo(question, defaultValue = "y") {
  return new Promise((resolve) => {
    const prompt = `${question} ${colorize(`(y/n, default: ${defaultValue})`, "dim")}: `;
    getRL().question(prompt, (answer) => {
      const response = answer.trim().toLowerCase() || defaultValue;
      resolve(response === "y" || response === "yes");
    });
  });
}

async function askOptions(question, options) {
  console.log(`\n${colorize(question, "cyan")}`);
  options.forEach((opt, idx) => {
    console.log(`${colorize(`${idx + 1}.`, "yellow")} ${opt.label}`);
  });
  
  while (true) {
    const answer = await askQuestion(colorize("Select an option", "blue"));
    const num = parseInt(answer, 10);
    if (num > 0 && num <= options.length) {
      return options[num - 1].value;
    }
    console.log(colorize("❌ Invalid option. Please try again.", "red"));
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile format
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

module.exports = {
  getRL,
  closeRL,
  colorize,
  generateSecureKey,
  askQuestion,
  askYesNo,
  askOptions,
  isValidEmail,
  isValidPhone
};
