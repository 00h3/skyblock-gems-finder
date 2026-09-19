const fs = require("fs");
let content = fs.readFileSync("src/routes/game.$id.tsx", "utf8");

// The top-left panel:
content = content.replace(
  "bg-zinc-950 border border-amber-500/60 rounded-lg flex items-center justify-center text-xs text-center overflow-hidden font-bold shadow-inner",
  "bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-lg flex items-center justify-center text-xs text-center overflow-hidden font-bold",
);
content = content.replace(
  'className="text-[10px] font-bold text-amber-200 tracking-wide"',
  'className="text-[10px] font-bold text-slate-800 tracking-wide"',
);
content = content.replace(
  /className="pointer-events-auto flex items-center gap-1 text-\[9px\] text-zinc-300 hover:text-white/g,
  'className="pointer-events-auto flex items-center gap-1 text-[9px] text-slate-600 hover:text-slate-900',
);
// Make the outer top-left profile panel white
content = content.replace(
  /className="pointer-events-auto flex items-center gap-2 bg-gradient-to-b from-zinc-800\/90 to-zinc-950\/95 border border-white\/10 rounded-xl p-1\.5 pr-3 shadow-\[.*?\] hover:scale-105 transition-transform cursor-pointer"/,
  'className="pointer-events-auto flex items-center gap-2 bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-xl p-1 pr-2.5 shadow-sm hover:scale-105 transition-transform cursor-pointer"',
);

// Scale down the profile avatar box
content = content.replace(/className="relative w-8\.5 h-8\.5/g, 'className="relative w-7 h-7');
content = content.replace(/className="h-8\.5 w-8\.5"/g, 'className="h-7 w-7"');

// The Home Party Icon button
content = content.replace(
  /className="pointer-events-auto w-8\.5 h-8\.5 bg-gradient-to-b from-zinc-800\/90 to-zinc-950\/95 border border-white\/10 rounded-xl flex items-center justify-center shadow-\[.*?\] hover:scale-105 active:scale-95 transition-transform p-1 cursor-pointer"/g,
  'className="pointer-events-auto w-7 h-7 bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-lg flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform p-1 cursor-pointer"',
);

// Currency row
content = content.replace(
  /className="flex items-center gap-2 bg-gradient-to-b from-zinc-800\/95 via-zinc-900\/95 to-zinc-950\/98 px-2\.5 py-1 rounded-xl border border-white\/10 text-white shadow-\[.*?\] backdrop-blur-md"/,
  'className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-200 text-slate-800 shadow-sm"',
);
content = content.replace(/border-l border-white\/10/g, "border-l border-slate-300");
content = content.replace(/text-amber-300 font-mono/g, "text-amber-600 font-bold font-mono");
content = content.replace(/text-pink-300 font-mono/g, "text-pink-600 font-bold font-mono");

// Perks & view button
content = content.replace(
  /className="h-7 px-2\.5 rounded-lg border border-white\/20 bg-zinc-800\/90 text-\[10px\] font-black text-white flex items-center gap-1\.5 shadow-\[.*?\] hover:bg-zinc-700\/90 active:scale-95 transition cursor-pointer"/,
  'className="h-6 px-2 rounded-lg border border-slate-200 bg-white/80 backdrop-blur-md text-[9px] font-bold text-slate-700 flex items-center gap-1 shadow-sm hover:bg-white/90 active:scale-95 transition cursor-pointer"',
);
content = content.replace(/text-amber-400/g, "text-amber-500");

// Dropdown
content = content.replace(
  /className="absolute right-0 top-8\.5 w-52 rounded-xl border border-white\/15 bg-\[#181a20\]\/95 backdrop-blur-xl shadow-2xl p-1\.5 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-100"/,
  'className="absolute right-0 top-7 w-48 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-lg p-1 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-100"',
);

// Dropdown items text
content = content.replace(/text-zinc-300/g, "text-slate-700");
content = content.replace(/text-zinc-200/g, "text-slate-700");
content = content.replace(/hover:bg-white\/10/g, "hover:bg-slate-100");
content = content.replace(/bg-white\/\[0\.06\] border-white\/5/g, "bg-slate-50 border-slate-200");

fs.writeFileSync("src/routes/game.$id.tsx", content);
console.log("Skyblock UI patched");
