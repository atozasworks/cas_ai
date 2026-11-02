const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const serverRoot = path.resolve(__dirname, '..', '..');

const modelDir = path.join(serverRoot, 'models');
const models = fs.readdirSync(modelDir).filter((name) => name.endsWith('.js'));
if (models.length === 0) {
  console.error('No Mongoose model files found.');
  process.exit(1);
}

for (const name of models) {
  require(path.join(modelDir, name));
}
console.log(`Mongoose models loaded: ${models.join(', ')}`);

const schemaCandidates = [
  path.join(repoRoot, 'prisma', 'schema.prisma'),
  path.join(serverRoot, 'prisma', 'schema.prisma'),
];
const schema = schemaCandidates.find((candidate) => fs.existsSync(candidate));

if (!schema) {
  console.log('Prisma schema not used. Database check passed with Mongoose.');
  process.exit(0);
}

const prisma = spawnSync('npx', ['prisma', 'validate', '--schema', schema], {
  cwd: repoRoot,
  encoding: 'utf8',
  stdio: 'inherit',
});
process.exit(prisma.status === 0 ? 0 : prisma.status || 1);
