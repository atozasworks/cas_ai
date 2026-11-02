const { spawnSync } = require('child_process');

const dir = process.argv[2];
const failAt = process.argv[3] || 'critical';
const rank = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

if (!dir) {
  console.error('Usage: node audit-gate.js <directory> [critical|high|moderate|low]');
  process.exit(1);
}

const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  cwd: dir,
  encoding: 'utf8',
});

let report;
try {
  const raw = result.stdout || '';
  const start = raw.indexOf('{');
  report = JSON.parse(start >= 0 ? raw.slice(start) : '{}');
} catch (err) {
  console.error(result.stderr || err.message);
  process.exit(1);
}

const counts = report.metadata?.vulnerabilities || {};
const detail = ['critical', 'high', 'moderate', 'low']
  .map((level) => `${counts[level] || 0} ${level}`)
  .join(', ');
console.log(detail);

const worst = ['critical', 'high', 'moderate', 'low', 'info'].find((level) => (counts[level] || 0) > 0);
if (worst && rank[worst] >= rank[failAt]) {
  console.error(`Audit failed: ${worst} findings are at or above ${failAt}.`);
  process.exit(1);
}
