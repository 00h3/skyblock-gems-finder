const { execSync } = require('child_process');

const icons = [
  { name: 'user-avatar', file: 'user-avatar.png', size: '72x72', c1: '#38bdf8', c2: '#1d4ed8' },
  { name: 'key-access', file: 'key-access.png', size: '72x72', c1: '#fcd34d', c2: '#d97706' },
  { name: 'bell-dot', file: 'bell-dot.png', size: '96x96', c1: '#fb7185', c2: '#e11d48' },
  { name: 'cloud-moon', file: 'cloud-moon.png', size: '72x72', c1: '#c084fc', c2: '#6d28d9' },
  { name: 'calendar-heart', file: 'calendar-heart.png', size: '72x72', c1: '#34d399', c2: '#047857' },
  { name: 'book-learn', file: 'book-learn.png', size: '72x72', c1: '#38bdf8', c2: '#4338ca' },
  { name: 'door-lock', file: 'door-lock.png', size: '72x72', c1: '#fb923c', c2: '#c2410c' },
  { name: 'phone-key', file: 'phone-key.png', size: '72x72', c1: '#f87171', c2: '#b91c1c' },
];

for (const icon of icons) {
  const inPath = 'public/icons/hosted/' + icon.file;
  const outPath = 'public/icons/hosted/' + icon.name + '-glossy.png';
  
  // Create gradient icon with top glossy sheen highlight
  const cmd = `convert "${inPath}" \
    \\( -size ${icon.size} gradient:"${icon.c1}-${icon.c2}" \\) \
    -compose In -composite \
    \\( -size ${icon.size} gradient:"rgba(255,255,255,0.45)-rgba(255,255,255,0)" \\) \
    -compose Screen -composite \
    "${inPath}" -compose DstIn -composite \
    "${outPath}"`;
  execSync(cmd, { shell: '/bin/bash' });
  console.log('Enhanced Glossy Icon:', outPath);
}
