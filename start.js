import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidates = [
  "dist/server/index.mjs",
  ".output/server/index.mjs",
  "build/server/index.mjs",
  "dist/index.mjs",
];

let entryFile = null;
for (const file of candidates) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    entryFile = fullPath;
    break;
  }
}

if (!entryFile) {
  console.error("=========================================");
  console.error("ERROR: Could not find server entry file!");
  console.error("Checked candidates: ", candidates.join(", "));
  console.error("Current directory contents:");
  console.error(fs.readdirSync(__dirname).join("\n"));
  console.error("=========================================");
  process.exit(1);
}

console.log(`Starting server with ${entryFile}`);
const child = spawn("node", [entryFile], { stdio: "inherit", env: process.env });
child.on("exit", (code) => process.exit(code || 0));
