const fs = require("fs");
let code = fs.readFileSync("src/routes/game.sandbox.tsx", "utf8");
code = code.replace(
  "heldSword = heldSwordSource?.clone(true) ?? null;",
  `heldSword = heldSwordSource?.clone(true) ?? null;
      if (heldSword && heldSwordSource?.userData?.animations) {
        heldSwordMixer = new THREE.AnimationMixer(heldSword);
        heldSwordSource.userData.animations.forEach((clip) => {
          const action = heldSwordMixer!.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
        });
      }`,
);
code = code.replace(
  "runesMixers.forEach((mixer) => mixer.update(dt));",
  "runesMixers.forEach((mixer) => mixer.update(dt));\n        if (heldSwordMixer) heldSwordMixer.update(dt);",
);
fs.writeFileSync("src/routes/game.sandbox.tsx", code);
