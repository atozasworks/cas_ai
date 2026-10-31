const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  const env = {};
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2)
      || (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1).replace(/\\(["'\\])/g, '$1');
    } else {
      const commentAt = value.search(/\s+#/);
      if (commentAt !== -1) value = value.slice(0, commentAt).trim();
    }

    env[key] = value;
  }

  return env;
}

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error(`Missing ${envPath}. Create it on the VPS before starting PM2.`);
  process.exit(1);
}

const fileEnv = parseEnvFile(envPath);
const appName = fileEnv.PM2_APP_NAME || 'cas-server';

module.exports = {
  apps: [
    {
      name: appName,
      cwd: __dirname,
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      time: true,
      env: {
        ...fileEnv,
        NODE_ENV: fileEnv.NODE_ENV || 'production',
      },
    },
  ],
};
