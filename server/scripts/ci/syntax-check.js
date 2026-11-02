const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');

function walk(dir, files) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'logs' || name === 'build') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (name.endsWith('.js')) files.push(full);
  }
}

const files = [];
walk(root, files);

let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed += 1;
    process.stderr.write(`${path.relative(root, file)}\n${result.stderr || result.stdout || ''}\n`);
  }
}

if (failed > 0) {
  console.error(`Syntax check failed for ${failed} file(s).`);
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} server file(s).`);
