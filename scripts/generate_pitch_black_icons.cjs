const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDirs = [
  path.join(__dirname, '../public/assets/hud/pitch_black'),
  path.join(__dirname, '../public/assets/pitch_black_theme'),
  path.join(__dirname, '../public/pitch_black_theme')
];

for (const dir of targetDirs) {
  fs.mkdirSync(dir, { recursive: true });
}

const { Resvg } = require('@resvg/resvg-js');

// Helper to write SVG and convert to PNG using Resvg
function generateIcon(name, width, height, svgBody) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="darkBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#2c3039" />
        <stop offset="100%" stop-color="#15171c" />
      </linearGradient>
      <linearGradient id="darkRing" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#4e5564" />
        <stop offset="50%" stop-color="#2d323c" />
        <stop offset="100%" stop-color="#1a1c22" />
      </linearGradient>
      <linearGradient id="knobGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#3d434f" />
        <stop offset="50%" stop-color="#282c35" />
        <stop offset="100%" stop-color="#16181e" />
      </linearGradient>
      <linearGradient id="accentWhite" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#cfd4dc" />
      </linearGradient>
      <linearGradient id="accentGold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffdf5d" />
        <stop offset="100%" stop-color="#f59e0b" />
      </linearGradient>
      <linearGradient id="accentGreen" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#22c55e" />
        <stop offset="100%" stop-color="#15803d" />
      </linearGradient>
      <linearGradient id="accentBlue" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#3b82f6" />
        <stop offset="100%" stop-color="#1d4ed8" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#ffffff" flood-opacity="0.7"/>
      </filter>
    </defs>
    ${svgBody}
  </svg>`;

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  for (const dir of targetDirs) {
    const outPngPath = path.join(dir, `${name}.png`);
    fs.writeFileSync(outPngPath, pngBuffer);
    const outSvgPath = path.join(dir, `${name}.svg`);
    fs.writeFileSync(outSvgPath, svg, 'utf8');
  }
}

console.log('Generating pitch black theme icons...');

// 1. Joystick pole base ring (256x256)
generateIcon('dark_pole_pole_bg', 256, 256, `
  <g filter="url(#shadow)">
    <!-- Outer rim -->
    <circle cx="128" cy="128" r="120" fill="#121418" fill-opacity="0.82" stroke="url(#darkRing)" stroke-width="4" />
    <circle cx="128" cy="128" r="114" fill="none" stroke="#252932" stroke-width="1.5" />
    <!-- Inner zone -->
    <circle cx="128" cy="128" r="92" fill="#181a20" fill-opacity="0.45" stroke="#2e333d" stroke-width="1.5" stroke-dasharray="4 6" />
    <circle cx="128" cy="128" r="50" fill="none" stroke="#373d4a" stroke-width="1" stroke-opacity="0.4" />
    <!-- 8 directional guide notches -->
    <line x1="128" y1="12" x2="128" y2="28" stroke="#687182" stroke-width="3" stroke-linecap="round" />
    <line x1="128" y1="228" x2="128" y2="244" stroke="#687182" stroke-width="3" stroke-linecap="round" />
    <line x1="12" y1="128" x2="28" y2="128" stroke="#687182" stroke-width="3" stroke-linecap="round" />
    <line x1="228" y1="128" x2="244" y2="128" stroke="#687182" stroke-width="3" stroke-linecap="round" />
    <line x1="46" y1="46" x2="57" y2="57" stroke="#4a5160" stroke-width="2" stroke-linecap="round" />
    <line x1="210" y1="46" x2="199" y2="57" stroke="#4a5160" stroke-width="2" stroke-linecap="round" />
    <line x1="46" y1="210" x2="57" y2="199" stroke="#4a5160" stroke-width="2" stroke-linecap="round" />
    <line x1="210" y1="210" x2="199" y2="199" stroke="#4a5160" stroke-width="2" stroke-linecap="round" />
  </g>
