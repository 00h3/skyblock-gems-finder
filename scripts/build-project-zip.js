import fs from "fs";
import path from "path";
import JSZip from "jszip";

const rootDir = process.cwd();
const zip = new JSZip();

const excludePatterns = [
  "node_modules",
  ".git",
  "dist",
  ".output",
  ".vinxi",
  ".cache",
  ".tanstack",
  ".env",
  ".env.local",
  "QBLOCK-project.zip",
  "zipFile.zip",
];

function shouldExclude(relPath) {
  return excludePatterns.some((pattern) => {
    const parts = relPath.split(path.sep);
    return parts.includes(pattern) || relPath === pattern;
  });
}

function addDirectoryToZip(currentDir, currentZip) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    if (shouldExclude(relPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      const folderZip = currentZip.folder(entry.name);
      addDirectoryToZip(fullPath, folderZip);
    } else if (entry.isFile()) {
      // Don't include huge binary cache files
      if (entry.name.endsWith(".log") || entry.name.endsWith(".tmp")) {
        continue;
      }
      const data = fs.readFileSync(fullPath);
      currentZip.file(entry.name, data);
    }
  }
}

async function buildZip() {
  console.log("Generating QBLOCK-project.zip...");
  addDirectoryToZip(rootDir, zip);

  const content = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const outPath = path.join(rootDir, "public", "QBLOCK-project.zip");
  fs.writeFileSync(outPath, content);
  console.log(
    `Generated QBLOCK-project.zip (${(content.length / (1024 * 1024)).toFixed(2)} MB) at ${outPath}`,
  );
}

buildZip().catch((err) => {
  console.error("Failed to generate zip:", err);
  process.exit(1);
});
