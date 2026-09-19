const fs = require("fs");
let content = fs.readFileSync("src/components/game-hud-parts.tsx", "utf8");

const oldJoystick = `
      {/* Clean circular grey joystick control area */}
      <div
        ref={baseRef}
        className="absolute inset-0 rounded-full bg-[#2a2d35]/80 backdrop-blur-md border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden"
      />
      {/* Knob */}
      <div
        ref={knobRef}
        className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3d4350]/90 border border-white/30 flex items-center justify-center shadow-md transition-transform duration-75"
      >
        <div className="h-3.5 w-3.5 rounded-full bg-amber-400/90 shadow-sm pointer-events-none" />
      </div>
`;

const newJoystick = `
      {/* D-Pad Base */}
      <div
        ref={baseRef}
        className="absolute inset-0 bg-white/40 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-white/80"
        style={{
          clipPath: "polygon(33% 0%, 67% 0%, 67% 33%, 100% 33%, 100% 67%, 67% 67%, 67% 100%, 33% 100%, 33% 67%, 0% 67%, 0% 33%, 33% 33%)",
          transform: "scale(1.2)"
        }}
      />
      
      {/* Knob (Center D-Pad dot) */}
      <div
        ref={knobRef}
        className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 flex items-center justify-center shadow-md transition-transform duration-75"
      >
        <div className="h-4 w-4 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] pointer-events-none" />
      </div>
`;

content = content.replace(oldJoystick.trim(), newJoystick.trim());
fs.writeFileSync("src/components/game-hud-parts.tsx", content);
console.log("Joystick patched");
