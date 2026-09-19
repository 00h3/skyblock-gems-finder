const fs = require("fs");
const archiver = require("archiver");
const output = fs.createWriteStream(__dirname + "/public/project_source.zip");
const archive = archiver("zip", {
  zlib: { level: 9 }, // Sets the compression level.
});
output.on("close", function () {
  console.log(archive.pointer() + " total bytes");
});
archive.on("error", function (err) {
  throw err;
});
archive.pipe(output);
archive.glob("**/*", {
  ignore: [
    "node_modules/**",
    "dist/**",
    ".git/**",
    ".lovable/**",
    "public/project_source.zip",
    "zip.cjs",
    ".output/**",
  ],
  dot: true,
});
archive.finalize();