`);

// 2. Joystick center knob (128x128)
generateIcon('dark_pole_pole_center', 128, 128, `
  <g filter="url(#shadow)">
    <!-- Base disc -->
    <circle cx="64" cy="64" r="58" fill="url(#knobGrad)" stroke="url(#darkRing)" stroke-width="3.5" />
    <!-- Metallic beveled inner ridge -->
    <circle cx="64" cy="64" r="48" fill="none" stroke="#4f5666" stroke-width="1.5" />
    <circle cx="64" cy="64" r="40" fill="#1b1d24" stroke="#2a2e38" stroke-width="2" />
    <!-- Center tactile dimple -->
    <circle cx="64" cy="64" r="22" fill="url(#knobGrad)" stroke="#5a6375" stroke-width="1.5" />
    <circle cx="64" cy="64" r="12" fill="#2d323e" />
    <circle cx="64" cy="64" r="5" fill="#e2e8f0" fill-opacity="0.9" />
  </g>
`);

// 3. Arrow Keys: Shang (Up)
generateIcon('dark_arrow_key_shang', 80, 80, `
  <g filter="url(#shadow)">
    <polygon points="40,16 68,52 40,42 12,52" fill="#1e2129" stroke="#3d4350" stroke-width="2" />
    <polygon points="40,22 62,49 40,40 18,49" fill="url(#accentWhite)" opacity="0.95" />
  </g>
`);

// 4. Arrow Keys: Shang Pressed
generateIcon('dark_arrow_key_shang_pre', 80, 80, `
  <g filter="url(#glow)">
    <polygon points="40,14 70,54 40,44 10,54" fill="#2c3240" stroke="#8da0c4" stroke-width="2.5" />
    <polygon points="40,20 64,51 40,42 16,51" fill="#ffffff" />
  </g>
`);

// 5. Arrow Keys: Xia (Down)
generateIcon('dark_arrow_key_xia', 80, 80, `
  <g filter="url(#shadow)">
    <polygon points="40,64 68,28 40,38 12,28" fill="#1e2129" stroke="#3d4350" stroke-width="2" />
    <polygon points="40,58 62,31 40,40 18,31" fill="url(#accentWhite)" opacity="0.95" />
  </g>
`);

// 6. Arrow Keys: Zuo (Left)
generateIcon('dark_arrow_key_zuo', 80, 80, `
  <g filter="url(#shadow)">
    <polygon points="16,40 52,12 42,40 52,68" fill="#1e2129" stroke="#3d4350" stroke-width="2" />
    <polygon points="22,40 49,18 40,40 49,62" fill="url(#accentWhite)" opacity="0.95" />
  </g>
`);

// 7. Arrow Keys: You (Right)
generateIcon('dark_arrow_key_you', 80, 80, `
  <g filter="url(#shadow)">
    <polygon points="64,40 28,12 38,40 28,68" fill="#1e2129" stroke="#3d4350" stroke-width="2" />
    <polygon points="58,40 31,18 40,40 31,62" fill="url(#accentWhite)" opacity="0.95" />
  </g>
`);

// 8. Arrow Keys: Zuo Xie Shang (Up-Left)
generateIcon('dark_arrow_key_zuoxieshang', 80, 80, `
  <g filter="url(#shadow)" transform="rotate(-45 40 40)">
    <polygon points="40,16 68,52 40,42 12,52" fill="#1e2129" stroke="#3d4350" stroke-width="2" />
    <polygon points="40,22 62,49 40,40 18,49" fill="url(#accentWhite)" opacity="0.95" />
  </g>
`);

// 9. Arrow Keys: You Xie Shang (Up-Right)
generateIcon('dark_arrow_key_youxieshang', 80, 80, `
  <g filter="url(#shadow)" transform="rotate(45 40 40)">
    <polygon points="40,16 68,52 40,42 12,52" fill="#1e2129" stroke="#3d4350" stroke-width="2" />
    <polygon points="40,22 62,49 40,40 18,49" fill="url(#accentWhite)" opacity="0.95" />
  </g>
