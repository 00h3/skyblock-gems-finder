const fs = require("fs");
let content = fs.readFileSync("src/routes/game.$id.tsx", "utf8");

// 1. Change magicSwordUrl
content = content.replace(
  'const magicSwordUrl = "/harvester-scythe.glb";',
  'const magicSwordUrl = "https://file.garden/alGOOylwpAfCa6qP/biblically_accurate_sword.glb";',
);

// 2. Change position and rotation
content = content.replace(
  "heldBasePos = new THREE.Vector3(0.2, -0.22, -0.34);",
  "heldBasePos = new THREE.Vector3(-0.35, -0.2, -0.45);",
);
content = content.replace(
  "heldBaseRot = new THREE.Euler(0.18, -0.42, 0.4);",
  "heldBaseRot = new THREE.Euler(0.1, 0.4, -0.2);",
);

// 3. Change scale
content = content.replace(
  "model.scale.setScalar(0.024);",
  'model.scale.setScalar(0.15); // scaled up for "not small"',
);

// 4. Update animation logic
content = content.replace(
  "scytheAction.setLoop(THREE.LoopOnce, 1);",
  "scytheAction.setLoop(THREE.LoopRepeat, Infinity);",
);
content = content.replace(
  "// Resting state: do not loop animation when not hitting",
  "// Playing continuously",
);
content = content.replace("scytheAction.stop();", "scytheAction.play();");

fs.writeFileSync("src/routes/game.$id.tsx", content);
console.log("Sword patched");
