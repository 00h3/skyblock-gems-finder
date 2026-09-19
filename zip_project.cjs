const fs = require("fs");
const archiver = require("archiver");

const output = fs.createWriteStream(__dirname + "/public/project_source.zip");
const archive = archiver("zip", {
  zlib: { level: 9 }, // Sets the compression level.
});

output.on("close", function () {
  console.log(archive.pointer() + " total bytes");
  console.log("archiver has been finalized and the output file descriptor has closed.");
});

output.on("end", function () {
  console.log("Data has been drained");
});

archive.on("warning", function (err) {
  if (err.code === "ENOENT") {
    console.warn(err);
  } else {
    throw err;
  }
});

archive.on("error", function (err) {
  throw err;
});

archive.pipe(output);

// append files from a glob pattern
archive.glob("**/*", {
  ignore: [
    "node_modules/**",
    "dist/**",
    ".git/**",
    ".lovable/**",
    "zipFile.zip",
    "public/project_source.zip",
  ],
  dot: true,
});

archive.finalize();
