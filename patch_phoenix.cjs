const fs = require("fs");
let content = fs.readFileSync("src/routes/game.$id.tsx", "utf8");

const oldFlight = `
            const flightT = now * 0.00032;
            const flyX = Math.sin(flightT) * 64 + Math.cos(flightT * 2.1) * 16;
            const flyZ = Math.cos(flightT) * 58 + Math.sin(flightT * 1.8) * 14;
            const flyY = 24 + Math.sin(flightT * 1.5) * 8;

            const nextT = flightT + 0.015;
            const nextX = Math.sin(nextT) * 64 + Math.cos(nextT * 2.1) * 16;
            const nextZ = Math.cos(nextT) * 58 + Math.sin(nextT * 1.8) * 14;
            const nextY = 24 + Math.sin(nextT * 1.5) * 8;
`;

const newFlight = `
            const flightT = now * 0.00022; // slower
            const flyX = Math.sin(flightT) * 140 + Math.cos(flightT * 2.1) * 30; // wider
            const flyZ = Math.cos(flightT) * 120 + Math.sin(flightT * 1.8) * 30; // wider
            const flyY = 45 + Math.sin(flightT * 1.5) * 12; // higher

            const nextT = flightT + 0.015;
            const nextX = Math.sin(nextT) * 140 + Math.cos(nextT * 2.1) * 30;
            const nextZ = Math.cos(nextT) * 120 + Math.sin(nextT * 1.8) * 30;
            const nextY = 45 + Math.sin(nextT * 1.5) * 12;
`;

content = content.replace(oldFlight.trim(), newFlight.trim());
fs.writeFileSync("src/routes/game.$id.tsx", content);
console.log("Phoenix patched");
