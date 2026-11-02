const fs = require('fs');

const reportPath = process.argv[2] || 'lighthouse.json';
const floors = {
  performance: 0.25,
  accessibility: 0.5,
  'best-practices': 0.5,
  seo: 0.7,
};

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const categories = report.categories || {};
const lines = [];
let failed = false;

for (const [name, floor] of Object.entries(floors)) {
  const score = categories[name]?.score;
  if (typeof score !== 'number') {
    failed = true;
    lines.push(`${name}=missing`);
    continue;
  }
  lines.push(`${name}=${Math.round(score * 100)}`);
  if (score < floor) failed = true;
}

console.log(lines.join(', '));
if (failed) {
  console.error('Lighthouse scores are below the required floors.');
  process.exit(1);
}
