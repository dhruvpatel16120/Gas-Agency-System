const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { 
  colorize, 
  askOptions, 
  askQuestion, 
  askYesNo, 
  isValidEmail, 
  isValidPhone, 
  closeRL 
} = require("./utils");

let prisma;

function initPrisma() {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

function generateAdminUserId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `ADMIN${timestamp}${random}`;
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

async function promptForPassword() {
  console.log(colorize("\nEnter password for admin (input will be visible)", "yellow"));
  let password = "";
  while (true) {
    const p1 = await askQuestion(colorize("Password", "blue"));
    const p2 = await askQuestion(colorize("Confirm Password", "blue"));
    if (p1 !== p2) {
      console.log(colorize("❌ Passwords do not match", "red"));
      continue;
    }
    const errors = validatePassword(p1);
    if (errors.length) {
      console.log(colorize(`❌ Password must contain: ${errors.join(", ")}`, "red"));
      continue;
    }
    password = p1;
    break;
  }
  return password;
}

async function createAdmin() {
  console.log(colorize("\n👤 Create Admin Account", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━", "cyan"));
  
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
    const val = await askQuestion(colorize("Phone (10 digits, India)", "blue"), "9999999999");
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

  const password = await promptForPassword();
  
  const client = initPrisma();
  const existing = await client.user.findUnique({ where: { email } });
  const hashed = await bcrypt.hash(password, 12);
  const userId = existing ? existing.userId : generateAdminUserId();

  const user = await client.user.upsert({
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
  console.log(`Name     : ${user.name}\nEmail    : ${user.email}\nUser ID  : ${user.userId}`);
  console.log(colorize("Note: Password is saved securely.", "dim"));
}

async function listAdmins() {
  console.log(colorize("\n📋 List of Admins", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━", "cyan"));
  
  const client = initPrisma();
  const admins = await client.user.findMany({ where: { role: "ADMIN" }, select: { name: true, email: true, userId: true, phone: true } });
  
  if (admins.length === 0) {
    console.log(colorize("No admins found.", "yellow"));
    return;
  }
  console.table(admins);
}

async function updateAdminPassword() {
  console.log(colorize("\n🔑 Change Admin Password", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━", "cyan"));

  let email = await askQuestion(colorize("Admin Email", "blue"));
  if (!isValidEmail(email)) return console.log(colorize("❌ Invalid email format", "red"));

  const client = initPrisma();
  const user = await client.user.findUnique({ where: { email } });
  if (!user || user.role !== "ADMIN") return console.log(colorize("❌ No ADMIN found with that email", "red"));

  const password = await promptForPassword();
  const hashed = await bcrypt.hash(password, 12);
  await client.user.update({ where: { id: user.id }, data: { password: hashed } });
  
  console.log(colorize("\n✅ Password updated successfully", "green"));
}

async function deleteAdmin() {
  console.log(colorize("\n🗑️  Delete Admin Account", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━", "cyan"));

  let email = await askQuestion(colorize("Admin Email to Delete", "blue"));
  if (!isValidEmail(email)) return console.log(colorize("❌ Invalid email format", "red"));

  const client = initPrisma();
  const user = await client.user.findUnique({ where: { email } });
  if (!user || user.role !== "ADMIN") return console.log(colorize("❌ No ADMIN found with that email", "red"));

  const confirm = await askYesNo(colorize(`⚠️  Are you sure you want to delete ${user.name} (${email})?`, "red"), "n");
  if (confirm) {
    await client.user.delete({ where: { id: user.id } });
    console.log(colorize("\n✅ Admin deleted successfully", "green"));
  } else {
    console.log(colorize("\nDeletion cancelled.", "yellow"));
  }
}

async function main() {
  console.log(colorize("\n🛡️  Admin Operations", "cyan"));
  console.log(colorize("===================", "cyan"));

  const options = [
    { label: "Create or Update Admin User", value: "create" },
    { label: "List Admin Users", value: "list" },
    { label: "Change Admin Password", value: "password" },
    { label: "Delete Admin User", value: "delete" },
    { label: "Exit", value: "exit" }
  ];

  try {
    while (true) {
      const choice = await askOptions("Select an operation:", options);

      if (choice === "exit") break;
      if (choice === "create") await createAdmin();
      if (choice === "list") await listAdmins();
      if (choice === "password") await updateAdminPassword();
      if (choice === "delete") await deleteAdmin();
    }
  } catch (error) {
    console.error(colorize(`\n❌ Error: ${error.message}`, "red"));
  } finally {
    if (prisma) await prisma.$disconnect();
    closeRL();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
