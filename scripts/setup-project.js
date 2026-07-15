const { execSync } = require("child_process");
const { colorize, askOptions, closeRL } = require("./utils");
const { setupEnv } = require("./setup-env");
const { setupDb } = require("./setup-db");

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

async function main() {
  console.log(colorize("\n🚀 Gas Agency System - Master Setup", "cyan"));
  console.log(colorize("==========================================\n", "cyan"));

  const options = [
    { label: "Full Project Setup (Install dependencies -> Env -> DB)", value: "full" },
    { label: "Install Dependencies Only", value: "install" },
    { label: "Environment Variables Setup Only", value: "env" },
    { label: "Database Setup Only", value: "db" },
    { label: "Exit", value: "exit" }
  ];

  while (true) {
    const choice = await askOptions("Select a setup operation:", options);

    if (choice === "exit") {
      console.log(colorize("Exiting setup...", "yellow"));
      break;
    }

    if (choice === "full" || choice === "install") {
      console.log(colorize("\n📦 Installing Dependencies...", "cyan"));
      runCommand("npm install");
    }
    
    if (choice === "full" || choice === "env") {
      await setupEnv();
    }
    
    if (choice === "full" || choice === "db") {
      await setupDb();
    }

    if (choice === "full") {
      console.log(colorize("\n🎉 FULL SETUP COMPLETE!", "green"));
      console.log(colorize("━━━━━━━━━━━━━━━━━━━", "green"));
      console.log(colorize("Next steps:", "white"));
      console.log(colorize("1. Run: npm run admin   (to create your first admin account)", "cyan"));
      console.log(colorize("2. Run: npm run dev     (to start the development server)", "cyan"));
      console.log(colorize("3. Open: http://localhost:3000\n", "cyan"));
      break;
    }
  }
}

main().then(() => closeRL()).catch(err => {
  console.error(colorize(`Error: ${err.message}`, "red"));
  closeRL();
});