`);

// 10. Jump Move Button (160x160)
generateIcon('dark_MainControlImageSet_jump_move_', 160, 160, `
  <g filter="url(#shadow)">
    <circle cx="80" cy="80" r="74" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="4.5" />
    <circle cx="80" cy="80" r="66" fill="#15171d" stroke="#2a2e37" stroke-width="1.5" />
    <!-- Dynamic jumping silhouette -->
    <!-- Head -->
    <rect x="71" y="32" width="18" height="18" rx="4" fill="url(#accentWhite)" />
    <!-- Body -->
    <rect x="73" y="54" width="14" height="28" rx="3" fill="url(#accentWhite)" />
    <!-- Arms angled up/out -->
    <path d="M72 58 L54 44 L48 50 L64 68 Z" fill="url(#accentWhite)" />
    <path d="M88 58 L106 44 L112 50 L96 68 Z" fill="url(#accentWhite)" />
    <!-- Legs bent in mid-air leap -->
    <path d="M74 80 L58 102 L66 108 L80 90 Z" fill="url(#accentWhite)" />
    <path d="M86 80 L102 102 L94 108 L80 90 Z" fill="url(#accentWhite)" />
    <!-- Upward swoosh indicator -->
    <path d="M50 120 Q80 114 110 120" stroke="#717c91" stroke-width="3" stroke-linecap="round" fill="none"/>
  </g>
`);

// 11. Fly Button (128x128)
generateIcon('dark_MainControlImageSet_fly', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <!-- Flying wings glyph -->
    <path d="M64 42 L72 74 L64 68 L56 74 Z" fill="url(#accentWhite)" />
    <!-- Wing left -->
    <path d="M56 50 C40 34 22 42 18 56 C28 62 44 60 56 64 Z" fill="url(#accentWhite)" />
    <!-- Wing right -->
    <path d="M72 50 C88 34 106 42 110 56 C100 62 84 60 72 64 Z" fill="url(#accentWhite)" />
    <!-- Air plumes underneath -->
    <circle cx="64" cy="84" r="3" fill="#8da0c4" />
    <circle cx="64" cy="94" r="2" fill="#8da0c4" opacity="0.6" />
  </g>
`);

// 12. Fly Ascend / Qi Fei (128x128)
generateIcon('dark_jump_control_qifei', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <!-- Rocket thrust / upward launch -->
    <polygon points="64,28 88,58 72,58 72,90 56,90 56,58 40,58" fill="url(#accentWhite)" />
    <line x1="38" y1="98" x2="90" y2="98" stroke="#ffdf5d" stroke-width="4" stroke-linecap="round" />
  </g>
`);

// 13. Fly Descend / Jiang Di (128x128)
generateIcon('dark_fly_control_jiangdi', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <!-- Downward arrows -->
    <polygon points="64,96 40,66 54,66 54,34 74,34 74,66 88,66" fill="url(#accentWhite)" />
  </g>
`);

// 14. Fly Land / Luo Di (128x128)
generateIcon('dark_fly_control_luodi', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <!-- Parachute / ground touchdown -->
    <path d="M40 40 C40 28 88 28 88 40 Z" fill="url(#accentWhite)" />
    <line x1="42" y1="42" x2="64" y2="66" stroke="#ffffff" stroke-width="2" />
    <line x1="86" y1="42" x2="64" y2="66" stroke="#ffffff" stroke-width="2" />
    <rect x="60" y="66" width="8" height="12" rx="2" fill="url(#accentWhite)" />
    <line x1="32" y1="94" x2="96" y2="94" stroke="#8da0c4" stroke-width="4" stroke-linecap="round" />
  </g>
`);

// 15. Fly Shenggao (Altitude Up) (128x128)
generateIcon('dark_fly_control_shenggao', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <!-- Double upward chevrons -->
    <path d="M38 58 L64 34 L90 58 L82 66 L64 48 L46 66 Z" fill="url(#accentWhite)" />
    <path d="M38 86 L64 62 L90 86 L82 94 L64 76 L46 94 Z" fill="url(#accentWhite)" opacity="0.8" />
  </g>
`);

