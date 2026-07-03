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

  const logoSrc = path.join(__dirname, '..', 'public', 'images', 'ucasapp.png');
  const fallbackSrc = path.join(__dirname, '..', 'public', 'favicon.svg');
  const src = fs.existsSync(logoSrc) ? logoSrc : fallbackSrc;
  const outDir = path.join(__dirname, '..', 'public', 'icons');
  fs.mkdirSync(outDir, { recursive: true });

  for (const size of [192, 512]) {
    const dest = path.join(outDir, `icon-${size}.png`);
    await sharp(src)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toFile(dest);
    console.log(`[PWA] Created ${dest} from ${path.basename(src)}`);
  }
}

main().catch((err) => {
  console.error('[PWA] Icon generation failed:', err.message);
  process.exit(1);
});
