const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outDir = path.join(__dirname, '..', 'public', 'icons');
const svgPath = path.join(__dirname, '..', 'public', 'favicon.svg');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Run: npm install sharp --save-dev');
    process.exit(1);
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const svg = fs.readFileSync(svgPath);
  await Promise.all(
    sizes.map(async (size) => {
      const out = path.join(outDir, `icon-${size}.png`);
      await sharp(svg).resize(size, size).png().toFile(out);
      console.log(`Created ${out}`);
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
