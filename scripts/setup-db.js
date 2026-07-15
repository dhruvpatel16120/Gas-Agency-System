const { execSync } = require("child_process");
const { colorize, askOptions, askYesNo, closeRL } = require("./utils");

function runCommand(command) {
  try {
    console.log(colorize(`\nExecuting: ${command}`, "dim"));
    execSync(command, { stdio: "inherit" });
    return true;
  } catch (error) {
    console.error(colorize(`\n❌ Command failed: ${command}`, "red"));
    return false;
  }
}

async function setupDb() {
  console.log(colorize("\n🗄️  Database Setup & Management", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan"));

  const options = [
    { label: "Generate Prisma Client (npm run db:generate)", value: "generate" },
    { label: "Push Schema to Database (npm run db:push)", value: "push" },
    { label: "Run Database Migrations (npm run db:migrate)", value: "migrate" },
    { label: "Reset Database (⚠️ Destructive) (npm run db:reset)", value: "reset" },
    { label: "Seed Sample Data (npm run db:seed)", value: "seed" },
    { label: "Open Prisma Studio (npm run db:studio)", value: "studio" },
    { label: "Exit", value: "exit" }
  ];

  while (true) {
    const choice = await askOptions("Select a database operation:", options);

    if (choice === "exit") {
      console.log(colorize("Exiting database setup...", "yellow"));
      break;
    }

    switch (choice) {
      case "generate":
        runCommand("npm run db:generate");
        break;
      case "push":
        runCommand("npm run db:push");
        break;
      case "migrate":
        runCommand("npm run db:migrate");
        break;
      case "reset":
        const confirmReset = await askYesNo(colorize("⚠️  WARNING: This will destroy all data in the database. Are you sure?", "red"), "n");
        if (confirmReset) {
          runCommand("npm run db:reset");
        } else {
          console.log(colorize("Reset cancelled.", "yellow"));
        }
        break;
      case "seed":
        runCommand("npm run db:seed");
        break;
      case "studio":
        console.log(colorize("Opening Prisma Studio... Press Ctrl+C to exit.", "green"));
        runCommand("npm run db:studio");
        break;
    }

    const continueSetup = await askYesNo("\nDo you want to perform another database operation?", "y");
    if (!continueSetup) {
      break;
    }
  }
}

// Run if called directly
if (require.main === module) {
  setupDb().then(() => closeRL());
}

module.exports = { setupDb };