// 16. Sprint State (128x128)
generateIcon('dark_move_state_sprint', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <!-- Leaning runner forward with motion wind -->
    <!-- Head -->
    <circle cx="76" cy="36" r="9" fill="url(#accentWhite)" />
    <!-- Body leaning 30 deg -->
    <path d="M72 46 L62 70 L54 66 L64 44 Z" fill="url(#accentWhite)" />
    <!-- Arms -->
    <path d="M68 50 L86 42 L90 48 L72 58 Z" fill="url(#accentWhite)" />
    <path d="M60 54 L44 62 L40 56 L56 48 Z" fill="url(#accentWhite)" />
    <!-- Front leg -->
    <path d="M62 70 L82 82 L78 98 L70 96 L74 84 L56 74 Z" fill="url(#accentWhite)" />
    <!-- Back leg kicking up -->
    <path d="M58 68 L40 80 L28 72 L32 66 L42 74 Z" fill="url(#accentWhite)" />
    <!-- Motion lines -->
    <line x1="22" y1="44" x2="38" y2="44" stroke="#ffdf5d" stroke-width="2.5" stroke-linecap="round" />
    <line x1="16" y1="56" x2="32" y2="56" stroke="#ffdf5d" stroke-width="2.5" stroke-linecap="round" />
    <line x1="20" y1="68" x2="30" y2="68" stroke="#ffdf5d" stroke-width="2.5" stroke-linecap="round" />
  </g>
`);

// 17. Run State (128x128)
generateIcon('dark_move_state_run', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <!-- Upright walking/jogging runner -->
    <circle cx="64" cy="34" r="9" fill="url(#accentWhite)" />
    <rect x="58" y="46" width="12" height="24" rx="3" fill="url(#accentWhite)" />
    <path d="M58 50 L44 64 L48 68 L60 56 Z" fill="url(#accentWhite)" />
    <path d="M70 50 L84 62 L80 66 L68 56 Z" fill="url(#accentWhite)" />
    <path d="M58 68 L48 94 L56 96 L64 74 Z" fill="url(#accentWhite)" />
    <path d="M68 68 L78 94 L70 96 L62 74 Z" fill="url(#accentWhite)" />
  </g>
`);

// 18. Sneak / Crouch State (128x128)
generateIcon('dark_move_state_sneak', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <!-- Crouched silhouette -->
    <circle cx="56" cy="44" r="8" fill="url(#accentWhite)" />
    <path d="M52 54 L72 58 L68 76 L48 72 Z" fill="url(#accentWhite)" />
    <!-- Knees bent low -->
    <path d="M48 72 L36 84 L44 94 L56 94 L50 84 L58 74 Z" fill="url(#accentWhite)" />
    <path d="M68 74 L78 86 L90 86 L84 94 L70 94 L62 82 Z" fill="url(#accentWhite)" />
  </g>
`);

// 19. Auto Run True (128x128)
generateIcon('dark_main_btn_auto_run_true', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#accentGreen)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#132318" stroke="#1d4328" stroke-width="1" />
    <!-- Runner locked -->
    <circle cx="56" cy="38" r="7" fill="url(#accentGreen)" />
    <path d="M52 46 L70 54 L62 76 L48 68 Z" fill="url(#accentGreen)" />
    <!-- Lock icon small -->
    <rect x="80" y="68" width="18" height="14" rx="2" fill="url(#accentGreen)" />
    <path d="M84 68 L84 62 C84 58 94 58 94 62 L94 68" stroke="url(#accentGreen)" stroke-width="2.5" fill="none" />
  </g>
`);

