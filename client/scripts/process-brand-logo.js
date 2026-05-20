const fs = require('fs');
const path = require('path');

const NAVY = { r: 15, g: 23, b: 42, alpha: 1 };
const SOURCE = path.join(__dirname, '..', 'public', 'ucasaapp-logo-source.png');
const OUT_1X = path.join(__dirname, '..', 'public', 'ucasaapp-logo.png');
const OUT_2X = path.join(__dirname, '..', 'public', 'ucasaapp-logo@2x.png');
const DISPLAY_HEIGHT = 64;

function isBackgroundPixel(r, g, b, a) {
  if (a < 16) return true;
  return r > 235 && g > 235 && b > 235;
}

async function buildPipeline(sharp, inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    if (isBackgroundPixel(r, g, b, a)) {
      pixels[i] = NAVY.r;
      pixels[i + 1] = NAVY.g;
      pixels[i + 2] = NAVY.b;
      pixels[i + 3] = 255;
    }
  }

  return sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 12, background: NAVY })
    .flatten({ background: NAVY });
}

async function exportLogo(pipeline, height, outputPath) {
  await pipeline
    .clone()
    .resize({ height, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.5 })
    .png({ compressionLevel: 5, quality: 100 })
    .toFile(outputPath);
}

async function main() {
  const sharp = require('sharp');

  if (!fs.existsSync(SOURCE)) {
    console.error(`Missing source: ${SOURCE}`);
    process.exit(1);
  }

  const pipeline = await buildPipeline(sharp, SOURCE);

  await exportLogo(pipeline, DISPLAY_HEIGHT, OUT_1X);
  await exportLogo(pipeline, DISPLAY_HEIGHT * 2, OUT_2X);

  const meta = await sharp(OUT_1X).metadata();
  console.log(`1x → ${OUT_1X} (${meta.width}x${meta.height})`);
  const meta2 = await sharp(OUT_2X).metadata();
  console.log(`2x → ${OUT_2X} (${meta2.width}x${meta2.height})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
