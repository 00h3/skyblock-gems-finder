const fs = require("fs");
let content = fs.readFileSync("src/routes/game.$id.tsx", "utf8");

const oldShadows = `
      sun.castShadow = !mobileLow;
      renderer.shadowMap.enabled = !mobileLow;
`;

const newShadows = `
      sun.castShadow = !mobileLow && !isSkyblock;
      renderer.shadowMap.enabled = !mobileLow && !isSkyblock;
`;

content = content.replace(oldShadows.trim(), newShadows.trim());
fs.writeFileSync("src/routes/game.$id.tsx", content);
console.log("Shadows patched");