// 20. Auto Run False (128x128)
generateIcon('dark_main_btn_auto_run_false', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <circle cx="64" cy="38" r="7" fill="#6b7280" />
    <path d="M60 46 L74 54 L66 76 L52 68 Z" fill="#6b7280" />
    <rect x="80" y="68" width="18" height="14" rx="2" fill="#6b7280" />
    <path d="M84 64 L84 60 C84 56 94 56 94 60" stroke="#6b7280" stroke-width="2.5" fill="none" />
  </g>
`);

// 21. Shoot Right Trigger (144x144)
generateIcon('dark_gun_RightShoot', 144, 144, `
  <g filter="url(#shadow)">
    <circle cx="72" cy="72" r="66" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="4" />
    <circle cx="72" cy="72" r="58" fill="#15171d" stroke="#2a2e37" stroke-width="1.5" />
    <!-- Crosshair reticle with blast -->
    <circle cx="72" cy="72" r="32" fill="none" stroke="url(#accentWhite)" stroke-width="3" />
    <circle cx="72" cy="72" r="8" fill="url(#accentWhite)" />
    <line x1="72" y1="26" x2="72" y2="44" stroke="url(#accentWhite)" stroke-width="3.5" stroke-linecap="round" />
    <line x1="72" y1="100" x2="72" y2="118" stroke="url(#accentWhite)" stroke-width="3.5" stroke-linecap="round" />
    <line x1="26" y1="72" x2="44" y2="72" stroke="url(#accentWhite)" stroke-width="3.5" stroke-linecap="round" />
    <line x1="100" y1="72" x2="118" y2="72" stroke="url(#accentWhite)" stroke-width="3.5" stroke-linecap="round" />
    <!-- Bullet sparks -->
    <polygon points="102,42 114,38 108,50" fill="#f59e0b" />
    <polygon points="42,42 30,38 36,50" fill="#f59e0b" />
  </g>
`);

// 22. Shoot Left Trigger (144x144)
generateIcon('dark_gun_LeftShoot', 144, 144, `
  <g filter="url(#shadow)">
    <circle cx="72" cy="72" r="66" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="4" />
    <circle cx="72" cy="72" r="58" fill="#15171d" stroke="#2a2e37" stroke-width="1.5" />
    <!-- Quick hand / secondary trigger action -->
    <path d="M48 94 L48 64 C48 58 56 58 56 64 L56 46 C56 40 64 40 64 46 L64 42 C64 36 72 36 72 42 L72 48 C72 44 80 44 80 50 L80 72 C80 88 64 96 48 94 Z" fill="url(#accentWhite)" />
  </g>
`);

// 23. Aim Scope (128x128)
generateIcon('dark_gun_Aim', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <!-- Scope ring -->
    <circle cx="64" cy="64" r="32" fill="none" stroke="url(#accentWhite)" stroke-width="2.5" />
    <circle cx="64" cy="64" r="18" fill="none" stroke="url(#accentWhite)" stroke-width="1.5" stroke-dasharray="2 3" />
    <line x1="64" y1="24" x2="64" y2="104" stroke="url(#accentWhite)" stroke-width="1.5" />
    <line x1="24" y1="64" x2="104" y2="64" stroke="url(#accentWhite)" stroke-width="1.5" />
    <circle cx="64" cy="64" r="3" fill="#ff4d4f" />
  </g>
`);

// 24. Cancel Aim (128x128)
generateIcon('dark_gun_CancalAim', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <!-- Scope with strike through -->
    <circle cx="64" cy="64" r="28" fill="none" stroke="#8da0c4" stroke-width="2" />
    <line x1="36" y1="36" x2="92" y2="92" stroke="#ef4444" stroke-width="4" stroke-linecap="round" />
  </g>
`);

// 25. Reload Bullet (128x128)
generateIcon('dark_gun_ReloadBullet', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <!-- Circular arrows around 2 bullets -->
    <path d="M64 28 A32 32 0 1 1 36 48" fill="none" stroke="url(#accentWhite)" stroke-width="3.5" stroke-linecap="round" />
    <polygon points="32,36 44,48 30,52" fill="url(#accentWhite)" />
    <!-- 2 bullets -->
    <rect x="54" y="52" width="8" height="22" rx="3" fill="#f59e0b" />
    <rect x="66" y="52" width="8" height="22" rx="3" fill="#f59e0b" />
  </g>
`);

