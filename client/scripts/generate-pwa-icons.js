const fs = require('fs');
const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.warn('[PWA] sharp not installed — run: npm install --save-dev sharp');
    process.exit(0);
  }

  const src = path.join(__dirname, '..', 'public', 'favicon.svg');
  const outDir = path.join(__dirname, '..', 'public', 'icons');
  fs.mkdirSync(outDir, { recursive: true });

  for (const size of [192, 512]) {
    const dest = path.join(outDir, `icon-${size}.png`);
    await sharp(src).resize(size, size).png().toFile(dest);
    console.log(`[PWA] Created ${dest}`);
  }
}

main().catch((err) => {
  console.error('[PWA] Icon generation failed:', err.message);
  process.exit(1);
});