// 26. Camera Perspective Switch (128x128)
generateIcon('dark_MainControlImageSet_camera', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <!-- Eye / perspective toggle -->
    <path d="M28 64 C40 46 88 46 100 64 C88 82 40 82 28 64 Z" fill="none" stroke="url(#accentWhite)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="12" fill="url(#accentWhite)" />
    <circle cx="68" cy="60" r="4" fill="#15171d" />
  </g>
`);

// 27. Crosshair (96x96)
generateIcon('dark_MainControlImageSet_cross_hair', 96, 96, `
  <g filter="url(#shadow)">
    <circle cx="48" cy="48" r="3.5" fill="#ffffff" />
    <circle cx="48" cy="48" r="24" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.75" />
    <line x1="48" y1="12" x2="48" y2="28" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
    <line x1="48" y1="68" x2="48" y2="84" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
    <line x1="12" y1="48" x2="28" y2="48" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
    <line x1="68" y1="48" x2="84" y2="48" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
  </g>
`);

// 28. Chat Speech Bubble (128x128)
generateIcon('dark_gui_material_chat_icon', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <!-- Speech bubble -->
    <path d="M36 44 C36 38 42 34 50 34 L78 34 C86 34 92 38 92 44 L92 70 C92 76 86 80 78 80 L56 80 L42 92 L46 80 L50 80 C42 80 36 76 36 70 Z" fill="url(#accentWhite)" />
    <!-- 3 dots -->
    <circle cx="52" cy="57" r="4" fill="#1a1c23" />
    <circle cx="64" cy="57" r="4" fill="#1a1c23" />
    <circle cx="76" cy="57" r="4" fill="#1a1c23" />
  </g>
`);

// 29. Close Button (X) (128x128)
generateIcon('dark_gui_material_guanbianniu', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <line x1="44" y1="44" x2="84" y2="84" stroke="url(#accentWhite)" stroke-width="6" stroke-linecap="round" />
    <line x1="84" y1="44" x2="44" y2="84" stroke="url(#accentWhite)" stroke-width="6" stroke-linecap="round" />
  </g>
`);

// 30. Menu Button (128x128)
generateIcon('dark_gui_material_diaochucaidananniu', 128, 128, `
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="58" fill="url(#darkBg)" stroke="url(#darkRing)" stroke-width="3.5" />
    <circle cx="64" cy="64" r="50" fill="#15171d" stroke="#2a2e37" stroke-width="1" />
    <line x1="40" y1="46" x2="88" y2="46" stroke="url(#accentWhite)" stroke-width="5" stroke-linecap="round" />
    <line x1="40" y1="64" x2="88" y2="64" stroke="url(#accentWhite)" stroke-width="5" stroke-linecap="round" />
    <line x1="40" y1="82" x2="88" y2="82" stroke="url(#accentWhite)" stroke-width="5" stroke-linecap="round" />
  </g>
`);

// 31. Material Button Green BG (200x80)
generateIcon('dark_gui_material_btn_bg_green', 200, 80, `
  <g filter="url(#shadow)">
    <rect x="6" y="6" width="188" height="68" rx="18" fill="url(#accentGreen)" stroke="#4ade80" stroke-width="2" />
    <rect x="10" y="10" width="180" height="30" rx="12" fill="#ffffff" fill-opacity="0.18" />
  </g>
`);

// 32. Material Button Blue BG (200x80)
generateIcon('dark_gui_material_btn_bg_blue', 200, 80, `
  <g filter="url(#shadow)">
    <rect x="6" y="6" width="188" height="68" rx="18" fill="url(#accentBlue)" stroke="#60a5fa" stroke-width="2" />
    <rect x="10" y="10" width="180" height="30" rx="12" fill="#ffffff" fill-opacity="0.18" />
  </g>
`);

console.log('All pitch black theme icons generated successfully!');
